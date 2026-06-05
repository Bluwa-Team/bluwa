-- ============================================================
-- Migration 038 — Ajout du statut 'archived' sur organizations
-- Soft delete : l'organisation est conservée en base mais
-- ses utilisateurs ne peuvent plus accéder à l'ERP.
-- ============================================================

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_status_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_status_check
    CHECK (status IN ('active', 'trial', 'suspended', 'churned', 'archived'));

COMMENT ON COLUMN organizations.status IS
  'active | trial | suspended | churned | archived (soft delete)';
