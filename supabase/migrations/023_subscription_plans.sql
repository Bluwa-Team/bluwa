-- ============================================================
-- Bluwa Merchant — Plans d'abonnement
-- Migration 023 — subscription_plans
-- Table globale (hors tenant) : gérée par Bluwa, lue par tous
-- ============================================================


-- ================================================================
-- §1  TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL UNIQUE,   -- 'Starter', 'Growth', 'Enterprise'
  price_monthly        NUMERIC(15,2) NOT NULL,        -- Prix mensuel de référence en XOF
  price_monthly_annual NUMERIC(15,2) NOT NULL,        -- Prix mensuel si engagement annuel
  max_users_allowed    INT         NOT NULL DEFAULT 5,
  target_size          TEXT        NOT NULL DEFAULT 'tpe'
                         CHECK (target_size IN ('tpe', 'pme', 'grande')),
  features_config      JSONB       NOT NULL DEFAULT '{}'::jsonb, -- Modules activés, limites
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  subscription_plans                       IS 'Plans SaaS Bluwa — référentiel global géré par l''équipe Bluwa';
COMMENT ON COLUMN subscription_plans.price_monthly         IS 'Prix mensuel en XOF (engagement mensuel)';
COMMENT ON COLUMN subscription_plans.price_monthly_annual  IS 'Prix mensuel en XOF si engagement annuel';
COMMENT ON COLUMN subscription_plans.target_size           IS 'tpe=1-3 users, pme=jusqu_a_15, grande=illimité';
COMMENT ON COLUMN subscription_plans.features_config       IS 'JSON: modules activés, support, limites par plan';

CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);


-- ================================================================
-- §2  RLS
-- Table globale : lecture publique (auth), écriture réservée aux
-- admins Bluwa (emails @bluwa.io via app Merchant)
-- ================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_select" ON subscription_plans;
DROP POLICY IF EXISTS "sp_admin"  ON subscription_plans;

-- Tout utilisateur authentifié peut lire les plans
CREATE POLICY "sp_select" ON subscription_plans FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seuls les admins Bluwa (portail Merchant) peuvent modifier
CREATE POLICY "sp_admin" ON subscription_plans FOR ALL USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io'
);
