-- ============================================================
-- Bluwa ERP — Rôle par site (factory) au lieu du rôle global
-- Migration 024 — Déplacement de profiles.role → user_site_access.role
--
-- Motivation : l'abonnement est par site, le rôle aussi.
-- Un user peut être admin sur DAK et operator sur LOM.
-- ============================================================


-- ================================================================
-- §1  SCHÉMA — Ajout du rôle sur user_site_access
-- ================================================================

ALTER TABLE user_site_access
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'operator'
    CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer'));

COMMENT ON COLUMN user_site_access.role IS 'Rôle de l''utilisateur sur CE site spécifique (owner > admin > manager > operator > viewer)';

-- Migrer les rôles existants de profiles vers user_site_access
UPDATE user_site_access usa
SET    role = p.role
FROM   profiles p
WHERE  usa.user_id = p.id;

-- Déprécier profiles.role (conservé pour compatibilité, ne plus utiliser)
COMMENT ON COLUMN profiles.role IS '[DEPRECATED depuis migration 024] Rôle déplacé sur user_site_access.role. Colonne conservée transitoirement.';


-- ================================================================
-- §2  HELPERS RLS — Mise à jour des fonctions
-- ================================================================

-- fn_is_admin() : admin ou owner sur AU MOINS UN site de l'org
CREATE OR REPLACE FUNCTION fn_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   user_site_access usa
    JOIN   factories f ON f.id = usa.factory_id
    WHERE  usa.user_id        = auth.uid()
    AND    f.organization_id  = fn_user_org()
    AND    usa.role IN ('owner', 'admin')
  )
$$;

-- fn_site_role(factory_id) : retourne le rôle de l'user sur UN site donné
CREATE OR REPLACE FUNCTION fn_site_role(p_factory_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role
  FROM   user_site_access
  WHERE  user_id    = auth.uid()
  AND    factory_id = p_factory_id
$$;

-- fn_has_role_on_any_site(roles) : pour les tables MDM org-level (articles, fournisseurs, clients)
-- vérifie que l'user a l'un des rôles demandés sur au moins un site de son org
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


-- ================================================================
-- §3  POLITIQUES RLS — Mise à jour de toutes les policies
--     qui lisaient profiles.role
-- ================================================================

-- ── Factories ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "factories_insert_admin" ON factories;
DROP POLICY IF EXISTS "factories_update_admin" ON factories;

CREATE POLICY "factories_insert_admin" ON factories FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND fn_is_admin()
);
CREATE POLICY "factories_update_admin" ON factories FOR UPDATE USING (
  organization_id = fn_user_org()
  AND fn_is_admin()
);


-- ── User site access ───────────────────────────────────────────
DROP POLICY IF EXISTS "user_site_access_select" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_admin"  ON user_site_access;

CREATE POLICY "user_site_access_select" ON user_site_access FOR SELECT
  USING (user_id = auth.uid() OR fn_is_admin());

CREATE POLICY "user_site_access_admin" ON user_site_access FOR ALL
  USING (fn_is_admin());


-- ── Articles (table org-level) ────────────────────────────────
DROP POLICY IF EXISTS "articles_insert" ON articles;
DROP POLICY IF EXISTS "articles_update" ON articles;
DROP POLICY IF EXISTS "articles_delete" ON articles;

CREATE POLICY "articles_insert" ON articles FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND fn_has_role_on_any_site(ARRAY['owner', 'admin', 'manager'])
);
CREATE POLICY "articles_update" ON articles FOR UPDATE USING (
  organization_id = fn_user_org()
  AND fn_has_role_on_any_site(ARRAY['owner', 'admin', 'manager'])
);
CREATE POLICY "articles_delete" ON articles FOR DELETE USING (
  organization_id = fn_user_org()
  AND fn_is_admin()
);


-- ── Fournisseurs (table org-level) ────────────────────────────
DROP POLICY IF EXISTS "fournisseurs_insert" ON fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_update" ON fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_delete" ON fournisseurs;

CREATE POLICY "fournisseurs_insert" ON fournisseurs FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND fn_has_role_on_any_site(ARRAY['owner', 'admin', 'manager'])
);
CREATE POLICY "fournisseurs_update" ON fournisseurs FOR UPDATE USING (
  organization_id = fn_user_org()
  AND fn_has_role_on_any_site(ARRAY['owner', 'admin', 'manager'])
);
CREATE POLICY "fournisseurs_delete" ON fournisseurs FOR DELETE USING (
  organization_id = fn_user_org()
  AND fn_is_admin()
);


-- ── Clients (table org-level) ─────────────────────────────────
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND fn_has_role_on_any_site(ARRAY['owner', 'admin', 'manager'])
);
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (
  organization_id = fn_user_org()
  AND fn_has_role_on_any_site(ARRAY['owner', 'admin', 'manager'])
);
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (
  organization_id = fn_user_org()
  AND fn_is_admin()
);


-- ── Work Centers (table factory-level) ────────────────────────
-- Utilise fn_site_role car work_centers a un factory_id direct
DROP POLICY IF EXISTS "wc_insert" ON work_centers;
DROP POLICY IF EXISTS "wc_update" ON work_centers;
DROP POLICY IF EXISTS "wc_delete" ON work_centers;

CREATE POLICY "wc_insert" ON work_centers FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND fn_site_role(factory_id) IN ('owner', 'admin', 'manager')
);
CREATE POLICY "wc_update" ON work_centers FOR UPDATE USING (
  organization_id = fn_user_org()
  AND fn_site_role(factory_id) IN ('owner', 'admin', 'manager')
);
CREATE POLICY "wc_delete" ON work_centers FOR DELETE USING (
  organization_id = fn_user_org()
  AND fn_site_role(factory_id) IN ('owner', 'admin')
);
