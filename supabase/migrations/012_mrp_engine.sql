-- ================================================================
-- Migration 012 — Moteur MRP : Runs & Recommandations
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Correspondances SAP PP-MRP :
--   mrp_runs             → MD01 / MDRE  (journal des passes MRP)
--   mrp_recommendations  → MDTB         (tableau des besoins MRP)
--
-- Philosophie :
--   Le moteur MRP écrit ici ses résultats de façon immuable.
--   Chaque passe génère un mrp_run + N recommandations.
--   La gérante valide (CONVERTED) ou rejette (IGNORED) chaque alerte.
--   Les recommandations converties créent automatiquement une DA ou un OF
--   (traçabilité via linked_purchase_requisition_id / linked_production_order_id).
--
-- DÉPENDANCES : migrations 003, 004, 009 appliquées
--   (organizations, factories, articles, purchase_requisitions, production_orders)
--
-- STRATÉGIE :
--   Idempotente — CREATE TABLE IF NOT EXISTS.
--   DROP POLICY IF EXISTS avant chaque CREATE POLICY.
--   Triggers protégés par EXCEPTION WHEN duplicate_object.
-- ================================================================


-- ================================================================
-- 1. MRP_RUNS — Journal des passes de calcul (SAP MD01 / MDRE)
-- ================================================================
-- Enregistre chaque exécution du moteur MRP.
-- Une passe couvre toujours une usine (factory_id) complète.
--
-- Cycle de vie :
--   RUNNING  → Passe en cours (calcul asynchrone)
--   SUCCESS  → Passe terminée, recommandations générées
--   FAILED   → Erreur fatale (logs dans mrp_run_errors — table future)
--
-- Les enregistrements sont IMMUABLES une fois en SUCCESS ou FAILED :
-- la RLS UPDATE bloque toute modification (audit trail garanti).
-- Pour rejouer le MRP, créer un nouveau mrp_run.

CREATE TABLE IF NOT EXISTS mrp_runs (
    id              UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID                     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    factory_id      UUID                     NOT NULL REFERENCES factories(id)     ON DELETE RESTRICT,
    -- Quelle usine a été recalculée

    executed_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    -- Horodatage de lancement (UTC) — indexé pour retrouver la dernière passe

    executed_by_system BOOLEAN               NOT NULL DEFAULT TRUE,
    -- TRUE  = Planificateur automatique (pg_cron, GitHub Action, etc.)
    -- FALSE = Déclenchement manuel par la gérante

    status          VARCHAR(30)              NOT NULL DEFAULT 'RUNNING'
                      CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED'))
    -- RUNNING  = en cours (calcul asynchrone)
    -- SUCCESS  = terminé, mrp_recommendations disponibles
    -- FAILED   = erreur fatale dans le moteur
);

ALTER TABLE mrp_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mrp_runs_org_select" ON mrp_runs;
DROP POLICY IF EXISTS "mrp_runs_org_insert" ON mrp_runs;
DROP POLICY IF EXISTS "mrp_runs_org_update" ON mrp_runs;

CREATE POLICY "mrp_runs_org_select" ON mrp_runs FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "mrp_runs_org_insert" ON mrp_runs FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- UPDATE autorisé uniquement sur les runs RUNNING (passage → SUCCESS ou FAILED)
-- Un run SUCCESS ou FAILED est immuable (audit trail).
CREATE POLICY "mrp_runs_org_update" ON mrp_runs FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND status = 'RUNNING'
  );

-- Pas de DELETE RLS : les runs sont conservés pour audit ; suppression interdite côté app.

