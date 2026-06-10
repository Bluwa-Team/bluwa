-- ================================================================
-- Migration 003 — Architecture SAP-grade
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Correspondances SAP :
--   organizations      → MANDT  (mandant / tenant)
--   factories          → T001W  (sites de production)
--   profiles           → USR21  (utilisateurs liés à un site)
--   suppliers            → LFA1   (fournisseurs Master Data)
--   articles           → MARA   (catalogue article — sans stock global)
--   articles_stocks    → MARC   (stock par site)
--   purchase_orders    → EKKO   (en-tête commande fournisseur)
--   purchase_order_items → EKPO (lignes commande fournisseur)
--   contrats_achat     → EKKO/EKPV (contrats-cadres)
--
-- STRATÉGIE D'APPLICATION :
--   Idempotente — utilise CREATE TABLE IF NOT EXISTS et
--   ALTER TABLE ADD COLUMN IF NOT EXISTS.
--   Les DROP POLICY IF EXISTS nettoient avant recréation.
--   Les INSERT ... ON CONFLICT DO NOTHING migrent les données
--   existantes sans risque de doublon.
-- ================================================================

-- update_updated_at() est déjà définie en 002 (CREATE OR REPLACE)
-- On la réapplique pour sécurité
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- 1. ORGANIZATIONS (Mandant — MANDT)
-- ================================================================
-- La table est créée par completeOnboardingAction mais jamais
-- versionnée. On la formalise ici.

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_member_select" ON organizations;
CREATE POLICY "orgs_member_select" ON organizations FOR SELECT
  USING (
    id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

DO $$ BEGIN
  CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 2. FACTORIES (Sites de production — T001W)
-- ================================================================
-- Référentiel des sites physiques. Un tenant peut avoir N sites.
-- Un entrepôt, un lot de stock, un bon de commande sont toujours
-- rattachés à un site précis.

CREATE TABLE IF NOT EXISTS factories (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  address         TEXT,
  code            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "factories_org_select" ON factories;
DROP POLICY IF EXISTS "factories_org_insert" ON factories;
DROP POLICY IF EXISTS "factories_org_update" ON factories;
DROP POLICY IF EXISTS "factories_org_delete" ON factories;

CREATE POLICY "factories_org_select" ON factories FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "factories_org_insert" ON factories FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "factories_org_update" ON factories FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "factories_org_delete" ON factories FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS factories_org_idx ON factories(organization_id);

DO $$ BEGIN
  CREATE TRIGGER factories_updated_at BEFORE UPDATE ON factories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 3. PROFILES (Utilisateurs — extension de auth.users)
-- ================================================================
-- En Supabase, l'identité est gérée par auth.users (géré par
-- Supabase Auth). La table profiles est l'extension publique qui
-- porte les données métier (rôle, site, organisation).
--
-- FIX CRITIQUE : factory_id était hardcodé à NULL dans auth.ts.
--   NULL est désormais autorisé SEULEMENT pour org_admin
--   (accès multi-sites). Pour tout autre rôle, factory_id doit
--   être renseigné.

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id      UUID REFERENCES factories(id) ON DELETE SET NULL,
  -- NULL = admin avec accès global ; sinon obligatoire par contrainte applicative
  role            TEXT NOT NULL DEFAULT 'operator'
                    CHECK (role IN ('org_admin', 'site_manager', 'operator', 'viewer')),
  full_name       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Si profiles existe déjà (migration antérieure ou onboarding),
-- on ajoute factory_id sans toucher au reste
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_select"    ON profiles;
DROP POLICY IF EXISTS "profiles_org_select"     ON profiles;
DROP POLICY IF EXISTS "profiles_self_update"    ON profiles;

-- Un user voit son propre profil + tous les profils de son org
CREATE POLICY "profiles_self_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE INDEX IF NOT EXISTS profiles_org_idx     ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS profiles_factory_idx ON profiles(factory_id);

DO $$ BEGIN
  CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 4. VENDORS (Fournisseurs — Master Data LFA1)
-- ================================================================
-- Remplace le champ texte libre "fournisseur: string" sur les
-- commandes. Chaque commande lie désormais un UUID réel.
-- Les données sont migrées depuis la table fournisseurs existante.

CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  tax_number      TEXT,
  code            TEXT,
  vendor_type     TEXT        DEFAULT 'Formel'
                                CHECK (vendor_type IN ('Formel', 'Informel')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_org_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_org_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_org_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_org_delete" ON suppliers;

CREATE POLICY "suppliers_org_select" ON suppliers FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "suppliers_org_insert" ON suppliers FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "suppliers_org_update" ON suppliers FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "suppliers_org_delete" ON suppliers FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS suppliers_org_idx ON suppliers(organization_id);

DO $$ BEGIN
  CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Migration fournisseurs → suppliers ──────────────────────────
-- Copie les fournisseurs existants dans la nouvelle table propre.
-- ON CONFLICT DO NOTHING = idempotent (peut être rejoué).
INSERT INTO suppliers (id, organization_id, name, code, vendor_type, created_at, updated_at)
SELECT
  id,
  organization_id,
  raison_sociale,
  code,
  statut,       -- 'Formel' | 'Informel' — même valeurs
  created_at,
  updated_at
FROM fournisseurs
ON CONFLICT (organization_id, name) DO NOTHING;


-- ================================================================
-- 5. ARTICLES (Catalogue — MARA)
-- ================================================================
-- La table articles existante est conservée (ALTER, pas DROP).
-- PRINCIPE SAP : MARA ne contient pas de données de stock.
--   → stock_securite, point_commande, pmp, dernier_prix_achat
--     sont DEPRECATED ici — ils migrent vers articles_stocks.
--   → On les garde pour l'instant (rétrocompatibilité) mais ils
--     seront supprimés en migration 004 une fois articles_stocks
--     alimenté.
--
-- AJOUTS :
--   sku  = alias explicite de code (clé métier unique par org)
--   uom  = alias explicite de unite_stock (Unit of Measure)

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS uom TEXT;

-- Synchronise sku et uom depuis les colonnes existantes
UPDATE articles
SET
  sku = code,
  uom = unite_stock
WHERE sku IS NULL OR uom IS NULL;

-- Contrainte unicité sur sku par organisation (équivalent MATNR)
DO $$ BEGIN
  ALTER TABLE articles
    ADD CONSTRAINT articles_org_sku_unique UNIQUE (organization_id, sku);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN others           THEN NULL; END $$;

COMMENT ON COLUMN articles.stock_securite   IS 'DEPRECATED — migré vers articles_stocks.safety_stock (migration 004)';
COMMENT ON COLUMN articles.point_commande   IS 'DEPRECATED — migré vers articles_stocks.reorder_point (migration 004)';
COMMENT ON COLUMN articles.pmp              IS 'DEPRECATED — migré vers articles_stocks.pmp (migration 004)';
COMMENT ON COLUMN articles.dernier_prix_achat IS 'DEPRECATED — conservé en lecture seule, remplacé par purchase_order_items.unit_price_ht';


-- ================================================================
-- 6. ARTICLES_STOCKS (Stock par site — MARC)
-- ================================================================
-- UNE LIGNE = UN ARTICLE × UN SITE.
-- C'est ici que vit le stock disponible, le stock de sécurité
-- et le point de commande — jamais dans le catalogue article.
-- Contrainte UNIQUE (organization_id, article_id, factory_id)
-- garantit l'unicité : impossible d'avoir deux lignes de stock
-- pour le même article sur le même site.

CREATE TABLE IF NOT EXISTS articles_stocks (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id       UUID           NOT NULL REFERENCES articles(id)  ON DELETE CASCADE,
  factory_id       UUID           NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  quantity_on_hand DECIMAL(15, 4) NOT NULL DEFAULT 0,
  safety_stock     DECIMAL(15, 4),          -- stock de sécurité propre à ce site
  reorder_point    DECIMAL(15, 4),          -- point de commande propre à ce site
  pmp              DECIMAL(15, 4),          -- Prix Moyen Pondéré propre à ce site
  created_at       TIMESTAMPTZ    DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE (organization_id, article_id, factory_id)
);

ALTER TABLE articles_stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "astocks_org_select" ON articles_stocks;
DROP POLICY IF EXISTS "astocks_org_insert" ON articles_stocks;
DROP POLICY IF EXISTS "astocks_org_update" ON articles_stocks;

CREATE POLICY "astocks_org_select" ON articles_stocks FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "astocks_org_insert" ON articles_stocks FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "astocks_org_update" ON articles_stocks FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS astocks_org_idx      ON articles_stocks(organization_id);
CREATE INDEX IF NOT EXISTS astocks_article_idx  ON articles_stocks(article_id);
CREATE INDEX IF NOT EXISTS astocks_factory_idx  ON articles_stocks(factory_id);
-- Index composite pour la requête la plus fréquente : stock d'un site
CREATE INDEX IF NOT EXISTS astocks_site_article ON articles_stocks(factory_id, article_id);

DO $$ BEGIN
  CREATE TRIGGER astocks_updated_at BEFORE UPDATE ON articles_stocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 7. PURCHASE_ORDERS (En-tête commandes fournisseurs — EKKO)
-- ================================================================
-- Remplace BCHeader (TypeScript mock).
-- factory_id = site destinataire de la livraison.
-- supplier_id = FK réelle vers suppliers (fini le string texte).
-- created_by = FK vers profiles (traçabilité auteur).

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id      UUID         NOT NULL REFERENCES factories(id)   ON DELETE RESTRICT,
  supplier_id     UUID         NOT NULL REFERENCES suppliers(id)   ON DELETE RESTRICT,
  order_number    VARCHAR(50)  NOT NULL,
  order_type      VARCHAR(10)  NOT NULL DEFAULT 'BC'
                                 CHECK (order_type IN ('BC', 'BA')),
  contract_number VARCHAR(50),
  status          VARCHAR(30)  NOT NULL DEFAULT 'DRAFT'
                                 CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'RECEIVED')),
  currency        VARCHAR(3)   NOT NULL DEFAULT 'XOF',
  -- Multi-devises : XOF (UEMOA), XAF (CEMAC), EUR, USD, GHS…
  -- Le code ISO 4217 est libre — pas de CHECK pour ne pas bloquer les nouvelles devises.
  created_by      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  -- profiles.id = auth.users.id (extension publique de Supabase Auth)
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  CONSTRAINT unique_order_number_per_tenant UNIQUE (organization_id, order_number)
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "po_org_select" ON purchase_orders;
DROP POLICY IF EXISTS "po_org_insert" ON purchase_orders;
DROP POLICY IF EXISTS "po_org_update" ON purchase_orders;
DROP POLICY IF EXISTS "po_org_delete" ON purchase_orders;

