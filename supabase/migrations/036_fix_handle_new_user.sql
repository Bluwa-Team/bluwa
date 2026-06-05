-- ============================================================
-- Migration 036 — Correction fn_handle_new_user
--
-- Problème : profiles.organization_id est NOT NULL.
-- Pour un nouvel utilisateur Google OAuth, raw_user_meta_data
-- ne contient pas encore organization_id → INSERT échoue
-- → Supabase retourne "Database error saving new user".
--
-- Fix : n'insérer dans profiles QUE si organization_id est
-- présent dans les métadonnées (cas invitation ou signup email
-- avec org déjà connue). Les nouveaux utilisateurs OAuth sont
-- créés sans profil ; l'onboarding les rattache ensuite à un tenant.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id UUID;
  v_role   TEXT;
BEGIN
  -- Lecture sécurisée de organization_id (ignore si absent ou invalide)
  BEGIN
    v_org_id := (NEW.raw_user_meta_data ->> 'organization_id')::UUID;
  EXCEPTION WHEN others THEN
    v_org_id := NULL;
  END;

  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'operator');

  -- N'insère dans profiles que si organization_id est disponible
  -- (invitation ou création manuelle). Les nouveaux utilisateurs OAuth
  -- passent par l'onboarding qui crée l'organisation et le profil.
  IF v_org_id IS NOT NULL THEN
    INSERT INTO profiles (id, organization_id, full_name, role)
    VALUES (
      NEW.id,
      v_org_id,
      COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_app_meta_data  ->> 'full_name',
        split_part(NEW.email, '@', 1)
      ),
      v_role
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
