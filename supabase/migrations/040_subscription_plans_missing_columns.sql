-- ============================================================
-- Migration 040 — Colonnes manquantes sur subscription_plans
-- Aligne la table réelle avec le schéma TypeScript attendu
-- ============================================================

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS price_monthly_annual NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_size TEXT NOT NULL DEFAULT 'tpe'
    CHECK (target_size IN ('tpe', 'pme', 'grande'));

COMMENT ON COLUMN subscription_plans.price_monthly_annual IS 'Prix mensuel en XOF si engagement annuel (12 mois)';
COMMENT ON COLUMN subscription_plans.target_size          IS 'tpe = 1–3 users, pme = jusqu_a_15, grande = illimité';
