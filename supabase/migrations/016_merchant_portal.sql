-- ============================================================
-- Migration 016 — Merchant Portal tables
-- Schéma multi-tenant : subscription embarquée dans factories
-- ============================================================

-- 1. Plans d'abonnement SaaS
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(50) NOT NULL UNIQUE,          -- 'Starter', 'Growth', 'Enterprise'
  price_monthly         DECIMAL(15, 2) NOT NULL,              -- Prix sans engagement
  price_monthly_annual  DECIMAL(15, 2) NOT NULL,              -- Prix équivalent mensuel si annuel
  max_users_allowed     INT NOT NULL DEFAULT 5,
  target_size           VARCHAR(20) NOT NULL DEFAULT 'tpe'
                          CHECK (target_size IN ('tpe', 'pme', 'grande')),
  features_config       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Organisations (groupe juridique client)
CREATE TABLE IF NOT EXISTS organizations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        VARCHAR(255) NOT NULL,           -- ex: 'Groupe SOKA'
  legal_registration_number   VARCHAR(100),                    -- RCCM
  country_headquarters        VARCHAR(100) NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'trial', 'suspended', 'churned')),
  created_at                  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Usines / Sites de production (portent l'abonnement individuel)
CREATE TABLE IF NOT EXISTS factories (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_plan_id    UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  name                    VARCHAR(255) NOT NULL,               -- ex: 'Usine Mangue', 'Usine Lait'
  code                    VARCHAR(10) NOT NULL,                -- ex: 'DAK', 'BKO'
  location_country        VARCHAR(100) NOT NULL,              -- 'Togo', 'Sénégal'
  location_city           VARCHAR(100) NOT NULL,
  timezone                VARCHAR(50) NOT NULL DEFAULT 'Africa/Lome',
  subscription_status     VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                            CHECK (subscription_status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS factories_organization_id_idx ON factories(organization_id);
CREATE INDEX IF NOT EXISTS factories_subscription_plan_id_idx ON factories(subscription_plan_id);

-- 4. Utilisateurs (rattachés au groupe, accès aux sites via user_site_access)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY,                            -- = auth.users.id Supabase
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  role            VARCHAR(50) NOT NULL DEFAULT 'OPERATOR'
                    CHECK (role IN ('SUPER_ADMIN', 'PLANT_MANAGER', 'OPERATOR', 'QUALITY_AUDITOR')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS users_organization_id_idx ON users(organization_id);

-- 5. Table pivot : autorisations d'accès aux sites (base RLS)
CREATE TABLE IF NOT EXISTS user_site_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  factory_id  UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  granted_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  granted_by  UUID REFERENCES users(id),
  CONSTRAINT unique_user_factory_access UNIQUE (user_id, factory_id)
);

CREATE INDEX IF NOT EXISTS user_site_access_user_id_idx ON user_site_access(user_id);
CREATE INDEX IF NOT EXISTS user_site_access_factory_id_idx ON user_site_access(factory_id);

-- 6. Frais d'installation (one-shot par site)
CREATE TABLE IF NOT EXISTS installation_fees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id  UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  size        VARCHAR(20) NOT NULL CHECK (size IN ('tpe', 'pme', 'grande')),
  amount_xof  DECIMAL(15, 2) NOT NULL,                        -- 150k | 500k | 1 500k
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'partial', 'paid')),
  paid_at     TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Services à la carte
CREATE TABLE IF NOT EXISTS service_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id    UUID REFERENCES factories(id),
  service_type  TEXT NOT NULL
                  CHECK (service_type IN ('formation', 'support_prioritaire', 'audit_conseil', 'migration_donnees')),
  description   TEXT NOT NULL,
  amount_xof    DECIMAL(15, 2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'quoted'
                  CHECK (status IN ('quoted', 'confirmed', 'delivered', 'invoiced', 'paid')),
  scheduled_at  TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Factures par site (billing manuel V1)
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id      UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  amount_xof      INTEGER NOT NULL CHECK (amount_xof >= 0),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_at          TIMESTAMPTZ NOT NULL,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_factory_id_idx ON invoices(factory_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);

-- 9. Tickets de support
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to TEXT,                       -- email @bluwa.io de l'agent assigné
  messages    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_org_id_idx ON support_tickets(org_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);

-- ============================================================
-- Seed : plans d'abonnement Bluwa (prix réels)
-- ============================================================
INSERT INTO subscription_plans (name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config)
VALUES
  (
    'Starter',
    45000.00,
    37000.00,
    3,
    'tpe',
    '{"modules": ["mdm", "achats", "stocks"], "support": "email", "users": "1-3"}'::jsonb
  ),
  (
    'Growth',
    150000.00,
    125000.00,
    15,
    'pme',
    '{"modules": ["mdm", "achats", "stocks", "gpao", "qualite"], "support": "email", "users": "jusqu_a_15"}'::jsonb
  ),
  (
    'Enterprise',
    350000.00,
    290000.00,
    999,
    'grande',
    '{"modules": ["mdm", "achats", "stocks", "gpao", "qualite", "crm", "bi"], "support": "prioritaire", "users": "illimite", "multi_sites": true}'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  price_monthly        = EXCLUDED.price_monthly,
  price_monthly_annual = EXCLUDED.price_monthly_annual,
  max_users_allowed    = EXCLUDED.max_users_allowed,
  target_size          = EXCLUDED.target_size,
  features_config      = EXCLUDED.features_config;

-- ============================================================
-- Trigger updated_at générique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['invoices', 'support_tickets', 'installation_fees', 'service_orders'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_' || t
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
