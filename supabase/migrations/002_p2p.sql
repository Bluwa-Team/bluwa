-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 002 — Flux P2P (Procure-to-Pay)
-- Tables : suppliers, purchase_orders, purchase_order_items,
--          purchase_receipts, purchase_receipt_items, supplier_payments,
--          goods_receipts, goods_receipt_items,
--          purchase_requisitions, article_stocks,
--          stock_movements, contrats_achat
-- Trigger : recalcul PMP + mise à jour stock à la validation d'une réception
--
-- Deux chemins d'achat :
--   FORMEL  → purchase_orders (BC) → goods_receipts → goods_receipt_items
--   INFORMEL → purchase_receipts (BA direct) → purchase_receipt_items
--              + supplier_payments (Cash/Wave) → goods_receipt_items
--   Les deux convergent vers quality_inspection_lots (purgatoire qualité)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── SUPPLIERS ─────────────────────────────────────────────────────────────────
-- Table simplifiée pour les opérations P2P.
-- La table `fournisseurs` reste le référentiel complet (qualification, scoring…).
-- À terme : fusionner les deux via une vue ou une FK.

CREATE TABLE public.suppliers (
    id                UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id   UUID        NOT NULL REFERENCES public.organizations(id),
    name              TEXT        NOT NULL,
    vendor_type       TEXT        DEFAULT 'Formel' NOT NULL
                        CHECK (vendor_type IN ('Formel', 'Informel')),
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT suppliers_pkey PRIMARY KEY (id),
    CONSTRAINT suppliers_org_name_key UNIQUE (organization_id, name)
);

-- ── PURCHASE_ORDERS ───────────────────────────────────────────────────────────

CREATE TABLE public.purchase_orders (
    id                UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id   UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id        UUID        NOT NULL REFERENCES public.factories(id),
    supplier_id       UUID        NOT NULL REFERENCES public.suppliers(id),
    order_number      TEXT        NOT NULL,           -- BC-2026-001 / BA-2026-001
    order_type        TEXT        NOT NULL CHECK (order_type IN ('BC', 'BA')),
    contract_number   TEXT,                           -- N° contrat-cadre (BC uniquement)
    currency          TEXT        DEFAULT 'XOF' NOT NULL,
    status            TEXT        DEFAULT 'DRAFT' NOT NULL
                        CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED')),
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_orders_org_number_key UNIQUE (organization_id, order_number)
);

-- ── PURCHASE_ORDER_ITEMS ──────────────────────────────────────────────────────

CREATE TABLE public.purchase_order_items (
    id                        UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id           UUID        NOT NULL REFERENCES public.organizations(id),
    purchase_order_id         UUID        NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    article_id                UUID        REFERENCES public.articles(id),
    article_label             TEXT        NOT NULL,   -- dénormalisé pour affichage rapide
    item_position             INTEGER     DEFAULT 1 NOT NULL,
    quantity                  NUMERIC     NOT NULL CHECK (quantity > 0),
    unit_price_ht             NUMERIC     DEFAULT 0 NOT NULL CHECK (unit_price_ht >= 0),
    expected_delivery_date    DATE,
    shelf_life_days           INTEGER,                -- durée de vie en jours (pour calcul DLC)
    purchase_requisition_id   UUID,                   -- traçabilité MRP → purchase_requisitions.id
    created_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id)
);

-- ── GOODS_RECEIPTS ────────────────────────────────────────────────────────────

CREATE TABLE public.goods_receipts (
    id                    UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id       UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id            UUID        REFERENCES public.factories(id),
    purchase_order_id     UUID        REFERENCES public.purchase_orders(id),
    receipt_number        TEXT        NOT NULL,           -- REC-2026-0001
    delivery_note_number  TEXT,                           -- N° BL fournisseur
    received_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
    status                TEXT        DEFAULT 'DRAFT' NOT NULL
                            CHECK (status IN ('DRAFT', 'VALIDATED', 'CANCELLED')),
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT goods_receipts_pkey PRIMARY KEY (id),
    CONSTRAINT goods_receipts_org_number_key UNIQUE (organization_id, receipt_number)
);

