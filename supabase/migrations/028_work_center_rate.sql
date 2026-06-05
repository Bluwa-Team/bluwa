-- ============================================================
-- Bluwa ERP — Migration 028
-- Taux horaire et devise des postes de charge
-- ============================================================
--
-- L'action createWorkCenter écrit rate_per_hour et currency, absents
-- de la migration 022. La création de poste échouait donc sur une
-- colonne inexistante.
-- ============================================================

ALTER TABLE work_centers
  ADD COLUMN IF NOT EXISTS rate_per_hour NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency      TEXT    NOT NULL DEFAULT 'XOF';

COMMENT ON COLUMN work_centers.rate_per_hour IS 'Coût horaire du poste (MOD + amortissement)';
COMMENT ON COLUMN work_centers.currency      IS 'Devise du taux horaire (XOF par défaut)';
