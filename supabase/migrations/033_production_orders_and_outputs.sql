-- ============================================================
-- Bluwa ERP — Migration 033
-- Création production_orders · production_order_boms
--                            · production_order_components
--                            · production_outputs
-- ============================================================
--
-- Migrations 003→017 perdues du repo. Ce fichier recrée les
-- tables avec IF NOT EXISTS (no-op si elles existent déjà).
--
-- Schéma "PRODUCTION AVEC BOM FLEXIBLE" :
--   production_orders          → en-tête OF
--   production_order_boms      → copie locale de la recette
--   production_order_components→ composants engagés (modifiables)
--   production_outputs         → déclarations de fin de prod
-- ============================================================

-- ── production_orders ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS production_orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id          UUID          NOT NULL REFERENCES factories(id)     ON DELETE RESTRICT,
  article_id          UUID          NOT NULL REFERENCES articles(id)      ON DELETE RESTRICT,
  work_center_id      UUID          REFERENCES work_centers(id)           ON DELETE RESTRICT,

  of_number           VARCHAR(50)   NOT NULL,
  quantity_target     DECIMAL(15,4) NOT NULL,
  quantity_produced   DECIMAL(15,4) NOT NULL DEFAULT 0.0000,

  status              VARCHAR(30)   NOT NULL DEFAULT 'PLANNED'
                        CHECK (status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),

  scheduled_start_date DATE         NOT NULL,
  actual_start_at     TIMESTAMPTZ,
  actual_end_at       TIMESTAMPTZ,

  -- Colonnes opérationnelles UI
  ligne               TEXT,
  operateur           TEXT,
  picking             TEXT          NOT NULL DEFAULT 'AValider'
                        CHECK (picking IN ('AValider', 'Valide')),

  created_by          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_of_number_per_factory UNIQUE (factory_id, of_number)
);

-- Colonnes UI ajoutées progressivement — IF NOT EXISTS pour tables existantes
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS ligne     TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS operateur TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS picking   TEXT NOT NULL DEFAULT 'AValider'
  CHECK (picking IN ('AValider', 'Valide'));

COMMENT ON TABLE  production_orders IS 'Ordres de fabrication. Cycle : PLANNED → RELEASED → IN_PROGRESS → COMPLETED.';
COMMENT ON COLUMN production_orders.of_number            IS 'Numéro OF (ex : OF-2026-0001). Unique par site.';
COMMENT ON COLUMN production_orders.scheduled_start_date IS 'Date de début planifiée.';
COMMENT ON COLUMN production_orders.quantity_produced    IS 'Mis à jour à chaque déclaration de production.';

DO $$ BEGIN
  CREATE TRIGGER trg_production_orders_updated_at
    BEFORE UPDATE ON production_orders
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_prod_orders_org    ON production_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_status ON production_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_prod_orders_art    ON production_orders(article_id);

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prod_orders_select" ON production_orders;
DROP POLICY IF EXISTS "prod_orders_write"  ON production_orders;
CREATE POLICY "prod_orders_select" ON production_orders
  FOR SELECT USING (organization_id = fn_user_org());
CREATE POLICY "prod_orders_write"  ON production_orders
  FOR ALL USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'operator')
  );


-- ── production_order_boms ─────────────────────────────────────────────────────
-- Copie locale de la recette au moment de la création de l'OF.
-- Permet de versionner ou modifier la recette sans toucher au référentiel BOM.

CREATE TABLE IF NOT EXISTS production_order_boms (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID        NOT NULL UNIQUE REFERENCES production_orders(id) ON DELETE CASCADE,
  original_bom_id     UUID        REFERENCES bom_headers(id) ON DELETE SET NULL,

  name                VARCHAR(255) NOT NULL,
  version             VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
  description         TEXT,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  production_order_boms IS 'Copie locale de la recette pour l''OF. Modifiable sans impacter le référentiel BOM.';
COMMENT ON COLUMN production_order_boms.original_bom_id IS 'Traçabilité vers la recette d''origine.';

CREATE INDEX IF NOT EXISTS idx_prod_boms_order ON production_order_boms(production_order_id);

ALTER TABLE production_order_boms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prod_boms_select" ON production_order_boms;
DROP POLICY IF EXISTS "prod_boms_write"  ON production_order_boms;
CREATE POLICY "prod_boms_select" ON production_order_boms
  FOR SELECT USING (
    production_order_id IN (
      SELECT id FROM production_orders WHERE organization_id = fn_user_org()
    )
  );
CREATE POLICY "prod_boms_write" ON production_order_boms
  FOR ALL USING (
    production_order_id IN (
      SELECT id FROM production_orders WHERE organization_id = fn_user_org()
    )
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'operator')
  );