-- ── GOODS_RECEIPT_ITEMS ───────────────────────────────────────────────────────

CREATE TABLE public.goods_receipt_items (
    id                      UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id         UUID        NOT NULL REFERENCES public.organizations(id),
    goods_receipt_id        UUID        NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
    article_id              UUID        NOT NULL REFERENCES public.articles(id),
    purchase_order_item_id  UUID        REFERENCES public.purchase_order_items(id),
    quantity_received       NUMERIC     NOT NULL CHECK (quantity_received > 0),
    batch_number            TEXT,                         -- lot interne généré (MP-20260615-0001)
    supplier_batch_number   TEXT,                         -- lot fournisseur
    expiry_date             DATE,                         -- DLC calculée ou saisie
    humidity                NUMERIC,                      -- % humidité — contrôle réception agro
    barcode                 TEXT,
    lot_status              TEXT        DEFAULT 'EnControle'
                                CHECK (lot_status IN ('EnControle', 'Libere', 'Bloque', 'NonConforme')),
    created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT goods_receipt_items_pkey PRIMARY KEY (id)
);

-- ── PURCHASE_REQUISITIONS ─────────────────────────────────────────────────────

CREATE TABLE public.purchase_requisitions (
    id                          UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id             UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id                  UUID        NOT NULL REFERENCES public.factories(id),
    article_id                  UUID        NOT NULL REFERENCES public.articles(id),
    requisition_number          TEXT        NOT NULL,    -- DA-2026-0001
    quantity_required           NUMERIC     NOT NULL CHECK (quantity_required > 0),
    requested_delivery_date     DATE        NOT NULL,
    status                      TEXT        DEFAULT 'PENDING' NOT NULL
                                    CHECK (status IN ('PENDING', 'CONVERTED', 'CANCELLED')),
    source_production_order_id  UUID,                    -- OF déclencheur (optionnel)
    converted_to_order_id       UUID        REFERENCES public.purchase_orders(id),
    created_at                  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at                  TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_requisitions_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_requisitions_org_number_key UNIQUE (organization_id, requisition_number)
);

-- ── ARTICLE_STOCKS ────────────────────────────────────────────────────────────
-- Stock courant par article × factory.
-- Mis à jour automatiquement par le trigger PMP à la validation d'une réception.

CREATE TABLE public.article_stocks (
    id                  UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id     UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id          UUID        NOT NULL REFERENCES public.factories(id),
    article_id          UUID        NOT NULL REFERENCES public.articles(id),
    quantity_available  NUMERIC     DEFAULT 0 NOT NULL,
    quantity_reserved   NUMERIC     DEFAULT 0 NOT NULL,  -- réservé pour OFs
    quantity_on_order   NUMERIC     DEFAULT 0 NOT NULL,  -- en commande fournisseur
    lead_time_days      INTEGER     DEFAULT 7 NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT article_stocks_pkey PRIMARY KEY (id),
    CONSTRAINT article_stocks_org_factory_article_key UNIQUE (organization_id, factory_id, article_id)
);

-- ── STOCK_MOVEMENTS ───────────────────────────────────────────────────────────
-- Journal immuable : jamais de UPDATE ni DELETE sur cette table.
-- Chaque mouvement = une ligne. Source of truth pour reconstituer l'historique.

CREATE TABLE public.stock_movements (
    id                UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id   UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id        UUID        NOT NULL REFERENCES public.factories(id),
    article_id        UUID        NOT NULL REFERENCES public.articles(id),
    movement_type     TEXT        NOT NULL CHECK (movement_type IN (
                          'ENTREE_RECEPTION', 'SORTIE_PRODUCTION', 'SORTIE_VENTE',
                          'AJUSTEMENT_INVENTAIRE', 'RETOUR_FOURNISSEUR'
                      )),
    quantity          NUMERIC     NOT NULL CHECK (quantity != 0),  -- positif = entrée, négatif = sortie
    unit_price        NUMERIC     NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    pmp_before        NUMERIC,    -- PMP avant mouvement
    pmp_after         NUMERIC,    -- PMP après mouvement
    batch_number      TEXT,
    reference_type    TEXT,       -- 'goods_receipt' | 'production_order' | 'inventory_count'
    reference_id      UUID,       -- id de la pièce source
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT stock_movements_pkey PRIMARY KEY (id)
);

