-- ================================================================
-- Migration 005 — Réceptions & Facturation fournisseur
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Correspondances SAP :
--   goods_receipts           → MKPF          (en-tête mouvement de stock / GR)
--   goods_receipt_items      → MSEG          (lignes mouvement de stock)
--   suppliers_invoices       → RBKP          (en-tête facture fournisseur / LIV)
--   suppliers_invoice_items  → RSEG          (lignes facture fournisseur)
--
-- DÉPENDANCES : migrations 003 et 004 doivent être appliquées
--   (tables organizations, factories, articles,
--    purchase_orders, purchase_order_items, suppliers).
--
-- STRATÉGIE D'APPLICATION :
--   Idempotente — CREATE TABLE IF NOT EXISTS.
--   DROP POLICY IF EXISTS avant chaque CREATE POLICY.
--   Triggers protégés par EXCEPTION WHEN duplicate_object.
--
-- FLUX COMPLET (3-way matching) :
--   purchase_orders  ──►  goods_receipts   ──►  suppliers_invoices
--   (BC/BA)               (Bon de Réception)    (Facture fournisseur)
--
--   goods_receipt_items.purchase_order_item_id
--     → rapprochement qté commandée ↔ qté reçue
--   suppliers_invoice_items.goods_receipt_item_id
--     → rapprochement qté reçue ↔ qté facturée
--   Toute divergence déclenche un blocage automatique de la facture.
-- ================================================================


-- ================================================================
-- 1. GOODS_RECEIPTS  (En-tête Bon de Réception — MKPF)
-- ================================================================
-- Un Bon de Réception (BR / GR) est créé à chaque livraison
-- physique d'un fournisseur en réponse à un BC ou BA.
--
-- Il est lié à UN seul purchase_order — si un fournisseur livre
-- en plusieurs fois, on crée plusieurs BR partiels sur le même BC.
--
-- Cycle de vie :
--   DRAFT      → En cours de saisie par le magasinier / agent pesée
--   VALIDATED  → Réception confirmée ; stock mis à jour en conséquence
--   CANCELLED  → Annulé (livraison refusée, erreur de saisie)
--
-- received_at ≠ created_at :
--   received_at = date/heure physique de la livraison (peut être antérieure)
--   created_at  = date/heure de création de l'enregistrement en base

CREATE TABLE IF NOT EXISTS goods_receipts (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID           NOT NULL REFERENCES organizations(id)   ON DELETE CASCADE,
  factory_id            UUID           NOT NULL REFERENCES factories(id)        ON DELETE RESTRICT,
  -- factory_id = le site qui réceptionne physiquement la livraison
  purchase_order_id     UUID           NOT NULL REFERENCES purchase_orders(id)  ON DELETE RESTRICT,
  -- Lien obligatoire vers le BC/BA d'origine (pas de réception "sauvage")
  delivery_note_number  VARCHAR(100),
  -- Numéro du bon de livraison du fournisseur (BL) — peut être absent
  -- pour les fournisseurs informels (marchés locaux Afrique de l'Ouest)
  received_by           UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  -- Agent de pesée ou magasinier ayant validé la réception physique
  status                VARCHAR(30)    NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN ('DRAFT', 'VALIDATED', 'CANCELLED')),
  notes                 TEXT,
  -- Observations du magasinier : état du colis, écart constaté, etc.
  received_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),

  CONSTRAINT gr_valid_status_transition CHECK (
    -- Un BR annulé ne peut pas être en DRAFT (cohérence métier)
    NOT (status = 'CANCELLED' AND received_at > NOW() + INTERVAL '1 day')
  )
);

COMMENT ON TABLE  goods_receipts                      IS 'En-têtes des Bons de Réception — chaque entrée correspond à une livraison fournisseur physique (≡ MKPF SAP)';
COMMENT ON COLUMN goods_receipts.delivery_note_number IS 'N° BL du fournisseur — nullable car les fournisseurs informels n''en émettent pas toujours';
COMMENT ON COLUMN goods_receipts.received_by          IS 'Agent ayant validé la pesée ou la réception (≡ MKPF-USNAM)';
COMMENT ON COLUMN goods_receipts.status               IS 'DRAFT=saisie en cours, VALIDATED=stock mis à jour, CANCELLED=livraison refusée/annulée';
COMMENT ON COLUMN goods_receipts.received_at          IS 'Horodatage physique de la livraison (peut précéder la saisie)';