-- ── production_order_components ───────────────────────────────────────────────
-- Composants engagés pour l'OF — copie flexible des ingrédients de la recette.
-- Modifiables par le chef de production avant le lancement.

CREATE TABLE IF NOT EXISTS production_order_components (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id    UUID          NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  component_article_id   UUID          NOT NULL REFERENCES articles(id)          ON DELETE RESTRICT,

  quantity_required      DECIMAL(15,4) NOT NULL,
  scrap_factor_applied   DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  quantity_consumed      DECIMAL(15,4) NOT NULL DEFAULT 0.0000,

  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_component_per_of UNIQUE (production_order_id, component_article_id)
);

COMMENT ON TABLE  production_order_components IS 'Composants engagés pour l''OF. Copie modifiable de la BOM.';
COMMENT ON COLUMN production_order_components.quantity_required    IS '(qty_target × proportion) + scrap localisé.';
COMMENT ON COLUMN production_order_components.scrap_factor_applied IS 'Coefficient de perte ajusté au lot du jour.';
COMMENT ON COLUMN production_order_components.quantity_consumed    IS 'Consommation réelle (suivi en cours de fabrication).';

CREATE INDEX IF NOT EXISTS idx_prod_components_order ON production_order_components(production_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_components_art   ON production_order_components(component_article_id);

ALTER TABLE production_order_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prod_components_select" ON production_order_components;
DROP POLICY IF EXISTS "prod_components_write"  ON production_order_components;
CREATE POLICY "prod_components_select" ON production_order_components
  FOR SELECT USING (
    production_order_id IN (
      SELECT id FROM production_orders WHERE organization_id = fn_user_org()
    )
  );
CREATE POLICY "prod_components_write" ON production_order_components
  FOR ALL USING (
    production_order_id IN (
      SELECT id FROM production_orders WHERE organization_id = fn_user_org()
    )
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'operator')
  );


-- ── production_outputs ────────────────────────────────────────────────────────
-- Déclaration de fin de production : lot PF + quantités réelles.

CREATE TABLE IF NOT EXISTS production_outputs (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID          NOT NULL REFERENCES organizations(id)     ON DELETE CASCADE,
  factory_id           UUID          NOT NULL REFERENCES factories(id)         ON DELETE CASCADE,
  production_order_id  UUID          NOT NULL REFERENCES production_orders(id) ON DELETE RESTRICT,
  article_id           UUID          NOT NULL REFERENCES articles(id)          ON DELETE RESTRICT,
  output_number        TEXT          NOT NULL,
  status               TEXT          NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT', 'CONFIRMED', 'POSTED')),
  quantity_produced    DECIMAL(15,4) NOT NULL DEFAULT 0,
  quantity_scrap       DECIMAL(15,4) NOT NULL DEFAULT 0,
  product_batch_number TEXT          NOT NULL,
  expiry_date          DATE,
  declared_by          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  declared_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  confirmed_by         UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at         TIMESTAMPTZ,
  posted_at            TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_output_number UNIQUE (organization_id, output_number)
);

COMMENT ON TABLE  production_outputs IS 'Déclarations de fin de production (≡ SAP CO11N). Cycle : DRAFT→CONFIRMED→POSTED.';
COMMENT ON COLUMN production_outputs.product_batch_number IS 'N° de lot PF : {TYPE}-YYYYMMDD-NNNN.';

DO $$ BEGIN
  CREATE TRIGGER trg_production_outputs_updated_at
    BEFORE UPDATE ON production_outputs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_prod_outputs_org   ON production_outputs(organization_id);
CREATE INDEX IF NOT EXISTS idx_prod_outputs_order ON production_outputs(production_order_id);

ALTER TABLE production_outputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prod_outputs_select" ON production_outputs;
DROP POLICY IF EXISTS "prod_outputs_write"  ON production_outputs;
CREATE POLICY "prod_outputs_select" ON production_outputs
  FOR SELECT USING (organization_id = fn_user_org());
CREATE POLICY "prod_outputs_write"  ON production_outputs
  FOR ALL USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'operator')
  );
