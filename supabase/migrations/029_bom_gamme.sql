-- ============================================================
-- Bluwa ERP — Migration 029
-- Nomenclatures (BOM) et Gammes de fabrication (Routing)
-- ============================================================
--
-- Tables utilisées par la page détail article :
--   bom_headers / bom_items       → nomenclature de référence
--   routing_headers / routing_steps → gamme de fabrication
-- ============================================================


-- ================================================================
-- §1  TABLES
-- ================================================================

-- ── BOM Headers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom_headers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id      UUID        NOT NULL REFERENCES articles(id)      ON DELETE CASCADE,
  version         TEXT        NOT NULL DEFAULT 'v1.0',
  version_name    TEXT,
  batch_size      NUMERIC     NOT NULL DEFAULT 1,
  base_quantity   NUMERIC     NOT NULL DEFAULT 1,
  batch_unit      TEXT        NOT NULL DEFAULT 'kg',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bom_headers IS 'En-tête de nomenclature — une seule active par article';

DO $$ BEGIN
  CREATE TRIGGER trg_bom_headers_updated_at
    BEFORE UPDATE ON bom_headers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bom_headers_article ON bom_headers(article_id);
CREATE INDEX IF NOT EXISTS idx_bom_headers_org     ON bom_headers(organization_id);


-- ── BOM Items ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bom_header_id   UUID        NOT NULL REFERENCES bom_headers(id)  ON DELETE CASCADE,
  component_id    UUID        NOT NULL REFERENCES articles(id)      ON DELETE RESTRICT,
  component_label TEXT,
  item_position   INTEGER     NOT NULL DEFAULT 1,
  quantity        NUMERIC     NOT NULL DEFAULT 0,
  unit            TEXT        NOT NULL DEFAULT 'kg',
  tolerance_pct   NUMERIC     NOT NULL DEFAULT 0,
  scrap_pct       NUMERIC     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bom_items IS 'Composants / ingrédients de la nomenclature';

CREATE INDEX IF NOT EXISTS idx_bom_items_header ON bom_items(bom_header_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_component ON bom_items(component_id);


-- ── Routing Headers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routing_headers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id      UUID        NOT NULL REFERENCES articles(id)      ON DELETE CASCADE,
  version         TEXT        NOT NULL DEFAULT 'v1.0',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE routing_headers IS 'En-tête de gamme de fabrication — une seule active par article';

DO $$ BEGIN
  CREATE TRIGGER trg_routing_headers_updated_at
    BEFORE UPDATE ON routing_headers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_routing_headers_article ON routing_headers(article_id);
CREATE INDEX IF NOT EXISTS idx_routing_headers_org     ON routing_headers(organization_id);


-- ── Routing Steps ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routing_steps (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  routing_header_id         UUID        NOT NULL REFERENCES routing_headers(id) ON DELETE CASCADE,
  work_center_id            UUID        REFERENCES work_centers(id) ON DELETE SET NULL,
  step_order                INTEGER     NOT NULL DEFAULT 1,
  operation                 TEXT        NOT NULL,
  duration_min              NUMERIC     NOT NULL DEFAULT 0,
  setup_time_minutes        NUMERIC     NOT NULL DEFAULT 0,
  run_time_minutes_per_unit NUMERIC     NOT NULL DEFAULT 0,
  temperature_c             NUMERIC,
  equipment                 TEXT,
  control_point             TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE routing_steps IS 'Étapes de la gamme de fabrication';

CREATE INDEX IF NOT EXISTS idx_routing_steps_header      ON routing_steps(routing_header_id);
CREATE INDEX IF NOT EXISTS idx_routing_steps_work_center ON routing_steps(work_center_id);


-- ================================================================
-- §2  RLS
-- ================================================================

ALTER TABLE bom_headers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_steps   ENABLE ROW LEVEL SECURITY;

-- BOM Headers
DROP POLICY IF EXISTS "bom_headers_select" ON bom_headers;
DROP POLICY IF EXISTS "bom_headers_write"  ON bom_headers;

CREATE POLICY "bom_headers_select" ON bom_headers FOR SELECT
  USING (organization_id = fn_user_org());

CREATE POLICY "bom_headers_write" ON bom_headers FOR ALL
  USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  );

-- BOM Items
DROP POLICY IF EXISTS "bom_items_select" ON bom_items;
DROP POLICY IF EXISTS "bom_items_write"  ON bom_items;

CREATE POLICY "bom_items_select" ON bom_items FOR SELECT
  USING (organization_id = fn_user_org());

CREATE POLICY "bom_items_write" ON bom_items FOR ALL
  USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  );

-- Routing Headers
DROP POLICY IF EXISTS "routing_headers_select" ON routing_headers;
DROP POLICY IF EXISTS "routing_headers_write"  ON routing_headers;

CREATE POLICY "routing_headers_select" ON routing_headers FOR SELECT
  USING (organization_id = fn_user_org());

CREATE POLICY "routing_headers_write" ON routing_headers FOR ALL
  USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  );

-- Routing Steps
DROP POLICY IF EXISTS "routing_steps_select" ON routing_steps;
DROP POLICY IF EXISTS "routing_steps_write"  ON routing_steps;

CREATE POLICY "routing_steps_select" ON routing_steps FOR SELECT
  USING (organization_id = fn_user_org());

CREATE POLICY "routing_steps_write" ON routing_steps FOR ALL
  USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  );
