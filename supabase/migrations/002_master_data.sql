-- ============================================================
-- Bluwa ERP — Master Data
-- Migration 002 — Articles, Fournisseurs, Clients + liens factories
-- ============================================================


-- ── Helpers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_user_org()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION fn_user_factories()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT factory_id FROM user_site_access WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION fn_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('owner', 'admin') FROM profiles WHERE id = auth.uid()
$$;


-- ================================================================
-- §1  TABLES
-- ================================================================

-- ── Articles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code             TEXT        NOT NULL,
  designation      TEXT        NOT NULL,
  type             TEXT        NOT NULL
                     CHECK (type IN ('MP', 'PSF', 'PF', 'AC', 'CS')),
  statut           TEXT        NOT NULL DEFAULT 'EnCreation'
                     CHECK (statut IN ('Actif', 'Bloque', 'EnCreation')),
  famille          TEXT,
  sous_famille     TEXT,
  unite_stock      TEXT        NOT NULL DEFAULT 'kg',
  unite_vente      TEXT,
  coeff_conversion NUMERIC     DEFAULT 1,
  poids_unitaire   NUMERIC,
  volume_unitaire  NUMERIC,
  duree_vie        INTEGER,
  stock_securite   NUMERIC,
  point_commande   NUMERIC,
  appro            TEXT        NOT NULL DEFAULT 'Achete'
                     CHECK (appro IN ('Achete', 'Fabrique')),
  gestion_lot      BOOLEAN     NOT NULL DEFAULT TRUE,
  code_barres      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_article_code_per_org UNIQUE (organization_id, code)
);

COMMENT ON COLUMN articles.type      IS 'MP=Matière Première, PSF=Semi-fini, PF=Produit Fini, AC=Article Consommable, CS=Consommable';
COMMENT ON COLUMN articles.appro     IS 'Achete=appro externe, Fabrique=produit en interne (OF)';
COMMENT ON COLUMN articles.duree_vie IS 'Durée de vie en jours — utilisée pour le calcul DLC des lots';

DO $$ BEGIN
  CREATE TRIGGER trg_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_articles_org    ON articles(organization_id);
CREATE INDEX IF NOT EXISTS idx_articles_type   ON articles(type);
CREATE INDEX IF NOT EXISTS idx_articles_statut ON articles(statut);


-- ── Article ↔ Factory links ───────────────────────────────
CREATE TABLE IF NOT EXISTS article_factory_links (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES articles(id)  ON DELETE CASCADE,
  factory_id UUID        NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_article_factory UNIQUE (article_id, factory_id)
);

COMMENT ON TABLE article_factory_links IS 'Territoire : quelles factories peuvent utiliser quel article';

CREATE INDEX IF NOT EXISTS idx_afl_article ON article_factory_links(article_id);
CREATE INDEX IF NOT EXISTS idx_afl_factory ON article_factory_links(factory_id);


-- ── Fournisseurs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fournisseurs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code              TEXT        NOT NULL,
  raison_sociale    TEXT        NOT NULL,
  statut            TEXT        NOT NULL DEFAULT 'Actif'
                      CHECK (statut IN ('Actif', 'Bloque')),
  qualification     TEXT        NOT NULL DEFAULT 'AQualifier'
                      CHECK (qualification IN ('Agree', 'AQualifier', 'Suspendu')),
  categorie         TEXT,
  devise            TEXT        NOT NULL DEFAULT 'XOF',
  contact_principal TEXT,
  telephone         TEXT,
  email             TEXT,
  ville             TEXT,
  pays              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_fournisseur_code_per_org UNIQUE (organization_id, code)
);

DO $$ BEGIN
  CREATE TRIGGER trg_fournisseurs_updated_at
    BEFORE UPDATE ON fournisseurs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_fournisseurs_org ON fournisseurs(organization_id);


-- ── Fournisseur ↔ Factory links ───────────────────────────
CREATE TABLE IF NOT EXISTS fournisseur_factory_links (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_id UUID        NOT NULL REFERENCES fournisseurs(id) ON DELETE CASCADE,
  factory_id     UUID        NOT NULL REFERENCES factories(id)    ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_fournisseur_factory UNIQUE (fournisseur_id, factory_id)
);

COMMENT ON TABLE fournisseur_factory_links IS 'Territoire : quelles factories travaillent avec quel fournisseur';

CREATE INDEX IF NOT EXISTS idx_ffl_fournisseur ON fournisseur_factory_links(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_ffl_factory     ON fournisseur_factory_links(factory_id);


-- ── Clients ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code               TEXT        NOT NULL,
  raison_sociale     TEXT        NOT NULL,
  statut             TEXT        NOT NULL DEFAULT 'Actif'
                       CHECK (statut IN ('Actif', 'Inactif')),
  type               TEXT
                       CHECK (type IN ('Grossiste', 'Detaillant', 'Institutionnel', 'ONG', 'Export', 'Autre')),
  contact_principal  TEXT,
  telephone          TEXT,
  email              TEXT,
  ville              TEXT,
  pays               TEXT,
  condition_paiement TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_client_code_per_org UNIQUE (organization_id, code)
);

DO $$ BEGIN
  CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);


-- ── Client ↔ Factory links ────────────────────────────────
CREATE TABLE IF NOT EXISTS client_factory_links (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID        NOT NULL REFERENCES clients(id)   ON DELETE CASCADE,
  factory_id UUID        NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_client_factory UNIQUE (client_id, factory_id)
);

COMMENT ON TABLE client_factory_links IS 'Territoire : quelles factories gèrent quel client';

CREATE INDEX IF NOT EXISTS idx_cfl_client  ON client_factory_links(client_id);
CREATE INDEX IF NOT EXISTS idx_cfl_factory ON client_factory_links(factory_id);


