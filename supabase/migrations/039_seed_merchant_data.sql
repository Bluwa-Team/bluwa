-- ============================================================
-- Migration 039 — Seed merchant portal
-- Plans Starter / Growth / Enterprise + clients pilotes
-- ============================================================


-- ================================================================
-- §1  SUBSCRIPTION PLANS
-- ================================================================

INSERT INTO subscription_plans (name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config)
VALUES
  (
    'Starter',
    45000,
    37000,
    3,
    'tpe',
    '{
      "modules": ["mdm", "achats", "reception", "stocks", "inventaire"],
      "support": "email",
      "users": "1–3",
      "multi_sites": false
    }'::jsonb
  ),
  (
    'Growth',
    150000,
    125000,
    15,
    'pme',
    '{
      "modules": ["mdm", "achats", "reception", "stocks", "inventaire", "ventes", "production", "qualite", "analyse_marge", "planification"],
      "support": "email",
      "users": "jusqu_a_15",
      "multi_sites": false
    }'::jsonb
  ),
  (
    'Enterprise',
    350000,
    290000,
    999,
    'grande',
    '{
      "modules": ["mdm", "achats", "reception", "stocks", "inventaire", "ventes", "production", "qualite", "analyse_marge", "planification", "mrp", "supply_planning", "logistique"],
      "support": "prioritaire",
      "users": "illimite",
      "multi_sites": true
    }'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  price_monthly        = EXCLUDED.price_monthly,
  price_monthly_annual = EXCLUDED.price_monthly_annual,
  max_users_allowed    = EXCLUDED.max_users_allowed,
  features_config      = EXCLUDED.features_config;


-- ================================================================
-- §2  CLIENT PILOTE — Chom Factory (Sénégal)
-- Biscuits & snacks · Dakar · 5 employés · ~5T/mois
-- Plan : Growth (production + analyse de marge requis)
-- ================================================================

DO $$
DECLARE
  org_id   uuid;
  plan_id  uuid;
  fac_id   uuid;
BEGIN
  SELECT id INTO plan_id FROM subscription_plans WHERE name = 'Growth';

  INSERT INTO organizations (name, slug, plan, is_active, country_headquarters, status, currency)
  VALUES ('Chom Factory', 'chom-factory', 'growth', true, 'Sénégal', 'trial', 'XOF')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO org_id;

  IF org_id IS NULL THEN
    SELECT id INTO org_id FROM organizations WHERE slug = 'chom-factory';
  END IF;

  INSERT INTO factories (
    organization_id, name, code,
    country, city, location_country, location_city,
    timezone, currency, is_active,
    subscription_plan_id, subscription_status
  )
  VALUES (
    org_id, 'Chom Factory Dakar', 'CHOM-DKR',
    'Sénégal', 'Dakar', 'Sénégal', 'Dakar',
    'Africa/Dakar', 'XOF', true,
    plan_id, 'ACTIVE'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO fac_id;

  IF fac_id IS NOT NULL THEN
    INSERT INTO installation_fees (factory_id, size, amount_xof, currency, status)
    VALUES (fac_id, 'tpe', 150000, 'XOF', 'pending');
  END IF;

  INSERT INTO onboarding_pipeline (org_id, org_name, country, stage, plan_target, assigned_to, notes)
  VALUES (org_id, 'Chom Factory', 'Sénégal', 'trial', 'Growth', 'john@bluwa.io',
    'Fondatrice : Kossiwa Midjresso-Amouzou. 5 employés, 5T/mois. Besoins : Production + Analyse de marge. Call cadrage : 5 juin 2026. Calls hebdo les vendredis.')
  ON CONFLICT DO NOTHING;
END $$;


-- ================================================================
-- §3  CLIENT PILOTE — Africube (Togo)
-- Bouillon culinaire naturel · Adétikopé · 23 employés · 11 000 sachets/jour
-- Plan : Growth (en attente signature LOI + NDA)
-- ================================================================

DO $$
DECLARE
  org_id   uuid;
  plan_id  uuid;
  fac_id   uuid;
BEGIN
  SELECT id INTO plan_id FROM subscription_plans WHERE name = 'Growth';

  INSERT INTO organizations (name, slug, plan, is_active, country_headquarters, status, currency)
  VALUES ('Africube', 'africube', 'growth', true, 'Togo', 'trial', 'XOF')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO org_id;

  IF org_id IS NULL THEN
    SELECT id INTO org_id FROM organizations WHERE slug = 'africube';
  END IF;

  INSERT INTO factories (
    organization_id, name, code,
    country, city, location_country, location_city,
    timezone, currency, is_active,
    subscription_plan_id, subscription_status
  )
  VALUES (
    org_id, 'Africube Adétikopé', 'AFCB-ADT',
    'Togo', 'Adétikopé', 'Togo', 'Adétikopé',
    'Africa/Lome', 'XOF', true,
    plan_id, 'ACTIVE'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO fac_id;

  IF fac_id IS NOT NULL THEN
    INSERT INTO installation_fees (factory_id, size, amount_xof, currency, status)
    VALUES (fac_id, 'pme', 500000, 'XOF', 'pending');
  END IF;

  INSERT INTO onboarding_pipeline (org_id, org_name, country, stage, plan_target, assigned_to, notes)
  VALUES (org_id, 'Africube', 'Togo', 'trial', 'Growth', 'john@bluwa.io',
    'Dir. : Ayité Ajavon. 23 employés, 11 000 sachets/jour. LOI + NDA envoyés via Yousign le 4 juin 2026 — en attente signature.')
  ON CONFLICT DO NOTHING;
END $$;
