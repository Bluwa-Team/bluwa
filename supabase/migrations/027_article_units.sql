-- ============================================================
-- Bluwa ERP — Migration 027
-- Unités de mesure pour poids et volume des articles
-- ============================================================
--
-- Permet de définir l'unité du poids unitaire (kg, g, t…) et du
-- volume unitaire (L, mL, m³…) au lieu de valeurs figées.
-- ============================================================

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS poids_unite  TEXT DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS volume_unite TEXT DEFAULT 'L';

COMMENT ON COLUMN articles.poids_unite  IS 'Unité du poids unitaire (kg, g, t…)';
COMMENT ON COLUMN articles.volume_unite IS 'Unité du volume unitaire (L, mL, m³…)';
