-- ================================================================
-- Migration 011 — Statut qualité lots : 'Bloqué' + auto-blocage DLC/DDM
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- PROBLÈME CORRIGÉ :
--   Migration 007 définit quality_inspection_lots.status avec les
--   valeurs ('En contrôle', 'Libéré', 'Rejeté'). Le métier agroali-
--   mentaire impose un seul concept d'interdiction d'usage : 'Bloqué'
--   (qu'il s'agisse d'un rejet QC, d'une DLC dépassée ou d'un rappel).
--
-- CE QUE CETTE MIGRATION FAIT :
--   §1 — Aligne quality_inspection_lots.status sur ('En contrôle',
--         'Libéré', 'Bloqué') et adapte la RLS pour autoriser
--         le passage Libéré → Bloqué (rappel / contamination découverte).
--   §2 — Ajoute goods_receipt_items.quality_status pour un accès
--         FEFO sans JOIN (dénormalisation contrôlée).
--   §3 — Ajoute 'Bloqué' au CHECK de stocks.statut.
--   §4 — Crée fn_auto_block_expired_lots() SECURITY DEFINER :
--         bascule en 'Bloqué' tous les lots dont expiry_date < CURRENT_DATE.
--   §5 — Trigger BEFORE INSERT sur goods_receipt_items : bloc immédiat
--         si un lot est réceptionné avec une DLC déjà dépassée.
--   §6 — Planifie le job pg_cron quotidien (00:05 UTC).
--   §7 — Crée la vue v_lots_expires (alertes FEFO 30 j).
--
-- DÉPENDANCES : migrations 002, 005, 007 appliquées
--
-- STRATÉGIE :
--   Idempotente — IF NOT EXISTS / IF EXISTS sur chaque objet.
--   pg_cron doit être activé dans Supabase Dashboard → Extensions
--   avant d'appliquer le §6 (disponible sur plan Pro+).
-- ================================================================


-- ================================================================
-- §1  QUALITY_INSPECTION_LOTS — Remplacement 'Rejeté' → 'Bloqué'
-- ================================================================

-- 1.1  Migrer les données existantes (idempotent)
UPDATE quality_inspection_lots
SET    status = 'Bloqué'
WHERE  status = 'Rejeté';

-- 1.2  Remplacer le CHECK constraint
--      Le nom auto-généré par PostgreSQL est quality_inspection_lots_status_check.
--      On le supprime proprement avant de recréer.
ALTER TABLE quality_inspection_lots
  DROP CONSTRAINT IF EXISTS quality_inspection_lots_status_check;

ALTER TABLE quality_inspection_lots
  ADD CONSTRAINT quality_inspection_lots_status_check
    CHECK (status IN ('En contrôle', 'Libéré', 'Bloqué'));

-- 1.3  Mettre à jour la valeur par défaut (déjà 'En contrôle', mais on confirme)
ALTER TABLE quality_inspection_lots
  ALTER COLUMN status SET DEFAULT 'En contrôle';

-- 1.4  Mettre à jour la RLS : autoriser Libéré → Bloqué (rappel, contamination)
--      Un lot 'Bloqué' reste immutable (décision finale — audit trail).
DROP POLICY IF EXISTS "qil_org_update" ON quality_inspection_lots;
CREATE POLICY "qil_org_update" ON quality_inspection_lots FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND status IN ('En contrôle', 'Libéré')
    -- 'Bloqué' → immuable : seul fn_auto_block_expired_lots() (SECURITY DEFINER) peut forcer
  );

-- 1.5  Mettre à jour les commentaires
COMMENT ON COLUMN quality_inspection_lots.status IS
  'En contrôle = inspection en cours (QA11 pending) | '
  'Libéré = lot accepté, stock débloqué (unrestricted use) | '
  'Bloqué = lot interdit d''utilisation : DLC dépassée, non-conforme ou rappel. '
  'Transition immuable (pas de retour en arrière possible).';


-- ================================================================
-- §2  GOODS_RECEIPT_ITEMS — Ajout quality_status (dénormalisé)
-- ================================================================
-- Permet des requêtes FEFO/FIFO et des alertes sans JOIN vers
-- quality_inspection_lots. Mis à jour par trigger et par le job cron.

ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS quality_status VARCHAR(30)
    NOT NULL DEFAULT 'En contrôle'
    CHECK (quality_status IN ('En contrôle', 'Libéré', 'Bloqué'));

COMMENT ON COLUMN goods_receipt_items.quality_status IS
  'Statut qualité dénormalisé — En contrôle / Libéré / Bloqué. '
  'Synchronisé depuis quality_inspection_lots ou basculé automatiquement '
  'à la DLC dépassée par fn_auto_block_expired_lots(). '
  'Permet des requêtes FEFO sans JOIN.';

