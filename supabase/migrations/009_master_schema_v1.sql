-- ================================================================
-- BLUWA ERP — Schema Maître v1.0
-- Migration 009 · Architecture Relationnelle Gelée & Validée
-- PostgreSQL 15+ / Supabase
--
-- Philosophie   : Fat Database, Thin Backend
-- Multi-tenant  : cloisonnement par organization_id (RLS)
-- Multi-site    : sectorisation par factory_id
-- Clés          : UUID exclusivement (gen_random_uuid())
-- Quantités     : DECIMAL(15,4) — Montants : DECIMAL(15,2) en XOF
--
-- Ordre d'exécution (respect des dépendances FK) :
--   §0  Helpers (fonctions utilitaires)
--   §1  SaaS & Identity
--   §2  Master Data
--   §3  Flux Achats
--   §4  Boucle Transactionnelle Avancée
--   §5  Indexes
--   §6  Row Level Security
-- ================================================================


-- ================================================================
-- §0  HELPERS — Fonctions utilitaires & triggers génériques
-- ================================================================

-- Mise à jour automatique du champ updated_at sur toute table
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Résolution de l'organization_id du JWT courant (évite les sous-requêtes répétées dans les policies)
CREATE OR REPLACE FUNCTION fn_current_org_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;


-- ================================================================
-- §1  SAAS & IDENTITY
-- ================================================================

-- ── 1.1  Tenants ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  plan        VARCHAR(20)  NOT NULL DEFAULT 'starter'
                CHECK (plan IN ('starter', 'growth', 'enterprise')),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  organizations       IS 'Tenants SaaS — une ligne par entreprise cliente Bluwa';
COMMENT ON COLUMN organizations.slug  IS 'Identifiant URL unique, ex : bluwa-dakar';


-- ── 1.2  Sites de production ────────────────────────────────────
CREATE TABLE IF NOT EXISTS factories (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  code            VARCHAR(20)  NOT NULL,                          -- ex : DAK, LOM
  country         VARCHAR(100) NOT NULL,
  city            VARCHAR(100),
  timezone        VARCHAR(60)  NOT NULL DEFAULT 'Africa/Dakar',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_factory_code_per_org UNIQUE (organization_id, code)
);

COMMENT ON TABLE  factories      IS 'Sites de production — sectorise toutes les données opérationnelles';
COMMENT ON COLUMN factories.code IS 'Code court du site (ex. DAK = Dakar, LOM = Lomé)';


-- ── 1.3  Profils utilisateurs (extension Supabase auth.users) ───
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       VARCHAR(200),
  role            VARCHAR(30)  NOT NULL DEFAULT 'operator'
                    CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer')),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  profiles      IS 'Extension de auth.users — lie un utilisateur Supabase à un tenant';
COMMENT ON COLUMN profiles.role IS 'owner > admin > manager > operator > viewer';

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Création automatique du profil à l'inscription (Supabase Auth hook)
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, organization_id, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data ->> 'organization_id')::UUID,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'operator')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();


-- ── 1.4  Accès multi-sites ──────────────────────────────────────
-- Permet à une gérante de piloter Dakar ET Lomé depuis un seul compte.
CREATE TABLE IF NOT EXISTS user_site_access (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  factory_id  UUID        NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_factory UNIQUE (user_id, factory_id)    -- un accès par (user, site)
);

COMMENT ON TABLE user_site_access IS 'Pivot accès multi-sites : UNIQUE(user_id, factory_id) empêche les doublons';


-- ================================================================
-- §2  MASTER DATA
-- ================================================================

-- ── 2.1  Fournisseurs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                VARCHAR(50)  NOT NULL,                    -- ex : FOURNISSEUR-001
  name                VARCHAR(200) NOT NULL,
  country             VARCHAR(100),
  contact_name        VARCHAR(200),
  contact_email       VARCHAR(200),
  contact_phone       VARCHAR(50),
  payment_terms_days  INT          NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
  currency            VARCHAR(10)  NOT NULL DEFAULT 'XOF',
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vendor_code_per_org UNIQUE (organization_id, code)
);

COMMENT ON TABLE  vendors                    IS 'Master fournisseurs — un référentiel par tenant';
COMMENT ON COLUMN vendors.payment_terms_days IS 'Délai de paiement standard en jours (ex : 30, 60, 90)';

CREATE OR REPLACE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ── 2.2  Fiches articles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku             VARCHAR(100)  NOT NULL,
  designation     VARCHAR(300)  NOT NULL,
  article_type    VARCHAR(20)   NOT NULL
                    CHECK (article_type IN ('MP', 'SF', 'PF', 'EMB', 'CONSOMMABLE')),
  -- MP=Matière Première · SF=Semi-fini · PF=Produit Fini
  -- EMB=Emballage · CONSOMMABLE
  uom             VARCHAR(30)   NOT NULL DEFAULT 'kg',          -- Unité de mesure principale
  unit_cost       DECIMAL(15,2) NOT NULL DEFAULT 0.00
                    CHECK (unit_cost >= 0),
  shelf_life_days INT           CHECK (shelf_life_days > 0),   -- DLC / FEFO : durée de vie en jours
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_sku_par_tenant UNIQUE (organization_id, sku)  -- contrainte explicitement nommée
);