CREATE POLICY "po_org_select" ON purchase_orders FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "po_org_insert" ON purchase_orders FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "po_org_update" ON purchase_orders FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "po_org_delete" ON purchase_orders FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS po_org_idx      ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS po_factory_idx  ON purchase_orders(factory_id);
CREATE INDEX IF NOT EXISTS po_supplier_idx ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS po_status_idx   ON purchase_orders(status);
-- Index pour la numérotation automatique (max order_number par org+type)
CREATE INDEX IF NOT EXISTS po_type_idx     ON purchase_orders(organization_id, order_type);

DO $$ BEGIN
  CREATE TRIGGER po_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 8. PURCHASE_ORDER_ITEMS (Lignes commandes — EKPO)
-- ================================================================
-- Remplace BCItem (TypeScript mock).
-- item_position = numéro de ligne dans la commande (1, 2, 3…)
--                 équivalent de EKPO.EBELP chez SAP.
-- article_id    = FK stricte vers articles.
--                 Pour les BA informels sans article en catalogue :
--                 article_id NULL accepté, article_label obligatoire.
-- quantity_received est retiré d'ici — il appartient à la table
-- de réception (goods_receipts_items) pour garder EKPO immuable.

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id      UUID           NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  article_id             UUID           REFERENCES articles(id) ON DELETE RESTRICT,
  article_label          TEXT           NOT NULL,
  -- Dénormalisé : permet de lire la ligne même si l'article est archivé
  item_position          INT            NOT NULL CHECK (item_position > 0),
  quantity               DECIMAL(15, 4) NOT NULL CHECK (quantity > 0),
  unit_price_ht          DECIMAL(15, 2) NOT NULL CHECK (unit_price_ht >= 0),
  shelf_life_days        INT,
  expected_delivery_date DATE           NOT NULL,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  CONSTRAINT unique_position_per_order UNIQUE (purchase_order_id, item_position)
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poi_po_select" ON purchase_order_items;
DROP POLICY IF EXISTS "poi_po_insert" ON purchase_order_items;
DROP POLICY IF EXISTS "poi_po_update" ON purchase_order_items;