-- ================================================================
-- §2  RLS (toutes les tables existent maintenant)
-- ================================================================

ALTER TABLE articles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_factory_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseur_factory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_factory_links   ENABLE ROW LEVEL SECURITY;

-- Articles
DROP POLICY IF EXISTS "articles_select" ON articles;
DROP POLICY IF EXISTS "articles_insert" ON articles;
DROP POLICY IF EXISTS "articles_update" ON articles;
DROP POLICY IF EXISTS "articles_delete" ON articles;

CREATE POLICY "articles_select" ON articles FOR SELECT USING (
  organization_id = fn_user_org()
  AND (
    fn_is_admin()
    OR id IN (
      SELECT article_id FROM article_factory_links
      WHERE factory_id IN (SELECT fn_user_factories())
    )
  )
);
CREATE POLICY "articles_insert" ON articles FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);
CREATE POLICY "articles_update" ON articles FOR UPDATE USING (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);
CREATE POLICY "articles_delete" ON articles FOR DELETE USING (
  organization_id = fn_user_org() AND fn_is_admin()
);

-- Article factory links
DROP POLICY IF EXISTS "afl_select" ON article_factory_links;
DROP POLICY IF EXISTS "afl_admin"  ON article_factory_links;

CREATE POLICY "afl_select" ON article_factory_links FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories()) OR fn_is_admin()
);
CREATE POLICY "afl_admin" ON article_factory_links FOR ALL USING (fn_is_admin());

-- Fournisseurs
DROP POLICY IF EXISTS "fournisseurs_select" ON fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_insert" ON fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_update" ON fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_delete" ON fournisseurs;

CREATE POLICY "fournisseurs_select" ON fournisseurs FOR SELECT USING (
  organization_id = fn_user_org()
  AND (
    fn_is_admin()
    OR id IN (
      SELECT fournisseur_id FROM fournisseur_factory_links
      WHERE factory_id IN (SELECT fn_user_factories())
    )
  )
);
CREATE POLICY "fournisseurs_insert" ON fournisseurs FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);
CREATE POLICY "fournisseurs_update" ON fournisseurs FOR UPDATE USING (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);
CREATE POLICY "fournisseurs_delete" ON fournisseurs FOR DELETE USING (
  organization_id = fn_user_org() AND fn_is_admin()
);

-- Fournisseur factory links
DROP POLICY IF EXISTS "ffl_select" ON fournisseur_factory_links;
DROP POLICY IF EXISTS "ffl_admin"  ON fournisseur_factory_links;

CREATE POLICY "ffl_select" ON fournisseur_factory_links FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories()) OR fn_is_admin()
);
CREATE POLICY "ffl_admin" ON fournisseur_factory_links FOR ALL USING (fn_is_admin());

-- Clients
DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_select" ON clients FOR SELECT USING (
  organization_id = fn_user_org()
  AND (
    fn_is_admin()
    OR id IN (
      SELECT client_id FROM client_factory_links
      WHERE factory_id IN (SELECT fn_user_factories())
    )
  )
);
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (
  organization_id = fn_user_org()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
);
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (
  organization_id = fn_user_org() AND fn_is_admin()
);

-- Client factory links
DROP POLICY IF EXISTS "cfl_select" ON client_factory_links;
DROP POLICY IF EXISTS "cfl_admin"  ON client_factory_links;

CREATE POLICY "cfl_select" ON client_factory_links FOR SELECT USING (
  factory_id IN (SELECT fn_user_factories()) OR fn_is_admin()
);
CREATE POLICY "cfl_admin" ON client_factory_links FOR ALL USING (fn_is_admin());


-- ================================================================
-- §3  FONCTIONS RECHERCHE CROSS-FACTORY (création de commande)
-- ================================================================

CREATE OR REPLACE FUNCTION search_clients_for_order(
  p_factory_id UUID,
  p_query      TEXT DEFAULT ''
)
RETURNS TABLE (
  id              UUID,
  code            TEXT,
  raison_sociale  TEXT,
  ville           TEXT,
  pays            TEXT,
  est_lie         BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    c.id, c.code, c.raison_sociale, c.ville, c.pays,
    EXISTS (
      SELECT 1 FROM client_factory_links cfl
      WHERE cfl.client_id = c.id AND cfl.factory_id = p_factory_id
    ) AS est_lie
  FROM clients c
  WHERE c.organization_id = fn_user_org()
    AND c.statut = 'Actif'
    AND (p_query = '' OR c.raison_sociale ILIKE '%' || p_query || '%' OR c.code ILIKE '%' || p_query || '%')
  ORDER BY est_lie DESC, c.raison_sociale
$$;

CREATE OR REPLACE FUNCTION search_fournisseurs_for_order(
  p_factory_id UUID,
  p_query      TEXT DEFAULT ''
)
RETURNS TABLE (
  id             UUID,
  code           TEXT,
  raison_sociale TEXT,
  ville          TEXT,
  pays           TEXT,
  est_lie        BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    f.id, f.code, f.raison_sociale, f.ville, f.pays,
    EXISTS (
      SELECT 1 FROM fournisseur_factory_links ffl
      WHERE ffl.fournisseur_id = f.id AND ffl.factory_id = p_factory_id
    ) AS est_lie
  FROM fournisseurs f
  WHERE f.organization_id = fn_user_org()
    AND f.statut = 'Actif'
    AND (p_query = '' OR f.raison_sociale ILIKE '%' || p_query || '%' OR f.code ILIKE '%' || p_query || '%')
  ORDER BY est_lie DESC, f.raison_sociale
$$;