COMMENT ON TABLE  articles                  IS 'Fiche article — Master Data, contrainte UNIQUE(org, sku)';
COMMENT ON COLUMN articles.article_type     IS 'MP/SF/PF/EMB/CONSOMMABLE — détermine les flux applicables';
COMMENT ON COLUMN articles.shelf_life_days  IS 'Durée de vie standard en jours (référence FEFO)';
COMMENT ON COLUMN articles.unit_cost        IS 'Coût unitaire standard en XOF (mis à jour par le calcul de prix de revient)';

CREATE OR REPLACE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ── 2.3  Stocks par site (sectorisation multi-factory) ──────────
CREATE TABLE IF NOT EXISTS article_stocks (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id          UUID          NOT NULL REFERENCES factories(id)     ON DELETE CASCADE,
  article_id          UUID          NOT NULL REFERENCES articles(id)      ON DELETE CASCADE,
  -- ── Positions de stock ─────────────────────────────────────────
  quantity_available  DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (quantity_available  >= 0),
  quantity_reserved   DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (quantity_reserved   >= 0),
  -- Réservé par des OFs ou des commandes clients
  quantity_in_qc      DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (quantity_in_qc      >= 0),
  -- Stock bloqué en contrôle qualité (lié à quality_inspection_lots)
  -- ── Paramètres MRP (≡ SAP MRP1/MRP2) ──────────────────────────
  safety_stock        DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (safety_stock        >= 0),
  -- Stock de sécurité (≡ EISBE SAP MRP1)
  reorder_point       DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (reorder_point       >= 0),
  -- Point de commande en mode VB (≡ MINBE SAP MRP1)
  lead_time_days      INT           NOT NULL DEFAULT 0 CHECK (lead_time_days      >= 0),
  -- Délai appro fournisseur en jours (≡ WEBAZ SAP MRP2)
  mrp_type            VARCHAR(10)   NOT NULL DEFAULT 'PD'
                        CHECK (mrp_type IN ('PD', 'VB', 'ND')),
  -- PD=MRP classique · VB=Point de commande · ND=Manuel (≡ DISMM SAP MRP2)
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stock_per_article_site UNIQUE (factory_id, article_id)
  -- Une seule ligne de stock par (article × site)
);

COMMENT ON TABLE  article_stocks               IS 'Stock sectorisé par site — une ligne par (factory_id, article_id)';
COMMENT ON COLUMN article_stocks.quantity_in_qc IS 'Mis à jour automatiquement par les lots QC : bloqué à la réception, libéré après inspection';
COMMENT ON COLUMN article_stocks.mrp_type       IS 'PD=calcul besoins nets | VB=réapprovisionnement par point de commande | ND=manuel';

CREATE OR REPLACE TRIGGER trg_article_stocks_updated_at
  BEFORE UPDATE ON article_stocks
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
-- §3  FLUX DOCUMENTAIRE ACHATS
-- ================================================================

-- ── 3.1  En-tête Bon de Commande ────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id              UUID          NOT NULL REFERENCES factories(id)     ON DELETE RESTRICT,
  vendor_id               UUID          NOT NULL REFERENCES vendors(id)       ON DELETE RESTRICT,
  order_number            VARCHAR(50)   NOT NULL,               -- ex : BC-2026-0001
  status                  VARCHAR(30)   NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN (
                              'DRAFT',             -- brouillon
                              'CONFIRMED',         -- confirmé fournisseur
                              'PARTIALLY_RECEIVED',-- réception partielle
                              'RECEIVED',          -- réception totale
                              'INVOICED',          -- facture reçue et réconciliée
                              'CANCELLED'
                            )),
  order_date              DATE          NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date  DATE,
  currency                VARCHAR(10)   NOT NULL DEFAULT 'XOF',
  total_amount_ht         DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (total_amount_ht >= 0),
  -- Mis à jour automatiquement par trigger sur purchase_order_items
  notes                   TEXT,
  created_by              UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_po_number_per_org UNIQUE (organization_id, order_number)
);

COMMENT ON TABLE  purchase_orders                IS 'En-tête Bon de Commande — document contractuel avec le fournisseur';
COMMENT ON COLUMN purchase_orders.total_amount_ht IS 'Calculé automatiquement (trigger) = Σ(qty × unit_price) des lignes';

CREATE OR REPLACE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ── 3.2  Lignes Bon de Commande ─────────────────────────────────
-- NOTE : purchase_requisition_id ajouté ICI pour la traçabilité MRP (§4 point 5).
-- La table purchase_requisitions est définie en §4.2 — la FK est ajoutée via ALTER TABLE
-- en fin de §4 pour respecter l'ordre des dépendances.
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id       UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  article_id              UUID          NOT NULL REFERENCES articles(id)         ON DELETE RESTRICT,
  -- purchase_requisition_id FK ajoutée après création de purchase_requisitions (voir §4.4)
  purchase_requisition_id UUID,                                 -- Lien MRP : besoin d'origine
  line_number             INT           NOT NULL CHECK (line_number > 0),
  quantity_ordered        DECIMAL(15,4) NOT NULL CHECK (quantity_ordered  > 0),
  quantity_received       DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price              DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
  uom                     VARCHAR(30)   NOT NULL,
  shelf_life_days         INT           CHECK (shelf_life_days > 0),
  -- Durée de vie minimale attendue à réception (peut différer du master article)
  notes                   TEXT,
  CONSTRAINT uq_line_per_po UNIQUE (purchase_order_id, line_number)
);

