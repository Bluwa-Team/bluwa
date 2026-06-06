-- ============================================================
-- Migration 041 — Création subscription_plans + seed complet
-- À exécuter si la table n'existe pas encore en production
-- Combine migrations 023 + 040 + 039
-- ============================================================


-- ================================================================
-- §1  TABLE subscription_plans (avec toutes les colonnes)
-- ================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT          NOT NULL UNIQUE,
  price_monthly        NUMERIC(15,2) NOT NULL,
  price_monthly_annual NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_users_allowed    INT           NOT NULL DEFAULT 5,
  target_size          TEXT          NOT NULL DEFAULT 'tpe'
                         CHECK (target_size IN ('tpe', 'pme', 'grande')),
  features_config      JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  subscription_plans                       IS 'Plans SaaS Bluwa — référentiel global géré par l''équipe Bluwa';
COMMENT ON COLUMN subscription_plans.price_monthly         IS 'Prix mensuel en XOF (engagement mensuel)';
COMMENT ON COLUMN subscription_plans.price_monthly_annual  IS 'Prix mensuel en XOF si engagement annuel';
COMMENT ON COLUMN subscription_plans.target_size           IS 'tpe = 1–3 users, pme = jusqu_a_15, grande = illimité';
COMMENT ON COLUMN subscription_plans.features_config       IS 'JSON: modules activés, support, limites par plan';

CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_select" ON subscription_plans;
CREATE POLICY "sp_select" ON subscription_plans FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "sp_bluwa_admin" ON subscription_plans;
CREATE POLICY "sp_bluwa_admin" ON subscription_plans FOR ALL USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io'
);

-- Ajouter colonnes manquantes si la table existait déjà sans elles
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS price_monthly_annual NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_size TEXT NOT NULL DEFAULT 'tpe';


-- ================================================================
-- §2  SEED PLANS
-- ================================================================

INSERT INTO subscription_plans (name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config)
VALUES
  (
    'Starter', 45000, 37000, 3, 'tpe',
    '{"modules": ["mdm", "achats", "reception", "stocks", "inventaire"], "support": "email", "users": "1–3", "multi_sites": false}'::jsonb
  ),
  (
    'Growth', 150000, 125000, 15, 'pme',
    '{"modules": ["mdm", "achats", "reception", "stocks", "inventaire", "ventes", "production", "qualite", "analyse_marge", "planification"], "support": "email", "users": "jusqu_a_15", "multi_sites": false}'::jsonb
  ),
  (
    'Enterprise', 350000, 290000, 999, 'grande',
    '{"modules": ["mdm", "achats", "reception", "stocks", "inventaire", "ventes", "production", "qualite", "analyse_marge", "planification", "mrp", "supply_planning", "logistique"], "support": "prioritaire", "users": "illimite", "multi_sites": true}'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  price_monthly        = EXCLUDED.price_monthly,
  price_monthly_annual = EXCLUDED.price_monthly_annual,
  max_users_allowed    = EXCLUDED.max_users_allowed,
  target_size          = EXCLUDED.target_size,
  features_config      = EXCLUDED.features_config;


-- ================================================================
-- §3  FK factories → subscription_plans (si pas encore en place)
-- ================================================================

ALTER TABLE factories
  ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_status  TEXT CHECK (subscription_status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;


-- ================================================================
-- §4  CLIENTS PILOTES
-- ================================================================

DO $$
DECLARE
  org_id   uuid;
  plan_id  uuid;
  fac_id   uuid;
BEGIN
  SELECT id INTO plan_id FROM subscription_plans WHERE name = 'Growth';

  -- Chom Factory
  INSERT INTO organizations (name, slug, plan, is_active, country_headquarters, status, currency)
  VALUES ('Chom Factory', 'chom-factory', 'growth', true, 'Sénégal', 'trial', 'XOF')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO org_id;
  IF org_id IS NULL THEN SELECT id INTO org_id FROM organizations WHERE slug = 'chom-factory'; END IF;

  INSERT INTO factories (organization_id, name, code, country, city, location_country, location_city, timezone, currency, is_active, subscription_plan_id, subscription_status)
  VALUES (org_id, 'Chom Factory Dakar', 'CHOM-DKR', 'Sénégal', 'Dakar', 'Sénégal', 'Dakar', 'Africa/Dakar', 'XOF', true, plan_id, 'ACTIVE')
  ON CONFLICT DO NOTHING RETURNING id INTO fac_id;

  IF fac_id IS NOT NULL THEN
    INSERT INTO installation_fees (factory_id, size, amount_xof, currency, status)
    VALUES (fac_id, 'tpe', 150000, 'XOF', 'pending');
  END IF;

  INSERT INTO onboarding_pipeline (org_id, org_name, country, stage, plan_target, assigned_to, notes)
  VALUES (org_id, 'Chom Factory', 'Sénégal', 'trial', 'Growth', 'john@bluwa.io',
    'Fondatrice : Kossiwa. 5 employés, 5T/mois. Besoins : Production + Analyse de marge. Calls hebdo vendredis.')
  ON CONFLICT DO NOTHING;


  -- Africube
  INSERT INTO organizations (name, slug, plan, is_active, country_headquarters, status, currency)
  VALUES ('Africube', 'africube', 'growth', true, 'Togo', 'trial', 'XOF')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO org_id;
  IF org_id IS NULL THEN SELECT id INTO org_id FROM organizations WHERE slug = 'africube'; END IF;

  INSERT INTO factories (organization_id, name, code, country, city, location_country, location_city, timezone, currency, is_active, subscription_plan_id, subscription_status)
  VALUES (org_id, 'Africube Adétikopé', 'AFCB-ADT', 'Togo', 'Adétikopé', 'Togo', 'Adétikopé', 'Africa/Lome', 'XOF', true, plan_id, 'ACTIVE')
  ON CONFLICT DO NOTHING RETURNING id INTO fac_id;

  IF fac_id IS NOT NULL THEN
    INSERT INTO installation_fees (factory_id, size, amount_xof, currency, status)
    VALUES (fac_id, 'pme', 500000, 'XOF', 'pending');
  END IF;

  INSERT INTO onboarding_pipeline (org_id, org_name, country, stage, plan_target, assigned_to, notes)
  VALUES (org_id, 'Africube', 'Togo', 'trial', 'Growth', 'john@bluwa.io',
    'Dir. : Ayité Ajavon. 23 employés, 11 000 sachets/jour. LOI + NDA envoyés via Yousign le 4 juin 2026.')
  ON CONFLICT DO NOTHING;

END $$;