-- Backfill : lots déjà réceptionnés avec DLC dépassée → Bloqué immédiatement
UPDATE goods_receipt_items
SET    quality_status = 'Bloqué'
WHERE  expiry_date    IS NOT NULL
AND    expiry_date    < CURRENT_DATE
AND    quality_status <> 'Bloqué';

-- Index pour les requêtes FEFO et l'alerte DLC
CREATE INDEX IF NOT EXISTS gri_quality_status_idx
  ON goods_receipt_items(quality_status);

-- Index composite : lots disponibles pour FEFO (Libéré, non périmé)
CREATE INDEX IF NOT EXISTS gri_fefo_idx
  ON goods_receipt_items(organization_id, article_id, expiry_date ASC)
  WHERE quality_status = 'Libéré' AND expiry_date IS NOT NULL;


-- ================================================================
-- §3  STOCKS — Ajout de 'Bloqué' au CHECK statut
-- ================================================================
-- stocks.statut représente l'état du stock article/lot sur un site.
-- 'Bloqué' = quantité immobilisée, interdite à la consommation ou
-- à l'expédition (ex. lot périmé encore en stock physique).

ALTER TABLE stocks
  DROP CONSTRAINT IF EXISTS stocks_statut_check;

ALTER TABLE stocks
  ADD CONSTRAINT stocks_statut_check
    CHECK (statut IN ('OK', 'Alerte', 'Rupture', 'Exces', 'Bloqué'));

COMMENT ON COLUMN stocks.statut IS
  'OK=stock sain | Alerte=sous le seuil d''alerte | Rupture=stock nul ou négatif | '
  'Exces=stock au-dessus du plafond | Bloqué=lot(s) immobilisé(s) (DLC/qualité).';


-- ================================================================
-- §4  FONCTION fn_auto_block_expired_lots()
-- ================================================================
-- SECURITY DEFINER : bypass RLS pour agir en job système.
-- Appelée par le job pg_cron (§6) chaque nuit à 00:05 UTC.
--
-- Ce qu'elle fait :
--   a) Bascule goods_receipt_items.quality_status = 'Bloqué'
--      pour tous les lots dont expiry_date < CURRENT_DATE.
--   b) Propage sur quality_inspection_lots liés :
--      force status = 'Bloqué', horodate decision_at, note automatique.
--   c) Émet un NOTICE pour le pg_cron log.

CREATE OR REPLACE FUNCTION fn_auto_block_expired_lots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- éviter l'injection de schema
AS $$
DECLARE
  v_gri_count  INTEGER := 0;
  v_qil_count  INTEGER := 0;
BEGIN

  -- ── a) Bloquer les lignes de réception périmées ─────────────────────────────
  UPDATE goods_receipt_items
  SET    quality_status = 'Bloqué'
  WHERE  expiry_date    IS NOT NULL
  AND    expiry_date    < CURRENT_DATE
  AND    quality_status <> 'Bloqué';

  GET DIAGNOSTICS v_gri_count = ROW_COUNT;

  -- ── b) Propager sur les lots d'inspection qualité associés ──────────────────
  --    Seuls les lots liés à une ligne GR périmée sont affectés.
  --    On ne surécrit pas un commentaire existant (COALESCE).
  UPDATE quality_inspection_lots AS qil
  SET    status            = 'Bloqué',
         decision_at       = NOW(),
         decision_comments = COALESCE(
           qil.decision_comments,
           'Bloqué automatiquement le ' || CURRENT_DATE::TEXT
             || ' : DLC/DDM dépassée.'
         )
  FROM   goods_receipt_items gri
  WHERE  qil.goods_receipt_item_id = gri.id
  AND    gri.expiry_date            IS NOT NULL
  AND    gri.expiry_date            < CURRENT_DATE
  AND    qil.status                <> 'Bloqué';

  GET DIAGNOSTICS v_qil_count = ROW_COUNT;

  -- ── c) Log ──────────────────────────────────────────────────────────────────
  RAISE NOTICE
    '[fn_auto_block_expired_lots] %  Exécuté le %. '
    'Lignes GRI bloquées : %. Lots QI propagés : %.',
    NOW()::DATE, CURRENT_DATE, v_gri_count, v_qil_count;

END;
$$;

-- Accorder l'exécution au rôle postgres (pg_cron tourne sous postgres)
GRANT EXECUTE ON FUNCTION fn_auto_block_expired_lots() TO postgres;

COMMENT ON FUNCTION fn_auto_block_expired_lots() IS
  'Job de maintenance quotidien — bascule en Bloqué tous les lots dont '
  'la DLC/DDM est dépassée. Appelé par pg_cron à 00:05 UTC. '
  'SECURITY DEFINER : bypass RLS volontaire (action système).';


-- ================================================================
-- §5  TRIGGER BEFORE INSERT — Blocage immédiat à la réception
-- ================================================================
-- Cas limite : un magasinier réceptionne un lot dont la DLC est déjà
-- dépassée (erreur de date, lot oublié dans un camion, etc.).
-- Ce trigger bascule quality_status = 'Bloqué' avant l'INSERT et
-- émet un WARNING visible dans les logs Supabase.

