-- ================================================================
-- Migration 015 — Ventes, ADV, Logistique (Phase 2)
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Nouvelles tables :
--   customer_invoices      → Factures clients  (FAC-YYYY-NNNN)
--   customer_invoice_items → Postes de facture
--   delivery_notes         → Bons de livraison (BL-YYYY-NNNN)
--   delivery_note_items    → Postes du BL
--
-- Appui sur :
--   sales_orders / sales_order_items (migration 006)
--   clients                          (migration 002)
--   articles                         (migration 002)
--
-- Idempotente — CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ================================================================

-- ================================================================
-- 1. CUSTOMER_INVOICES  (Factures clients — FI SAP SD-F2)
-- ================================================================
-- Une facture est généralement liée à une commande vente (sales_order).
-- Elle peut aussi être créée indépendamment (facture directe).
-- Statuts : DRAFT → SENT → PAID (ou OVERDUE / CANCELLED).

CREATE TABLE IF NOT EXISTS customer_invoices (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  factory_id        UUID        NOT NULL REFERENCES factories(id)       ON DELETE RESTRICT,
  client_id         UUID        NOT NULL REFERENCES clients(id)         ON DELETE RESTRICT,
  sales_order_id    UUID        REFERENCES sales_orders(id)             ON DELETE SET NULL,
  invoice_number    VARCHAR(50) NOT NULL,
  -- Convention : FAC-YYYY-NNNN (ex. FAC-2026-0001)
  invoice_date      DATE        NOT NULL,
  due_date          DATE        NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT','SENT','PAID','OVERDUE','CANCELLED')),
  currency          VARCHAR(10) NOT NULL DEFAULT 'XOF',
  tva_pct           DECIMAL(5,2) NOT NULL DEFAULT 18,
  -- TVA applicable (18 % Sénégal / UEMOA par défaut)
  notes             TEXT,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),

  CONSTRAINT unique_invoice_number_per_tenant UNIQUE (organization_id, invoice_number),
  CONSTRAINT invoice_due_after_invoice        CHECK (due_date >= invoice_date)
);

COMMENT ON TABLE  customer_invoices         IS 'Factures émises aux clients (≡ FI SAP SD-F2)';
COMMENT ON COLUMN customer_invoices.tva_pct IS 'Taux TVA applicable — 18 % par défaut (UEMOA/Sénégal)';

ALTER TABLE customer_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ci_org_select" ON customer_invoices;
DROP POLICY IF EXISTS "ci_org_insert" ON customer_invoices;
DROP POLICY IF EXISTS "ci_org_update" ON customer_invoices;
DROP POLICY IF EXISTS "ci_org_delete" ON customer_invoices;
CREATE POLICY "ci_org_select" ON customer_invoices FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ci_org_insert" ON customer_invoices FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ci_org_update" ON customer_invoices FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ci_org_delete" ON customer_invoices FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS ci_org_idx       ON customer_invoices(organization_id);
CREATE INDEX IF NOT EXISTS ci_status_idx    ON customer_invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS ci_client_idx    ON customer_invoices(organization_id, client_id);

-- ================================================================
-- 2. CUSTOMER_INVOICE_ITEMS  (Postes de facture)
-- ================================================================

CREATE TABLE IF NOT EXISTS customer_invoice_items (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID           NOT NULL REFERENCES organizations(id)       ON DELETE CASCADE,
  customer_invoice_id     UUID           NOT NULL REFERENCES customer_invoices(id)   ON DELETE CASCADE,
  sales_order_item_id     UUID           REFERENCES sales_order_items(id)            ON DELETE SET NULL,
  article_id              UUID           NOT NULL REFERENCES articles(id)             ON DELETE RESTRICT,
  article_label           TEXT           NOT NULL,
  item_position           INT            NOT NULL CHECK (item_position > 0),
  quantity                DECIMAL(15, 4) NOT NULL CHECK (quantity > 0),
  unit_price_ht           DECIMAL(15, 2) NOT NULL CHECK (unit_price_ht >= 0),
  discount_pct            DECIMAL(5, 2)  NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  tva_pct                 DECIMAL(5, 2)  NOT NULL DEFAULT 18,
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),

  CONSTRAINT unique_inv_item_position UNIQUE (customer_invoice_id, item_position)
);

COMMENT ON TABLE customer_invoice_items IS 'Postes des factures clients — une ligne par article facturé';

ALTER TABLE customer_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cii_org_select" ON customer_invoice_items;
DROP POLICY IF EXISTS "cii_org_insert" ON customer_invoice_items;
DROP POLICY IF EXISTS "cii_org_update" ON customer_invoice_items;
DROP POLICY IF EXISTS "cii_org_delete" ON customer_invoice_items;
CREATE POLICY "cii_org_select" ON customer_invoice_items FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "cii_org_insert" ON customer_invoice_items FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "cii_org_update" ON customer_invoice_items FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "cii_org_delete" ON customer_invoice_items FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS cii_invoice_idx ON customer_invoice_items(customer_invoice_id);
CREATE INDEX IF NOT EXISTS cii_org_idx     ON customer_invoice_items(organization_id);

