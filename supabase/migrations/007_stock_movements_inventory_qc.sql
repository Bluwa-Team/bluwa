-- ================================================================
-- Migration 007 — Mouvements de stock, Inventaires,
--                 Lots d'inspection qualité
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Correspondances SAP :
--   stock_movements           → MSEG / MB51    (mouvements de stock MM-IM)
--   inventory_documents       → MI01 / MI07    (en-tête document inventaire)
--   inventory_document_items  → MI04           (lignes comptage inventaire)
--   quality_inspection_lots   → QA01 / QA32    (lots de contrôle QM-QI)
--
-- DÉPENDANCES : migrations 002–006 appliquées
--   (organizations, factories, articles,
--    purchase_orders, production_orders, goods_receipt_items).
--
-- STRATÉGIE D'APPLICATION :
--   Idempotente — CREATE TABLE IF NOT EXISTS.
--   DROP POLICY IF EXISTS avant chaque CREATE POLICY.
--   Triggers protégés par EXCEPTION WHEN duplicate_object.
--
-- FLUX STOCK (SAP MM-IM) :
--   Entrée achat    → goods_receipts ──► stock_movements (ENTRY_PO)
--   Conso. prod.    → production_orders ──► stock_movements (CONSO_OF)
--   Entrée prod.    → production_orders ──► stock_movements (ENTRY_OF)
--   Écart inventaire → inventory_documents ──► stock_movements (INV_ADJ)
-- ================================================================


-- ================================================================
-- 1. STOCK_MOVEMENTS  (Journal des mouvements de stock — MB51)
-- ================================================================
-- Chaque ligne représente un mouvement atomique : entrée, sortie
-- ou ajustement. La quantité est TOUJOURS positive ; c'est le
-- movement_type qui détermine le sens comptable (+/−).
--
-- Correspondance SAP :
--   movement_type 'ENTRY_PO'  → type 101 (GR from Purchase Order)
--   movement_type 'CONSO_OF'  → type 261 (GR for Production Order)
--   movement_type 'ENTRY_OF'  → type 131 (GR from Production Order)
--   movement_type 'INV_ADJ'   → type 701/702 (Inventory difference)
--   movement_type 'INIT'      → type 561 (Initial stock entry)