-- Index organisation (liste des runs d'un tenant)
CREATE INDEX IF NOT EXISTS mrp_runs_org_idx
  ON mrp_runs(organization_id);

-- Index usine (filtrer par site)
CREATE INDEX IF NOT EXISTS mrp_runs_factory_idx
  ON mrp_runs(factory_id);

-- Index composite : dernière passe par usine (ORDER BY executed_at DESC LIMIT 1)
CREATE INDEX IF NOT EXISTS mrp_runs_latest_idx
  ON mrp_runs(factory_id, executed_at DESC);

-- Index statut (retrouver les runs RUNNING en cours)
CREATE INDEX IF NOT EXISTS mrp_runs_status_idx
  ON mrp_runs(organization_id, status)
  WHERE status = 'RUNNING';

COMMENT ON TABLE mrp_runs IS
  'Journal des passes MRP (≡ MD01/MDRE SAP). '
  'Chaque enregistrement représente une exécution complète du moteur MRP sur un site. '
  'Les runs SUCCESS et FAILED sont immuables (audit trail).';

COMMENT ON COLUMN mrp_runs.executed_at          IS 'Horodatage UTC de lancement de la passe MRP';
COMMENT ON COLUMN mrp_runs.executed_by_system    IS 'TRUE = planificateur automatique | FALSE = déclenchement manuel par l''utilisateur';
COMMENT ON COLUMN mrp_runs.status                IS 'RUNNING=calcul en cours | SUCCESS=terminé, recommandations disponibles | FAILED=erreur fatale';


-- ================================================================
-- 2. MRP_RECOMMENDATIONS — Alertes & Ordres proposés (SAP MDTB)
-- ================================================================
-- Résultats du moteur MRP : chaque ligne est une recommandation
-- d'action pour couvrir un besoin net détecté (rupture anticipée).
--
-- Types d'actions :
--   BUY      → Créer une DA (purchase_requisition) → BC/BA
--   PRODUCE  → Créer un OF (production_order)
--   EXPEDITE → Avancer la date de livraison d'un BC existant
--
-- Cycle de vie (statut) :
--   NEW       → Alerte non lue, en attente de décision
--   CONVERTED → Validée — une DA ou un OF a été créé (FK liées)
--   IGNORED   → Rejetée consciemment par la gérante
--
-- Immuabilité :
--   Une recommandation CONVERTED ou IGNORED ne peut plus être modifiée
--   (décision irréversible — traçabilité achats & production).

CREATE TABLE IF NOT EXISTS mrp_recommendations (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID           NOT NULL REFERENCES organizations(id)          ON DELETE CASCADE,
    factory_id      UUID           NOT NULL REFERENCES factories(id)               ON DELETE RESTRICT,
    mrp_run_id      UUID           NOT NULL REFERENCES mrp_runs(id)               ON DELETE CASCADE,
    -- Passe MRP qui a généré cette recommandation
    article_id      UUID           NOT NULL REFERENCES articles(id)               ON DELETE RESTRICT,
    -- Article en danger de rupture

    -- ── Ce que le moteur recommande ──────────────────────────────────────────
    action_type         VARCHAR(50)    NOT NULL
                          CHECK (action_type IN ('BUY', 'PRODUCE', 'EXPEDITE')),
    -- BUY=Acheter | PRODUCE=Fabriquer | EXPEDITE=Avancer livraison BC existant

    suggested_quantity  DECIMAL(15, 4) NOT NULL CHECK (suggested_quantity > 0),
    -- Quantité exacte à commander / produire pour repasser au-dessus du stock de sécurité

    suggested_order_date DATE          NOT NULL,
    -- Date limite à laquelle la gérante doit valider l'action
    -- Au-delà de cette date, la couverture du besoin ne sera plus garantie

    required_date       DATE           NOT NULL,
    -- Date impérative à laquelle la matière/le PF doit être disponible
    -- Une rupture est confirmée si aucune action n'est prise avant cette date

    -- ── Statut de la décision humaine ────────────────────────────────────────
    status              VARCHAR(30)    NOT NULL DEFAULT 'NEW'
                          CHECK (status IN ('NEW', 'CONVERTED', 'IGNORED')),

    -- ── Traçabilité de la conversion ─────────────────────────────────────────
    linked_purchase_requisition_id UUID
      REFERENCES purchase_requisitions(id) ON DELETE SET NULL,
    -- Renseigné si action_type = 'BUY' et status = 'CONVERTED'

    linked_production_order_id     UUID
      REFERENCES production_orders(id) ON DELETE SET NULL,
    -- Renseigné si action_type = 'PRODUCE' et status = 'CONVERTED'

    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    -- updated_at mis à jour lors du passage NEW → CONVERTED/IGNORED

    CONSTRAINT mrp_rec_dates_coherence
      CHECK (required_date >= suggested_order_date)
    -- La date requise est toujours ≥ la date de commande suggérée
);

ALTER TABLE mrp_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mrp_rec_org_select" ON mrp_recommendations;
DROP POLICY IF EXISTS "mrp_rec_org_insert" ON mrp_recommendations;
DROP POLICY IF EXISTS "mrp_rec_org_update" ON mrp_recommendations;

CREATE POLICY "mrp_rec_org_select" ON mrp_recommendations FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "mrp_rec_org_insert" ON mrp_recommendations FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- UPDATE autorisé uniquement sur les recommandations NEW
-- Une fois CONVERTED ou IGNORED, la décision est immuable.
CREATE POLICY "mrp_rec_org_update" ON mrp_recommendations FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND status = 'NEW'
  );