-- ================================================================
-- 3. DELIVERY_NOTES  (Bons de livraison — ≡ VL02N SAP SD)
-- ================================================================
-- Un BL est créé à partir d'une commande vente confirmée.
-- Statuts : DRAFT → PREPARED → SHIPPED → DELIVERED (ou CANCELLED).

CREATE TABLE IF NOT EXISTS delivery_notes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factory_id        UUID        NOT NULL REFERENCES factories(id)      ON DELETE RESTRICT,
  client_id         UUID        NOT NULL REFERENCES clients(id)        ON DELETE RESTRICT,
  sales_order_id    UUID        REFERENCES sales_orders(id)            ON DELETE SET NULL,
  delivery_number   VARCHAR(50) NOT NULL,
  -- Convention : BL-YYYY-NNNN (ex. BL-2026-0001)
  delivery_date     DATE        NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT','PREPARED','SHIPPED','DELIVERED','CANCELLED')),
  carrier           TEXT,
  -- Transporteur (ex. DHL, Chronopost, camion interne)
  tracking_ref      TEXT,
  -- Référence de suivi transporteur
  delivery_address  TEXT,
  notes             TEXT,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),

  CONSTRAINT unique_delivery_number_per_tenant UNIQUE (organization_id, delivery_number)
);

COMMENT ON TABLE  delivery_notes                IS 'Bons de livraison clients (≡ VL02N SAP SD) — traçabilité expédition';
COMMENT ON COLUMN delivery_notes.tracking_ref   IS 'Numéro de suivi transporteur ou référence interne expédition';

ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dn_org_select" ON delivery_notes;
DROP POLICY IF EXISTS "dn_org_insert" ON delivery_notes;
DROP POLICY IF EXISTS "dn_org_update" ON delivery_notes;
DROP POLICY IF EXISTS "dn_org_delete" ON delivery_notes;
CREATE POLICY "dn_org_select" ON delivery_notes FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "dn_org_insert" ON delivery_notes FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "dn_org_update" ON delivery_notes FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "dn_org_delete" ON delivery_notes FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS dn_org_idx     ON delivery_notes(organization_id);
CREATE INDEX IF NOT EXISTS dn_status_idx  ON delivery_notes(organization_id, status);
CREATE INDEX IF NOT EXISTS dn_client_idx  ON delivery_notes(organization_id, client_id);

-- ================================================================
-- 4. DELIVERY_NOTE_ITEMS  (Postes du bon de livraison)
-- ================================================================

CREATE TABLE IF NOT EXISTS delivery_note_items (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID           NOT NULL REFERENCES organizations(id)   ON DELETE CASCADE,
  delivery_note_id      UUID           NOT NULL REFERENCES delivery_notes(id)  ON DELETE CASCADE,
  sales_order_item_id   UUID           REFERENCES sales_order_items(id)        ON DELETE SET NULL,
  article_id            UUID           NOT NULL REFERENCES articles(id)         ON DELETE RESTRICT,
  article_label         TEXT           NOT NULL,
  item_position         INT            NOT NULL CHECK (item_position > 0),
  quantity_ordered      DECIMAL(15, 4) NOT NULL CHECK (quantity_ordered > 0),
  quantity_delivered    DECIMAL(15, 4) NOT NULL DEFAULT 0,
  batch_number          VARCHAR(50),
  -- Lot expédié — traçabilité aval
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),

  CONSTRAINT unique_dn_item_position UNIQUE (delivery_note_id, item_position)
);

COMMENT ON TABLE  delivery_note_items                  IS 'Postes des bons de livraison — une ligne par article expédié';
COMMENT ON COLUMN delivery_note_items.quantity_ordered  IS 'Qté commandée dans la CO source';
COMMENT ON COLUMN delivery_note_items.quantity_delivered IS 'Qté effectivement livrée (peut différer en cas de livraison partielle)';
COMMENT ON COLUMN delivery_note_items.batch_number      IS 'Lot expédié — traçabilité aval client';

ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dni_org_select" ON delivery_note_items;
DROP POLICY IF EXISTS "dni_org_insert" ON delivery_note_items;
DROP POLICY IF EXISTS "dni_org_update" ON delivery_note_items;
DROP POLICY IF EXISTS "dni_org_delete" ON delivery_note_items;
CREATE POLICY "dni_org_select" ON delivery_note_items FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "dni_org_insert" ON delivery_note_items FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "dni_org_update" ON delivery_note_items FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "dni_org_delete" ON delivery_note_items FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS dni_dn_idx  ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS dni_org_idx ON delivery_note_items(organization_id);