-- ── PURCHASE_RECEIPTS (flux informel — BA direct sans commande préalable) ─────
-- Utilisé quand le fournisseur est informel : achat direct au marché,
-- auprès d'un collecteur local, d'un transporteur, etc.
-- Pas de purchase_order associé — le paiement se fait à la livraison (Cash/Wave).

CREATE TABLE public.purchase_receipts (
    id                    UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id       UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id            UUID        NOT NULL REFERENCES public.factories(id),
    supplier_id           UUID        REFERENCES public.suppliers(id),
    supplier_name         TEXT,                           -- nom libre si fournisseur non référencé
    receipt_number        TEXT        NOT NULL,           -- BA-2026-0001
    receipt_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
    currency              TEXT        DEFAULT 'XOF' NOT NULL,
    total_amount_ht       NUMERIC     DEFAULT 0 NOT NULL,
    payment_status        TEXT        DEFAULT 'PENDING' NOT NULL
                            CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID')),
    status                TEXT        DEFAULT 'DRAFT' NOT NULL
                            CHECK (status IN ('DRAFT', 'VALIDATED', 'CANCELLED')),
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_receipts_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_receipts_org_number_key UNIQUE (organization_id, receipt_number)
);

-- ── PURCHASE_RECEIPT_ITEMS ────────────────────────────────────────────────────

CREATE TABLE public.purchase_receipt_items (
    id                    UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id       UUID        NOT NULL REFERENCES public.organizations(id),
    purchase_receipt_id   UUID        NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
    article_id            UUID        REFERENCES public.articles(id),
    article_label         TEXT        NOT NULL,
    quantity              NUMERIC     NOT NULL CHECK (quantity > 0),
    unit_price_ht         NUMERIC     DEFAULT 0 NOT NULL CHECK (unit_price_ht >= 0),
    shelf_life_days       INTEGER,
    item_position         INTEGER     DEFAULT 1 NOT NULL,
    created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_receipt_items_pkey PRIMARY KEY (id)
);

-- ── SUPPLIER_PAYMENTS (paiements directs Cash / Wave / Mobile Money) ──────────

CREATE TABLE public.supplier_payments (
    id                    UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id       UUID        NOT NULL REFERENCES public.organizations(id),
    purchase_receipt_id   UUID        REFERENCES public.purchase_receipts(id),
    purchase_order_id     UUID        REFERENCES public.purchase_orders(id),
    supplier_id           UUID        REFERENCES public.suppliers(id),
    payment_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
    amount                NUMERIC     NOT NULL CHECK (amount > 0),
    currency              TEXT        DEFAULT 'XOF' NOT NULL,
    payment_method        TEXT        NOT NULL
                            CHECK (payment_method IN ('CASH', 'WAVE', 'ORANGE_MONEY', 'VIREMENT', 'CHEQUE', 'AUTRE')),
    reference             TEXT,                           -- N° transaction Wave/OM
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT supplier_payments_pkey PRIMARY KEY (id),
    -- Un paiement est lié à un bon d'achat informel OU une commande formelle, pas les deux
    CONSTRAINT supplier_payments_source_check
        CHECK (
            (purchase_receipt_id IS NOT NULL AND purchase_order_id IS NULL) OR
            (purchase_receipt_id IS NULL AND purchase_order_id IS NOT NULL) OR
            (purchase_receipt_id IS NULL AND purchase_order_id IS NULL)
        )
);

-- ── CONTRATS_ACHAT ────────────────────────────────────────────────────────────