-- Pas de DELETE RLS : les recommandations sont conservées pour audit.

-- Index organisation
CREATE INDEX IF NOT EXISTS mrp_rec_org_idx
  ON mrp_recommendations(organization_id);

-- Index usine
CREATE INDEX IF NOT EXISTS mrp_rec_factory_idx
  ON mrp_recommendations(factory_id);

-- Index run (toutes les recs d'une passe donnée)
CREATE INDEX IF NOT EXISTS mrp_rec_run_idx
  ON mrp_recommendations(mrp_run_id);

-- Index article (retrouver les alertes d'un composant)
CREATE INDEX IF NOT EXISTS mrp_rec_article_idx
  ON mrp_recommendations(article_id);

-- Index statut (filtrer les alertes NEW en attente de décision — requête principale)
CREATE INDEX IF NOT EXISTS mrp_rec_status_idx
  ON mrp_recommendations(organization_id, status)
  WHERE status = 'NEW';

-- Index composite tableau de bord : alertes NEW d'un site, triées par urgence
CREATE INDEX IF NOT EXISTS mrp_rec_dashboard_idx
  ON mrp_recommendations(factory_id, status, required_date ASC)
  WHERE status = 'NEW';

-- Index type d'action (filtrer BUY/PRODUCE/EXPEDITE)
CREATE INDEX IF NOT EXISTS mrp_rec_action_idx
  ON mrp_recommendations(organization_id, action_type);

-- Index conversion DA (retrouver la reco depuis une DA)
CREATE INDEX IF NOT EXISTS mrp_rec_preq_idx
  ON mrp_recommendations(linked_purchase_requisition_id)
  WHERE linked_purchase_requisition_id IS NOT NULL;

-- Index conversion OF (retrouver la reco depuis un OF)
CREATE INDEX IF NOT EXISTS mrp_rec_prod_idx
  ON mrp_recommendations(linked_production_order_id)
  WHERE linked_production_order_id IS NOT NULL;

-- Trigger updated_at (passage NEW → CONVERTED / IGNORED)
DO $$ BEGIN
  CREATE TRIGGER mrp_rec_updated_at
    BEFORE UPDATE ON mrp_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE mrp_recommendations IS
  'Recommandations générées par le moteur MRP (≡ MDTB SAP). '
  'Chaque ligne est une alerte d''action : BUY (créer DA), PRODUCE (créer OF) ou EXPEDITE (avancer BC). '
  'La gérante valide (CONVERTED) ou ignore (IGNORED) chaque alerte — décision immuable.';

COMMENT ON COLUMN mrp_recommendations.action_type            IS 'BUY=Acheter (→ DA) | PRODUCE=Fabriquer (→ OF) | EXPEDITE=Avancer livraison d''un BC existant';
COMMENT ON COLUMN mrp_recommendations.suggested_quantity      IS 'Quantité à commander ou produire pour couvrir le besoin net et repasser au-dessus du stock de sécurité';
COMMENT ON COLUMN mrp_recommendations.suggested_order_date    IS 'Date limite de passage de la commande/lancement OF. Au-delà : rupture garantie.';
COMMENT ON COLUMN mrp_recommendations.required_date           IS 'Date impérative de disponibilité en stock. Rupture confirmée si aucune action avant cette date.';
COMMENT ON COLUMN mrp_recommendations.status                  IS 'NEW=en attente de décision | CONVERTED=validée (DA ou OF créé) | IGNORED=rejetée par la gérante. CONVERTED/IGNORED sont immuables.';
COMMENT ON COLUMN mrp_recommendations.linked_purchase_requisition_id IS 'FK vers la DA créée lors de la conversion (action_type=BUY)';
COMMENT ON COLUMN mrp_recommendations.linked_production_order_id     IS 'FK vers l''OF créé lors de la conversion (action_type=PRODUCE)';


-- ================================================================
-- FIN migration 012
-- ================================================================
