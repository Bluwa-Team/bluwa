-- ============================================================
-- Bluwa ERP — Migration 034
-- Création quality_inspection_lots
--
-- Table manquante référencée depuis la migration 025 (quality_non_conformites).
-- Représente le lot de contrôle QC créé à chaque réception de MP.
-- Cycle : PENDING → RELEASED | REJECTED
-- ============================================================

CREATE TABLE IF NOT EXISTS quality_inspection_lots (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID          NOT NULL REFERENCES organizations(id)      ON DELETE CASCADE,
  factory_id            UUID          NOT NULL REFERENCES factories(id)          ON DELETE RESTRICT,

  -- Lien 1:1 strict avec la ligne de réception
  goods_receipt_item_id UUID          NOT NULL UNIQUE,
  article_id            UUID          NOT NULL REFERENCES articles(id)           ON DELETE RESTRICT,

  -- Repris de la réception pour indexation rapide (évite un JOIN systématique)
  batch_number          VARCHAR(100)  NOT NULL,

  quantity_to_inspect   DECIMAL(15,4) NOT NULL CHECK (quantity_to_inspect > 0),

  status                VARCHAR(30)   NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING', 'RELEASED', 'REJECTED')),

  -- Résultats d'analyse agro-alimentaire (structure libre par article)
  -- ex: {"humidity_pct": 12.5, "brix_degree": 14.2, "ph": 6.8}
  laboratory_results    JSONB         NOT NULL DEFAULT '{}'::jsonb,

  expiration_date       DATE          NOT NULL,

  inspected_by          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_date         TIMESTAMPTZ,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Trigger updated_at ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER trg_quality_inspection_lots_updated_at
    BEFORE UPDATE ON quality_inspection_lots
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_qil_org        ON quality_inspection_lots(organization_id);
CREATE INDEX IF NOT EXISTS idx_qil_status     ON quality_inspection_lots(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_qil_article    ON quality_inspection_lots(article_id);
CREATE INDEX IF NOT EXISTS idx_qil_batch      ON quality_inspection_lots(organization_id, batch_number);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE quality_inspection_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qil_select" ON quality_inspection_lots;
DROP POLICY IF EXISTS "qil_write"  ON quality_inspection_lots;

CREATE POLICY "qil_select" ON quality_inspection_lots
  FOR SELECT USING (organization_id = fn_user_org());

CREATE POLICY "qil_write" ON quality_inspection_lots
  FOR ALL USING (
    organization_id = fn_user_org()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'operator')
  );

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  quality_inspection_lots                          IS 'Lots de contrôle QC — créés à la réception, libérés avant consommation en production.';
COMMENT ON COLUMN quality_inspection_lots.goods_receipt_item_id   IS 'Lien 1:1 avec la ligne de réception (goods_receipt_items.id).';
COMMENT ON COLUMN quality_inspection_lots.batch_number            IS 'Repris de goods_receipt_items pour indexation rapide.';
COMMENT ON COLUMN quality_inspection_lots.laboratory_results      IS 'Résultats d''analyse JSONB : humidity_pct, brix_degree, ph, etc.';
COMMENT ON COLUMN quality_inspection_lots.status                  IS 'PENDING = en attente analyse, RELEASED = libéré pour production, REJECTED = bloqué/rebut.';
