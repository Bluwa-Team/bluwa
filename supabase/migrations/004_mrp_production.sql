-- ================================================================
-- Migration 004 — MRP & Production
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Correspondances SAP :
--   production_orders      → AUFK + AFKO  (en-tête ordre de fabrication PP)
--   purchase_requisitions  → EBAN          (demande d'achat / intention d'achat)
--
-- DÉPENDANCE : migration 003 doit être appliquée avant (tables
--   organizations, factories, articles, purchase_orders).
--
-- STRATÉGIE D'APPLICATION :
--   Idempotente — CREATE TABLE IF NOT EXISTS.
--   DROP POLICY IF EXISTS avant chaque CREATE POLICY.
--   Triggers protégés par EXCEPTION WHEN duplicate_object.
-- ================================================================


-- ================================================================
-- 1. PRODUCTION_ORDERS (Ordres de fabrication — AUFK / AFKO)
-- ================================================================
-- Formalise ce qu'un site doit fabriquer et sur quelle période.
-- Un OF lie un article FINI à un site de production (factory).
--
-- Cycle de vie :
--   PLANNED     → OF créé par le planificateur (ou le MRP)
--   RELEASED    → Matières vérifiées, OF lancé en atelier
--   IN_PROGRESS → Production en cours (quantité_produite > 0)
--   COMPLETED   → Quantité cible atteinte, OF clôturé
--   CANCELLED   → OF annulé (rupture matière, changement de plan)
--
-- quantity_produced est mis à jour au fil des saisies de production.
-- En SAP ce champ équivaut à AFRU (confirmations d'OF).

CREATE TABLE IF NOT EXISTS production_orders (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID           NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  factory_id        UUID           NOT NULL REFERENCES factories(id)       ON DELETE RESTRICT,
  article_id        UUID           NOT NULL REFERENCES articles(id)        ON DELETE RESTRICT,
  -- article_id = article FINI à produire (PF ou PSF) — toujours en catalogue
  order_number      VARCHAR(50)    NOT NULL,
  -- Convention : 'OF-YYYY-NNNN' (ex. OF-2026-0099)
  quantity_target   DECIMAL(15, 4) NOT NULL CHECK (quantity_target > 0),
  quantity_produced DECIMAL(15, 4) NOT NULL DEFAULT 0.0000
                      CHECK (quantity_produced >= 0),
  status            VARCHAR(30)    NOT NULL DEFAULT 'PLANNED'
                      CHECK (status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  start_date        DATE           NOT NULL,
  end_date          DATE           NOT NULL,
  created_by        UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  CONSTRAINT unique_prod_number_per_tenant UNIQUE (organization_id, order_number),
  CONSTRAINT prod_dates_coherence          CHECK (end_date >= start_date),
  CONSTRAINT prod_qty_not_exceed_target    CHECK (quantity_produced <= quantity_target)
);

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prod_org_select" ON production_orders;
DROP POLICY IF EXISTS "prod_org_insert" ON production_orders;
DROP POLICY IF EXISTS "prod_org_update" ON production_orders;
DROP POLICY IF EXISTS "prod_org_delete" ON production_orders;

CREATE POLICY "prod_org_select" ON production_orders FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "prod_org_insert" ON production_orders FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "prod_org_update" ON production_orders FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "prod_org_delete" ON production_orders FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index organisation (filtres liste)
CREATE INDEX IF NOT EXISTS prod_org_idx        ON production_orders(organization_id);
-- Index site (requêtes par usine)
CREATE INDEX IF NOT EXISTS prod_factory_idx    ON production_orders(factory_id);
-- Index article (identifier les OF pour un produit)
CREATE INDEX IF NOT EXISTS prod_article_idx    ON production_orders(article_id);
-- Index statut (filtres actifs / planifiés)
CREATE INDEX IF NOT EXISTS prod_status_idx     ON production_orders(status);
-- Index composite pour le planning : OF actifs d'un site sur une période
CREATE INDEX IF NOT EXISTS prod_planning_idx   ON production_orders(factory_id, status, start_date, end_date);
-- Index numérotation automatique (max order_number par org)
CREATE INDEX IF NOT EXISTS prod_number_idx     ON production_orders(organization_id, order_number);

DO $$ BEGIN
  CREATE TRIGGER prod_updated_at BEFORE UPDATE ON production_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 2. PURCHASE_REQUISITIONS (Demandes d'achat — EBAN)
-- ================================================================
-- Table pivot MRP : inscrit les besoins en matières premières
-- générés automatiquement depuis les ordres de fabrication.
--
-- Cycle de vie :
--   PENDING    → DA créée, en attente de validation achat
--   CONVERTED  → Transformée en purchase_order (FK converted_to_order_id)
--   CANCELLED  → Annulée (OF annulé, besoin disparu)
--
-- Traçabilité :
--   source_production_order_id → OF qui a généré ce besoin
--   converted_to_order_id      → BC/BA créé depuis cette DA
--
-- En SAP, EBAN.BANFN = numéro de demande d'achat,
--          EBAN.BNFPO = poste de demande d'achat.
-- Ici on garde une structure simplifiée : 1 DA = 1 article.
-- Si un OF génère plusieurs besoins matières, autant de DA.

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id                         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID           NOT NULL REFERENCES organizations(id)      ON DELETE CASCADE,
  factory_id                 UUID           NOT NULL REFERENCES factories(id)           ON DELETE RESTRICT,
  article_id                 UUID           NOT NULL REFERENCES articles(id)            ON DELETE RESTRICT,
  -- article_id = matière première manquante (MP, AC, CS…)
  requisition_number         VARCHAR(50)    NOT NULL,
  -- Convention : 'DA-YYYY-NNNN' (ex. DA-2026-0004)
  quantity_required          DECIMAL(15, 4) NOT NULL CHECK (quantity_required > 0),
  requested_delivery_date    DATE           NOT NULL,
  -- Date limite pour éviter la rupture de production
  status                     VARCHAR(30)    NOT NULL DEFAULT 'PENDING'
                               CHECK (status IN ('PENDING', 'CONVERTED', 'CANCELLED')),
  source_production_order_id UUID           REFERENCES production_orders(id) ON DELETE SET NULL,
  -- Traçabilité amont : quel OF a déclenché ce besoin ?
  converted_to_order_id      UUID           REFERENCES purchase_orders(id)   ON DELETE SET NULL,
  -- Traçabilité aval : quelle commande fournisseur couvre ce besoin ?
  created_at                 TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at                 TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  CONSTRAINT unique_req_number_per_tenant UNIQUE (organization_id, requisition_number)
);

ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preq_org_select" ON purchase_requisitions;
DROP POLICY IF EXISTS "preq_org_insert" ON purchase_requisitions;
DROP POLICY IF EXISTS "preq_org_update" ON purchase_requisitions;
DROP POLICY IF EXISTS "preq_org_delete" ON purchase_requisitions;

CREATE POLICY "preq_org_select" ON purchase_requisitions FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "preq_org_insert" ON purchase_requisitions FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "preq_org_update" ON purchase_requisitions FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "preq_org_delete" ON purchase_requisitions FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index organisation
CREATE INDEX IF NOT EXISTS preq_org_idx      ON purchase_requisitions(organization_id);
-- Index site
CREATE INDEX IF NOT EXISTS preq_factory_idx  ON purchase_requisitions(factory_id);
-- Index article (retrouver les DA d'une matière)
CREATE INDEX IF NOT EXISTS preq_article_idx  ON purchase_requisitions(article_id);
-- Index statut (filtrer les DA PENDING à traiter)
CREATE INDEX IF NOT EXISTS preq_status_idx   ON purchase_requisitions(status);
-- Index traçabilité amont : toutes les DA d'un OF
CREATE INDEX IF NOT EXISTS preq_prod_idx     ON purchase_requisitions(source_production_order_id);
-- Index traçabilité aval : DA couvertes par un BC/BA
CREATE INDEX IF NOT EXISTS preq_order_idx    ON purchase_requisitions(converted_to_order_id);
-- Index composite achat : DA à traiter par site, triées par urgence
CREATE INDEX IF NOT EXISTS preq_pending_idx  ON purchase_requisitions(factory_id, status, requested_delivery_date);

DO $$ BEGIN
  CREATE TRIGGER preq_updated_at BEFORE UPDATE ON purchase_requisitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 3. LIEN purchase_order_items → purchase_requisitions
-- ================================================================
-- Ferme la boucle de traçabilité MRP :
--   DA (purchase_requisitions) ──► Ligne de commande (purchase_order_items)
--
-- Sens de lecture :
--   purchase_requisitions.converted_to_order_id  → à quel BC/BA appartient la couverture
--   purchase_order_items.purchase_requisition_id → quelle DA a déclenché cette ligne
--
-- ON DELETE SET NULL : si la DA est supprimée, la ligne de commande
-- reste valide (la commande ne dépend pas de la DA pour exister).
--
-- NOTE : purchase_order_items est défini en migration 003.
--        purchase_requisitions est défini juste au-dessus (section 2).
--        Cet ALTER doit donc s'exécuter APRÈS les deux CREATE TABLE.

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS purchase_requisition_id UUID
    REFERENCES purchase_requisitions(id) ON DELETE SET NULL;

COMMENT ON COLUMN purchase_order_items.purchase_requisition_id
  IS 'Lien vers la Demande d''Achat générée par le MRP — traçabilité OF → DA → Ligne commande';

-- Index pour retrouver toutes les lignes couvertes par une DA donnée
CREATE INDEX IF NOT EXISTS poi_requisition_idx
  ON purchase_order_items(purchase_requisition_id);


-- ================================================================
-- FIN DE LA MIGRATION 004
-- ================================================================
