-- ============================================================
-- Bluwa ERP — Postes de Travail / Capacité Industrielle
-- Migration 022 — Work Centers
-- ============================================================


-- ================================================================
-- §1  TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS work_centers (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id            UUID        NOT NULL REFERENCES factories(id)     ON DELETE CASCADE,

  code                  TEXT        NOT NULL, -- ex: 'CUVE-01', 'LIGNE-EMB'
  name                  TEXT        NOT NULL, -- ex: 'Cuve de mélange principale'
  daily_capacity_hours  NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  efficiency_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00
                          CHECK (efficiency_percentage BETWEEN 0 AND 100),
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_work_center_code_per_factory UNIQUE (factory_id, code)
);

COMMENT ON TABLE  work_centers                       IS 'Postes de travail / lignes de production — capacité industrielle par site';
COMMENT ON COLUMN work_centers.code                  IS 'Code court du poste, ex: CUVE-01, LIGNE-EMB';
COMMENT ON COLUMN work_centers.daily_capacity_hours  IS 'Nombre d''heures d''ouverture par jour';
COMMENT ON COLUMN work_centers.efficiency_percentage IS 'Facteur de performance TRS théorique (0–100)';

DO $$ BEGIN
  CREATE TRIGGER trg_work_centers_updated_at
    BEFORE UPDATE ON work_centers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_work_centers_factory ON work_centers(factory_id);
CREATE INDEX IF NOT EXISTS idx_work_centers_org     ON work_centers(organization_id);


-- ================================================================
-- §2  RLS
-- ================================================================

ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wc_select" ON work_centers;
DROP POLICY IF EXISTS "wc_insert" ON work_centers;
DROP POLICY IF EXISTS "wc_update" ON work_centers;
DROP POLICY IF EXISTS "wc_delete" ON work_centers;

CREATE POLICY "wc_select" ON work_centers FOR SELECT USING (
  organization_id = fn_user_org()
  AND (fn_is_admin() OR factory_id IN (SELECT fn_user_factories()))
);

CREATE POLICY "wc_insert" ON work_centers FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);

CREATE POLICY "wc_update" ON work_centers FOR UPDATE USING (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);

CREATE POLICY "wc_delete" ON work_centers FOR DELETE USING (
  organization_id = fn_user_org() AND fn_is_admin()
);