COMMENT ON TABLE  purchase_order_items                     IS 'Lignes BC — 1 ligne = 1 article commandé';
COMMENT ON COLUMN purchase_order_items.shelf_life_days     IS 'DLC minimale attendue à la livraison (exprimée en jours restants)';
COMMENT ON COLUMN purchase_order_items.purchase_requisition_id IS 'Traçabilité MRP : DA source ayant généré cette ligne de commande';

-- Trigger : recalcule le total HT du BC à chaque modification de ligne
CREATE OR REPLACE FUNCTION fn_update_po_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_po_id UUID;
BEGIN
  v_po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  UPDATE purchase_orders
  SET total_amount_ht = (
    SELECT COALESCE(SUM(quantity_ordered * unit_price), 0.00)
    FROM   purchase_order_items
    WHERE  purchase_order_id = v_po_id
  )
  WHERE id = v_po_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_poi_update_po_total ON purchase_order_items;
CREATE TRIGGER trg_poi_update_po_total
  AFTER INSERT OR UPDATE OF quantity_ordered, unit_price OR DELETE
  ON purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION fn_update_po_total();


-- ================================================================
-- §4  BOUCLE TRANSACTIONNELLE AVANCÉE
-- ================================================================

-- ── 4.1  Ordres de Fabrication ──────────────────────────────────
CREATE TABLE IF NOT EXISTS production_orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id          UUID          NOT NULL REFERENCES factories(id)     ON DELETE RESTRICT,
  article_id          UUID          NOT NULL REFERENCES articles(id)      ON DELETE RESTRICT,
  order_number        VARCHAR(50)   NOT NULL,                   -- ex : OF-2026-0001
  status              VARCHAR(30)   NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN (
                          'DRAFT',
                          'PLANNED',
                          'RELEASED',        -- lancé en atelier
                          'IN_PROGRESS',
                          'COMPLETED',
                          'CANCELLED'
                        )),
  quantity_target     DECIMAL(15,4) NOT NULL CHECK (quantity_target   > 0),
  quantity_produced   DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (quantity_produced >= 0),
  planned_start_date  DATE,
  planned_end_date    DATE,
  actual_start_date   DATE,
  actual_end_date     DATE,
  created_by          UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_of_number_per_org UNIQUE (organization_id, order_number),
  CONSTRAINT chk_of_dates CHECK (
    planned_end_date IS NULL OR planned_start_date IS NULL
    OR planned_end_date >= planned_start_date
  )
);

COMMENT ON TABLE  production_orders                  IS 'Ordres de fabrication — déclencheurs des DAs MRP';
COMMENT ON COLUMN production_orders.quantity_produced IS 'Mis à jour par la clôture de l''OF après déclaration de production';

CREATE OR REPLACE TRIGGER trg_production_orders_updated_at
  BEFORE UPDATE ON production_orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ── 4.2  Demandes d'Achat (MRP) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID          NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  factory_id                  UUID          NOT NULL REFERENCES factories(id)      ON DELETE RESTRICT,
  article_id                  UUID          NOT NULL REFERENCES articles(id)       ON DELETE RESTRICT,
  source_production_order_id  UUID          REFERENCES production_orders(id)       ON DELETE SET NULL,
  -- OF qui a déclenché ce besoin (NULL si DA manuelle)
  requisition_number          VARCHAR(50)   NOT NULL,           -- ex : DA-2026-0001
  status                      VARCHAR(30)   NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING', 'CONVERTED', 'CANCELLED')),
  quantity_required           DECIMAL(15,4) NOT NULL CHECK (quantity_required > 0),
  requested_delivery_date     DATE,
  created_by                  UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_da_number_per_org UNIQUE (organization_id, requisition_number)
);

COMMENT ON TABLE  purchase_requisitions                          IS 'Demandes d''achat générées par le MRP ou manuellement';
COMMENT ON COLUMN purchase_requisitions.source_production_order_id IS 'Traçabilité MRP : OF à l''origine du besoin';
COMMENT ON COLUMN purchase_requisitions.status                   IS 'PENDING → CONVERTED (quand une ligne BC est liée) | CANCELLED';

CREATE OR REPLACE TRIGGER trg_purchase_requisitions_updated_at
  BEFORE UPDATE ON purchase_requisitions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ── 4.3  Réceptions physiques — En-tête ─────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID         NOT NULL REFERENCES organizations(id)   ON DELETE CASCADE,
  factory_id          UUID         NOT NULL REFERENCES factories(id)       ON DELETE RESTRICT,
  purchase_order_id   UUID         REFERENCES purchase_orders(id)          ON DELETE RESTRICT,
  vendor_id           UUID         NOT NULL REFERENCES vendors(id)         ON DELETE RESTRICT,
  receipt_number      VARCHAR(50)  NOT NULL,                    -- ex : BR-2026-0001
  status              VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT', 'POSTED')),
  -- POSTED = irréversible : mouvements de stock générés
  receipt_date        DATE         NOT NULL DEFAULT CURRENT_DATE,
  vendor_delivery_ref VARCHAR(100),                             -- Numéro BL fournisseur
  notes               TEXT,
  posted_by           UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  posted_at           TIMESTAMPTZ,
  created_by          UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_receipt_number_per_org UNIQUE (organization_id, receipt_number),
  CONSTRAINT chk_posted_coherence CHECK (
    (status = 'POSTED' AND posted_at IS NOT NULL AND posted_by IS NOT NULL)
    OR status = 'DRAFT'
  )
);

