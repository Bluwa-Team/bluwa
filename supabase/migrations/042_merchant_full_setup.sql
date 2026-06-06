-- ============================================================
-- Migration 042 — Setup complet Merchant Portal (idempotent)
-- Exécuter en une seule fois dans Supabase SQL Editor
-- Ordre : subscription_plans → ALTER orgs → ALTER factories
--         → autres tables → RLS → seed
-- ============================================================


-- ================================================================
-- §1  subscription_plans (aucune dépendance)
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

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_select"      ON subscription_plans;
DROP POLICY IF EXISTS "sp_bluwa_admin" ON subscription_plans;

CREATE POLICY "sp_select" ON subscription_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sp_bluwa_admin" ON subscription_plans FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');


-- ================================================================
-- §2  ALTER organizations
-- ================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS country_headquarters TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XOF';

-- status avec tous les statuts (recréer la contrainte proprement)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_status_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_status_check
    CHECK (status IN ('active', 'trial', 'suspended', 'churned', 'archived'));


-- ================================================================
-- §3  ALTER factories (FK vers subscription_plans déjà créée)
-- ================================================================

ALTER TABLE factories
  ADD COLUMN IF NOT EXISTS location_country        TEXT,
  ADD COLUMN IF NOT EXISTS location_city           TEXT,
  ADD COLUMN IF NOT EXISTS currency                TEXT NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS subscription_plan_id    UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT
    CHECK (subscription_status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;


-- ================================================================
-- §4  Table users (utilisateurs ERP clients)
-- ================================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  role            TEXT        NOT NULL DEFAULT 'OPERATOR'
                    CHECK (role IN ('SUPER_ADMIN', 'PLANT_MANAGER', 'OPERATOR', 'QUALITY_AUDITOR')),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_bluwa_admin"    ON users;
DROP POLICY IF EXISTS "users_select_own_org" ON users;

CREATE POLICY "users_bluwa_admin" ON users FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');
CREATE POLICY "users_select_own_org" ON users FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ================================================================
-- §5  Table installation_fees
-- ================================================================

CREATE TABLE IF NOT EXISTS installation_fees (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id   UUID          NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  size         TEXT          NOT NULL CHECK (size IN ('tpe', 'pme', 'grande')),
  amount_xof   NUMERIC(15,2) NOT NULL,
  currency     TEXT          NOT NULL DEFAULT 'XOF',
  status       TEXT          NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'partial', 'paid')),
  paid_at      TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_install_fees_factory ON installation_fees(factory_id);
ALTER TABLE installation_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "install_fees_admin" ON installation_fees;
CREATE POLICY "install_fees_admin" ON installation_fees FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');


-- ================================================================
-- §6  Table service_orders
-- ================================================================

CREATE TABLE IF NOT EXISTS service_orders (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id   UUID          REFERENCES factories(id) ON DELETE SET NULL,
  service_type TEXT          NOT NULL
                 CHECK (service_type IN ('formation', 'support_prioritaire', 'audit_conseil', 'migration_donnees')),
  description  TEXT          NOT NULL,
  amount_xof   NUMERIC(15,2) NOT NULL,
  currency     TEXT          NOT NULL DEFAULT 'XOF',
  status       TEXT          NOT NULL DEFAULT 'quoted'
                 CHECK (status IN ('quoted', 'confirmed', 'delivered', 'invoiced', 'paid')),
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_org ON service_orders(org_id);
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_orders_admin" ON service_orders;
CREATE POLICY "service_orders_admin" ON service_orders FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');


-- ================================================================
-- §7  Table invoices
-- ================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID          NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  amount_xof NUMERIC(15,2) NOT NULL,
  currency   TEXT          NOT NULL DEFAULT 'XOF',
  status     TEXT          NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_at     TIMESTAMPTZ   NOT NULL,
  paid_at    TIMESTAMPTZ,
  notes      TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_factory ON invoices(factory_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_admin" ON invoices;
CREATE POLICY "invoices_admin" ON invoices FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');


-- ================================================================
-- §8  Table support_tickets
-- ================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority    TEXT        NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to TEXT,
  messages    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_org    ON support_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_admin" ON support_tickets;
CREATE POLICY "tickets_admin" ON support_tickets FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');


-- ================================================================
-- §9  Tables onboarding_pipeline + checklist + comments
-- ================================================================

CREATE TABLE IF NOT EXISTS onboarding_pipeline (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        REFERENCES organizations(id) ON DELETE SET NULL,
  org_name         TEXT        NOT NULL,
  country          TEXT,
  stage            TEXT        NOT NULL DEFAULT 'prospect'
                     CHECK (stage IN ('prospect', 'demo', 'trial', 'configuration', 'formation', 'golive')),
  plan_target      TEXT,
  assigned_to      TEXT,
  notes            TEXT,
  blocked          BOOLEAN     NOT NULL DEFAULT FALSE,
  blocked_reason   TEXT,
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON onboarding_pipeline(stage);
ALTER TABLE onboarding_pipeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pipeline_admin" ON onboarding_pipeline;
CREATE POLICY "pipeline_admin" ON onboarding_pipeline FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');

CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID        NOT NULL REFERENCES onboarding_pipeline(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  done        BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_pipeline ON onboarding_checklist(pipeline_id);
ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_admin" ON onboarding_checklist;
CREATE POLICY "checklist_admin" ON onboarding_checklist FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');

CREATE TABLE IF NOT EXISTS onboarding_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID        NOT NULL REFERENCES onboarding_pipeline(id) ON DELETE CASCADE,
  author      TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_pipeline ON onboarding_comments(pipeline_id);
ALTER TABLE onboarding_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_admin" ON onboarding_comments;
CREATE POLICY "comments_admin" ON onboarding_comments FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');


-- ================================================================
-- §10  RLS bypass admin sur tables existantes
-- ================================================================

DROP POLICY IF EXISTS "orgs_bluwa_admin"              ON organizations;
DROP POLICY IF EXISTS "factories_bluwa_admin"          ON factories;
DROP POLICY IF EXISTS "profiles_bluwa_admin"           ON profiles;
DROP POLICY IF EXISTS "user_site_access_bluwa_admin"   ON user_site_access;

CREATE POLICY "orgs_bluwa_admin" ON organizations FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');
CREATE POLICY "factories_bluwa_admin" ON factories FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');
CREATE POLICY "profiles_bluwa_admin" ON profiles FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');
CREATE POLICY "user_site_access_bluwa_admin" ON user_site_access FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io');


-- ================================================================
-- §11  Seed subscription_plans
-- ================================================================

INSERT INTO subscription_plans (name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config)
VALUES
  ('Starter',    45000,  37000, 3,   'tpe',   '{"modules":["mdm","achats","reception","stocks","inventaire"],"support":"email","users":"1–3","multi_sites":false}'::jsonb),
  ('Growth',    150000, 125000, 15,  'pme',   '{"modules":["mdm","achats","reception","stocks","inventaire","ventes","production","qualite","analyse_marge","planification"],"support":"email","users":"jusqu_a_15","multi_sites":false}'::jsonb),
  ('Enterprise',350000, 290000, 999, 'grande','{"modules":["mdm","achats","reception","stocks","inventaire","ventes","production","qualite","analyse_marge","planification","mrp","supply_planning","logistique"],"support":"prioritaire","users":"illimite","multi_sites":true}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  price_monthly        = EXCLUDED.price_monthly,
  price_monthly_annual = EXCLUDED.price_monthly_annual,
  max_users_allowed    = EXCLUDED.max_users_allowed,
  target_size          = EXCLUDED.target_size,
  features_config      = EXCLUDED.features_config;

