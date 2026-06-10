-- ============================================================
-- Bluwa ERP — HACCP
-- Migration 022 — Plan HACCP, Analyse des dangers, PCC,
--                 Surveillance opérationnelle, NC Qualité
-- ============================================================

-- ================================================================
-- §1  TABLES
-- ================================================================

-- ── 1. Plan HACCP ─────────────────────────────────────────────────────────────
-- Un plan par site (factory). Versionné : un seul statut 'active' par factory.

CREATE TABLE IF NOT EXISTS haccp_plans (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id        UUID        NOT NULL REFERENCES factories(id)     ON DELETE CASCADE,
  version           TEXT        NOT NULL DEFAULT '1.0',
  scope             TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'active', 'archived')),
  revised_at        DATE,
  revised_by        TEXT,
  approved_by       TEXT,
  next_revision_date DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  haccp_plans            IS 'En-tête du plan HACCP par site — versionné et approuvé par la direction qualité';
COMMENT ON COLUMN haccp_plans.scope      IS 'Périmètre couvert : ex. "Production jus de fruits — ligne principale"';
COMMENT ON COLUMN haccp_plans.status     IS 'draft=en préparation, active=en vigueur, archived=remplacé par une version plus récente';

DO $$ BEGIN
  CREATE TRIGGER trg_haccp_plans_updated_at
    BEFORE UPDATE ON haccp_plans
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_haccp_plans_factory ON haccp_plans(factory_id);
CREATE INDEX IF NOT EXISTS idx_haccp_plans_status  ON haccp_plans(status);


-- ── 2. Étapes du flux de process ──────────────────────────────────────────────
-- Chaque ligne = une étape du diagramme de flux (réception, cuisson, emballage…).
-- Lien optionnel vers work_centers pour rattacher à un poste de charge existant.

CREATE TABLE IF NOT EXISTS haccp_process_steps (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID        NOT NULL REFERENCES haccp_plans(id)   ON DELETE CASCADE,
  factory_id      UUID        NOT NULL REFERENCES factories(id)     ON DELETE CASCADE,
  order_seq       SMALLINT    NOT NULL CHECK (order_seq > 0),
  name            TEXT        NOT NULL,
  description     TEXT,
  work_center_id  UUID        REFERENCES work_centers(id) ON DELETE SET NULL,
  has_ccp         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_haccp_step_order UNIQUE (plan_id, order_seq)
);

COMMENT ON TABLE  haccp_process_steps             IS 'Étapes ordonnées du diagramme de flux du plan HACCP';
COMMENT ON COLUMN haccp_process_steps.order_seq   IS 'Numéro d''ordre de l''étape dans le flux (1 = première étape)';
COMMENT ON COLUMN haccp_process_steps.work_center_id IS 'Lien optionnel vers le poste de charge correspondant dans le MES';
COMMENT ON COLUMN haccp_process_steps.has_ccp     IS 'True si un PCC est associé à cette étape — calculé depuis haccp_ccp';

DO $$ BEGIN
  CREATE TRIGGER trg_haccp_steps_updated_at
    BEFORE UPDATE ON haccp_process_steps
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_haccp_steps_plan    ON haccp_process_steps(plan_id);
CREATE INDEX IF NOT EXISTS idx_haccp_steps_factory ON haccp_process_steps(factory_id);


-- ── 3. Analyse des dangers ────────────────────────────────────────────────────
-- Un ou plusieurs dangers par étape. Cotation G × P → décision PCC.