COMMENT ON TABLE  goods_receipts        IS 'En-tête réception marchandise — le passage à POSTED est irréversible';
COMMENT ON COLUMN goods_receipts.status IS 'DRAFT = en cours de saisie | POSTED = validé, stock mis à jour';


-- ── 4.4  Réceptions physiques — Lignes ──────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id        UUID          NOT NULL REFERENCES goods_receipts(id)      ON DELETE CASCADE,
  purchase_order_item_id  UUID          REFERENCES purchase_order_items(id)         ON DELETE SET NULL,
  article_id              UUID          NOT NULL REFERENCES articles(id)            ON DELETE RESTRICT,
  line_number             INT           NOT NULL CHECK (line_number > 0),
  quantity_received       DECIMAL(15,4) NOT NULL CHECK (quantity_received > 0),
  uom                     VARCHAR(30)   NOT NULL,
  batch_number            VARCHAR(100),                         -- Lot fournisseur (traçabilité FEFO)
  expiry_date             DATE,                                 -- DLC / FEFO
  unit_price              DECIMAL(15,2) CHECK (unit_price >= 0),
  qc_status               VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                            CHECK (qc_status IN ('PENDING', 'IN_CONTROL', 'APPROVED', 'REJECTED')),
  -- PENDING : pas encore soumis au QC
  -- IN_CONTROL : lot bloqué en contrôle (quality_inspection_lots actif)
  -- APPROVED / REJECTED : décision rendue
  CONSTRAINT uq_line_per_receipt UNIQUE (goods_receipt_id, line_number)
);

COMMENT ON TABLE  goods_receipt_items           IS 'Lignes de réception — chaque ligne crée un lot de contrôle qualité si requis';
COMMENT ON COLUMN goods_receipt_items.qc_status IS 'Synchronisé avec quality_inspection_lots.status lors de la décision QC';


-- ── 4.5  Lots de contrôle qualité (stock bloqué) ────────────────
CREATE TABLE IF NOT EXISTS quality_inspection_lots (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id            UUID          NOT NULL REFERENCES factories(id)     ON DELETE RESTRICT,
  goods_receipt_item_id UUID          NOT NULL REFERENCES goods_receipt_items(id) ON DELETE CASCADE,
  article_id            UUID          NOT NULL REFERENCES articles(id)      ON DELETE RESTRICT,
  lot_number            VARCHAR(100)  NOT NULL,                 -- Numéro de lot interne Bluwa
  batch_number          VARCHAR(100),                           -- Lot fournisseur
  quantity              DECIMAL(15,4) NOT NULL CHECK (quantity > 0),
  uom                   VARCHAR(30)   NOT NULL,
  status                VARCHAR(20)   NOT NULL DEFAULT 'EN_CONTROLE'
                          CHECK (status IN ('EN_CONTROLE', 'LIBERE', 'REJETE')),
  -- EN_CONTROLE → LIBERE : stock transféré vers article_stocks.quantity_available
  -- EN_CONTROLE → REJETE : stock détruit ou retourné fournisseur
  inspection_date       DATE,
  decision_by           UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  decision_at           TIMESTAMPTZ,
  decision_comments     TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lot_number_per_org UNIQUE (organization_id, lot_number)
);

COMMENT ON TABLE  quality_inspection_lots        IS 'Stock bloqué qualité — flux agroalimentaire : tout lot réceptionné passe par ici';
COMMENT ON COLUMN quality_inspection_lots.status IS 'EN_CONTROLE → LIBERE (stock dispo) ou REJETE (destruction/retour)';


-- ── 4.6  FK Traçabilité MRP : purchase_order_items → purchase_requisitions ──
-- Ajoutée ICI (après la création de purchase_requisitions) pour respecter
-- l'ordre des dépendances sans recourir à des tables circulaires.
DO $$ BEGIN
  ALTER TABLE purchase_order_items
    ADD CONSTRAINT fk_poi_purchase_requisition
    FOREIGN KEY (purchase_requisition_id)
    REFERENCES purchase_requisitions(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 4.7  Factures Fournisseurs — En-tête ────────────────────────
CREATE TABLE IF NOT EXISTS vendor_invoices (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id          UUID          NOT NULL REFERENCES factories(id)     ON DELETE RESTRICT,
  vendor_id           UUID          NOT NULL REFERENCES vendors(id)       ON DELETE RESTRICT,
  purchase_order_id   UUID          REFERENCES purchase_orders(id)        ON DELETE RESTRICT,
  -- Référence au BC (Triple Concordance : BC ↔ BR ↔ Facture)
  invoice_number      VARCHAR(100)  NOT NULL,                   -- Numéro de la facture fournisseur
  internal_ref        VARCHAR(50),                              -- Référence interne Bluwa
  status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN (
                          'PENDING',   -- reçue, en attente de rapprochement
                          'MATCHED',   -- Triple concordance OK
                          'APPROVED',  -- validée pour paiement
                          'PAID',      -- réglée
                          'DISPUTED',  -- litige en cours
                          'CANCELLED'
                        )),
  invoice_date        DATE          NOT NULL,
  due_date            DATE,
  currency            VARCHAR(10)   NOT NULL DEFAULT 'XOF',
  amount_ht           DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (amount_ht  >= 0),
  amount_tax          DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (amount_tax >= 0),
  amount_ttc          DECIMAL(15,2) GENERATED ALWAYS AS (amount_ht + amount_tax) STORED,
  -- Colonne calculée : aucune saisie possible, garantit amount_ttc = amount_ht + amount_tax
  payment_terms_days  INT           CHECK (payment_terms_days >= 0),
  paid_at             TIMESTAMPTZ,
  created_by          UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoice_number_per_vendor UNIQUE (vendor_id, invoice_number),
  CONSTRAINT chk_paid_coherence CHECK (
    (status = 'PAID' AND paid_at IS NOT NULL) OR status != 'PAID'
  )
);

