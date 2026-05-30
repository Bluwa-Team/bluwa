-- ============================================================
-- Bluwa ERP — Schéma socle
-- Migration 001 — Auth, Organisations, Sites, Profils
--
-- Tables conservées :
--   organizations    — tenants SaaS
--   factories        — sites de production
--   profiles         — extension auth.users
--   user_site_access — accès multi-sites
-- ============================================================

-- ── Fonction utilitaire updated_at ────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


-- ── 1. Organizations ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(200) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  plan       VARCHAR(20)  NOT NULL DEFAULT 'starter'
               CHECK (plan IN ('starter', 'growth', 'enterprise')),
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  organizations      IS 'Tenants SaaS — une ligne par entreprise cliente Bluwa';
COMMENT ON COLUMN organizations.slug IS 'Identifiant URL unique, ex : bluwa-dakar';

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_select_own" ON organizations;
CREATE POLICY "orgs_select_own" ON organizations FOR SELECT
  USING (id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ── 2. Factories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factories (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  code            VARCHAR(20)  NOT NULL,
  country         VARCHAR(100) NOT NULL,
  city            VARCHAR(100),
  timezone        VARCHAR(60)  NOT NULL DEFAULT 'Africa/Dakar',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_factory_code_per_org UNIQUE (organization_id, code)
);

COMMENT ON TABLE  factories      IS 'Sites de production — sectorise toutes les données opérationnelles';
COMMENT ON COLUMN factories.code IS 'Code court du site (ex. DAK = Dakar, LOM = Lomé)';

ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "factories_select_own_org" ON factories;
DROP POLICY IF EXISTS "factories_insert_admin"    ON factories;
DROP POLICY IF EXISTS "factories_update_admin"    ON factories;

CREATE POLICY "factories_select_own_org" ON factories FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "factories_insert_admin" ON factories FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );
CREATE POLICY "factories_update_admin" ON factories FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );


-- ── 3. Profiles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       VARCHAR(200),
  role            VARCHAR(30)  NOT NULL DEFAULT 'operator'
                    CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer')),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  profiles      IS 'Extension de auth.users — lie un utilisateur Supabase à un tenant';
COMMENT ON COLUMN profiles.role IS 'owner > admin > manager > operator > viewer';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_org" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"      ON profiles;

CREATE POLICY "profiles_select_own_org" ON profiles FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Hook Supabase Auth : crée le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, organization_id, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data ->> 'organization_id')::UUID,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'operator')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();


-- ── 4. User site access ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_site_access (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  factory_id UUID        NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_factory UNIQUE (user_id, factory_id)
);

COMMENT ON TABLE user_site_access IS 'Pivot accès multi-sites : UNIQUE(user_id, factory_id) empêche les doublons';

ALTER TABLE user_site_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_site_access_select" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_admin"  ON user_site_access;

CREATE POLICY "user_site_access_select" ON user_site_access FOR SELECT
  USING (user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin'));
CREATE POLICY "user_site_access_admin" ON user_site_access FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin'));
