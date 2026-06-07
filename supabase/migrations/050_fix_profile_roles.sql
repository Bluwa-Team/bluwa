-- ============================================================
-- Migration 050 — Correction rôles profiles
-- Problème : fn_handle_new_user() met role='operator' par défaut
--            si raw_user_meta_data ne contient pas de champ role
--            → les fondateurs/owners se retrouvent avec role='operator'
-- ============================================================

-- §1 : Corriger les rôles existants
--      Premier utilisateur créé par org = owner (fondateur)
UPDATE profiles p
SET role = 'owner'
WHERE p.created_at = (
  SELECT MIN(p2.created_at)
  FROM profiles p2
  WHERE p2.organization_id = p.organization_id
)
AND p.role = 'operator';

-- §2 : Améliorer le trigger pour defaulter le premier user d'une org à 'owner'
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id  UUID;
  v_role    TEXT;
  v_count   INT;
BEGIN
  v_org_id := (NEW.raw_user_meta_data ->> 'organization_id')::UUID;

  -- Si pas d'org_id dans les metadata → rien à faire
  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Rôle : metadata > premier user de l'org (owner) > operator
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'operator');

  -- Si aucun profil n'existe encore dans cette org → c'est le fondateur
  SELECT COUNT(*) INTO v_count FROM profiles WHERE organization_id = v_org_id;
  IF v_count = 0 THEN
    v_role := 'owner';
  END IF;

  INSERT INTO profiles (id, organization_id, full_name, role)
  VALUES (
    NEW.id,
    v_org_id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
