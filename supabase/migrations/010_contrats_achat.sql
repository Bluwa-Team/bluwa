-- ================================================================
-- Migration 010 — Contrats d'achat cadres
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Correspondance SAP : EKKO/EKPV (contrats-cadres fournisseurs)
-- FK sur fournisseurs(id) — table active en production (migration 002)
--
-- DÉPENDANCES : migration 002 appliquée (fournisseurs, organizations)
-- ================================================================

CREATE TABLE IF NOT EXISTS contrats_achat (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fournisseur_id  UUID           NOT NULL REFERENCES fournisseurs(id)  ON DELETE CASCADE,
  reference       TEXT           NOT NULL,
  -- Ex : CT-2026-0001 — unicité par tenant
  article         TEXT           NOT NULL,
  -- Libellé libre de la matière/article concerné par le contrat
  date_debut      DATE           NOT NULL,
  date_fin        DATE           NOT NULL,
  prix_unitaire   DECIMAL(15, 4) NOT NULL CHECK (prix_unitaire  >= 0),
  devise          TEXT           NOT NULL DEFAULT 'XOF',
  quantite_min    DECIMAL(15, 4) NOT NULL DEFAULT 0 CHECK (quantite_min >= 0),
  unite           TEXT           NOT NULL DEFAULT 'kg',
  statut          TEXT           NOT NULL DEFAULT 'EnNegociation'
                    CHECK (statut IN ('Actif', 'Expire', 'EnNegociation')),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_contrat_reference_per_org UNIQUE (organization_id, reference),
  CONSTRAINT chk_dates_contrat CHECK (date_fin > date_debut)
);

COMMENT ON TABLE  contrats_achat              IS 'Contrats-cadres fournisseur (≡ EKKO/EKPV SAP) — conditions négociées sur une période';
COMMENT ON COLUMN contrats_achat.prix_unitaire IS 'Prix contractuel unitaire en devise';
COMMENT ON COLUMN contrats_achat.quantite_min  IS 'Quantité minimum de commande définie au contrat';

-- Mise à jour automatique de updated_at
DO $$ BEGIN
  CREATE TRIGGER contrats_achat_updated_at
    BEFORE UPDATE ON contrats_achat
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
EXCEPTION WHEN undefined_function THEN
  -- moddatetime non disponible : fallback trigger générique
  NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS ca_org_fournisseur_idx ON contrats_achat(organization_id, fournisseur_id);
CREATE INDEX IF NOT EXISTS ca_statut_dates_idx    ON contrats_achat(organization_id, statut, date_debut, date_fin);

-- Row Level Security
ALTER TABLE contrats_achat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ca_select" ON contrats_achat;
DROP POLICY IF EXISTS "ca_insert" ON contrats_achat;
DROP POLICY IF EXISTS "ca_update" ON contrats_achat;
DROP POLICY IF EXISTS "ca_delete" ON contrats_achat;

CREATE POLICY "ca_select" ON contrats_achat FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ca_insert" ON contrats_achat FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ca_update" ON contrats_achat FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ca_delete" ON contrats_achat FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ================================================================
-- FIN migration 010
-- ================================================================
