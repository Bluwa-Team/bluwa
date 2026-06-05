-- ============================================================
-- Bluwa ERP — Migration 032
-- production_orders : colonnes UI manquantes
-- ============================================================
--
-- Ajoute les colonnes de suivi opérationnel manquantes :
--   ligne     = poste/ligne de production (ex : L1, L2)
--   operateur = préparateur picking / opérateur responsable
--   picking   = statut picking (AValider | Valide)
-- ============================================================

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS ligne     TEXT,
  ADD COLUMN IF NOT EXISTS operateur TEXT,
  ADD COLUMN IF NOT EXISTS picking   TEXT NOT NULL DEFAULT 'AValider'
    CHECK (picking IN ('AValider', 'Valide'));

COMMENT ON COLUMN production_orders.ligne     IS 'Ligne / poste de production (ex : L1, L2). Optionnel.';
COMMENT ON COLUMN production_orders.operateur IS 'Opérateur responsable du picking / de la préparation.';
COMMENT ON COLUMN production_orders.picking   IS 'Statut picking : AValider (par défaut) → Valide.';