-- RLS héritée de purchase_orders via sous-requête
CREATE POLICY "poi_po_select" ON purchase_order_items FOR SELECT
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY "poi_po_insert" ON purchase_order_items FOR INSERT
  WITH CHECK (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY "poi_po_update" ON purchase_order_items FOR UPDATE
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS poi_po_idx      ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS poi_article_idx ON purchase_order_items(article_id);


-- ================================================================
-- BONUS — CONTRATS_ACHAT (Contrats-cadres fournisseurs)
-- ================================================================
-- Requis par getContratActifByFournisseur() (lib/actions/approvisionnement.ts).
-- Un contrat lie un supplier à des conditions négociées sur une période.

CREATE TABLE IF NOT EXISTS contrats_achat (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id     UUID           NOT NULL REFERENCES suppliers(id),
  reference       TEXT           NOT NULL,       -- CT-2026-XXX
  article         TEXT           NOT NULL,
  date_debut      DATE           NOT NULL,
  date_fin        DATE           NOT NULL,
  prix_unitaire   DECIMAL(15, 4) NOT NULL CHECK (prix_unitaire >= 0),
  devise          TEXT           NOT NULL DEFAULT 'XOF',
  quantite_min    DECIMAL(15, 4) NOT NULL DEFAULT 0,
  unite           TEXT           NOT NULL DEFAULT 'kg',
  statut          TEXT           NOT NULL DEFAULT 'Actif'
                    CHECK (statut IN ('Actif', 'Expire', 'EnNegociation')),
  created_at      TIMESTAMPTZ    DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE (organization_id, reference),
  CONSTRAINT date_coherence CHECK (date_fin > date_debut)
);

ALTER TABLE contrats_achat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ca_org_select" ON contrats_achat;
DROP POLICY IF EXISTS "ca_org_insert" ON contrats_achat;
DROP POLICY IF EXISTS "ca_org_update" ON contrats_achat;

CREATE POLICY "ca_org_select" ON contrats_achat FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ca_org_insert" ON contrats_achat FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ca_org_update" ON contrats_achat FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index optimisé pour la requête getContratActifByFournisseur()
CREATE INDEX IF NOT EXISTS ca_supplier_statut_dates ON contrats_achat(organization_id, supplier_id, statut, date_debut, date_fin);

DO $$ BEGIN
  CREATE TRIGGER ca_updated_at BEFORE UPDATE ON contrats_achat
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- FIX — auth.ts : factory_id de l'org_admin
-- ================================================================
-- Le bug identifié en session 6 : lors de l'onboarding, la factory
-- est créée mais factory_id est passé NULL dans profiles.
-- Ce script ne peut pas corriger le code TypeScript, mais une fois
-- que auth.ts est corrigé (factory_id: factory.id), les nouveaux
-- tenants seront correctement liés.
--
-- Pour les tenants EXISTANTS, exécuter manuellement :
--
--   UPDATE profiles p
--   SET factory_id = (
--     SELECT id FROM factories f
--     WHERE f.organization_id = p.organization_id
--     LIMIT 1
--   )
--   WHERE p.factory_id IS NULL
--     AND p.role = 'org_admin';
--
-- ================================================================
-- FIN DE LA MIGRATION 003
-- ================================================================
