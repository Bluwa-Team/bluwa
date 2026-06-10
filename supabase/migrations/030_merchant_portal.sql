-- ============================================================
-- Bluwa Merchant Portal — Migration 030
-- Colonnes manquantes + tables merchant + RLS bypass admin
-- ============================================================


-- ================================================================
-- §1  HELPER — is_bluwa_admin()
-- ================================================================

CREATE OR REPLACE FUNCTION is_bluwa_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bluwa.io'
$$;


-- ================================================================
-- §2  COLONNES MANQUANTES — organizations
-- ================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS country_headquarters TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trial', 'suspended', 'churned')),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XOF';


-- ================================================================
-- §3  COLONNES MANQUANTES — factories
-- ================================================================

ALTER TABLE factories
  ADD COLUMN IF NOT EXISTS location_country TEXT,
  ADD COLUMN IF NOT EXISTS location_city    TEXT,
  ADD COLUMN IF NOT EXISTS currency         TEXT NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS subscription_plan_id      UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_status       TEXT CHECK (subscription_status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at   TIMESTAMPTZ;


-- ================================================================
-- §4  TABLE installation_fees
-- ================================================================

CREATE TABLE IF NOT EXISTS installation_fees (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id  UUID         NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  size        TEXT         NOT NULL CHECK (size IN ('tpe', 'pme', 'grande')),
  amount_xof  NUMERIC(15,2) NOT NULL,
  amount_local NUMERIC(15,2),
  currency    TEXT         NOT NULL DEFAULT 'XOF',
  status      TEXT         NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'partial', 'paid')),
  paid_at     TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE installation_fees IS 'Frais one-shot d''installation par site';

CREATE INDEX IF NOT EXISTS idx_install_fees_factory ON installation_fees(factory_id);

ALTER TABLE installation_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "install_fees_admin" ON installation_fees;
CREATE POLICY "install_fees_admin" ON installation_fees FOR ALL USING (is_bluwa_admin());


-- ================================================================
-- §6  TABLE service_orders
-- ================================================================

CREATE TABLE IF NOT EXISTS service_orders (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id   UUID         REFERENCES factories(id) ON DELETE SET NULL,
  service_type TEXT         NOT NULL
                 CHECK (service_type IN ('formation', 'support_prioritaire', 'audit_conseil', 'migration_donnees')),
  description  TEXT         NOT NULL,
  amount_xof   NUMERIC(15,2) NOT NULL,
  amount_local NUMERIC(15,2),
  currency     TEXT         NOT NULL DEFAULT 'XOF',
  status       TEXT         NOT NULL DEFAULT 'quoted'
                 CHECK (status IN ('quoted', 'confirmed', 'delivered', 'invoiced', 'paid')),
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE service_orders IS 'Prestations à la carte (formation, audit, migration, support)';

CREATE INDEX IF NOT EXISTS idx_service_orders_org ON service_orders(org_id);

ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_orders_admin" ON service_orders;
CREATE POLICY "service_orders_admin" ON service_orders FOR ALL USING (is_bluwa_admin());


-- ================================================================
-- §7  TABLE invoices
-- ================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id      UUID         NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  amount_xof      NUMERIC(15,2) NOT NULL,
  amount_local    NUMERIC(15,2),
  currency        TEXT         NOT NULL DEFAULT 'XOF',
  status          TEXT         NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_at          TIMESTAMPTZ  NOT NULL,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'Factures d''abonnement SaaS par site';

CREATE INDEX IF NOT EXISTS idx_invoices_factory ON invoices(factory_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_admin" ON invoices;
CREATE POLICY "invoices_admin" ON invoices FOR ALL USING (is_bluwa_admin());


-- ================================================================
-- §8  TABLE support_tickets
-- ================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject     TEXT         NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority    TEXT         NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to TEXT,
  messages    JSONB        NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE support_tickets IS 'Tickets support client — messages en JSONB';

CREATE INDEX IF NOT EXISTS idx_tickets_org    ON support_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_admin" ON support_tickets;
CREATE POLICY "tickets_admin" ON support_tickets FOR ALL USING (is_bluwa_admin());


-- ================================================================
-- §9  TABLE onboarding_pipeline
-- ================================================================

CREATE TABLE IF NOT EXISTS onboarding_pipeline (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID         REFERENCES organizations(id) ON DELETE SET NULL,
  org_name         TEXT         NOT NULL,
  country          TEXT,
  stage            TEXT         NOT NULL DEFAULT 'prospect'
                     CHECK (stage IN ('prospect', 'demo', 'trial', 'configuration', 'formation', 'golive')),
  plan_target      TEXT,
  assigned_to      TEXT,
  notes            TEXT,
  blocked          BOOLEAN      NOT NULL DEFAULT FALSE,
  blocked_reason   TEXT,
  stage_entered_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE onboarding_pipeline IS 'Suivi pipeline commercial & onboarding client';

CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON onboarding_pipeline(stage);

ALTER TABLE onboarding_pipeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pipeline_admin" ON onboarding_pipeline;
CREATE POLICY "pipeline_admin" ON onboarding_pipeline FOR ALL USING (is_bluwa_admin());


-- ================================================================
-- §10  TABLE onboarding_checklist
-- ================================================================

CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID         NOT NULL REFERENCES onboarding_pipeline(id) ON DELETE CASCADE,
  label       TEXT         NOT NULL,
  done        BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_pipeline ON onboarding_checklist(pipeline_id);

ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_admin" ON onboarding_checklist;
CREATE POLICY "checklist_admin" ON onboarding_checklist FOR ALL USING (is_bluwa_admin());


-- ================================================================
-- §11  TABLE onboarding_comments
-- ================================================================

CREATE TABLE IF NOT EXISTS onboarding_comments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID         NOT NULL REFERENCES onboarding_pipeline(id) ON DELETE CASCADE,
  author      TEXT         NOT NULL,
  content     TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_pipeline ON onboarding_comments(pipeline_id);

ALTER TABLE onboarding_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_admin" ON onboarding_comments;
CREATE POLICY "comments_admin" ON onboarding_comments FOR ALL USING (is_bluwa_admin());


-- ================================================================
-- §12  RLS BYPASS — tables existantes pour admins @bluwa.io
-- ================================================================

-- organizations
DROP POLICY IF EXISTS "orgs_bluwa_admin" ON organizations;
CREATE POLICY "orgs_bluwa_admin" ON organizations FOR ALL USING (is_bluwa_admin());

-- factories
DROP POLICY IF EXISTS "factories_bluwa_admin" ON factories;
CREATE POLICY "factories_bluwa_admin" ON factories FOR ALL USING (is_bluwa_admin());

-- profiles
DROP POLICY IF EXISTS "profiles_bluwa_admin" ON profiles;
CREATE POLICY "profiles_bluwa_admin" ON profiles FOR ALL USING (is_bluwa_admin());

-- user_site_access
DROP POLICY IF EXISTS "user_site_access_bluwa_admin" ON user_site_access;
CREATE POLICY "user_site_access_bluwa_admin" ON user_site_access FOR ALL USING (is_bluwa_admin());

-- subscription_plans (déjà une policy sp_admin, on en ajoute une explicite SELECT)
DROP POLICY IF EXISTS "sp_bluwa_admin" ON subscription_plans;
CREATE POLICY "sp_bluwa_admin" ON subscription_plans FOR ALL USING (is_bluwa_admin());
