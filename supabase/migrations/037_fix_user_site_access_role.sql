-- ============================================================
-- Migration 037 — Correction user_site_access.role manquant
--
-- La migration 024 n'était pas appliquée en production.
-- Ce script est idempotent (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- ── 1. Colonne role sur user_site_access ─────────────────────
ALTER TABLE user_site_access
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'operator'
    CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer'));

COMMENT ON COLUMN user_site_access.role
  IS 'Rôle de l''utilisateur sur ce site (owner > admin > manager > operator > viewer)';

-- ── 2. Helpers RLS ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   user_site_access usa
    JOIN   factories f ON f.id = usa.factory_id
    WHERE  usa.user_id       = auth.uid()
    AND    f.organization_id = fn_user_org()
    AND    usa.role IN ('owner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION fn_site_role(p_factory_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role
  FROM   user_site_access
  WHERE  user_id    = auth.uid()
  AND    factory_id = p_factory_id
$$;

CREATE OR REPLACE FUNCTION fn_has_role_on_any_site(p_roles TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   user_site_access usa
    JOIN   factories f ON f.id = usa.factory_id
    WHERE  usa.user_id       = auth.uid()
    AND    f.organization_id = fn_user_org()
    AND    usa.role          = ANY(p_roles)
  )
$$;

-- ── 3. Policies user_site_access ─────────────────────────────
DROP POLICY IF EXISTS "user_site_access_select" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_admin"  ON user_site_access;

CREATE POLICY "user_site_access_select" ON user_site_access
  FOR SELECT USING (user_id = auth.uid() OR fn_is_admin());

CREATE POLICY "user_site_access_admin" ON user_site_access
  FOR ALL USING (fn_is_admin());