CREATE OR REPLACE FUNCTION fn_gri_check_expiry_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
    NEW.quality_status := 'Bloqué';
    RAISE WARNING
      '[GRI] Lot "%" — DLC dépassée (%) → quality_status forcé à Bloqué à la réception.',
      COALESCE(NEW.batch_number, 'sans numéro de lot'),
      NEW.expiry_date;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_gri_check_expiry_on_insert
    BEFORE INSERT ON goods_receipt_items
    FOR EACH ROW EXECUTE FUNCTION fn_gri_check_expiry_on_insert();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON FUNCTION fn_gri_check_expiry_on_insert() IS
  'Trigger BEFORE INSERT sur goods_receipt_items : '
  'si expiry_date < CURRENT_DATE, force quality_status = Bloqué '
  'et émet un WARNING dans les logs (lot périmé réceptionné par erreur).';


-- ================================================================
-- §6  PG_CRON — Job quotidien de blocage DLC/DDM
-- ================================================================
-- Prérequis : activer pg_cron dans Supabase Dashboard → Extensions.
-- Disponible à partir du plan Pro. Sur le plan Free, commenter ce §
-- et appeler fn_auto_block_expired_lots() depuis un cron externe
-- (GitHub Actions, Railway Cron, etc.).
--
-- Planification : chaque nuit à 00:05 UTC
--   → offset de 5 min pour laisser les jobs système Supabase se terminer.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer le job existant si la migration est rejouée (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('bluwa-block-expired-lots');
EXCEPTION WHEN OTHERS THEN NULL;  -- job inexistant ou pg_cron non disponible
END $$;

-- Planifier le job
DO $$
BEGIN
  PERFORM cron.schedule(
    'bluwa-block-expired-lots',   -- nom unique du job
    '5 0 * * *',                  -- 00:05 UTC tous les jours
    $job$ SELECT fn_auto_block_expired_lots(); $job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING
    '[Migration 011] Impossible de planifier pg_cron : %. '
    'Assurez-vous que l''extension pg_cron est activée (Dashboard → Extensions). '
    'La fonction fn_auto_block_expired_lots() reste disponible pour un appel manuel.',
    SQLERRM;
END $$;


-- ================================================================
-- §7  VUE v_lots_expires — Alertes FEFO / DLC (30 jours)
-- ================================================================
-- Expose tous les lots approchant ou ayant dépassé leur DLC.
-- Utilisée par le tableau de bord stock et les alertes qualité.
--
-- niveau_alerte :
--   PERIME   → DLC dépassée       (jours_restants < 0)
--   CRITIQUE → DLC dans ≤ 7 jours (jours_restants 0–7)
--   ALERTE   → DLC dans 8–30 jours
--
-- RLS : la vue hérite des politiques de goods_receipt_items et
-- goods_receipts — chaque tenant ne voit que ses propres lots.

DROP VIEW IF EXISTS v_lots_expires;

CREATE VIEW v_lots_expires AS
SELECT
  gri.id                                          AS gri_id,
  gri.organization_id,
  gr.factory_id,
  gri.batch_number,
  gri.article_id,
  a.sku,
  a.designation                                   AS article_designation,
  gri.expiry_date,
  (gri.expiry_date - CURRENT_DATE)::INTEGER       AS jours_restants,
  -- négatif = périmé, 0 = expire aujourd'hui, positif = jours restants
  gri.quantity_received,
  gri.quality_status,
  CASE
    WHEN gri.expiry_date < CURRENT_DATE           THEN 'PERIME'
    WHEN gri.expiry_date <= CURRENT_DATE + 7      THEN 'CRITIQUE'
    ELSE                                               'ALERTE'
  END                                             AS niveau_alerte,
  gr.received_at,
  gr.id                                           AS goods_receipt_id,
  qil.id                                          AS inspection_lot_id,
  qil.status                                      AS inspection_status
FROM       goods_receipt_items   gri
JOIN       goods_receipts        gr   ON gr.id  = gri.goods_receipt_id
JOIN       articles              a    ON a.id   = gri.article_id
LEFT JOIN  quality_inspection_lots qil ON qil.goods_receipt_item_id = gri.id
WHERE  gri.expiry_date IS NOT NULL
AND    gri.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY gri.expiry_date ASC;

COMMENT ON VIEW v_lots_expires IS
  'Lots approchant ou ayant dépassé leur DLC/DDM (fenêtre 30 jours). '
  'niveau_alerte : PERIME=DLC dépassée | CRITIQUE=≤7 j | ALERTE=8–30 j. '
  'Hérite de la RLS goods_receipt_items — isolée par tenant.';


-- ================================================================
-- FIN migration 011
-- ================================================================
