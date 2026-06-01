-- Migration 019 : rend le trigger fn_handle_new_user robuste aux invitations
-- Problème : si organization_id est absent/invalide dans raw_user_meta_data,
-- le cast ::UUID échoue et bloque la création de l'utilisateur.

CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id  UUID;
  v_role    TEXT;
BEGIN
  -- Lecture sécurisée de organization_id (ignore si invalide)
  BEGIN
    v_org_id := (NEW.raw_user_meta_data ->> 'organization_id')::UUID;
  EXCEPTION WHEN others THEN
    v_org_id := NULL;
  END;

  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'operator');

  -- N'insère que si organization_id est disponible
  IF v_org_id IS NOT NULL THEN
    INSERT INTO profiles (id, organization_id, full_name, role)
    VALUES (
      NEW.id,
      v_org_id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
      v_role
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
