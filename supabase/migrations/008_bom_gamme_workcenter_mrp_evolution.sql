-- ================================================================
-- Migration 008 — Évolution : Nomenclatures, Gammes,
--                Postes de charge, Paramètres MRP
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Correspondances SAP :
--   bill_of_materials  → MARA + STKO (alias bom_headers + version_name)
--   bom_items          → STPO + LGPRO (scrap_factor_percentage = AUSSS)
--   work_centers       → CR03 + code poste + capacité journalière
--   routing_operations → PLPO simplifié (flat, sans en-tête séparé)
--   routing_steps      → PLPO + VGZ01 (setup_time = Rüstzeit)
--   article_stocks     → MRP1/MRP2 (safety_stock=EISBE, lead_time=WEBAZ)
--
-- DÉPENDANCES : migrations 002–007 appliquées.
--
-- STRATÉGIE :
--   Évolutive et non destructive — ALTER TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.
--   Les tables bom_headers, routing_headers, routing_steps restent intactes.
--   routing_operations est une NOUVELLE table (structure plate per-article).
-- ================================================================


-- ================================================================
-- 1. WORK_CENTERS — Ajout code opératoire + capacité + rendement
-- ================================================================
-- SAP CR03 : chaque poste a un code machine (ex. LIGNE_EMBOUTEILLAGE),
-- une capacité journalière et un taux de performance (TRS).

ALTER TABLE work_centers
  ADD COLUMN IF NOT EXISTS code VARCHAR(50),
  -- Code court du poste (ex. 'LIGNE_EMBOUTEILLAGE') — unique par site
  ADD COLUMN IF NOT EXISTS daily_capacity_hours DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
  -- Heures d'ouverture théoriques par jour (≡ Kapazität CR03)
  ADD COLUMN IF NOT EXISTS efficiency_percentage DECIMAL(5, 2) NOT NULL DEFAULT 100.00;
  -- Taux de performance réel du poste, en % (≡ TRS partiel / rendement machine)

-- Contrainte unique sur (factory_id, code) si code est renseigné
DO $$ BEGIN
  ALTER TABLE work_centers
    ADD CONSTRAINT unique_wc_code_per_factory UNIQUE (factory_id, code);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

COMMENT ON COLUMN work_centers.code                   IS 'Code court du poste (≡ CR03 SAP) : identifiant machine, ex. LIGNE_EMBOUTEILLAGE';
COMMENT ON COLUMN work_centers.daily_capacity_hours   IS 'Capacité d''ouverture journalière en heures (ex. 8.00 = 1 équipe × 8h)';
COMMENT ON COLUMN work_centers.efficiency_percentage  IS 'Taux de performance / rendement du poste en % (100 = pas de perte, 85 = 15% de pertes TRS)';

-- Création index sur le code
CREATE INDEX IF NOT EXISTS wc_code_idx ON work_centers(factory_id, code) WHERE code IS NOT NULL;


-- ================================================================
-- 2. BOM_HEADERS — Ajout version_name + base_quantity (aliases)
-- ================================================================
-- SAP PP-CS10 : version_name = STLAL (alternative BOM)
--              base_quantity = BMENG (base quantity)

ALTER TABLE bom_headers
  ADD COLUMN IF NOT EXISTS version_name VARCHAR(100),
  -- Nom lisible de la version (ex. 'Recette Standard', 'Recette Export')
  ADD COLUMN IF NOT EXISTS base_quantity DECIMAL(15, 4);
  -- Quantité de base de référence (alias de batch_size, pour cohérence avec bom_items)

-- Backfill version_name depuis version existante
UPDATE bom_headers
  SET version_name = version
  WHERE version_name IS NULL;

-- Backfill base_quantity depuis batch_size existante
UPDATE bom_headers
  SET base_quantity = batch_size
  WHERE base_quantity IS NULL;

COMMENT ON COLUMN bom_headers.version_name IS 'Nom de version lisible (ex. "Recette Standard") — complément de version (v1.0)';
COMMENT ON COLUMN bom_headers.base_quantity IS 'Quantité de référence pour les postes BOM (≡ BMENG SAP) — alias de batch_size';


-- ================================================================
-- 3. BOM_ITEMS — Ajout scrap_factor_percentage (alias scrap_pct)
-- ================================================================
-- SAP STPO : AUSSS = Scrap factor (% de perte planifiée)
-- Note : scrap_pct existe déjà en migration 006.
--        scrap_factor_percentage est ajouté comme colonne générée
--        pour alignement avec la nomenclature SAP.

ALTER TABLE bom_items
  ADD COLUMN IF NOT EXISTS scrap_factor_percentage DECIMAL(5, 2)
    GENERATED ALWAYS AS (scrap_pct) STORED;
  -- Vue calculée : identique à scrap_pct (pertes planifiées en %)

COMMENT ON COLUMN bom_items.scrap_factor_percentage IS 'Colonne calculée (= scrap_pct) — % de perte matière planifié (≡ AUSSS SAP STPO)';


-- ================================================================
-- 4. ROUTING_STEPS — Ajout setup_time + run_time_per_unit
-- ================================================================
-- SAP PLPO : VGZ01=Rüstzeit (setup), VGZ02=Maschinenzeit (run/unit)

ALTER TABLE routing_steps
  ADD COLUMN IF NOT EXISTS setup_time_minutes DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  -- Temps de réglage machine avant démarrage de l'opération (≡ Rüstzeit SAP)
  ADD COLUMN IF NOT EXISTS run_time_minutes_per_unit DECIMAL(10, 4);
  -- Temps de fabrication par unité de PF (≡ Maschinenzeit SAP)
  -- Calculé : duration_min / bom.batch_size — mis à jour par l'application

