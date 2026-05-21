-- ============================================================
-- ERP Agro-Alimentaire — Tables métier
-- Migration 002 — Articles, Fournisseurs, Clients, Stocks
-- ============================================================

-- ── ARTICLES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  designation       TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('MP','PSF','PF','AC','CS')),
  statut            TEXT NOT NULL DEFAULT 'EnCreation' CHECK (statut IN ('Actif','Bloque','EnCreation')),
  famille           TEXT,
  sous_famille      TEXT,
  categorie         TEXT,
  unite_stock       TEXT NOT NULL DEFAULT '',
  unite_vente       TEXT,
  coeff_conversion  NUMERIC DEFAULT 1,
  dernier_prix_achat NUMERIC,
  prix_vente        NUMERIC,
  pmp               NUMERIC,
  poids_unitaire    NUMERIC,
  volume_unitaire   NUMERIC,
  duree_vie         INTEGER,
  stock_securite    NUMERIC,
  point_commande    NUMERIC,
  appro             TEXT DEFAULT 'Achete' CHECK (appro IN ('Achete','Fabrique')),
  gestion_lot       BOOLEAN DEFAULT TRUE,
  delai_controle    INTEGER,
  protocole_controle TEXT,
  code_barres       TEXT,
  qr_code           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articles_org_select" ON articles FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "articles_org_insert" ON articles FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "articles_org_update" ON articles FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "articles_org_delete" ON articles FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS articles_org_idx ON articles(organization_id);
CREATE INDEX IF NOT EXISTS articles_type_idx ON articles(type);
CREATE INDEX IF NOT EXISTS articles_statut_idx ON articles(statut);


-- ── FOURNISSEURS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fournisseurs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  raison_sociale    TEXT NOT NULL,
  statut            TEXT DEFAULT 'Formel' CHECK (statut IN ('Formel','Informel')),
  qualification     TEXT DEFAULT 'AQualifier' CHECK (qualification IN ('Agree','AQualifier','Suspendu')),
  categorie         TEXT,
  devise            TEXT DEFAULT 'XOF',
  contact_principal TEXT,
  telephone         TEXT,
  email             TEXT,
  ville             TEXT,
  pays              TEXT,
  mode_logistique   TEXT,
  paiement_mobile   BOOLEAN DEFAULT FALSE,
  score_fiabilite   NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fournisseurs_org_select" ON fournisseurs FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "fournisseurs_org_insert" ON fournisseurs FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "fournisseurs_org_update" ON fournisseurs FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "fournisseurs_org_delete" ON fournisseurs FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS fournisseurs_org_idx ON fournisseurs(organization_id);


-- ── CLIENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  raison_sociale    TEXT NOT NULL,
  statut            TEXT DEFAULT 'Actif' CHECK (statut IN ('Actif','Inactif')),
  type              TEXT CHECK (type IN ('Grossiste','Detaillant','Institutionnel','ONG','Export','Autre')),
  secteur           TEXT,
  langue            TEXT DEFAULT 'Français',
  ville             TEXT,
  pays              TEXT,
  incoterm          TEXT,
  transport         TEXT,
  limite_credit     NUMERIC,
  condition_paiement TEXT,
  paiement_mobile   BOOLEAN DEFAULT FALSE,
  contact_principal TEXT,
  telephone         TEXT,
  email             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_org_select" ON clients FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "clients_org_insert" ON clients FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "clients_org_update" ON clients FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "clients_org_delete" ON clients FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS clients_org_idx ON clients(organization_id);


-- ── GRILLES TARIFAIRES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS grilles_tarifaires (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  article_code  TEXT NOT NULL,
  designation   TEXT,
  prix_negocie  NUMERIC NOT NULL,
  devise        TEXT DEFAULT 'XOF',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, article_code)
);

ALTER TABLE grilles_tarifaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grilles_select" ON grilles_tarifaires FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients
    WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));
CREATE POLICY "grilles_insert" ON grilles_tarifaires FOR INSERT
  WITH CHECK (client_id IN (
    SELECT id FROM clients
    WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));
CREATE POLICY "grilles_update" ON grilles_tarifaires FOR UPDATE
  USING (client_id IN (
    SELECT id FROM clients
    WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));
CREATE POLICY "grilles_delete" ON grilles_tarifaires FOR DELETE
  USING (client_id IN (
    SELECT id FROM clients
    WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));


-- ── ENTREPÔTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entrepots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  nom             TEXT NOT NULL,
  emplacements    TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

ALTER TABLE entrepots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entrepots_org_select" ON entrepots FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "entrepots_org_insert" ON entrepots FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "entrepots_org_update" ON entrepots FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ── LIGNES DE STOCK ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_code    TEXT NOT NULL,
  article_designation TEXT,
  article_type    TEXT,
  entrepot_code   TEXT,
  entrepot_nom    TEXT,
  emplacement     TEXT,
  lot             TEXT,
  date_peremption DATE,
  quantite        NUMERIC DEFAULT 0,
  unite           TEXT,
  pmp             NUMERIC,
  stock_securite  NUMERIC,
  point_commande  NUMERIC,
  statut          TEXT DEFAULT 'OK' CHECK (statut IN ('OK','Alerte','Rupture','Exces')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stocks_org_select" ON stocks FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "stocks_org_insert" ON stocks FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "stocks_org_update" ON stocks FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS stocks_org_idx ON stocks(organization_id);
CREATE INDEX IF NOT EXISTS stocks_article_idx ON stocks(article_code);


-- ── MOUVEMENTS DE STOCK ────────────────────────────────────
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  type              TEXT NOT NULL CHECK (type IN ('Entree','Sortie','Transfert','Ajustement')),
  article_code      TEXT NOT NULL,
  article_designation TEXT,
  lot               TEXT,
  quantite          NUMERIC NOT NULL,
  unite             TEXT,
  entrepot_source   TEXT,
  entrepot_dest     TEXT,
  reference         TEXT,
  motif             TEXT,
  operateur         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mouvements_org_select" ON mouvements_stock FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "mouvements_org_insert" ON mouvements_stock FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS mouvements_org_idx ON mouvements_stock(organization_id);
CREATE INDEX IF NOT EXISTS mouvements_date_idx ON mouvements_stock(date DESC);


-- ── TRIGGERS updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fournisseurs_updated_at BEFORE UPDATE ON fournisseurs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER stocks_updated_at BEFORE UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
