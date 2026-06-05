-- ============================================================
-- Bluwa ERP — Migration 035
-- Création production_material_consumptions
--
-- Enregistre chaque sortie réelle de MP/AC/CS vers un OF.
-- Clé de généalogie : OF × lot QC libéré (quality_inspection_lots).
-- Un opérateur ne peut consommer qu'un lot RELEASED (contrôle côté app).
-- ============================================================

CREATE TABLE IF NOT EXISTS production_material_consumptions (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID          NOT NULL REFERENCES organizations(id)          ON DELETE CASCADE,
  factory_id           UUID          NOT NULL REFERENCES factories(id)              ON DELETE RESTRICT,
  production_order_id  UUID          NOT NULL REFERENCES production_orders(id)      ON DELETE RESTRICT,
  article_id           UUID          NOT NULL REFERENCES articles(id)               ON DELETE RESTRICT,

  -- Lot QC exact utilisé — traçabilité amont complète
  consumed_batch_id    UUID          NOT NULL REFERENCES quality_inspection_lots(id) ON DELETE RESTRICT,

  quantity_consumed    DECIMAL(15,4) NOT NULL CHECK (quantity_consumed > 0),

  consumed_by          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  consumed_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pmc_org     ON production_material_consumptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_pmc_order   ON production_material_consumptions(production_order_id);
CREATE INDEX IF NOT EXISTS idx_pmc_batch   ON production_material_consumptions(consumed_batch_id);
CREATE INDEX IF NOT EXISTS idx_pmc_article ON production_material_consumptions(article_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE production_material_consumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pmc_select" ON production_material_consumptions;
DROP POLICY IF EXISTS "pmc_write"  ON production_material_consumptions;

CREATE POLICY "pmc_select" ON production_material_consumptions
  FOR SELECT USING (organization_id = fn_user_org());

CREATE POLICY "pmc_write" ON production_material_consumptions
  FOR ALL USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'operator')
  );

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  production_material_consumptions                    IS 'Consommations réelles de MP/AC/CS par OF — base de la généalogie lot agroalimentaire.';
COMMENT ON COLUMN production_material_consumptions.consumed_batch_id  IS 'Lot QC libéré consommé (quality_inspection_lots.id) — traçabilité amont vers la réception.';
COMMENT ON COLUMN production_material_consumptions.quantity_consumed  IS 'Quantité réellement versée dans l''OF (unité = unite_stock de l''article).';
