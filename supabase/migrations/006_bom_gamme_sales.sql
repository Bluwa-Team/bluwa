-- ================================================================
-- Migration 006 — Nomenclatures, Gammes de fabrication,
--                 Postes de charge, Commandes clients
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Correspondances SAP :
--   bom_headers        → MAST / STKO   (en-tête nomenclature PP-CS10)
--   bom_items          → STPO          (postes nomenclature)
--   work_centers       → CR03          (poste de charge)
--   routing_headers    → PLKO          (en-tête gamme PP-CA10)
--   routing_steps      → PLPO          (opérations gamme)
--   sales_orders       → VBAK          (en-tête commande vente SD-VA01)
--   sales_order_items  → VBAP          (postes commande vente)
--
-- DÉPENDANCES : migrations 002–005 (organizations, factories,
--   articles, clients, purchase_orders).
--
-- STRATÉGIE D'APPLICATION :
--   Idempotente — CREATE TABLE IF NOT EXISTS.
--   DROP POLICY IF EXISTS avant chaque CREATE POLICY.
--   Triggers protégés par EXCEPTION WHEN duplicate_object.
-- ================================================================


-- ================================================================
-- 1. WORK_CENTERS  (Postes de charge — CR03 SAP)
-- ================================================================
-- Un poste de charge représente un équipement ou une cellule de
-- production avec son coût horaire.
-- Il est référencé par les opérations de la gamme pour calculer
-- le coût de fabrication (≡ taux horaire CR03).

CREATE TABLE IF NOT EXISTS work_centers (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  factory_id      UUID           NOT NULL REFERENCES factories(id)       ON DELETE RESTRICT,
  name            TEXT           NOT NULL,
  -- ex. 'Cuve inox 500L', 'Ligne embouteillage', 'Lab. qualité'
  rate_per_hour   DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (rate_per_hour >= 0),
  -- Taux horaire en XOF (utilisé pour le calcul du coût gamme)
  currency        VARCHAR(10)    NOT NULL DEFAULT 'XOF',
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_work_center_per_site UNIQUE (factory_id, name)
);

COMMENT ON TABLE  work_centers              IS 'Postes de charge (≡ CR03 SAP) — définit le coût horaire de chaque équipement ou cellule de production';
COMMENT ON COLUMN work_centers.rate_per_hour IS 'Taux horaire en currency : main-d''œuvre + amortissement + overhead du poste';

ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wc_org_select" ON work_centers;
DROP POLICY IF EXISTS "wc_org_insert" ON work_centers;
DROP POLICY IF EXISTS "wc_org_update" ON work_centers;
DROP POLICY IF EXISTS "wc_org_delete" ON work_centers;

CREATE POLICY "wc_org_select" ON work_centers FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wc_org_insert" ON work_centers FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wc_org_update" ON work_centers FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wc_org_delete" ON work_centers FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS wc_org_idx     ON work_centers(organization_id);
CREATE INDEX IF NOT EXISTS wc_factory_idx ON work_centers(factory_id);

DO $$ BEGIN
  CREATE TRIGGER wc_updated_at BEFORE UPDATE ON work_centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 2. BOM_HEADERS  (En-tête Nomenclature — MAST / STKO SAP)
-- ================================================================
-- Une nomenclature décrit la composition d'un PF ou PSF :
-- quels composants (MP, AC, CS) et en quelles quantités
-- pour produire 1 unité (batch_size = 1) ou un lot de référence.
--
-- Une seule nomenclature peut être ACTIVE par article à un instant T.
-- Les versions précédentes sont conservées pour la traçabilité des OF.
--
-- batch_size + batch_unit définissent le lot de référence :
--   ex. batch_size=100, batch_unit='btl' → les qtyPerUnit sont
--   la quantité de composant pour 100 bouteilles.
--   La qté par 1 unité = qty / batch_size.