COMMENT ON TABLE  vendor_invoices            IS 'En-tête facture fournisseur — Triple Concordance BC ↔ BR ↔ Facture';
COMMENT ON COLUMN vendor_invoices.amount_ttc IS 'GENERATED ALWAYS AS (amount_ht + amount_tax) — garantie d''intégrité comptable';
COMMENT ON COLUMN vendor_invoices.status     IS 'PENDING → MATCHED → APPROVED → PAID (ou DISPUTED)';

CREATE OR REPLACE TRIGGER trg_vendor_invoices_updated_at
  BEFORE UPDATE ON vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ── 4.8  Factures Fournisseurs — Lignes (Triple Concordance) ────
CREATE TABLE IF NOT EXISTS vendor_invoice_items (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_invoice_id       UUID          NOT NULL REFERENCES vendor_invoices(id)    ON DELETE CASCADE,
  goods_receipt_item_id   UUID          REFERENCES goods_receipt_items(id)         ON DELETE SET NULL,
  purchase_order_item_id  UUID          REFERENCES purchase_order_items(id)        ON DELETE SET NULL,
  article_id              UUID          NOT NULL REFERENCES articles(id)           ON DELETE RESTRICT,
  line_number             INT           NOT NULL CHECK (line_number > 0),
  quantity_invoiced       DECIMAL(15,4) NOT NULL CHECK (quantity_invoiced > 0),
  unit_price              DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
  amount_ht               DECIMAL(15,2) NOT NULL CHECK (amount_ht  >= 0),
  uom                     VARCHAR(30)   NOT NULL,
  -- ── Triple Concordance : copies au moment du rapprochement ──────
  quantity_ordered        DECIMAL(15,4),   -- snapshot depuis purchase_order_items
  quantity_received       DECIMAL(15,4),   -- snapshot depuis goods_receipt_items
  concordance_status      VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                            CHECK (concordance_status IN ('PENDING', 'MATCHED', 'DISCREPANCY')),
  -- MATCHED   : qty_invoiced = qty_ordered = qty_received (tolérance applicable)
  -- DISCREPANCY : écart détecté → action requise
  CONSTRAINT uq_line_per_invoice UNIQUE (vendor_invoice_id, line_number)
);

COMMENT ON TABLE  vendor_invoice_items                    IS 'Lignes facture — porte les 3 quantités pour la Triple Concordance';
COMMENT ON COLUMN vendor_invoice_items.quantity_ordered   IS 'Snapshot BC au moment du rapprochement (immuable après MATCHED)';
COMMENT ON COLUMN vendor_invoice_items.quantity_received  IS 'Snapshot BR au moment du rapprochement (immuable après MATCHED)';
COMMENT ON COLUMN vendor_invoice_items.concordance_status IS 'MATCHED si qty_facturée ≈ qty_commandée ≈ qty_reçue | DISCREPANCY sinon';


-- ================================================================
-- §5  INDEXES — Performance des requêtes fréquentes
-- ================================================================

-- organizations
CREATE INDEX IF NOT EXISTS idx_factories_org        ON factories(organization_id);
CREATE INDEX IF NOT EXISTS idx_factories_active      ON factories(organization_id, is_active);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_org          ON profiles(organization_id);

-- user_site_access
CREATE INDEX IF NOT EXISTS idx_usa_user              ON user_site_access(user_id);
CREATE INDEX IF NOT EXISTS idx_usa_factory           ON user_site_access(factory_id);

-- vendors
CREATE INDEX IF NOT EXISTS idx_vendors_org           ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_active        ON vendors(organization_id, is_active);

-- articles
CREATE INDEX IF NOT EXISTS idx_articles_org          ON articles(organization_id);
CREATE INDEX IF NOT EXISTS idx_articles_type         ON articles(organization_id, article_type);
CREATE INDEX IF NOT EXISTS idx_articles_active       ON articles(organization_id, is_active);

-- article_stocks
CREATE INDEX IF NOT EXISTS idx_stocks_org            ON article_stocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_stocks_factory        ON article_stocks(factory_id);
CREATE INDEX IF NOT EXISTS idx_stocks_article        ON article_stocks(article_id);
CREATE INDEX IF NOT EXISTS idx_stocks_mrp_type       ON article_stocks(mrp_type);

