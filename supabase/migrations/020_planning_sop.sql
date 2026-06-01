-- ── Migration 020 : Planning S&OP — Prévisions, Plan de demande, Supply Planning
-- Crée les tables manquantes pour le module Planification

-- ── 1. Prévisions de la demande (saisie manuelle) ─────────────────────────────
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID          NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  factory_id      UUID          NOT NULL REFERENCES factories(id)       ON DELETE CASCADE,
  article_id      UUID          NOT NULL REFERENCES articles(id)        ON DELETE CASCADE,
  week_start      DATE          NOT NULL,   -- Lundi de la semaine (ISO)
  quantity        DECIMAL(15,4) NOT NULL DEFAULT 0,
  created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_forecast_factory_article_week UNIQUE (factory_id, article_id, week_start)
);

COMMENT ON TABLE  demand_forecasts            IS 'Prévisions de demande hebdomadaires saisies manuellement par les planificateurs';
COMMENT ON COLUMN demand_forecasts.week_start IS 'Lundi de la semaine ISO — toujours normaliser avant insertion';

ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forecast_select" ON demand_forecasts FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "forecast_insert" ON demand_forecasts FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "forecast_update" ON demand_forecasts FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "forecast_delete" ON demand_forecasts FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_forecast_factory_week ON demand_forecasts(factory_id, week_start);
CREATE INDEX IF NOT EXISTS idx_forecast_article      ON demand_forecasts(article_id);

-- Trigger updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_demand_forecasts_updated_at
    BEFORE UPDATE ON demand_forecasts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2. Commandes clients (sales_orders) ──────────────────────────────────────
-- Table déjà référencée dans les server actions ventes.ts mais migration manquante
CREATE TABLE IF NOT EXISTS sales_orders (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  factory_id      UUID         NOT NULL REFERENCES factories(id)       ON DELETE CASCADE,
  client_id       UUID         NOT NULL REFERENCES clients(id)         ON DELETE RESTRICT,
  order_number    VARCHAR(50)  NOT NULL,
  order_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
  delivery_date   DATE,
  status          VARCHAR(30)  NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('draft','confirmed','in_progress','delivered','cancelled')),
  notes           TEXT,
  created_by      UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_number_factory UNIQUE (factory_id, order_number)
);

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_orders_select" ON sales_orders FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "sales_orders_insert" ON sales_orders FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "sales_orders_update" ON sales_orders FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sales_orders_factory      ON sales_orders(factory_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_delivery     ON sales_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status       ON sales_orders(status);

DO $$ BEGIN
  CREATE TRIGGER trg_sales_orders_updated_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 3. Lignes de commandes clients (sales_order_items) ───────────────────────
CREATE TABLE IF NOT EXISTS sales_order_items (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  sales_order_id   UUID          NOT NULL REFERENCES sales_orders(id)   ON DELETE CASCADE,
  article_id       UUID          NOT NULL REFERENCES articles(id)        ON DELETE RESTRICT,
  item_position    INTEGER       NOT NULL DEFAULT 1,
  quantity         DECIMAL(15,4) NOT NULL,
  unit_price       DECIMAL(15,4),
  currency         VARCHAR(10)   DEFAULT 'XOF',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_order_items_select" ON sales_order_items FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "sales_order_items_insert" ON sales_order_items FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_soi_order   ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_soi_article ON sales_order_items(article_id);