CREATE TABLE IF NOT EXISTS haccp_hazards (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id           UUID        NOT NULL REFERENCES haccp_process_steps(id) ON DELETE CASCADE,
  plan_id           UUID        NOT NULL REFERENCES haccp_plans(id)         ON DELETE CASCADE,
  factory_id        UUID        NOT NULL REFERENCES factories(id)            ON DELETE CASCADE,
  hazard_type       TEXT        NOT NULL CHECK (hazard_type IN ('B', 'C', 'P')),
  hazard_description TEXT       NOT NULL,
  gravity           SMALLINT    NOT NULL CHECK (gravity BETWEEN 1 AND 3),
  probability       SMALLINT    NOT NULL CHECK (probability BETWEEN 1 AND 3),
  control_measure   TEXT        NOT NULL,
  is_ccp            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  haccp_hazards                 IS 'Analyse des dangers par étape — matrice Gravité × Probabilité';
COMMENT ON COLUMN haccp_hazards.hazard_type     IS 'B=Biologique (bactéries, moisissures), C=Chimique (pesticides, allergènes), P=Physique (corps étrangers)';
COMMENT ON COLUMN haccp_hazards.gravity         IS 'Gravité du danger : 1=faible, 2=modérée, 3=élevée';
COMMENT ON COLUMN haccp_hazards.probability     IS 'Probabilité d''occurrence : 1=faible, 2=modérée, 3=élevée';
COMMENT ON COLUMN haccp_hazards.is_ccp          IS 'True si ce danger est maîtrisé par un PCC (score G×P ≥ 7 en général)';

DO $$ BEGIN
  CREATE TRIGGER trg_haccp_hazards_updated_at
    BEFORE UPDATE ON haccp_hazards
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_haccp_hazards_step    ON haccp_hazards(step_id);
CREATE INDEX IF NOT EXISTS idx_haccp_hazards_plan    ON haccp_hazards(plan_id);
CREATE INDEX IF NOT EXISTS idx_haccp_hazards_factory ON haccp_hazards(factory_id);
CREATE INDEX IF NOT EXISTS idx_haccp_hazards_type    ON haccp_hazards(hazard_type);


-- ── 4. Points Critiques de Contrôle (PCC) ────────────────────────────────────
-- Référentiel opérationnel : limite critique, méthode, responsable, action corrective.

CREATE TABLE IF NOT EXISTS haccp_ccp (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id              UUID        NOT NULL REFERENCES haccp_plans(id)         ON DELETE CASCADE,
  step_id              UUID        NOT NULL REFERENCES haccp_process_steps(id) ON DELETE CASCADE,
  factory_id           UUID        NOT NULL REFERENCES factories(id)            ON DELETE CASCADE,
  pcc_number           TEXT        NOT NULL,
  hazard_type          TEXT        NOT NULL CHECK (hazard_type IN ('B', 'C', 'P')),
  hazard_description   TEXT        NOT NULL,
  critical_limit       TEXT        NOT NULL,
  monitoring_method    TEXT        NOT NULL,
  monitoring_frequency TEXT        NOT NULL,
  responsible          TEXT        NOT NULL,
  corrective_action    TEXT        NOT NULL,
  verification_method  TEXT        NOT NULL,
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pcc_number_per_plan UNIQUE (plan_id, pcc_number)
);

COMMENT ON TABLE  haccp_ccp                      IS 'Points Critiques de Contrôle — référentiel HACCP opérationnel par plan';
COMMENT ON COLUMN haccp_ccp.pcc_number           IS 'Identifiant du PCC : PCC 1, PCC 2… — unique par plan';
COMMENT ON COLUMN haccp_ccp.critical_limit       IS 'Valeur ou plage limite à ne pas dépasser (ex. T° ≥ 85°C pendant ≥ 15 s)';
COMMENT ON COLUMN haccp_ccp.monitoring_frequency IS 'Fréquence de surveillance requise (ex. "Continu", "Toutes les 30 min", "Chaque livraison")';
COMMENT ON COLUMN haccp_ccp.responsible          IS 'Poste responsable de la surveillance (ex. "Opérateur Pasteurisation")';
COMMENT ON COLUMN haccp_ccp.is_active            IS 'False si le PCC a été désactivé lors d''une révision du plan sans être supprimé';

DO $$ BEGIN
  CREATE TRIGGER trg_haccp_ccp_updated_at
    BEFORE UPDATE ON haccp_ccp
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_haccp_ccp_plan    ON haccp_ccp(plan_id);
CREATE INDEX IF NOT EXISTS idx_haccp_ccp_step    ON haccp_ccp(step_id);
CREATE INDEX IF NOT EXISTS idx_haccp_ccp_factory ON haccp_ccp(factory_id);
CREATE INDEX IF NOT EXISTS idx_haccp_ccp_active  ON haccp_ccp(is_active) WHERE is_active = TRUE;


-- ── 5. Enregistrements de surveillance ───────────────────────────────────────
-- Une ligne par mesure de terrain sur un PCC. Lien optionnel vers OF ou réception.

CREATE TABLE IF NOT EXISTS haccp_monitoring_records (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id               UUID        NOT NULL REFERENCES haccp_ccp(id)           ON DELETE CASCADE,
  factory_id           UUID        NOT NULL REFERENCES factories(id)            ON DELETE CASCADE,
  recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  measured_value       NUMERIC,
  unit                 TEXT,
  raw_observation      TEXT,
  is_within_limit      BOOLEAN     NOT NULL,
  deviation_details    TEXT,
  operator_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  production_order_id  UUID,
  goods_receipt_id     UUID,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  haccp_monitoring_records                  IS 'Enregistrements terrain de surveillance des PCC — un enregistrement par mesure';
COMMENT ON COLUMN haccp_monitoring_records.measured_value   IS 'Valeur numérique mesurée (ex. 87.3 pour 87,3°C). NULL si observation qualitative (raw_observation)';
COMMENT ON COLUMN haccp_monitoring_records.raw_observation  IS 'Observation qualitative quand la mesure n''est pas numérique (ex. "Lot conforme à l''inspection visuelle")';
COMMENT ON COLUMN haccp_monitoring_records.is_within_limit  IS 'False = déviation de la limite critique → déclenche une action corrective obligatoire';
COMMENT ON COLUMN haccp_monitoring_records.production_order_id IS 'OF associé à la mesure (PCC en cours de production)';
COMMENT ON COLUMN haccp_monitoring_records.goods_receipt_id    IS 'Réception associée à la mesure (PCC à réception MP)';

CREATE INDEX IF NOT EXISTS idx_haccp_mon_ccp     ON haccp_monitoring_records(ccp_id);
CREATE INDEX IF NOT EXISTS idx_haccp_mon_factory ON haccp_monitoring_records(factory_id);
CREATE INDEX IF NOT EXISTS idx_haccp_mon_date    ON haccp_monitoring_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_haccp_mon_deviat  ON haccp_monitoring_records(is_within_limit) WHERE is_within_limit = FALSE;


-- ── 6. Actions correctives HACCP ──────────────────────────────────────────────
-- Déclenchée automatiquement quand is_within_limit = FALSE sur un enregistrement.
-- Note : non_conformite_id est ajouté via ALTER TABLE après création de quality_non_conformites
--        (dépendance circulaire résolue par FK différée).

CREATE TABLE IF NOT EXISTS haccp_corrective_actions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_record_id  UUID        NOT NULL REFERENCES haccp_monitoring_records(id) ON DELETE CASCADE,
  ccp_id                UUID        NOT NULL REFERENCES haccp_ccp(id)                ON DELETE CASCADE,
  factory_id            UUID        NOT NULL REFERENCES factories(id)                ON DELETE CASCADE,
  triggered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_description    TEXT        NOT NULL,
  root_cause            TEXT,
  resolved_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at           TIMESTAMPTZ,
  is_resolved           BOOLEAN     NOT NULL DEFAULT FALSE,
  lot_blocked           BOOLEAN     NOT NULL DEFAULT FALSE,
  non_conformite_id     UUID,
  stock_movement_id     UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  haccp_corrective_actions                     IS 'Actions correctives déclenchées lors d''une déviation de limite critique PCC';
COMMENT ON COLUMN haccp_corrective_actions.lot_blocked         IS 'True si le lot en cours a été mis en quarantaine suite à la déviation';
COMMENT ON COLUMN haccp_corrective_actions.non_conformite_id   IS 'NC créée dans quality_non_conformites si la déviation génère une non-conformité formelle';
COMMENT ON COLUMN haccp_corrective_actions.stock_movement_id   IS 'Mouvement de stock lié (ex. rebut ou retour fournisseur déclenché par l''action)';

DO $$ BEGIN
  CREATE TRIGGER trg_haccp_ca_updated_at
    BEFORE UPDATE ON haccp_corrective_actions
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_haccp_ca_record  ON haccp_corrective_actions(monitoring_record_id);
CREATE INDEX IF NOT EXISTS idx_haccp_ca_ccp     ON haccp_corrective_actions(ccp_id);
CREATE INDEX IF NOT EXISTS idx_haccp_ca_factory ON haccp_corrective_actions(factory_id);
CREATE INDEX IF NOT EXISTS idx_haccp_ca_open    ON haccp_corrective_actions(is_resolved) WHERE is_resolved = FALSE;


-- ── 7. Non-Conformités Qualité ────────────────────────────────────────────────
-- Registre centralisé des NC — alimenté par le Centre de Libération (rejet de lot)
-- et par les actions correctives HACCP (dépassement limite critique PCC).

CREATE TABLE IF NOT EXISTS quality_non_conformites (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id               UUID        NOT NULL REFERENCES factories(id)     ON DELETE CASCADE,
  nc_number                TEXT        NOT NULL,
  quality_inspection_lot_id UUID       REFERENCES quality_inspection_lots(id) ON DELETE SET NULL,
  article_id               UUID        REFERENCES articles(id) ON DELETE SET NULL,
  batch_number             TEXT,
  flux                     TEXT        NOT NULL CHECK (flux IN ('Reception', 'Production', 'HACCP')),
  origine                  TEXT,
  defect_type              TEXT        NOT NULL
                             CHECK (defect_type IN (
                               'HUMIDITY_TOO_HIGH', 'FOREIGN_BODY', 'DAMAGED_PACKAGING',
                               'EXPIRED', 'CCP_DEVIATION', 'MICROBIOLOGICAL', 'CHEMICAL',
                               'PHYSICAL', 'OTHER'
                             )),
  description              TEXT        NOT NULL,
  severity                 TEXT        NOT NULL DEFAULT 'MAJOR'
                             CHECK (severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
  status                   TEXT        NOT NULL DEFAULT 'OPEN'
                             CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED')),
  disposition_action       TEXT        NOT NULL DEFAULT 'UNDER_REVIEW'
                             CHECK (disposition_action IN (
                               'UNDER_REVIEW', 'RETURN_TO_SUPPLIER',
                               'DESTROYED', 'ACCEPTED_WITH_DISCOUNT'
                             )),
  financial_claim_xof      NUMERIC,
  evidence_urls            TEXT[]      DEFAULT '{}',
  reported_by              UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_by              UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes         TEXT,
  resolved_at              TIMESTAMPTZ,
  goods_receipt_id         UUID,
  production_order_id      UUID,
  haccp_corrective_action_id UUID      REFERENCES haccp_corrective_actions(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_nc_number_per_factory UNIQUE (factory_id, nc_number)
);

-- FK différée : haccp_corrective_actions.non_conformite_id → quality_non_conformites
-- (les deux tables existant maintenant, on peut ajouter la contrainte)
ALTER TABLE haccp_corrective_actions
  ADD CONSTRAINT IF NOT EXISTS fk_hca_non_conformite
  FOREIGN KEY (non_conformite_id)
  REFERENCES quality_non_conformites(id)
  ON DELETE SET NULL;

COMMENT ON TABLE  quality_non_conformites                          IS 'Registre centralisé des Non-Conformités — source : rejet lot (Centre de Libération) ou déviation PCC (HACCP)';
COMMENT ON COLUMN quality_non_conformites.nc_number               IS 'Numéro de NC unique par site — format suggéré : NC-{CODE_SITE}-{ANNEE}-{SEQUENCE}';
COMMENT ON COLUMN quality_non_conformites.flux                    IS 'Reception=rejet à la réception, Production=rejet en cours de fabrication, HACCP=déviation limite critique';
COMMENT ON COLUMN quality_non_conformites.severity                IS 'MINOR=impact limité, MAJOR=non-conformité significative, CRITICAL=risque sécurité alimentaire';
COMMENT ON COLUMN quality_non_conformites.financial_claim_xof     IS 'Montant de la réclamation financière en FCFA (pour retour fournisseur ou destruction)';
COMMENT ON COLUMN quality_non_conformites.haccp_corrective_action_id IS 'Lien vers l''action corrective HACCP qui a déclenché cette NC (déviation PCC)';

DO $$ BEGIN
  CREATE TRIGGER trg_quality_nc_updated_at
    BEFORE UPDATE ON quality_non_conformites
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_qnc_org        ON quality_non_conformites(organization_id);
CREATE INDEX IF NOT EXISTS idx_qnc_factory    ON quality_non_conformites(factory_id);
CREATE INDEX IF NOT EXISTS idx_qnc_status     ON quality_non_conformites(status);
CREATE INDEX IF NOT EXISTS idx_qnc_severity   ON quality_non_conformites(severity);
CREATE INDEX IF NOT EXISTS idx_qnc_lot        ON quality_non_conformites(quality_inspection_lot_id);
CREATE INDEX IF NOT EXISTS idx_qnc_article    ON quality_non_conformites(article_id);


-- ================================================================
-- §2  RLS
-- ================================================================

ALTER TABLE haccp_plans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_process_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_hazards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_ccp                ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_monitoring_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_non_conformites  ENABLE ROW LEVEL SECURITY;

-- ── haccp_plans ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "haccp_plans_select" ON haccp_plans;
DROP POLICY IF EXISTS "haccp_plans_insert" ON haccp_plans;
DROP POLICY IF EXISTS "haccp_plans_update" ON haccp_plans;
DROP POLICY IF EXISTS "haccp_plans_delete" ON haccp_plans;

CREATE POLICY "haccp_plans_select" ON haccp_plans FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "haccp_plans_insert" ON haccp_plans FOR INSERT WITH CHECK (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_plans_update" ON haccp_plans FOR UPDATE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_plans_delete" ON haccp_plans FOR DELETE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);

-- ── haccp_process_steps ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "haccp_steps_select" ON haccp_process_steps;
DROP POLICY IF EXISTS "haccp_steps_insert" ON haccp_process_steps;
DROP POLICY IF EXISTS "haccp_steps_update" ON haccp_process_steps;
DROP POLICY IF EXISTS "haccp_steps_delete" ON haccp_process_steps;

CREATE POLICY "haccp_steps_select" ON haccp_process_steps FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "haccp_steps_insert" ON haccp_process_steps FOR INSERT WITH CHECK (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_steps_update" ON haccp_process_steps FOR UPDATE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_steps_delete" ON haccp_process_steps FOR DELETE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);

-- ── haccp_hazards ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "haccp_hazards_select" ON haccp_hazards;
DROP POLICY IF EXISTS "haccp_hazards_insert" ON haccp_hazards;
DROP POLICY IF EXISTS "haccp_hazards_update" ON haccp_hazards;
DROP POLICY IF EXISTS "haccp_hazards_delete" ON haccp_hazards;

CREATE POLICY "haccp_hazards_select" ON haccp_hazards FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "haccp_hazards_insert" ON haccp_hazards FOR INSERT WITH CHECK (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_hazards_update" ON haccp_hazards FOR UPDATE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_hazards_delete" ON haccp_hazards FOR DELETE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);

-- ── haccp_ccp ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "haccp_ccp_select" ON haccp_ccp;
DROP POLICY IF EXISTS "haccp_ccp_insert" ON haccp_ccp;
DROP POLICY IF EXISTS "haccp_ccp_update" ON haccp_ccp;
DROP POLICY IF EXISTS "haccp_ccp_delete" ON haccp_ccp;

CREATE POLICY "haccp_ccp_select" ON haccp_ccp FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "haccp_ccp_insert" ON haccp_ccp FOR INSERT WITH CHECK (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_ccp_update" ON haccp_ccp FOR UPDATE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_ccp_delete" ON haccp_ccp FOR DELETE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);

-- ── haccp_monitoring_records ──────────────────────────────────────────────────
-- Lecture : tous les utilisateurs du site. Saisie : opérateurs et au-dessus.

DROP POLICY IF EXISTS "haccp_mon_select" ON haccp_monitoring_records;
DROP POLICY IF EXISTS "haccp_mon_insert" ON haccp_monitoring_records;
DROP POLICY IF EXISTS "haccp_mon_update" ON haccp_monitoring_records;
DROP POLICY IF EXISTS "haccp_mon_delete" ON haccp_monitoring_records;

CREATE POLICY "haccp_mon_select" ON haccp_monitoring_records FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "haccp_mon_insert" ON haccp_monitoring_records FOR INSERT WITH CHECK (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "haccp_mon_update" ON haccp_monitoring_records FOR UPDATE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_mon_delete" ON haccp_monitoring_records FOR DELETE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);

-- ── haccp_corrective_actions ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "haccp_ca_select" ON haccp_corrective_actions;
DROP POLICY IF EXISTS "haccp_ca_insert" ON haccp_corrective_actions;
DROP POLICY IF EXISTS "haccp_ca_update" ON haccp_corrective_actions;
DROP POLICY IF EXISTS "haccp_ca_delete" ON haccp_corrective_actions;

CREATE POLICY "haccp_ca_select" ON haccp_corrective_actions FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "haccp_ca_insert" ON haccp_corrective_actions FOR INSERT WITH CHECK (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "haccp_ca_update" ON haccp_corrective_actions FOR UPDATE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "haccp_ca_delete" ON haccp_corrective_actions FOR DELETE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);

-- ── quality_non_conformites ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "qnc_select" ON quality_non_conformites;
DROP POLICY IF EXISTS "qnc_insert" ON quality_non_conformites;
DROP POLICY IF EXISTS "qnc_update" ON quality_non_conformites;
DROP POLICY IF EXISTS "qnc_delete" ON quality_non_conformites;

CREATE POLICY "qnc_select" ON quality_non_conformites FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "qnc_insert" ON quality_non_conformites FOR INSERT WITH CHECK (
  factory_id IN (SELECT fn_user_factories())
);
CREATE POLICY "qnc_update" ON quality_non_conformites FOR UPDATE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);
CREATE POLICY "qnc_delete" ON quality_non_conformites FOR DELETE USING (
  factory_id IN (SELECT fn_user_factories())
  AND fn_is_admin()
);


-- ================================================================
-- §3  TRIGGER — AUTO-CRÉATION ACTION CORRECTIVE LORS D'UNE DÉVIATION
-- ================================================================
-- Quand un enregistrement de surveillance enregistre is_within_limit = FALSE,
-- une action corrective est automatiquement ouverte dans haccp_corrective_actions.

CREATE OR REPLACE FUNCTION fn_haccp_auto_corrective_action()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_within_limit = FALSE THEN
    INSERT INTO haccp_corrective_actions (
      monitoring_record_id,
      ccp_id,
      factory_id,
      action_description
    ) VALUES (
      NEW.id,
      NEW.ccp_id,
      NEW.factory_id,
      'Déviation automatiquement détectée — action corrective à définir par le responsable qualité.'
    );
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_haccp_auto_ca
    AFTER INSERT ON haccp_monitoring_records
    FOR EACH ROW EXECUTE FUNCTION fn_haccp_auto_corrective_action();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- §4  CLEANUP — mise à jour du script de nettoyage
-- ================================================================
-- Ces lignes sont à ajouter dans cleanup_business_tables.sql si besoin de reset :
-- DROP TABLE IF EXISTS haccp_corrective_actions CASCADE;
-- DROP TABLE IF EXISTS haccp_monitoring_records CASCADE;
-- DROP TABLE IF EXISTS haccp_ccp                CASCADE;
-- DROP TABLE IF EXISTS haccp_hazards            CASCADE;
-- DROP TABLE IF EXISTS haccp_process_steps      CASCADE;
-- DROP TABLE IF EXISTS haccp_plans              CASCADE;
-- DROP TABLE IF EXISTS quality_non_conformites  CASCADE;
