-- ============================================================
-- Bluwa ERP — Migration 026
-- Alignement schéma Master Data avec le frontend
-- Corrige les bugs d'enregistrement articles / clients / fournisseurs
-- + Module Référentiel (valeurs personnalisées : familles, unités, etc.)
-- ============================================================
--
-- Contexte : le frontend a évolué (colonnes secteur, langue, devise,
-- mode_logistique, grilles tarifaires, etc.) mais la migration 002
-- n'avait pas été mise à jour. Tout INSERT échouait donc sur une
-- colonne inexistante ou une contrainte CHECK violée.
-- ============================================================


-- ================================================================
-- §1  ARTICLES — colonnes manquantes
-- ================================================================

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS categorie               TEXT,
  ADD COLUMN IF NOT EXISTS prix_vente              NUMERIC,
  ADD COLUMN IF NOT EXISTS dernier_prix_achat      NUMERIC,
  ADD COLUMN IF NOT EXISTS pmp                     NUMERIC,
  ADD COLUMN IF NOT EXISTS delai_controle          INTEGER,
  ADD COLUMN IF NOT EXISTS seuil_alerte_peremption INTEGER,
  ADD COLUMN IF NOT EXISTS protocole_controle      TEXT,
  ADD COLUMN IF NOT EXISTS qr_code                 TEXT,
  ADD COLUMN IF NOT EXISTS devise                  TEXT DEFAULT 'XOF';


-- ================================================================
-- §2  CLIENTS — colonnes manquantes
-- ================================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS secteur          TEXT,
  ADD COLUMN IF NOT EXISTS langue           TEXT DEFAULT 'Français',
  ADD COLUMN IF NOT EXISTS incoterm         TEXT,
  ADD COLUMN IF NOT EXISTS transport        TEXT,
  ADD COLUMN IF NOT EXISTS limite_credit    NUMERIC,
  ADD COLUMN IF NOT EXISTS paiement_mobile  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS devise           TEXT DEFAULT 'XOF';


-- ================================================================
-- §3  FOURNISSEURS — colonnes manquantes + correction du statut
-- ================================================================

ALTER TABLE fournisseurs
  ADD COLUMN IF NOT EXISTS mode_logistique TEXT,
  ADD COLUMN IF NOT EXISTS paiement_mobile BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS score_fiabilite NUMERIC;

-- Le frontend utilise statut Formel|Informel (et non Actif|Bloque).
-- 1. Supprimer l'ancienne contrainte CHECK
ALTER TABLE fournisseurs DROP CONSTRAINT IF EXISTS fournisseurs_statut_check;

-- 2. Migrer les valeurs existantes (Actif → Formel, Bloque → Informel)
UPDATE fournisseurs SET statut = 'Formel'   WHERE statut = 'Actif';
UPDATE fournisseurs SET statut = 'Informel' WHERE statut = 'Bloque';

-- 3. Nouveau défaut + nouvelle contrainte
ALTER TABLE fournisseurs ALTER COLUMN statut SET DEFAULT 'Formel';
ALTER TABLE fournisseurs
  ADD CONSTRAINT fournisseurs_statut_check CHECK (statut IN ('Formel', 'Informel'));


-- ================================================================
-- §4  GRILLES TARIFAIRES — table manquante
-- ================================================================

CREATE TABLE IF NOT EXISTS grilles_tarifaires (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  article_code TEXT        NOT NULL,
  designation  TEXT,
  prix_negocie NUMERIC     NOT NULL,
  devise       TEXT        NOT NULL DEFAULT 'XOF',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_grille_client_article UNIQUE (client_id, article_code)
);

COMMENT ON TABLE grilles_tarifaires IS 'Prix de vente négociés par client et par article (PF/PSF)';

DO $$ BEGIN
  CREATE TRIGGER trg_grilles_tarifaires_updated_at
    BEFORE UPDATE ON grilles_tarifaires
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_grilles_client ON grilles_tarifaires(client_id);


-- ================================================================
-- §5  RÉFÉRENTIEL — valeurs personnalisées (familles, unités, etc.)
-- ================================================================
-- Table générique multi-tenant pour les listes que l'utilisateur peut
-- enrichir depuis l'UI (bouton « ajouter » dans les selects).
--
--   kind   : type de référentiel (voir CHECK)
--   value  : libellé saisi
--   parent : pour les hiérarchies (sous_famille → famille,
--            categorie → sous_famille). NULL sinon.

CREATE TABLE IF NOT EXISTS referentiel_values (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind            TEXT        NOT NULL
                    CHECK (kind IN (
                      'article_famille',
                      'article_sous_famille',
                      'article_categorie',
                      'unite_stock',
                      'unite_mesure'
                    )),
  value           TEXT        NOT NULL,
  parent          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_referentiel_value UNIQUE (organization_id, kind, value, parent)
);

COMMENT ON TABLE  referentiel_values        IS 'Valeurs de référentiel enrichies par l''utilisateur (familles, unités, catégories)';
COMMENT ON COLUMN referentiel_values.kind   IS 'Type : article_famille | article_sous_famille | article_categorie | unite_stock | unite_mesure';
COMMENT ON COLUMN referentiel_values.parent IS 'Valeur parente pour les hiérarchies (sous_famille→famille, categorie→sous_famille)';

CREATE INDEX IF NOT EXISTS idx_referentiel_org_kind ON referentiel_values(organization_id, kind);


-- ================================================================
-- §6  RLS — nouvelles tables
-- ================================================================

ALTER TABLE grilles_tarifaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE referentiel_values ENABLE ROW LEVEL SECURITY;

-- Grilles tarifaires : accessibles si le client parent est accessible
DROP POLICY IF EXISTS "grilles_select" ON grilles_tarifaires;
DROP POLICY IF EXISTS "grilles_write"  ON grilles_tarifaires;

CREATE POLICY "grilles_select" ON grilles_tarifaires FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE organization_id = fn_user_org())
);
CREATE POLICY "grilles_write" ON grilles_tarifaires FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE organization_id = fn_user_org())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);

-- Référentiel : lecture par toute l'org, écriture par manager+
DROP POLICY IF EXISTS "referentiel_select" ON referentiel_values;
DROP POLICY IF EXISTS "referentiel_write"  ON referentiel_values;

CREATE POLICY "referentiel_select" ON referentiel_values FOR SELECT USING (
  organization_id = fn_user_org()
);
CREATE POLICY "referentiel_write" ON referentiel_values FOR ALL USING (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);