CREATE TABLE public.contrats_achat (
    id                UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id   UUID        NOT NULL REFERENCES public.organizations(id),
    supplier_id       UUID        NOT NULL REFERENCES public.suppliers(id),
    reference         TEXT        NOT NULL,
    statut            TEXT        DEFAULT 'Actif' NOT NULL
                        CHECK (statut IN ('Actif', 'Expire', 'Suspendu')),
    date_debut        DATE        NOT NULL,
    date_fin          DATE        NOT NULL,
    conditions        TEXT,
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT contrats_achat_pkey PRIMARY KEY (id)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER PMP — validation réception → mouvements stock + recalcul PMP
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_validate_goods_receipt()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_item          RECORD;
    v_current_qty   NUMERIC;
    v_current_pmp   NUMERIC;
    v_unit_price    NUMERIC;
    v_new_pmp       NUMERIC;
    v_factory_id    UUID;
BEGIN
    IF OLD.status = 'DRAFT' AND NEW.status = 'VALIDATED' THEN

        v_factory_id := NEW.factory_id;

        FOR v_item IN
            SELECT
                gri.id,
                gri.article_id,
                gri.quantity_received,
                gri.batch_number,
                gri.purchase_order_item_id,
                a.pmp AS current_pmp
            FROM   public.goods_receipt_items  gri
            JOIN   public.articles             a   ON a.id = gri.article_id
            WHERE  gri.goods_receipt_id = NEW.id
        LOOP
            -- Stock et PMP courants
            SELECT COALESCE(quantity_available, 0)
            INTO   v_current_qty
            FROM   public.article_stocks
            WHERE  organization_id = NEW.organization_id
              AND  factory_id      = v_factory_id
              AND  article_id      = v_item.article_id;

            v_current_qty := COALESCE(v_current_qty, 0);
            v_current_pmp := COALESCE(v_item.current_pmp, 0);

            -- Prix unitaire depuis la ligne de commande liée (si disponible)
            SELECT COALESCE(unit_price_ht, 0)
            INTO   v_unit_price
            FROM   public.purchase_order_items
            WHERE  id = v_item.purchase_order_item_id;

            v_unit_price := COALESCE(v_unit_price, 0);

            -- Calcul PMP : (stock_avant × pmp_avant + qte_entrée × prix_unitaire) / stock_après
            IF (v_current_qty + v_item.quantity_received) > 0 THEN
                v_new_pmp := (v_current_qty * v_current_pmp + v_item.quantity_received * v_unit_price)
                             / (v_current_qty + v_item.quantity_received);
            ELSE
                v_new_pmp := v_current_pmp;
            END IF;

            -- Journal stock_movements (immuable)
            INSERT INTO public.stock_movements (
                organization_id, factory_id, article_id,
                movement_type, quantity, unit_price,
                pmp_before, pmp_after,
                batch_number, reference_type, reference_id
            ) VALUES (
                NEW.organization_id, v_factory_id, v_item.article_id,
                'ENTREE_RECEPTION',
                v_item.quantity_received,
                v_unit_price,
                v_current_pmp,
                v_new_pmp,
                v_item.batch_number,
                'goods_receipt',
                NEW.id
            );

            -- Mise à jour stock disponible (upsert)
            INSERT INTO public.article_stocks (
                organization_id, factory_id, article_id,
                quantity_available, updated_at
            ) VALUES (
                NEW.organization_id, v_factory_id, v_item.article_id,
                v_item.quantity_received, now()
            )
            ON CONFLICT (organization_id, factory_id, article_id)
            DO UPDATE SET
                quantity_available = public.article_stocks.quantity_available + EXCLUDED.quantity_available,
                updated_at         = now();

            -- Mise à jour PMP sur l'article
            UPDATE public.articles
               SET pmp        = v_new_pmp,
                   updated_at = now()
             WHERE id = v_item.article_id;

        END LOOP;

        -- Passer la commande liée à RECEIVED si elle existe
        IF NEW.purchase_order_id IS NOT NULL THEN
            UPDATE public.purchase_orders
               SET status     = 'RECEIVED',
                   updated_at = now()
             WHERE id = NEW.purchase_order_id
               AND status != 'CANCELLED';
        END IF;

    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_goods_receipt
    AFTER UPDATE ON public.goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validate_goods_receipt();

-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_suppliers_org                  ON public.suppliers(organization_id);
CREATE INDEX idx_purchase_orders_org            ON public.purchase_orders(organization_id, created_at DESC);
CREATE INDEX idx_purchase_orders_supplier       ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status         ON public.purchase_orders(organization_id, status);
CREATE INDEX idx_po_items_order                 ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_article               ON public.purchase_order_items(article_id);
CREATE INDEX idx_goods_receipts_org             ON public.goods_receipts(organization_id, received_at DESC);
CREATE INDEX idx_goods_receipts_po              ON public.goods_receipts(purchase_order_id);
CREATE INDEX idx_goods_receipt_items_receipt    ON public.goods_receipt_items(goods_receipt_id);
CREATE INDEX idx_goods_receipt_items_article    ON public.goods_receipt_items(article_id);
CREATE INDEX idx_requisitions_org               ON public.purchase_requisitions(organization_id, created_at DESC);
CREATE INDEX idx_requisitions_article           ON public.purchase_requisitions(article_id);
CREATE INDEX idx_article_stocks_org_article     ON public.article_stocks(organization_id, article_id);
CREATE INDEX idx_stock_movements_org            ON public.stock_movements(organization_id, created_at DESC);
CREATE INDEX idx_stock_movements_article        ON public.stock_movements(article_id, created_at DESC);
CREATE INDEX idx_contrats_achat_supplier        ON public.contrats_achat(supplier_id);
CREATE INDEX idx_purchase_receipts_org          ON public.purchase_receipts(organization_id, receipt_date DESC);
CREATE INDEX idx_purchase_receipts_supplier     ON public.purchase_receipts(supplier_id);
CREATE INDEX idx_purchase_receipt_items_receipt ON public.purchase_receipt_items(purchase_receipt_id);
CREATE INDEX idx_purchase_receipt_items_article ON public.purchase_receipt_items(article_id);
CREATE INDEX idx_supplier_payments_org          ON public.supplier_payments(organization_id, payment_date DESC);
CREATE INDEX idx_supplier_payments_receipt      ON public.supplier_payments(purchase_receipt_id);
CREATE INDEX idx_supplier_payments_order        ON public.supplier_payments(purchase_order_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.suppliers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisitions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_stocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrats_achat          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments       ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les utilisateurs de l'organisation
CREATE POLICY suppliers_select           ON public.suppliers           FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY purchase_orders_select     ON public.purchase_orders     FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY po_items_select            ON public.purchase_order_items FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY goods_receipts_select      ON public.goods_receipts      FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY gr_items_select            ON public.goods_receipt_items  FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY requisitions_select        ON public.purchase_requisitions FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY article_stocks_select      ON public.article_stocks       FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY stock_movements_select     ON public.stock_movements       FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY contrats_achat_select      ON public.contrats_achat        FOR SELECT USING (organization_id = public.fn_user_org());

-- Écriture : owner, admin, manager
CREATE POLICY suppliers_write ON public.suppliers
    USING (organization_id = public.fn_user_org() AND public.fn_is_admin())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY purchase_orders_write ON public.purchase_orders
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY po_items_write ON public.purchase_order_items
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY goods_receipts_write ON public.goods_receipts
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY gr_items_write ON public.goods_receipt_items
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY requisitions_write ON public.purchase_requisitions
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY article_stocks_write ON public.article_stocks
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

-- stock_movements : INSERT uniquement (immuable — pas d'UPDATE/DELETE utilisateur)
CREATE POLICY stock_movements_insert ON public.stock_movements
    FOR INSERT WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY contrats_achat_write ON public.contrats_achat
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY purchase_receipts_select  ON public.purchase_receipts      FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY purchase_receipts_write   ON public.purchase_receipts
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY pr_items_select           ON public.purchase_receipt_items  FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY pr_items_write            ON public.purchase_receipt_items
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY supplier_payments_select  ON public.supplier_payments       FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY supplier_payments_write   ON public.supplier_payments
    USING (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());