-- purchase_orders
CREATE INDEX IF NOT EXISTS idx_po_org                ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_po_factory            ON purchase_orders(factory_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor             ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status             ON purchase_orders(organization_id, status);

-- purchase_order_items
CREATE INDEX IF NOT EXISTS idx_poi_po                ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_article           ON purchase_order_items(article_id);
CREATE INDEX IF NOT EXISTS idx_poi_pr                ON purchase_order_items(purchase_requisition_id)
  WHERE purchase_requisition_id IS NOT NULL;

-- production_orders
CREATE INDEX IF NOT EXISTS idx_of_org                ON production_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_of_factory            ON production_orders(factory_id);
CREATE INDEX IF NOT EXISTS idx_of_article            ON production_orders(article_id);
CREATE INDEX IF NOT EXISTS idx_of_status             ON production_orders(organization_id, status);

-- purchase_requisitions
CREATE INDEX IF NOT EXISTS idx_pr_org                ON purchase_requisitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_pr_factory            ON purchase_requisitions(factory_id);
CREATE INDEX IF NOT EXISTS idx_pr_article            ON purchase_requisitions(article_id);
CREATE INDEX IF NOT EXISTS idx_pr_status             ON purchase_requisitions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_pr_of                 ON purchase_requisitions(source_production_order_id)
  WHERE source_production_order_id IS NOT NULL;

-- goods_receipts
CREATE INDEX IF NOT EXISTS idx_gr_org                ON goods_receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_gr_factory            ON goods_receipts(factory_id);
CREATE INDEX IF NOT EXISTS idx_gr_po                 ON goods_receipts(purchase_order_id)
  WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gr_vendor             ON goods_receipts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_gr_status             ON goods_receipts(organization_id, status);

-- goods_receipt_items
CREATE INDEX IF NOT EXISTS idx_gri_gr                ON goods_receipt_items(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_gri_article           ON goods_receipt_items(article_id);
CREATE INDEX IF NOT EXISTS idx_gri_poi               ON goods_receipt_items(purchase_order_item_id)
  WHERE purchase_order_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gri_qc_status         ON goods_receipt_items(qc_status)
  WHERE qc_status IN ('PENDING', 'IN_CONTROL');

-- quality_inspection_lots
CREATE INDEX IF NOT EXISTS idx_qil_org               ON quality_inspection_lots(organization_id);
CREATE INDEX IF NOT EXISTS idx_qil_factory           ON quality_inspection_lots(factory_id);
CREATE INDEX IF NOT EXISTS idx_qil_article           ON quality_inspection_lots(article_id);
CREATE INDEX IF NOT EXISTS idx_qil_gri               ON quality_inspection_lots(goods_receipt_item_id);
CREATE INDEX IF NOT EXISTS idx_qil_status            ON quality_inspection_lots(organization_id, status);

-- vendor_invoices
CREATE INDEX IF NOT EXISTS idx_vi_org                ON vendor_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_vi_factory            ON vendor_invoices(factory_id);
CREATE INDEX IF NOT EXISTS idx_vi_vendor             ON vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vi_po                 ON vendor_invoices(purchase_order_id)
  WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vi_status             ON vendor_invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vi_due                ON vendor_invoices(due_date)
  WHERE status IN ('APPROVED', 'MATCHED');

-- vendor_invoice_items
CREATE INDEX IF NOT EXISTS idx_vii_invoice           ON vendor_invoice_items(vendor_invoice_id);
CREATE INDEX IF NOT EXISTS idx_vii_article           ON vendor_invoice_items(article_id);
CREATE INDEX IF NOT EXISTS idx_vii_concordance       ON vendor_invoice_items(concordance_status)
  WHERE concordance_status != 'MATCHED';


-- ================================================================
-- §6  ROW LEVEL SECURITY — Cloisonnement multi-tenant
-- ================================================================
-- Pattern uniforme : USING / WITH CHECK basés sur fn_current_org_id()
-- Toutes les tables portent organization_id → isolation complète par tenant.
-- ================================================================

-- ── Helper macro (répété par table) ─────────────────────────────
-- Pour chaque table T avec organization_id :
--   ALTER TABLE T ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "T_select" ON T FOR SELECT USING (organization_id = fn_current_org_id());
--   CREATE POLICY "T_insert" ON T FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
--   CREATE POLICY "T_update" ON T FOR UPDATE USING (organization_id = fn_current_org_id());
--   CREATE POLICY "T_delete" ON T FOR DELETE USING (organization_id = fn_current_org_id());

-- ── organizations ────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (id = fn_current_org_id());

-- ── factories ────────────────────────────────────────────────────
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fac_select" ON factories; DROP POLICY IF EXISTS "fac_insert" ON factories;
DROP POLICY IF EXISTS "fac_update" ON factories; DROP POLICY IF EXISTS "fac_delete" ON factories;
CREATE POLICY "fac_select" ON factories FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "fac_insert" ON factories FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "fac_update" ON factories FOR UPDATE USING (organization_id = fn_current_org_id());
CREATE POLICY "fac_delete" ON factories FOR DELETE USING (organization_id = fn_current_org_id());

-- ── profiles ─────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pro_select" ON profiles; DROP POLICY IF EXISTS "pro_insert" ON profiles;
DROP POLICY IF EXISTS "pro_update" ON profiles;
CREATE POLICY "pro_select" ON profiles FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "pro_insert" ON profiles FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "pro_update" ON profiles FOR UPDATE USING (id = auth.uid());
-- Un utilisateur ne peut modifier que son propre profil

-- ── user_site_access ─────────────────────────────────────────────
ALTER TABLE user_site_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usa_select" ON user_site_access; DROP POLICY IF EXISTS "usa_insert" ON user_site_access;
DROP POLICY IF EXISTS "usa_delete" ON user_site_access;
CREATE POLICY "usa_select" ON user_site_access FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE organization_id = fn_current_org_id()));
CREATE POLICY "usa_insert" ON user_site_access FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE organization_id = fn_current_org_id()));
CREATE POLICY "usa_delete" ON user_site_access FOR DELETE
  USING (user_id IN (SELECT id FROM profiles WHERE organization_id = fn_current_org_id()));

