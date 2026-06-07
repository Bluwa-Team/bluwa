-- ============================================================
-- Migration 044 — Fix RLS policies : subquery auth.users → auth.email()
-- Migration 042 utilisait (SELECT email FROM auth.users WHERE id = auth.uid())
-- qui nécessite SECURITY DEFINER. En policy SQL inline, le rôle
-- authenticated n'a pas accès à auth.users → exception PostgreSQL →
-- tous les reads sur profiles (et autres tables) échouent silencieusement.
-- auth.email() lit l'email directement depuis le JWT, sans permission requise.
-- ============================================================

-- ── profiles (cause principale du bug ERP) ─────────────────────────────────
DROP POLICY IF EXISTS "profiles_bluwa_admin" ON profiles;
CREATE POLICY "profiles_bluwa_admin" ON profiles FOR ALL
  USING (auth.email() LIKE '%@bluwa.io');

-- ── organizations ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orgs_bluwa_admin" ON organizations;
CREATE POLICY "orgs_bluwa_admin" ON organizations FOR ALL
  USING (auth.email() LIKE '%@bluwa.io');

-- ── factories ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "factories_bluwa_admin" ON factories;
CREATE POLICY "factories_bluwa_admin" ON factories FOR ALL
  USING (auth.email() LIKE '%@bluwa.io');

-- ── user_site_access ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_site_access_bluwa_admin" ON user_site_access;
CREATE POLICY "user_site_access_bluwa_admin" ON user_site_access FOR ALL
  USING (auth.email() LIKE '%@bluwa.io');

-- ── subscription_plans ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sp_bluwa_admin" ON subscription_plans;
CREATE POLICY "sp_bluwa_admin" ON subscription_plans FOR ALL
  USING (auth.email() LIKE '%@bluwa.io');

-- ── tables merchant ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_bluwa_admin"       ON users;
DROP POLICY IF EXISTS "install_fees_admin"       ON installation_fees;
DROP POLICY IF EXISTS "service_orders_admin"     ON service_orders;
DROP POLICY IF EXISTS "invoices_admin"           ON invoices;
DROP POLICY IF EXISTS "tickets_admin"            ON support_tickets;
DROP POLICY IF EXISTS "pipeline_admin"           ON onboarding_pipeline;
DROP POLICY IF EXISTS "checklist_admin"          ON onboarding_checklist;
DROP POLICY IF EXISTS "comments_admin"           ON onboarding_comments;

CREATE POLICY "users_bluwa_admin"     ON users               FOR ALL USING (auth.email() LIKE '%@bluwa.io');
CREATE POLICY "install_fees_admin"    ON installation_fees   FOR ALL USING (auth.email() LIKE '%@bluwa.io');
CREATE POLICY "service_orders_admin"  ON service_orders      FOR ALL USING (auth.email() LIKE '%@bluwa.io');
CREATE POLICY "invoices_admin"        ON invoices            FOR ALL USING (auth.email() LIKE '%@bluwa.io');
CREATE POLICY "tickets_admin"         ON support_tickets     FOR ALL USING (auth.email() LIKE '%@bluwa.io');
CREATE POLICY "pipeline_admin"        ON onboarding_pipeline FOR ALL USING (auth.email() LIKE '%@bluwa.io');
CREATE POLICY "checklist_admin"       ON onboarding_checklist FOR ALL USING (auth.email() LIKE '%@bluwa.io');
CREATE POLICY "comments_admin"        ON onboarding_comments  FOR ALL USING (auth.email() LIKE '%@bluwa.io');