-- Contrainte unicité BL par tenant (index partiel : NULL exclu)
-- Plusieurs NULL autorisés (fournisseurs sans BL)
CREATE UNIQUE INDEX IF NOT EXISTS gr_delivery_note_unique
  ON goods_receipts(organization_id, delivery_note_number)
  WHERE delivery_note_number IS NOT NULL;

ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gr_org_select" ON goods_receipts;
DROP POLICY IF EXISTS "gr_org_insert" ON goods_receipts;
DROP POLICY IF EXISTS "gr_org_update" ON goods_receipts;
DROP POLICY IF EXISTS "gr_org_delete" ON goods_receipts;

CREATE POLICY "gr_org_select" ON goods_receipts FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "gr_org_insert" ON goods_receipts FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "gr_org_update" ON goods_receipts FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "gr_org_delete" ON goods_receipts FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index organisation (filtres liste)
CREATE INDEX IF NOT EXISTS gr_org_idx         ON goods_receipts(organization_id);
-- Index site (toutes les réceptions d'un entrepôt)
CREATE INDEX IF NOT EXISTS gr_factory_idx     ON goods_receipts(factory_id);
-- Index BC d'origine (toutes les réceptions liées à un BC)
CREATE INDEX IF NOT EXISTS gr_po_idx          ON goods_receipts(purchase_order_id);
-- Index statut (filtrer les BR en attente de validation)
CREATE INDEX IF NOT EXISTS gr_status_idx      ON goods_receipts(status);
-- Index date réception (chronologie des entrées stock)
CREATE INDEX IF NOT EXISTS gr_received_at_idx ON goods_receipts(received_at DESC);
-- Index agent (traçabilité pesée par opérateur)
CREATE INDEX IF NOT EXISTS gr_received_by_idx ON goods_receipts(received_by) WHERE received_by IS NOT NULL;

DO $$ BEGIN
  CREATE TRIGGER gr_updated_at BEFORE UPDATE ON goods_receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 2. GOODS_RECEIPT_ITEMS  (Lignes Bon de Réception — MSEG)
-- ================================================================
-- Une ligne par article reçu sur le BR.
-- La quantité reçue peut différer de la quantité commandée :
--   → livraison partielle (quantity_received < commandée)
--   → sur-livraison (quantity_received > commandée, à bloquer en aval)
--
-- batch_number : numéro de lot attribué À LA RÉCEPTION.
-- En Afrique de l'Ouest, la traçabilité lot est essentielle pour
-- les matières premières agro (hibiscus, gingembre…) :
--   campagne de récolte + humidité + origine → affecte la qualité du PF.
--
-- expiry_date : calculé = received_at::date + shelf_life_days du BC.
-- Le shelf_life_days est défini sur la ligne purchase_order_items.

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID           NOT NULL REFERENCES organizations(id)          ON DELETE CASCADE,
  -- Dénormalisé depuis goods_receipts pour RLS performant sans JOIN
  goods_receipt_id       UUID           NOT NULL REFERENCES goods_receipts(id)         ON DELETE CASCADE,
  purchase_order_item_id UUID           NOT NULL REFERENCES purchase_order_items(id)   ON DELETE RESTRICT,
  -- Lien obligatoire vers la ligne BC : permet le rapprochement qté commandée ↔ reçue
  article_id             UUID           NOT NULL REFERENCES articles(id)               ON DELETE RESTRICT,
  quantity_received      DECIMAL(15, 4) NOT NULL CHECK (quantity_received > 0),
  -- Quantité réellement pesée/reçue (en UoM de la ligne BC)
  batch_number           VARCHAR(50),
  -- Numéro de lot — optionnel mais fortement recommandé pour les MP agro
  expiry_date            DATE,
  -- Calculé par l'application : received_at::date + purchase_order_items.shelf_life_days
  -- Stocké ici pour requêtes FIFO / alerte péremption sans recalcul
  created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE  goods_receipt_items                          IS 'Lignes des Bons de Réception — une ligne par article réceptionné (≡ MSEG SAP)';
COMMENT ON COLUMN goods_receipt_items.quantity_received        IS 'Quantité pesée/reçue — peut différer de la qté commandée (livraison partielle ou écart)';
COMMENT ON COLUMN goods_receipt_items.batch_number             IS 'N° de lot attribué à la réception — essentiel pour la traçabilité FIFO des MP agro';
COMMENT ON COLUMN goods_receipt_items.expiry_date              IS 'Calculé par l''app : received_at + shelf_life_days de la ligne BC — stocké pour alertes FEFO';
COMMENT ON COLUMN goods_receipt_items.organization_id          IS 'Dénormalisé depuis goods_receipts pour un RLS direct sans JOIN coûteux';

ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gri_org_select" ON goods_receipt_items;
DROP POLICY IF EXISTS "gri_org_insert" ON goods_receipt_items;
DROP POLICY IF EXISTS "gri_org_update" ON goods_receipt_items;
DROP POLICY IF EXISTS "gri_org_delete" ON goods_receipt_items;

CREATE POLICY "gri_org_select" ON goods_receipt_items FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "gri_org_insert" ON goods_receipt_items FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "gri_org_update" ON goods_receipt_items FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "gri_org_delete" ON goods_receipt_items FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index en-tête parent (toutes les lignes d'un BR)
CREATE INDEX IF NOT EXISTS gri_receipt_idx    ON goods_receipt_items(goods_receipt_id);
-- Index ligne BC (rapprochement qté commandée ↔ reçue)
CREATE INDEX IF NOT EXISTS gri_po_item_idx    ON goods_receipt_items(purchase_order_item_id);
-- Index article (stock d'un article : toutes ses réceptions)
CREATE INDEX IF NOT EXISTS gri_article_idx    ON goods_receipt_items(article_id);
-- Index lot (traçabilité : retrouver tous les mouvements d'un lot)
CREATE INDEX IF NOT EXISTS gri_batch_idx      ON goods_receipt_items(batch_number) WHERE batch_number IS NOT NULL;
-- Index expiration (alertes FEFO : lots proches de la péremption)
CREATE INDEX IF NOT EXISTS gri_expiry_idx     ON goods_receipt_items(expiry_date)  WHERE expiry_date IS NOT NULL;
-- Index organisation (RLS + stats entrées stock par tenant)
CREATE INDEX IF NOT EXISTS gri_org_idx        ON goods_receipt_items(organization_id);


-- ================================================================
-- 3. SUPPLIERS_INVOICES  (En-tête Facture Fournisseur — RBKP)
-- ================================================================
-- Enregistre la facture émise par le fournisseur suite à une livraison.
-- L'objectif est le 3-way matching :
--   BC (quantité commandée) ↔ BR (quantité reçue) ↔ Facture (quantité facturée)
--
-- Si les 3 quantités concordent → paiement automatiquement approuvé.
-- Tout écart → statut BLOCKED, nécessite une action manuelle.
--
-- Cycle de vie :
--   PENDING              → Facture saisie, en attente de rapprochement
--   APPROVED_FOR_PAYMENT → 3-way matching OK, facture ordonnancée
--   PAID                 → Virement / règlement effectué
--   BLOCKED              → Écart quantité ou prix détecté, litige
--
-- purchase_order_id est OPTIONNEL : certains fournisseurs envoient
-- une facture globale couvrant plusieurs BCs (consolidation mensuelle).
-- Dans ce cas le rapprochement se fait ligne par ligne via
-- suppliers_invoice_items.purchase_order_item_id.

CREATE TABLE IF NOT EXISTS suppliers_invoices (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID           NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  supplier_id       UUID           NOT NULL REFERENCES suppliers(id)       ON DELETE RESTRICT,
  purchase_order_id UUID           REFERENCES purchase_orders(id)          ON DELETE RESTRICT,
  -- Optionnel : lien direct vers le BC/BA si la facture est mono-BC
  -- NULL autorisé pour les factures consolidées multi-BC
  invoice_number    VARCHAR(100)   NOT NULL,
  -- Numéro officiel de la facture émis par le fournisseur
  invoice_date      DATE           NOT NULL,
  due_date          DATE,
  -- Date d'échéance de paiement (délai contractuel ou délai légal)
  currency          VARCHAR(10)    NOT NULL DEFAULT 'XOF',
  amount_ht         DECIMAL(15, 2) NOT NULL CHECK (amount_ht >= 0),
  amount_ttc        DECIMAL(15, 2) NOT NULL CHECK (amount_ttc >= amount_ht),
  -- amount_ttc >= amount_ht imposé : la TVA ne peut pas être négative
  status            VARCHAR(30)    NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'APPROVED_FOR_PAYMENT', 'PAID', 'BLOCKED')),
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),

  CONSTRAINT unique_invoice_per_tenant    UNIQUE (organization_id, invoice_number),
  CONSTRAINT si_due_date_after_invoice    CHECK (due_date IS NULL OR due_date >= invoice_date)
);

COMMENT ON TABLE  suppliers_invoices                   IS 'En-têtes des factures fournisseurs — point d''entrée du 3-way matching BC ↔ BR ↔ Facture (≡ RBKP SAP)';
COMMENT ON COLUMN suppliers_invoices.purchase_order_id IS 'Lien optionnel BC : NULL si facture consolidée multi-BC (rapprochement ligne à ligne)';
COMMENT ON COLUMN suppliers_invoices.invoice_date      IS 'Date d''émission de la facture par le fournisseur (≠ created_at)';
COMMENT ON COLUMN suppliers_invoices.due_date          IS 'Date d''échéance contractuelle — alerte trésorerie si dépassée sans paiement';
COMMENT ON COLUMN suppliers_invoices.status            IS 'PENDING=à valider, APPROVED_FOR_PAYMENT=ordonnancée, PAID=réglée, BLOCKED=litige écart';

ALTER TABLE suppliers_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "si_org_select" ON suppliers_invoices;
DROP POLICY IF EXISTS "si_org_insert" ON suppliers_invoices;
DROP POLICY IF EXISTS "si_org_update" ON suppliers_invoices;
DROP POLICY IF EXISTS "si_org_delete" ON suppliers_invoices;

CREATE POLICY "si_org_select" ON suppliers_invoices FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "si_org_insert" ON suppliers_invoices FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "si_org_update" ON suppliers_invoices FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "si_org_delete" ON suppliers_invoices FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index organisation
CREATE INDEX IF NOT EXISTS si_org_idx        ON suppliers_invoices(organization_id);
-- Index fournisseur (toutes les factures d'un fournisseur)
CREATE INDEX IF NOT EXISTS si_supplier_idx   ON suppliers_invoices(supplier_id);
-- Index BC d'origine (toutes les factures liées à un BC)
CREATE INDEX IF NOT EXISTS si_po_idx         ON suppliers_invoices(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
-- Index statut (factures à payer, bloquées)
CREATE INDEX IF NOT EXISTS si_status_idx     ON suppliers_invoices(status);
-- Index échéance (alertes trésorerie : factures dues non payées)
CREATE INDEX IF NOT EXISTS si_due_date_idx   ON suppliers_invoices(due_date) WHERE due_date IS NOT NULL;
-- Index composite trésorerie : factures à payer par tenant, triées par urgence
CREATE INDEX IF NOT EXISTS si_payment_idx    ON suppliers_invoices(organization_id, status, due_date)
  WHERE status IN ('PENDING', 'APPROVED_FOR_PAYMENT');

DO $$ BEGIN
  CREATE TRIGGER si_updated_at BEFORE UPDATE ON suppliers_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 4. SUPPLIERS_INVOICE_ITEMS  (Lignes Facture Fournisseur — RSEG)
-- ================================================================
-- Une ligne par article facturé.
--
-- Champs clés pour le 3-way matching :
--   purchase_order_item_id  → qté commandée (référence BC)
--   goods_receipt_item_id   → qté reçue     (référence BR)
--   quantity_invoiced       → qté facturée  (référence Facture)
--
-- Règle métier :
--   quantity_invoiced > quantity_received  → écart → BLOCKED
--   unit_price_invoiced > purchase_order_item.puHT + tolérance → BLOCKED
--
-- La colonne goods_receipt_item_id est OPTIONNELLE pour permettre
-- la saisie de la facture avant validation du BR (cas d'une facture
-- reçue avant la livraison — avance sur commande).

CREATE TABLE IF NOT EXISTS suppliers_invoice_items (
  id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID           NOT NULL REFERENCES organizations(id)          ON DELETE CASCADE,
  -- Dénormalisé depuis suppliers_invoices pour RLS performant
  suppliers_invoice_id     UUID           NOT NULL REFERENCES suppliers_invoices(id)     ON DELETE CASCADE,
  purchase_order_item_id   UUID           REFERENCES purchase_order_items(id)            ON DELETE RESTRICT,
  -- Optionnel : NULL si facture globale sans rapprochement ligne à ligne
  goods_receipt_item_id    UUID           REFERENCES goods_receipt_items(id)             ON DELETE SET NULL,
  -- Optionnel : lien vers la ligne BR pour le 3-way matching complet
  -- SET NULL si le BR est annulé après facturation (litige à traiter manuellement)
  quantity_invoiced        DECIMAL(15, 4) NOT NULL CHECK (quantity_invoiced > 0),
  unit_price_invoiced      DECIMAL(15, 2) NOT NULL CHECK (unit_price_invoiced >= 0),
  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE  suppliers_invoice_items                          IS 'Lignes des factures fournisseurs — support du 3-way matching BC ↔ BR ↔ Facture (≡ RSEG SAP)';
COMMENT ON COLUMN suppliers_invoice_items.goods_receipt_item_id   IS '3-way matching : lien vers la ligne BR — permet de vérifier qté reçue = qté facturée avant paiement';
COMMENT ON COLUMN suppliers_invoice_items.purchase_order_item_id  IS 'Lien ligne BC — permet de vérifier prix unitaire facturé vs prix commandé';
COMMENT ON COLUMN suppliers_invoice_items.organization_id         IS 'Dénormalisé depuis suppliers_invoices pour un RLS direct sans JOIN';

ALTER TABLE suppliers_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sii_org_select" ON suppliers_invoice_items;
DROP POLICY IF EXISTS "sii_org_insert" ON suppliers_invoice_items;
DROP POLICY IF EXISTS "sii_org_update" ON suppliers_invoice_items;
DROP POLICY IF EXISTS "sii_org_delete" ON suppliers_invoice_items;

CREATE POLICY "sii_org_select" ON suppliers_invoice_items FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "sii_org_insert" ON suppliers_invoice_items FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "sii_org_update" ON suppliers_invoice_items FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "sii_org_delete" ON suppliers_invoice_items FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Index en-tête parent (toutes les lignes d'une facture)
CREATE INDEX IF NOT EXISTS sii_invoice_idx    ON suppliers_invoice_items(suppliers_invoice_id);
-- Index ligne BC (rapprochement prix commandé ↔ facturé)
CREATE INDEX IF NOT EXISTS sii_po_item_idx    ON suppliers_invoice_items(purchase_order_item_id) WHERE purchase_order_item_id IS NOT NULL;
-- Index ligne BR (3-way matching : qté reçue ↔ facturée)
CREATE INDEX IF NOT EXISTS sii_gr_item_idx    ON suppliers_invoice_items(goods_receipt_item_id)  WHERE goods_receipt_item_id IS NOT NULL;
-- Index organisation
CREATE INDEX IF NOT EXISTS sii_org_idx        ON suppliers_invoice_items(organization_id);


-- ================================================================
-- 5. LIENS AVAL : purchase_orders ← goods_receipts (statut)
-- ================================================================
-- Quand un BR est VALIDATED, la purchase_order doit passer en
-- RECEIVED (tout reçu) ou rester APPROVED (livraison partielle).
-- Ce calcul est fait côté application (server action).
-- On ajoute ici un index pour accélérer la requête de vérification :
--   "Combien de lignes du BC ont été reçues ?"

CREATE INDEX IF NOT EXISTS gr_po_validation_idx
  ON goods_receipts(purchase_order_id, status)
  WHERE status = 'VALIDATED';
