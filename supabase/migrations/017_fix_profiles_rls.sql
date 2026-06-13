-- ============================================================
-- Migration 017 — Isolation RLS profiles par organisation
-- ============================================================
-- Problème : profiles_select_own n'autorise chaque user qu'à voir
-- sa propre ligne → listOrgUsers retourne 0 membres pour les orgs
-- normales. Pour john@bluwa.io, profiles_bluwa_admin bypasse tout
-- et expose les profils de TOUTES les organisations.
--
-- Fix : ajouter profiles_select_same_org (fn_user_org, SECURITY
-- DEFINER → pas de récursion RLS) + supprimer profiles_bluwa_admin
-- qui ne doit pas piloter l'UI métier (les admins Bluwa utilisent
-- le dashboard Supabase directement).
-- ============================================================

-- Supprimer la policy trop permissive (expose tous les orgs)
DROP POLICY IF EXISTS profiles_bluwa_admin ON public.profiles;

-- Ajouter la policy d'isolation par org (fn_user_org est SECURITY DEFINER)
DROP POLICY IF EXISTS profiles_select_same_org ON public.profiles;
CREATE POLICY profiles_select_same_org ON public.profiles
  FOR SELECT
  USING (organization_id = public.fn_user_org());