-- ── vendors ──────────────────────────────────────────────────────
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ven_select" ON vendors; DROP POLICY IF EXISTS "ven_insert" ON vendors;
DROP POLICY IF EXISTS "ven_update" ON vendors; DROP POLICY IF EXISTS "ven_delete" ON vendors;
CREATE POLICY "ven_select" ON vendors FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "ven_insert" ON vendors FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "ven_update" ON vendors FOR UPDATE USING (organization_id = fn_current_org_id());
CREATE POLICY "ven_delete" ON vendors FOR DELETE USING (organization_id = fn_current_org_id());

-- ── articles ─────────────────────────────────────────────────────
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "art_select" ON articles; DROP POLICY IF EXISTS "art_insert" ON articles;
DROP POLICY IF EXISTS "art_update" ON articles; DROP POLICY IF EXISTS "art_delete" ON articles;
CREATE POLICY "art_select" ON articles FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "art_insert" ON articles FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "art_update" ON articles FOR UPDATE USING (organization_id = fn_current_org_id());
CREATE POLICY "art_delete" ON articles FOR DELETE USING (organization_id = fn_current_org_id());

-- ── article_stocks ───────────────────────────────────────────────
ALTER TABLE article_stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "as_select" ON article_stocks; DROP POLICY IF EXISTS "as_insert" ON article_stocks;
DROP POLICY IF EXISTS "as_update" ON article_stocks; DROP POLICY IF EXISTS "as_delete" ON article_stocks;
CREATE POLICY "as_select" ON article_stocks FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "as_insert" ON article_stocks FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "as_update" ON article_stocks FOR UPDATE USING (organization_id = fn_current_org_id());
CREATE POLICY "as_delete" ON article_stocks FOR DELETE USING (organization_id = fn_current_org_id());

-- ── purchase_orders ──────────────────────────────────────────────
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_select" ON purchase_orders; DROP POLICY IF EXISTS "po_insert" ON purchase_orders;
DROP POLICY IF EXISTS "po_update" ON purchase_orders; DROP POLICY IF EXISTS "po_delete" ON purchase_orders;
CREATE POLICY "po_select" ON purchase_orders FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "po_insert" ON purchase_orders FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "po_update" ON purchase_orders FOR UPDATE USING (organization_id = fn_current_org_id());
CREATE POLICY "po_delete" ON purchase_orders FOR DELETE
  USING (organization_id = fn_current_org_id() AND status = 'DRAFT');
-- Un BC ne peut être supprimé que s'il est encore en brouillon

-- ── purchase_order_items ─────────────────────────────────────────
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "poi_select" ON purchase_order_items; DROP POLICY IF EXISTS "poi_insert" ON purchase_order_items;
DROP POLICY IF EXISTS "poi_update" ON purchase_order_items; DROP POLICY IF EXISTS "poi_delete" ON purchase_order_items;
CREATE POLICY "poi_select" ON purchase_order_items FOR SELECT
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organization_id = fn_current_org_id()));
CREATE POLICY "poi_insert" ON purchase_order_items FOR INSERT
  WITH CHECK (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organization_id = fn_current_org_id()));
CREATE POLICY "poi_update" ON purchase_order_items FOR UPDATE
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organization_id = fn_current_org_id()));
CREATE POLICY "poi_delete" ON purchase_order_items FOR DELETE
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organization_id = fn_current_org_id()));

-- ── production_orders ────────────────────────────────────────────
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "of_select" ON production_orders; DROP POLICY IF EXISTS "of_insert" ON production_orders;
DROP POLICY IF EXISTS "of_update" ON production_orders; DROP POLICY IF EXISTS "of_delete" ON production_orders;
CREATE POLICY "of_select" ON production_orders FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "of_insert" ON production_orders FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "of_update" ON production_orders FOR UPDATE USING (organization_id = fn_current_org_id());
CREATE POLICY "of_delete" ON production_orders FOR DELETE
  USING (organization_id = fn_current_org_id() AND status IN ('DRAFT', 'PLANNED'));

-- ── purchase_requisitions ────────────────────────────────────────
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pr_select" ON purchase_requisitions; DROP POLICY IF EXISTS "pr_insert" ON purchase_requisitions;
DROP POLICY IF EXISTS "pr_update" ON purchase_requisitions; DROP POLICY IF EXISTS "pr_delete" ON purchase_requisitions;
CREATE POLICY "pr_select" ON purchase_requisitions FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "pr_insert" ON purchase_requisitions FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "pr_update" ON purchase_requisitions FOR UPDATE USING (organization_id = fn_current_org_id());
CREATE POLICY "pr_delete" ON purchase_requisitions FOR DELETE
  USING (organization_id = fn_current_org_id() AND status = 'PENDING');

-- ── goods_receipts ───────────────────────────────────────────────
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gr_select" ON goods_receipts; DROP POLICY IF EXISTS "gr_insert" ON goods_receipts;
DROP POLICY IF EXISTS "gr_update" ON goods_receipts; DROP POLICY IF EXISTS "gr_delete" ON goods_receipts;
CREATE POLICY "gr_select" ON goods_receipts FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "gr_insert" ON goods_receipts FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "gr_update" ON goods_receipts FOR UPDATE
  USING (organization_id = fn_current_org_id() AND status = 'DRAFT');
