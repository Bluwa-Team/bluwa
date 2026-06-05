-- ============================================================
-- Bluwa ERP — Migration 033
-- Création production_orders + production_outputs
-- ============================================================
--
-- Migrations 003→017 perdues du repo.
-- Ce fichier recrée les deux tables avec IF NOT EXISTS :
--   • sans risque si elles existent déjà (no-op)
--   • les crée si elles sont absentes
--
-- Inclut les colonnes de la migration 032 (ligne, operateur,
-- picking) pour éviter un double-ALTER si les tables sont neuves.
-- ============================================================

-- ── Helpers ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ── production_orders ─────────────────────────────────────────────────────────
--
-- Un ordre de fabrication = une demande de production d'un article (PF ou PSF)
-- pour une quantité cible, sur une période planifiée.
-- Équivalent SAP : AUFK (en-tête OF) + AFKO (données de fabrication).
--
-- Cycle de vie :
--   PLANNED → RELEASED → IN_PROGRESS → COMPLETED
--   N'importe quel statut → CANCELLED

CREATE TABLE IF NOT EXISTS production_orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id        UUID        NOT NULL REFERENCES factories(id)     ON DELETE CASCADE,
  article_id        UUID        NOT NULL REFERENCES articles(id)      ON DELETE RESTRICT,
  order_number      TEXT        NOT NULL,
  quantity_target   NUMERIC     NOT NULL CHECK (quantity_target > 0),
  quantity_produced NUMERIC     NOT NULL DEFAULT 0 CHECK (quantity_produced >= 0),
  status            TEXT        NOT NULL DEFAULT 'PLANNED'
                      CHECK (status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  start_date        DATE,
  end_date          DATE,
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Colonnes opérationnelles (ancienne migration 032)
  ligne             TEXT,
  operateur         TEXT,
  picking           TEXT        NOT NULL DEFAULT 'AValider'
                      CHECK (picking IN ('AValider', 'Valide')),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_production_order_number UNIQUE (organization_id, order_number)
);

-- Si les colonnes de la migration 032 n'existent pas encore (table existante)
ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS ligne     TEXT,
  ADD COLUMN IF NOT EXISTS operateur TEXT,
  ADD COLUMN IF NOT EXISTS picking   TEXT NOT NULL DEFAULT 'AValider'
    CHECK (picking IN ('AValider', 'Valide'));

COMMENT ON TABLE  production_orders IS 'Ordres de fabrication (≡ SAP AUFK). Cycle : PLANNED→RELEASED→IN_PROGRESS→COMPLETED.';
COMMENT ON COLUMN production_orders.quantity_target   IS 'Quantité planifiée à produire (en unite_stock de l''article).';
COMMENT ON COLUMN production_orders.quantity_produced IS 'Quantité réellement produite (mis à jour à chaque déclaration).';
COMMENT ON COLUMN production_orders.picking           IS 'Statut picking composants : AValider (défaut) → Valide.';

DO $$ BEGIN
  CREATE TRIGGER trg_production_orders_updated_at
    BEFORE UPDATE ON production_orders
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_prod_orders_org    ON production_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_status ON production_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_prod_orders_art    ON production_orders(article_id);

-- RLS
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prod_orders_select" ON production_orders;
DROP POLICY IF EXISTS "prod_orders_write"  ON production_orders;

CREATE POLICY "prod_orders_select" ON production_orders
  FOR SELECT USING (organization_id = fn_user_org());

CREATE POLICY "prod_orders_write" ON production_orders
  FOR ALL USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'operator')
  );


-- ── production_outputs ────────────────────────────────────────────────────────
--
-- Déclaration de fin de production : lot PF produit + quantités réelles.
-- Équivalent SAP : CO11N (déclaration OF) + MB31 (mouvement 101).
--
-- Cycle de vie :
--   DRAFT → CONFIRMED (validation chef d'équipe)
--   CONFIRMED → POSTED (comptabilisation : lot PF entre en stock)
--   POSTED est immuable.

CREATE TABLE IF NOT EXISTS production_outputs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID        NOT NULL REFERENCES organizations(id)    ON DELETE CASCADE,
  factory_id           UUID        NOT NULL REFERENCES factories(id)        ON DELETE CASCADE,
  production_order_id  UUID        NOT NULL REFERENCES production_orders(id) ON DELETE RESTRICT,
  article_id           UUID        NOT NULL REFERENCES articles(id)         ON DELETE RESTRICT,
  output_number        TEXT        NOT NULL,                                 -- DP-YYYY-NNNN
  status               TEXT        NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT', 'CONFIRMED', 'POSTED')),
  quantity_produced    NUMERIC     NOT NULL DEFAULT 0 CHECK (quantity_produced >= 0),
  quantity_scrap       NUMERIC     NOT NULL DEFAULT 0 CHECK (quantity_scrap    >= 0),
  product_batch_number TEXT        NOT NULL,                                 -- {TYPE}-YYYYMMDD-NNNN
  expiry_date          DATE,
  declared_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  declared_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_by         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at         TIMESTAMPTZ,
  posted_at            TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_output_number UNIQUE (organization_id, output_number)
);

COMMENT ON TABLE  production_outputs IS 'Déclarations de fin de production (≡ SAP CO11N). Cycle : DRAFT→CONFIRMED→POSTED.';
COMMENT ON COLUMN production_outputs.output_number        IS 'Numéro séquentiel DP-YYYY-NNNN.';
COMMENT ON COLUMN production_outputs.product_batch_number IS 'N° de lot PF généré : {TYPE}-YYYYMMDD-NNNN (ex. PF-20260605-0001).';
COMMENT ON COLUMN production_outputs.quantity_scrap       IS 'Quantité rebutée lors de cette déclaration.';

DO $$ BEGIN
  CREATE TRIGGER trg_production_outputs_updated_at
    BEFORE UPDATE ON production_outputs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_prod_outputs_org   ON production_outputs(organization_id);
CREATE INDEX IF NOT EXISTS idx_prod_outputs_order ON production_outputs(production_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_outputs_art   ON production_outputs(article_id);

-- RLS
ALTER TABLE production_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prod_outputs_select" ON production_outputs;
DROP POLICY IF EXISTS "prod_outputs_write"  ON production_outputs;

CREATE POLICY "prod_outputs_select" ON production_outputs
  FOR SELECT USING (organization_id = fn_user_org());

CREATE POLICY "prod_outputs_write" ON production_outputs
  FOR ALL USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'operator')
  );