CREATE TABLE IF NOT EXISTS stock_movements (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID           NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  factory_id           UUID           NOT NULL REFERENCES factories(id)       ON DELETE RESTRICT,
  article_id           UUID           NOT NULL REFERENCES articles(id)        ON DELETE RESTRICT,

  -- Type de mouvement (10 car.) → détermine le sens comptable (+/−)
  movement_type        VARCHAR(10)    NOT NULL
    CHECK (movement_type IN (
      'ENTRY_PO',   -- Entrée achat    (réception depuis BC/BA)
      'CONSO_OF',   -- Consommation production (sortie vers OF)
      'ENTRY_OF',   -- Entrée production (OF terminé → stock PF/PSF)
      'INV_ADJ',    -- Écart inventaire (+/−)
      'INIT'        -- Initialisation stock
    )),

  -- La quantité est toujours positive ; le sens est dicté par movement_type
  -- ENTRY_PO / ENTRY_OF / INIT → entrée (+)
  -- CONSO_OF → sortie (−)
  -- INV_ADJ  → positif si excédent, négatif si manque (stocker en DECIMAL signé)
  quantity             DECIMAL(15, 4) NOT NULL,

  -- Traçabilité documentaire (SAP : numéro de bon de mouvement)
  source_document_type VARCHAR(50)
    CHECK (source_document_type IN (
      'PURCHASE_ORDER',    -- lié à une commande d'achat
      'PRODUCTION_ORDER',  -- lié à un ordre de fabrication
      'INVENTORY'          -- lié à un document d'inventaire
    )),
  source_document_id   UUID,          -- ID du document source (FK logique)

  -- Traçabilité lot (obligatoire en agroalimentaire)
  batch_number         VARCHAR(50),

  -- Audit
  created_by           UUID           REFERENCES users(id) ON DELETE RESTRICT,
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE  stock_movements                  IS 'Journal des mouvements de stock (≡ MB51 SAP MM-IM). Quantité toujours positive — le sens est déterminé par movement_type.';
COMMENT ON COLUMN stock_movements.movement_type    IS 'ENTRY_PO=Entrée achat | CONSO_OF=Conso. production | ENTRY_OF=Entrée OF | INV_ADJ=Écart inventaire | INIT=Init. stock';
COMMENT ON COLUMN stock_movements.quantity         IS 'Toujours positif pour ENTRY_* et INIT. Peut être négatif pour INV_ADJ (manquant) ou CONSO_OF (sortie).';
COMMENT ON COLUMN stock_movements.source_document_id IS 'FK logique (non contrainte) vers purchase_orders, production_orders ou inventory_documents selon source_document_type.';

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sm_org_select" ON stock_movements;
DROP POLICY IF EXISTS "sm_org_insert" ON stock_movements;

CREATE POLICY "sm_org_select" ON stock_movements FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "sm_org_insert" ON stock_movements FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
-- Les mouvements sont immuables une fois créés (pas d'UPDATE ni de DELETE)

CREATE INDEX IF NOT EXISTS sm_org_idx      ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS sm_factory_idx  ON stock_movements(factory_id);
CREATE INDEX IF NOT EXISTS sm_article_idx  ON stock_movements(article_id);
CREATE INDEX IF NOT EXISTS sm_batch_idx    ON stock_movements(batch_number);
CREATE INDEX IF NOT EXISTS sm_source_idx   ON stock_movements(source_document_type, source_document_id);
CREATE INDEX IF NOT EXISTS sm_created_idx  ON stock_movements(created_at DESC);


-- ================================================================
-- 2. INVENTORY_DOCUMENTS  (En-tête document inventaire — MI01)
-- ================================================================
-- Un document d'inventaire déclenche un comptage physique
-- sur un site. Il passe par 3 statuts :
--   PROPOSED → COUNTED → POSTED
--
-- Le passage à POSTED génère des stock_movements de type INV_ADJ
-- pour chaque ligne dont difference_quantity ≠ 0.

CREATE TABLE IF NOT EXISTS inventory_documents (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  factory_id      UUID         NOT NULL REFERENCES factories(id)       ON DELETE RESTRICT,
  document_number VARCHAR(50)  NOT NULL,  -- ex. 'INV-2026-0001'

  -- Workflow : PROPOSED → COUNTED → POSTED
  status          VARCHAR(30)  NOT NULL DEFAULT 'PROPOSED'
    CHECK (status IN ('PROPOSED', 'COUNTED', 'POSTED')),

  -- Audit
  created_by      UUID         REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  posted_at       TIMESTAMP WITH TIME ZONE,  -- Date de validation comptable des écarts

  CONSTRAINT unique_inv_number_per_tenant UNIQUE (organization_id, document_number)
);

COMMENT ON TABLE  inventory_documents         IS 'En-tête document d''inventaire physique (≡ MI01 SAP MM-IM). Le passage POSTED crée des stock_movements INV_ADJ.';
COMMENT ON COLUMN inventory_documents.status  IS 'PROPOSED=créé, en attente de comptage | COUNTED=toutes les lignes comptées | POSTED=écarts validés et imputés en stock';
COMMENT ON COLUMN inventory_documents.posted_at IS 'Date de clôture comptable. Renseignée uniquement quand status=POSTED.';

ALTER TABLE inventory_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_doc_org_select" ON inventory_documents;
DROP POLICY IF EXISTS "inv_doc_org_insert" ON inventory_documents;
DROP POLICY IF EXISTS "inv_doc_org_update" ON inventory_documents;

CREATE POLICY "inv_doc_org_select" ON inventory_documents FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "inv_doc_org_insert" ON inventory_documents FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "inv_doc_org_update" ON inventory_documents FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND status <> 'POSTED');  -- interdit de modifier un document validé

CREATE INDEX IF NOT EXISTS inv_doc_org_idx     ON inventory_documents(organization_id);
CREATE INDEX IF NOT EXISTS inv_doc_factory_idx ON inventory_documents(factory_id);
CREATE INDEX IF NOT EXISTS inv_doc_status_idx  ON inventory_documents(status);


-- ================================================================
-- 3. INVENTORY_DOCUMENT_ITEMS  (Lignes comptage — MI04)
-- ================================================================
-- Chaque ligne associe un article (+ lot optionnel) à :
--   book_quantity    : stock théorique au moment de la création du doc
--   counted_quantity : quantité physiquement comptée par le magasinier
--   difference_quantity : calculé auto (counted − book) — peut être négatif

CREATE TABLE IF NOT EXISTS inventory_document_items (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_document_id UUID           NOT NULL REFERENCES inventory_documents(id) ON DELETE CASCADE,
  article_id            UUID           NOT NULL REFERENCES articles(id)             ON DELETE RESTRICT,
  batch_number          VARCHAR(50),   -- NULL = comptage sans gestion de lots

  -- Quantités
  book_quantity         DECIMAL(15, 4) NOT NULL,              -- Stock système (snapshot à la création)
  counted_quantity      DECIMAL(15, 4),                       -- NULL = pas encore compté
  difference_quantity   DECIMAL(15, 4)
    GENERATED ALWAYS AS (counted_quantity - book_quantity) STORED,
    -- Négatif = manquant · Positif = excédent · NULL = non compté

  CONSTRAINT unique_article_batch_per_inv UNIQUE (inventory_document_id, article_id, batch_number)
);

COMMENT ON TABLE  inventory_document_items                   IS 'Lignes de comptage d''un document d''inventaire (≡ MI04 SAP). difference_quantity est calculée automatiquement.';
COMMENT ON COLUMN inventory_document_items.book_quantity     IS 'Stock théorique (snapshot à la création du document). Immutable.';
COMMENT ON COLUMN inventory_document_items.counted_quantity  IS 'Quantité réellement comptée. NULL = ligne non encore saisie par le magasinier.';
COMMENT ON COLUMN inventory_document_items.difference_quantity IS 'Calculé : counted_quantity − book_quantity. Négatif = manquant, positif = excédent.';

ALTER TABLE inventory_document_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_item_org_select" ON inventory_document_items;
DROP POLICY IF EXISTS "inv_item_org_insert" ON inventory_document_items;
DROP POLICY IF EXISTS "inv_item_org_update" ON inventory_document_items;

CREATE POLICY "inv_item_org_select" ON inventory_document_items FOR SELECT
  USING (
    (SELECT organization_id FROM inventory_documents WHERE id = inventory_document_id)
      = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "inv_item_org_insert" ON inventory_document_items FOR INSERT
  WITH CHECK (
    (SELECT organization_id FROM inventory_documents WHERE id = inventory_document_id)
      = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "inv_item_org_update" ON inventory_document_items FOR UPDATE
  USING (
    (SELECT organization_id FROM inventory_documents WHERE id = inventory_document_id)
      = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT status FROM inventory_documents WHERE id = inventory_document_id) <> 'POSTED'
  );

CREATE INDEX IF NOT EXISTS inv_item_doc_idx     ON inventory_document_items(inventory_document_id);
CREATE INDEX IF NOT EXISTS inv_item_article_idx ON inventory_document_items(article_id);


-- ================================================================
-- 4. QUALITY_INSPECTION_LOTS  (Lots de contrôle qualité — QA01)
-- ================================================================
-- Un lot de contrôle est créé automatiquement lors d'une réception
-- (goods_receipt_items) dès qu'un article est soumis à inspection.
-- La décision finale libère, bloque ou rejette le lot.
--
-- Correspondance SAP QM :
--   status 'En contrôle' → usage decision pending  (QA11)
--   status 'Libéré'      → stock transféré en unrestricted use
--   status 'Rejeté'      → stock transféré en blocked / rebut

CREATE TABLE IF NOT EXISTS quality_inspection_lots (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID           NOT NULL REFERENCES organizations(id)      ON DELETE CASCADE,
  factory_id          UUID           NOT NULL REFERENCES factories(id)           ON DELETE RESTRICT,

  -- Lien direct avec la ligne de réception qui a déclenché l'inspection
  goods_receipt_item_id UUID         REFERENCES goods_receipt_items(id)         ON DELETE CASCADE,

  article_id          UUID           NOT NULL REFERENCES articles(id)            ON DELETE RESTRICT,
  batch_number        VARCHAR(50)    NOT NULL,

  -- Taille d'échantillon prélevé (plan d'échantillonnage)
  sample_quantity     DECIMAL(15, 4),

  -- Workflow : En contrôle → Libéré | Rejeté
  status              VARCHAR(30)    NOT NULL DEFAULT 'En contrôle'
    CHECK (status IN ('En contrôle', 'Libéré', 'Rejeté')),

  -- Décision QA
  decision_by         UUID           REFERENCES users(id)                        ON DELETE RESTRICT,
  decision_comments   TEXT,
  decision_at         TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE  quality_inspection_lots              IS 'Lots de contrôle qualité (≡ QA01 SAP QM-QI). Créé à chaque réception d''article à inspection obligatoire.';
COMMENT ON COLUMN quality_inspection_lots.status       IS 'En contrôle=inspection en cours | Libéré=lot accepté, stock débloqué | Rejeté=lot refusé (périmé ou non-conforme)';
COMMENT ON COLUMN quality_inspection_lots.decision_at  IS 'Horodatage de la décision QA. NULL = pas encore décidé.';
COMMENT ON COLUMN quality_inspection_lots.sample_quantity IS 'Quantité prélevée pour le contrôle selon le plan d''échantillonnage. NULL = 100% contrôle.';

ALTER TABLE quality_inspection_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qil_org_select" ON quality_inspection_lots;
DROP POLICY IF EXISTS "qil_org_insert" ON quality_inspection_lots;
DROP POLICY IF EXISTS "qil_org_update" ON quality_inspection_lots;

CREATE POLICY "qil_org_select" ON quality_inspection_lots FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "qil_org_insert" ON quality_inspection_lots FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "qil_org_update" ON quality_inspection_lots FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND status = 'En contrôle');  -- interdit de modifier un lot déjà décidé

CREATE INDEX IF NOT EXISTS qil_org_idx      ON quality_inspection_lots(organization_id);
CREATE INDEX IF NOT EXISTS qil_factory_idx  ON quality_inspection_lots(factory_id);
CREATE INDEX IF NOT EXISTS qil_article_idx  ON quality_inspection_lots(article_id);
CREATE INDEX IF NOT EXISTS qil_batch_idx    ON quality_inspection_lots(batch_number);
CREATE INDEX IF NOT EXISTS qil_status_idx   ON quality_inspection_lots(status);
CREATE INDEX IF NOT EXISTS qil_gr_item_idx  ON quality_inspection_lots(goods_receipt_item_id);


-- ================================================================
-- FIN migration 007
-- ================================================================