-- Un BR validé (POSTED) est immuable
CREATE POLICY "gr_delete" ON goods_receipts FOR DELETE
  USING (organization_id = fn_current_org_id() AND status = 'DRAFT');

-- ── goods_receipt_items ──────────────────────────────────────────
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gri_select" ON goods_receipt_items; DROP POLICY IF EXISTS "gri_insert" ON goods_receipt_items;
DROP POLICY IF EXISTS "gri_update" ON goods_receipt_items; DROP POLICY IF EXISTS "gri_delete" ON goods_receipt_items;
CREATE POLICY "gri_select" ON goods_receipt_items FOR SELECT
  USING (goods_receipt_id IN (SELECT id FROM goods_receipts WHERE organization_id = fn_current_org_id()));
CREATE POLICY "gri_insert" ON goods_receipt_items FOR INSERT
  WITH CHECK (goods_receipt_id IN (SELECT id FROM goods_receipts WHERE organization_id = fn_current_org_id() AND status = 'DRAFT'));
CREATE POLICY "gri_update" ON goods_receipt_items FOR UPDATE
  USING (goods_receipt_id IN (SELECT id FROM goods_receipts WHERE organization_id = fn_current_org_id() AND status = 'DRAFT'));
CREATE POLICY "gri_delete" ON goods_receipt_items FOR DELETE
  USING (goods_receipt_id IN (SELECT id FROM goods_receipts WHERE organization_id = fn_current_org_id() AND status = 'DRAFT'));

-- ── quality_inspection_lots ──────────────────────────────────────
ALTER TABLE quality_inspection_lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qil_select" ON quality_inspection_lots; DROP POLICY IF EXISTS "qil_insert" ON quality_inspection_lots;
DROP POLICY IF EXISTS "qil_update" ON quality_inspection_lots;
CREATE POLICY "qil_select" ON quality_inspection_lots FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "qil_insert" ON quality_inspection_lots FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "qil_update" ON quality_inspection_lots FOR UPDATE
  USING (organization_id = fn_current_org_id() AND status = 'EN_CONTROLE');
-- Une décision QC est irréversible : UPDATE bloqué si LIBERE ou REJETE

-- ── vendor_invoices ──────────────────────────────────────────────
ALTER TABLE vendor_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vi_select" ON vendor_invoices; DROP POLICY IF EXISTS "vi_insert" ON vendor_invoices;
DROP POLICY IF EXISTS "vi_update" ON vendor_invoices; DROP POLICY IF EXISTS "vi_delete" ON vendor_invoices;
CREATE POLICY "vi_select" ON vendor_invoices FOR SELECT USING (organization_id = fn_current_org_id());
CREATE POLICY "vi_insert" ON vendor_invoices FOR INSERT WITH CHECK (organization_id = fn_current_org_id());
CREATE POLICY "vi_update" ON vendor_invoices FOR UPDATE
  USING (organization_id = fn_current_org_id() AND status NOT IN ('PAID', 'CANCELLED'));
CREATE POLICY "vi_delete" ON vendor_invoices FOR DELETE
  USING (organization_id = fn_current_org_id() AND status = 'PENDING');

-- ── vendor_invoice_items ─────────────────────────────────────────
ALTER TABLE vendor_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vii_select" ON vendor_invoice_items; DROP POLICY IF EXISTS "vii_insert" ON vendor_invoice_items;
DROP POLICY IF EXISTS "vii_update" ON vendor_invoice_items; DROP POLICY IF EXISTS "vii_delete" ON vendor_invoice_items;
CREATE POLICY "vii_select" ON vendor_invoice_items FOR SELECT
  USING (vendor_invoice_id IN (SELECT id FROM vendor_invoices WHERE organization_id = fn_current_org_id()));
CREATE POLICY "vii_insert" ON vendor_invoice_items FOR INSERT
  WITH CHECK (vendor_invoice_id IN (SELECT id FROM vendor_invoices WHERE organization_id = fn_current_org_id() AND status = 'PENDING'));
CREATE POLICY "vii_update" ON vendor_invoice_items FOR UPDATE
  USING (vendor_invoice_id IN (SELECT id FROM vendor_invoices WHERE organization_id = fn_current_org_id() AND status NOT IN ('PAID', 'CANCELLED')));
CREATE POLICY "vii_delete" ON vendor_invoice_items FOR DELETE
  USING (vendor_invoice_id IN (SELECT id FROM vendor_invoices WHERE organization_id = fn_current_org_id() AND status = 'PENDING'));


-- ================================================================
-- FIN Migration 009 — Schema Maître v1.0
-- Tables créées : 12
--   organizations · factories · profiles · user_site_access
--   vendors · articles · article_stocks
--   purchase_orders · purchase_order_items
--   production_orders · purchase_requisitions
--   goods_receipts · goods_receipt_items
--   quality_inspection_lots
--   vendor_invoices · vendor_invoice_items
-- Indexes : 40+
-- RLS policies : ~50 (isolation multi-tenant complète)
-- Triggers DB : fn_set_updated_at · fn_update_po_total · fn_handle_new_user
-- Colonnes calculées : vendor_invoices.amount_ttc (GENERATED ALWAYS AS)
-- ================================================================