CREATE TABLE IF NOT EXISTS bom_headers (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id      UUID           NOT NULL REFERENCES articles(id)       ON DELETE RESTRICT,
  -- article_id = PF ou PSF exclusivement (CHECK côté app)
  version         VARCHAR(20)    NOT NULL DEFAULT 'v1.0',
  batch_size      DECIMAL(15, 4) NOT NULL DEFAULT 1 CHECK (batch_size > 0),
  -- Taille du lot de référence pour les quantités des composants
  batch_unit      TEXT           NOT NULL DEFAULT '',
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_by      UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  -- Un seul BOM actif par article par tenant
  CONSTRAINT unique_active_bom_per_article EXCLUDE
    USING btree (organization_id WITH =, article_id WITH =, is_active WITH =)
    WHERE (is_active = TRUE)
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE  bom_headers           IS 'En-têtes des nomenclatures (≡ MAST/STKO SAP) — une seule version active par article PF/PSF';
COMMENT ON COLUMN bom_headers.batch_size IS 'Taille du lot de référence. Les quantités bom_items sont exprimées pour ce lot.';
COMMENT ON COLUMN bom_headers.version    IS 'Version de la nomenclature : v1.0, v1.1, v2.0 …';

ALTER TABLE bom_headers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bh_org_select" ON bom_headers;
DROP POLICY IF EXISTS "bh_org_insert" ON bom_headers;
DROP POLICY IF EXISTS "bh_org_update" ON bom_headers;
DROP POLICY IF EXISTS "bh_org_delete" ON bom_headers;

CREATE POLICY "bh_org_select" ON bom_headers FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bh_org_insert" ON bom_headers FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bh_org_update" ON bom_headers FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bh_org_delete" ON bom_headers FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index article (trouver la BOM active d'un PF)
CREATE INDEX IF NOT EXISTS bh_article_idx  ON bom_headers(article_id);
-- Index org (lister toutes les BOMs d'un tenant)
CREATE INDEX IF NOT EXISTS bh_org_idx      ON bom_headers(organization_id);
-- Index BOM actives par article (lookup fréquent lors calcul MRP)
CREATE INDEX IF NOT EXISTS bh_active_idx   ON bom_headers(organization_id, article_id, is_active)
  WHERE is_active = TRUE;

DO $$ BEGIN
  CREATE TRIGGER bh_updated_at BEFORE UPDATE ON bom_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 3. BOM_ITEMS  (Postes Nomenclature — STPO SAP)
-- ================================================================
-- Chaque ligne représente un composant et sa quantité pour le lot
-- de référence de la BOM parent.
--
-- La quantité par unité de PF se calcule :
--   qty_per_unit = quantity / bom_headers.batch_size
--
-- component_label est dénormalisé pour affichage même si
-- l'article est archivé ou supprimé (cohérence historique).

CREATE TABLE IF NOT EXISTS bom_items (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bom_header_id    UUID           NOT NULL REFERENCES bom_headers(id)   ON DELETE CASCADE,
  component_id     UUID           NOT NULL REFERENCES articles(id)       ON DELETE RESTRICT,
  component_label  TEXT           NOT NULL,
  -- Dénormalisé : articles.designation au moment de la création du poste
  item_position    INT            NOT NULL CHECK (item_position > 0),
  quantity         DECIMAL(15, 6) NOT NULL CHECK (quantity > 0),
  -- Quantité pour 1 lot de référence (batch_size unités)
  unit             TEXT           NOT NULL,
  -- UoM du composant (doit correspondre à articles.unite_stock)
  tolerance_pct    DECIMAL(5, 2)  NOT NULL DEFAULT 0 CHECK (tolerance_pct >= 0 AND tolerance_pct <= 100),
  -- Tolérance de variance autorisée à la pesée (ex. 5 = ±5%)
  scrap_pct        DECIMAL(5, 2)  NOT NULL DEFAULT 0 CHECK (scrap_pct >= 0 AND scrap_pct <= 100),
  -- Pertes / rebuts planifiés en % (ex. 2 = 2% de perte à la filtration)
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_component_per_bom UNIQUE (bom_header_id, component_id),
  CONSTRAINT unique_position_per_bom  UNIQUE (bom_header_id, item_position)
);

COMMENT ON TABLE  bom_items               IS 'Postes de nomenclature (≡ STPO SAP) — un composant + sa quantité par lot de référence';
COMMENT ON COLUMN bom_items.quantity       IS 'Quantité pour bom_headers.batch_size unités de PF (ex. 2.5 kg pour 100 btl)';
COMMENT ON COLUMN bom_items.tolerance_pct  IS 'Tolérance ±% autorisée à la pesée — génère une alerte si dépassée à la déclaration OF';
COMMENT ON COLUMN bom_items.scrap_pct      IS 'Perte planifiée en % — incluse dans le calcul du besoin MRP net';

ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bi_org_select" ON bom_items;
DROP POLICY IF EXISTS "bi_org_insert" ON bom_items;
DROP POLICY IF EXISTS "bi_org_update" ON bom_items;
DROP POLICY IF EXISTS "bi_org_delete" ON bom_items;

CREATE POLICY "bi_org_select" ON bom_items FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bi_org_insert" ON bom_items FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bi_org_update" ON bom_items FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bi_org_delete" ON bom_items FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index en-tête BOM (toutes les lignes d'une nomenclature)
CREATE INDEX IF NOT EXISTS bi_bom_idx       ON bom_items(bom_header_id);
-- Index composant (où est utilisée cette MP ? dans quelles BOMs ?)
CREATE INDEX IF NOT EXISTS bi_component_idx ON bom_items(component_id);
-- Index org
CREATE INDEX IF NOT EXISTS bi_org_idx       ON bom_items(organization_id);


-- ================================================================
-- 4. ROUTING_HEADERS  (En-tête Gamme — PLKO SAP)
-- ================================================================
-- La gamme décrit les opérations de fabrication d'un PF ou PSF,
-- dans l'ordre, avec les durées et équipements associés.
-- Elle est utilisée pour :
--   · Ordonnancement des OF
--   · Calcul du coût de fabrication (durée × taux poste)
--   · Points de contrôle qualité intégrés à la production

CREATE TABLE IF NOT EXISTS routing_headers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  article_id      UUID        NOT NULL REFERENCES articles(id)       ON DELETE RESTRICT,
  version         VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  -- Un seul routing actif par article
  CONSTRAINT unique_active_routing_per_article EXCLUDE
    USING btree (organization_id WITH =, article_id WITH =, is_active WITH =)
    WHERE (is_active = TRUE)
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE routing_headers IS 'En-têtes des gammes de fabrication (≡ PLKO SAP) — séquence d''opérations pour produire un PF/PSF';

ALTER TABLE routing_headers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_org_select" ON routing_headers;
DROP POLICY IF EXISTS "rh_org_insert" ON routing_headers;
DROP POLICY IF EXISTS "rh_org_update" ON routing_headers;
DROP POLICY IF EXISTS "rh_org_delete" ON routing_headers;

CREATE POLICY "rh_org_select" ON routing_headers FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "rh_org_insert" ON routing_headers FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "rh_org_update" ON routing_headers FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "rh_org_delete" ON routing_headers FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS rtg_article_idx ON routing_headers(article_id);
CREATE INDEX IF NOT EXISTS rtg_org_idx     ON routing_headers(organization_id);
CREATE INDEX IF NOT EXISTS rtg_active_idx  ON routing_headers(organization_id, article_id, is_active)
  WHERE is_active = TRUE;

DO $$ BEGIN
  CREATE TRIGGER rh_updated_at BEFORE UPDATE ON routing_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 5. ROUTING_STEPS  (Opérations Gamme — PLPO SAP)
-- ================================================================
-- Chaque opération est liée à un poste de charge (work_center_id)
-- qui fournit le taux horaire pour le calcul du coût de revient.
--
-- duration_min est la durée STANDARD pour le lot de référence
-- de la BOM associée. La durée par unité = duration_min / batch_size.

CREATE TABLE IF NOT EXISTS routing_steps (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID           NOT NULL REFERENCES organizations(id)   ON DELETE CASCADE,
  routing_header_id UUID           NOT NULL REFERENCES routing_headers(id) ON DELETE CASCADE,
  work_center_id    UUID           REFERENCES work_centers(id)             ON DELETE SET NULL,
  -- Optionnel : si NULL, utilise un taux horaire global par défaut
  step_order        INT            NOT NULL CHECK (step_order > 0),
  operation         TEXT           NOT NULL,
  duration_min      INT            NOT NULL CHECK (duration_min > 0),
  -- Durée standard en minutes pour le lot de référence de la BOM
  temperature_c     DECIMAL(5, 1),
  -- Température de consigne en °C (NULL = pas de contrainte thermique)
  equipment         TEXT,
  -- Équipement principal utilisé (ex. 'Cuve inox 500L')
  control_point     TEXT,
  -- Point de contrôle qualité associé à cette opération (NULL = aucun)
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_step_order_per_routing UNIQUE (routing_header_id, step_order)
);

COMMENT ON TABLE  routing_steps                IS 'Opérations de gamme (≡ PLPO SAP) — chaque étape référence un poste de charge pour le calcul du coût';
COMMENT ON COLUMN routing_steps.duration_min    IS 'Durée standard en minutes pour le lot de référence (batch_size unités)';
COMMENT ON COLUMN routing_steps.work_center_id  IS 'Poste de charge : taux horaire utilisé pour valoriser cette opération';
COMMENT ON COLUMN routing_steps.control_point   IS 'Point de contrôle qualité intégré (ex. pH 2.5–3.2 · Brix 12–15)';

ALTER TABLE routing_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rs_org_select" ON routing_steps;
DROP POLICY IF EXISTS "rs_org_insert" ON routing_steps;
DROP POLICY IF EXISTS "rs_org_update" ON routing_steps;
DROP POLICY IF EXISTS "rs_org_delete" ON routing_steps;

CREATE POLICY "rs_org_select" ON routing_steps FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "rs_org_insert" ON routing_steps FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "rs_org_update" ON routing_steps FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "rs_org_delete" ON routing_steps FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS rs_routing_idx    ON routing_steps(routing_header_id);
CREATE INDEX IF NOT EXISTS rs_wc_idx         ON routing_steps(work_center_id) WHERE work_center_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS rs_org_idx        ON routing_steps(organization_id);


-- ================================================================
-- 6. SALES_ORDERS  (En-tête Commande Client — VBAK SAP)
-- ================================================================
-- Enregistre les commandes passées par les clients.
-- Ferme la boucle MRP : les commandes clients (qty + date) sont
-- le point d'entrée du PDP (Plan Directeur de Production).
--
-- Cycle de vie :
--   DRAFT         → Saisie en cours (devis interne)
--   CONFIRMED     → Commande ferme acceptée par le client
--   IN_PREPARATION → OF lancé pour couvrir la commande
--   SHIPPED       → Expédié (bons de livraison émis)
--   INVOICED      → Facturé
--   CANCELLED     → Annulée

CREATE TABLE IF NOT EXISTS sales_orders (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id               UUID        NOT NULL REFERENCES factories(id)      ON DELETE RESTRICT,
  client_id                UUID        NOT NULL REFERENCES clients(id)         ON DELETE RESTRICT,
  order_number             VARCHAR(50) NOT NULL,
  -- Convention : 'CO-YYYY-NNNN' (ex. CO-2026-0012)
  order_date               DATE        NOT NULL,
  requested_delivery_date  DATE        NOT NULL,
  currency                 VARCHAR(10) NOT NULL DEFAULT 'XOF',
  status                   VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                             CHECK (status IN ('DRAFT','CONFIRMED','IN_PREPARATION','SHIPPED','INVOICED','CANCELLED')),
  notes                    TEXT,
  created_by               UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_so_number_per_tenant UNIQUE (organization_id, order_number),
  CONSTRAINT so_delivery_after_order     CHECK (requested_delivery_date >= order_date)
);

COMMENT ON TABLE  sales_orders                      IS 'En-têtes des commandes clients (≡ VBAK SAP) — point d''entrée du PDP via les besoins clients';
COMMENT ON COLUMN sales_orders.status               IS 'DRAFT→CONFIRMED→IN_PREPARATION→SHIPPED→INVOICED (ou CANCELLED)';
COMMENT ON COLUMN sales_orders.requested_delivery_date IS 'Date de livraison souhaitée par le client — utilisée dans le calcul ATP du MRP';

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "so_org_select" ON sales_orders;
DROP POLICY IF EXISTS "so_org_insert" ON sales_orders;
DROP POLICY IF EXISTS "so_org_update" ON sales_orders;
DROP POLICY IF EXISTS "so_org_delete" ON sales_orders;

CREATE POLICY "so_org_select" ON sales_orders FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "so_org_insert" ON sales_orders FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "so_org_update" ON sales_orders FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "so_org_delete" ON sales_orders FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS so_org_idx      ON sales_orders(organization_id);
CREATE INDEX IF NOT EXISTS so_client_idx   ON sales_orders(client_id);
CREATE INDEX IF NOT EXISTS so_status_idx   ON sales_orders(status);
-- Index planning : CO confirmées par date livraison souhaitée (pour ATP)
CREATE INDEX IF NOT EXISTS so_delivery_idx ON sales_orders(organization_id, status, requested_delivery_date)
  WHERE status IN ('CONFIRMED', 'IN_PREPARATION');

DO $$ BEGIN
  CREATE TRIGGER so_updated_at BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 7. SALES_ORDER_ITEMS  (Postes Commande Client — VBAP SAP)
-- ================================================================

CREATE TABLE IF NOT EXISTS sales_order_items (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  sales_order_id  UUID           NOT NULL REFERENCES sales_orders(id)   ON DELETE CASCADE,
  article_id      UUID           NOT NULL REFERENCES articles(id)        ON DELETE RESTRICT,
  article_label   TEXT           NOT NULL,
  -- Dénormalisé pour affichage même si article archivé
  item_position   INT            NOT NULL CHECK (item_position > 0),
  quantity        DECIMAL(15, 4) NOT NULL CHECK (quantity > 0),
  unit_price_ht   DECIMAL(15, 2) NOT NULL CHECK (unit_price_ht >= 0),
  discount_pct    DECIMAL(5, 2)  NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  -- Remise négociée avec le client (ex. 10 = -10%)
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_item_position_per_so UNIQUE (sales_order_id, item_position)
);

COMMENT ON TABLE  sales_order_items             IS 'Postes des commandes clients (≡ VBAP SAP) — une ligne par article commandé';
COMMENT ON COLUMN sales_order_items.discount_pct IS 'Remise accordée au client en % — prix net = unit_price_ht × (1 - discount_pct/100)';

ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soi_org_select" ON sales_order_items;
DROP POLICY IF EXISTS "soi_org_insert" ON sales_order_items;
DROP POLICY IF EXISTS "soi_org_update" ON sales_order_items;
DROP POLICY IF EXISTS "soi_org_delete" ON sales_order_items;

CREATE POLICY "soi_org_select" ON sales_order_items FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "soi_org_insert" ON sales_order_items FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "soi_org_update" ON sales_order_items FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "soi_org_delete" ON sales_order_items FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS soi_order_idx   ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS soi_article_idx ON sales_order_items(article_id);
CREATE INDEX IF NOT EXISTS soi_org_idx     ON sales_order_items(organization_id);


-- ================================================================
-- 8. LIEN production_orders ← bom_headers (snapshot BOM à l'OF)
-- ================================================================
-- Quand un OF est créé, on enregistre l'ID de la BOM active utilisée.
-- Cela permet de :
--   · Retrouver quelle version de nomenclature a été utilisée
--   · Comparer le coût réel vs le coût théorique de la BOM au moment de l'OF

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS bom_header_id UUID REFERENCES bom_headers(id) ON DELETE SET NULL;
ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS routing_header_id UUID REFERENCES routing_headers(id) ON DELETE SET NULL;

COMMENT ON COLUMN production_orders.bom_header_id     IS 'Snapshot BOM utilisée pour cet OF — traçabilité coût théorique vs réel';
COMMENT ON COLUMN production_orders.routing_header_id IS 'Snapshot gamme utilisée pour cet OF — traçabilité temps théorique vs réel';

CREATE INDEX IF NOT EXISTS po_bom_idx     ON production_orders(bom_header_id)     WHERE bom_header_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS po_routing_idx ON production_orders(routing_header_id) WHERE routing_header_id IS NOT NULL;


-- ================================================================
-- 9. LIEN sales_orders ← production_orders  (couverture CO→OF)
-- ================================================================
-- Optionnel : link direct pour savoir quel OF couvre quelle CO.
-- Relation M:N via table pivot.

CREATE TABLE IF NOT EXISTS sales_order_production_links (
  sales_order_id      UUID NOT NULL REFERENCES sales_orders(id)      ON DELETE CASCADE,
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  PRIMARY KEY (sales_order_id, production_order_id)
);

COMMENT ON TABLE sales_order_production_links IS 'Lien M:N CO→OF — traçabilité des OF lancés pour couvrir une commande client';