COMMENT ON COLUMN routing_steps.setup_time_minutes       IS 'Temps de réglage machine avant l''opération, en minutes (≡ Rüstzeit / VGZ01 SAP PLPO)';
COMMENT ON COLUMN routing_steps.run_time_minutes_per_unit IS 'Temps machine par unité de PF, en minutes (≡ Maschinenzeit / VGZ02 SAP PLPO). Calculé = duration_min / batch_size.';

-- Backfill run_time_minutes_per_unit depuis duration_min (lot=100 par défaut)
UPDATE routing_steps
  SET run_time_minutes_per_unit = ROUND(duration_min::DECIMAL / 100, 4)
  WHERE run_time_minutes_per_unit IS NULL;


-- ================================================================
-- 5. ROUTING_OPERATIONS — Table plate per-article (SAP PLPO simplifié)
-- ================================================================
-- Alternative à routing_headers + routing_steps pour les articles
-- simples : une seule table, référencée directement par article_id.
-- Utilisée notamment pour le calcul de coût gamme (CO-PC).
--
-- Coexiste avec routing_headers/steps — les deux structures sont valides.
-- La préférence applicative est définie par la couche service.

CREATE TABLE IF NOT EXISTS routing_operations (
  id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id               UUID           NOT NULL REFERENCES articles(id)      ON DELETE CASCADE,
  -- Lié directement à l'article (pas de header séparé)

  operation_sequence       INT            NOT NULL CHECK (operation_sequence > 0),
  -- 10, 20, 30 … (même convention SAP)

  work_center_id           UUID           REFERENCES work_centers(id)           ON DELETE RESTRICT,
  -- Poste de charge associé (fournit le taux horaire pour le coût gamme)

  setup_time_minutes       DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  -- Temps de réglage avant démarrage (≡ Rüstzeit / VGZ01 SAP)

  run_time_minutes_per_unit DECIMAL(10, 4) NOT NULL,
  -- Temps machine par unité de PF (≡ Maschinenzeit / VGZ02 SAP)

  description              VARCHAR(255),
  -- Libellé de l'opération (ex. 'Macération hibiscus', 'Embouteillage')

  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),

  CONSTRAINT unique_op_sequence_per_article UNIQUE (article_id, operation_sequence)
);

COMMENT ON TABLE  routing_operations                        IS 'Gamme plate per-article (≡ PLPO SAP simplifié). Alternative à routing_headers + routing_steps pour articles simples.';
COMMENT ON COLUMN routing_operations.operation_sequence     IS 'Séquence de l''opération : 10, 20, 30 … (convention SAP)';
COMMENT ON COLUMN routing_operations.setup_time_minutes     IS 'Rüstzeit : temps de réglage machine avant démarrage (minutes)';
COMMENT ON COLUMN routing_operations.run_time_minutes_per_unit IS 'Maschinenzeit : temps machine par unité de PF (minutes)';

ALTER TABLE routing_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ro_org_select" ON routing_operations;
DROP POLICY IF EXISTS "ro_org_insert" ON routing_operations;
DROP POLICY IF EXISTS "ro_org_update" ON routing_operations;
DROP POLICY IF EXISTS "ro_org_delete" ON routing_operations;

CREATE POLICY "ro_org_select" ON routing_operations FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ro_org_insert" ON routing_operations FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ro_org_update" ON routing_operations FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ro_org_delete" ON routing_operations FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS ro_org_idx     ON routing_operations(organization_id);
CREATE INDEX IF NOT EXISTS ro_article_idx ON routing_operations(article_id);
CREATE INDEX IF NOT EXISTS ro_wc_idx      ON routing_operations(work_center_id) WHERE work_center_id IS NOT NULL;


-- ================================================================
-- 6. ARTICLE_STOCKS — Paramètres MRP (MRP1 / MRP2 SAP)
-- ================================================================
-- SAP MRP1 :
--   EISBE = safety_stock (stock de sécurité)
--   MINBE = reorder_point (point de commande)
-- SAP MRP2 :
--   WEBAZ = lead_time_days (délai d'approvisionnement fournisseur)
--   DISMM = mrp_type
--     'PD' = MRP classique (calcul besoins nets)
--     'VB' = Réapprovisionnement par point de commande
--     'ND' = Sans MRP (gestion manuelle)

ALTER TABLE article_stocks
  ADD COLUMN IF NOT EXISTS safety_stock  DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS lead_time_days INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mrp_type      VARCHAR(10)   NOT NULL DEFAULT 'PD'
    CHECK (mrp_type IN ('PD', 'VB', 'ND'));

COMMENT ON COLUMN article_stocks.safety_stock   IS 'Stock de sécurité (≡ EISBE SAP MRP1) — quantité minimale à maintenir en stock';
COMMENT ON COLUMN article_stocks.reorder_point  IS 'Point de commande (≡ MINBE SAP MRP1) — seuil déclenchant une demande d''achat (mode VB)';
COMMENT ON COLUMN article_stocks.lead_time_days IS 'Délai d''approvisionnement fournisseur en jours (≡ WEBAZ SAP MRP2)';
COMMENT ON COLUMN article_stocks.mrp_type       IS 'Mode de planification MRP (≡ DISMM SAP) : PD=MRP classique | VB=Point commande | ND=Manuel';

CREATE INDEX IF NOT EXISTS as_mrp_type_idx ON article_stocks(mrp_type);


-- ================================================================
-- FIN migration 008
-- ================================================================
