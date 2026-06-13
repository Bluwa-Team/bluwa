-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 018 — Schéma P2P complet (rattrapage migrations 002-016)
--
-- Ces tables n'étaient pas dans le baseline du 10 juin. Migration idempotente :
-- CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, DROP/CREATE policies.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── PURCHASE_ORDERS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id                UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id   UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id        UUID        NOT NULL REFERENCES public.factories(id),
    fournisseur_id    UUID        REFERENCES public.fournisseurs(id),
    fournisseur_nom   TEXT,
    order_number      TEXT        NOT NULL,
    order_type        TEXT        NOT NULL CHECK (order_type IN ('BC', 'BA')),
    contract_number   TEXT,
    currency          TEXT        DEFAULT 'XOF' NOT NULL,
    status            TEXT        DEFAULT 'DRAFT' NOT NULL,
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_orders_org_number_key UNIQUE (organization_id, order_number)
);

ALTER TABLE public.purchase_orders
    DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE public.purchase_orders
    ADD CONSTRAINT purchase_orders_status_check
    CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'RECEIVED', 'CANCELLED'));

-- ── PURCHASE_ORDER_ITEMS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id                        UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id           UUID        NOT NULL REFERENCES public.organizations(id),
    purchase_order_id         UUID        NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    article_id                UUID        REFERENCES public.articles(id),
    article_label             TEXT        NOT NULL,
    item_position             INTEGER     DEFAULT 1 NOT NULL,
    quantity                  NUMERIC     NOT NULL CHECK (quantity > 0),
    unit_price_ht             NUMERIC     DEFAULT 0 NOT NULL CHECK (unit_price_ht >= 0),
    expected_delivery_date    DATE,
    shelf_life_days           INTEGER,
    purchase_requisition_id   UUID,
    created_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id)
);

-- ── GOODS_RECEIPTS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goods_receipts (
    id                    UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id       UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id            UUID        REFERENCES public.factories(id),
    purchase_order_id     UUID        REFERENCES public.purchase_orders(id),
    receipt_number        TEXT        NOT NULL,
    delivery_note_number  TEXT,
    fournisseur_nom       TEXT,
    fournisseur_type      TEXT        NOT NULL DEFAULT 'Formel'
                            CHECK (fournisseur_type IN ('Formel', 'Informel')),
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

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
    id                      UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id         UUID        NOT NULL REFERENCES public.organizations(id),
    goods_receipt_id        UUID        NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
    article_id              UUID        NOT NULL REFERENCES public.articles(id),
    purchase_order_item_id  UUID        REFERENCES public.purchase_order_items(id),
    quantity_received       NUMERIC     NOT NULL CHECK (quantity_received > 0),
    unit_price_ht           NUMERIC     NOT NULL DEFAULT 0,
    batch_number            TEXT,
    supplier_batch_number   TEXT,
    expiry_date             DATE,
    humidity                NUMERIC,
    barcode                 TEXT,
    lot_status              TEXT        DEFAULT 'EnControle'
                                CHECK (lot_status IN ('EnControle', 'Libere', 'Bloque')),
    created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT goods_receipt_items_pkey PRIMARY KEY (id)
);

-- ── PURCHASE_RECEIPTS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_receipts (
    id                UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id   UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id        UUID        NOT NULL REFERENCES public.factories(id),
    fournisseur_id    UUID        REFERENCES public.fournisseurs(id),
    fournisseur_nom   TEXT,
    receipt_number    TEXT        NOT NULL,
    receipt_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
    currency          TEXT        DEFAULT 'XOF' NOT NULL,
    total_amount_ht   NUMERIC     DEFAULT 0 NOT NULL,
    payment_status    TEXT        DEFAULT 'PENDING' NOT NULL
                        CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID')),
    status            TEXT        DEFAULT 'DRAFT' NOT NULL
                        CHECK (status IN ('DRAFT', 'VALIDATED', 'CANCELLED')),
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_receipts_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_receipts_org_number_key UNIQUE (organization_id, receipt_number)
);

-- ── PURCHASE_RECEIPT_ITEMS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
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

-- ── SUPPLIER_PAYMENTS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id                    UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id       UUID        NOT NULL REFERENCES public.organizations(id),
    purchase_receipt_id   UUID        REFERENCES public.purchase_receipts(id),
    purchase_order_id     UUID        REFERENCES public.purchase_orders(id),
    fournisseur_id        UUID        REFERENCES public.fournisseurs(id),
    payment_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
    amount                NUMERIC     NOT NULL CHECK (amount > 0),
    currency              TEXT        DEFAULT 'XOF' NOT NULL,
    payment_method        TEXT        NOT NULL
                            CHECK (payment_method IN ('CASH', 'WAVE', 'ORANGE_MONEY', 'VIREMENT', 'CHEQUE', 'AUTRE')),
    reference             TEXT,
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT supplier_payments_pkey PRIMARY KEY (id)
);

-- ── PURCHASE_REQUISITIONS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
    id                          UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id             UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id                  UUID        NOT NULL REFERENCES public.factories(id),
    article_id                  UUID        NOT NULL REFERENCES public.articles(id),
    requisition_number          TEXT        NOT NULL,
    quantity_required           NUMERIC     NOT NULL CHECK (quantity_required > 0),
    requested_delivery_date     DATE        NOT NULL,
    status                      TEXT        DEFAULT 'PENDING' NOT NULL
                                    CHECK (status IN ('PENDING', 'CONVERTED', 'CANCELLED')),
    source_production_order_id  UUID,
    converted_to_order_id       UUID        REFERENCES public.purchase_orders(id),
    created_at                  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at                  TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT purchase_requisitions_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_requisitions_org_number_key UNIQUE (organization_id, requisition_number)
);

-- ── ARTICLE_STOCKS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.article_stocks (
    id                  UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id     UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id          UUID        NOT NULL REFERENCES public.factories(id),
    article_id          UUID        NOT NULL REFERENCES public.articles(id),
    quantity_available  NUMERIC     DEFAULT 0 NOT NULL,
    quantity_reserved   NUMERIC     DEFAULT 0 NOT NULL,
    quantity_on_order   NUMERIC     DEFAULT 0 NOT NULL,
    lead_time_days      INTEGER     DEFAULT 7 NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT article_stocks_pkey PRIMARY KEY (id),
    CONSTRAINT article_stocks_org_factory_article_key UNIQUE (organization_id, factory_id, article_id)
);

-- ── STOCK_MOVEMENTS ───────────────────────────────────────────────────────────
-- goods_receipt_item_id : FK directe pour le join PostgREST dans MouvementsStockTab
-- resulting_stock_quantity : stock après mouvement, calculé par le trigger

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id                        UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id           UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id                UUID        NOT NULL REFERENCES public.factories(id),
    article_id                UUID        NOT NULL REFERENCES public.articles(id),
    goods_receipt_item_id     UUID        REFERENCES public.goods_receipt_items(id),
    movement_type             TEXT        NOT NULL,
    quantity                  NUMERIC     NOT NULL CHECK (quantity != 0),
    unit_price                NUMERIC     NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    pmp_before                NUMERIC,
    pmp_after                 NUMERIC,
    resulting_stock_quantity  NUMERIC,
    batch_number              TEXT,
    reference_type            TEXT,
    reference_id              UUID,
    notes                     TEXT,
    created_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT stock_movements_pkey PRIMARY KEY (id)
);

ALTER TABLE public.stock_movements
    DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE public.stock_movements
    ADD CONSTRAINT stock_movements_movement_type_check
    CHECK (movement_type IN (
        'ENTREE_RECEPTION', 'ENTREE_PRODUCTION',
        'SORTIE_PRODUCTION', 'SORTIE_VENTE',
        'AJUSTEMENT_INVENTAIRE', 'RETOUR_FOURNISSEUR', 'RETOUR_CLIENT'
    ));

-- ── CONTRATS_ACHAT ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contrats_achat (
    id                UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id   UUID        NOT NULL REFERENCES public.organizations(id),
    fournisseur_id    UUID        NOT NULL REFERENCES public.fournisseurs(id),
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

-- ── LOTS ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lots (
    id                 UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id    UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    factory_id         UUID        NOT NULL REFERENCES public.factories(id),
    article_id         UUID        NOT NULL REFERENCES public.articles(id),
    batch_number       TEXT        NOT NULL,
    quantity_initial   NUMERIC     NOT NULL DEFAULT 0 CHECK (quantity_initial >= 0),
    quantity_remaining NUMERIC     NOT NULL DEFAULT 0,
    statut_qc          TEXT        NOT NULL DEFAULT 'EnControle',
    goods_receipt_id   UUID        REFERENCES public.goods_receipts(id),
    expiry_date        DATE,
    unit_cost          NUMERIC     NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    etat               TEXT        NOT NULL DEFAULT 'Quarantaine'
                         CHECK (etat IN ('Disponible', 'Quarantaine', 'Réservé', 'Périmé', 'Bloqué')),
    created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT lots_pkey PRIMARY KEY (id),
    CONSTRAINT lots_batch_unique UNIQUE (organization_id, factory_id, batch_number)
);

ALTER TABLE public.lots
    DROP CONSTRAINT IF EXISTS lots_statut_qc_check;
ALTER TABLE public.lots
    ADD CONSTRAINT lots_statut_qc_check
    CHECK (statut_qc IN ('EnControle', 'LibereUsageInterne', 'Libere', 'Bloque'));

-- ── INVENTORY_DOCUMENTS (008) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_documents (
    id               UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id  UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id       UUID        NOT NULL REFERENCES public.factories(id),
    document_number  TEXT        NOT NULL,
    status           TEXT        NOT NULL DEFAULT 'PROPOSED'
                       CHECK (status IN ('PROPOSED', 'COUNTED', 'POSTED')),
    created_by       UUID        REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    posted_at        TIMESTAMPTZ,
    CONSTRAINT inventory_documents_pkey    PRIMARY KEY (id),
    CONSTRAINT inventory_documents_doc_num UNIQUE (organization_id, document_number)
);

CREATE TABLE IF NOT EXISTS public.inventory_document_items (
    id                     UUID     DEFAULT gen_random_uuid() NOT NULL,
    inventory_document_id  UUID     NOT NULL
                             REFERENCES public.inventory_documents(id) ON DELETE CASCADE,
    organization_id        UUID     NOT NULL REFERENCES public.organizations(id),
    article_id             UUID     NOT NULL REFERENCES public.articles(id),
    batch_number           TEXT,
    book_quantity          NUMERIC  NOT NULL DEFAULT 0 CHECK (book_quantity >= 0),
    counted_quantity       NUMERIC  CHECK (counted_quantity >= 0),
    difference_quantity    NUMERIC  GENERATED ALWAYS AS (counted_quantity - book_quantity) STORED,
    created_at             TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT inventory_document_items_pkey PRIMARY KEY (id)
);

-- ── QUALITY_INSPECTION_LOTS (011) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quality_inspection_lots (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    factory_id            UUID        NOT NULL REFERENCES public.factories(id),
    lot_id                UUID        NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
    batch_number          TEXT        NOT NULL,
    article_id            UUID        NOT NULL REFERENCES public.articles(id),
    goods_receipt_item_id UUID        REFERENCES public.goods_receipt_items(id),
    sample_quantity       NUMERIC,
    status                TEXT        NOT NULL DEFAULT 'En contrôle'
                          CHECK (status IN ('En contrôle', 'Libéré — Usage interne', 'Libéré — Marché', 'Rejeté')),
    types_analyse         TEXT[]      NOT NULL DEFAULT ARRAY['PHYSICO_CHIMIQUE'],
    laboratory_results    JSONB,
    microbio_status       TEXT        CHECK (microbio_status IN ('PENDING', 'CONFORME', 'NON_CONFORME')),
    microbio_delai_jours  INTEGER,
    microbio_resultats    JSONB,
    decision_by           TEXT,
    decision_comments     TEXT,
    decision_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT qil_lot_unique UNIQUE (lot_id)
);

-- ── ARTICLES : colonne remplace_par (015) ─────────────────────────────────────

ALTER TABLE public.articles
    ADD COLUMN IF NOT EXISTS remplace_par UUID REFERENCES public.articles(id);

-- ── TRIGGER VALIDATION RÉCEPTION (version finale 010) ────────────────────────
-- Calcule PMP, crée stock_movements (avec goods_receipt_item_id + resulting_stock_quantity),
-- met à jour article_stocks et lots.

CREATE OR REPLACE FUNCTION public.fn_validate_goods_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_item           RECORD;
    v_factory_id     UUID;
    v_pmp_before     NUMERIC;
    v_pmp_after      NUMERIC;
    v_unit_price     NUMERIC;
    v_qty_before     NUMERIC;
    v_qty_after      NUMERIC;
    v_statut_qc      TEXT;
BEGIN
    IF NEW.status <> 'VALIDATED' OR OLD.status = 'VALIDATED' THEN
        RETURN NEW;
    END IF;

    v_factory_id := NEW.factory_id;

    FOR v_item IN
        SELECT gri.id                                                           AS gri_id,
               gri.article_id,
               gri.quantity_received,
               gri.batch_number,
               gri.expiry_date,
               gri.lot_status,
               COALESCE(a.gestion_lot, TRUE)                                   AS gestion_lot,
               COALESCE(
                   NULLIF(gri.unit_price_ht, 0),
                   poi.unit_price_ht,
                   0
               )                                                                AS unit_price_achat,
               COALESCE(a.coeff_conversion_achat, 1)                           AS coeff_achat
        FROM   public.goods_receipt_items gri
        LEFT JOIN public.articles             a   ON a.id   = gri.article_id
        LEFT JOIN public.purchase_order_items poi ON poi.id = gri.purchase_order_item_id
        WHERE  gri.goods_receipt_id = NEW.id
    LOOP
        SELECT COALESCE(pmp, 0) INTO v_pmp_before
        FROM   public.articles WHERE id = v_item.article_id;

        IF v_item.unit_price_achat <= 0 AND v_pmp_before = 0 THEN
            RAISE EXCEPTION 'Prix unitaire manquant pour l''article % (réception %) — PMP ne peut pas être calculé.',
                v_item.article_id, NEW.receipt_number;
        END IF;

        v_unit_price := CASE
            WHEN v_item.unit_price_achat > 0
            THEN v_item.unit_price_achat / GREATEST(v_item.coeff_achat, 1)
            ELSE v_pmp_before
        END;

        SELECT COALESCE(quantity_available, 0) INTO v_qty_before
        FROM   public.article_stocks
        WHERE  organization_id = NEW.organization_id
          AND  article_id      = v_item.article_id
        LIMIT 1;

        v_qty_before := COALESCE(v_qty_before, 0);

        v_pmp_after := CASE
            WHEN (v_qty_before + v_item.quantity_received) = 0 THEN v_unit_price
            ELSE (v_qty_before * v_pmp_before + v_item.quantity_received * v_unit_price)
                 / (v_qty_before + v_item.quantity_received)
        END;

        v_qty_after := v_qty_before + v_item.quantity_received;

        INSERT INTO public.stock_movements (
            organization_id, factory_id, article_id,
            goods_receipt_item_id,
            movement_type, quantity, unit_price, pmp_before, pmp_after,
            resulting_stock_quantity,
            batch_number, reference_type, reference_id
        ) VALUES (
            NEW.organization_id, v_factory_id, v_item.article_id,
            v_item.gri_id,
            'ENTREE_RECEPTION', v_item.quantity_received,
            v_unit_price, v_pmp_before, v_pmp_after,
            v_qty_after,
            v_item.batch_number, 'GOODS_RECEIPT', NEW.id
        );

        INSERT INTO public.article_stocks (
            organization_id, factory_id, article_id, quantity_available, updated_at
        ) VALUES (
            NEW.organization_id, v_factory_id, v_item.article_id,
            v_item.quantity_received, now()
        )
        ON CONFLICT (organization_id, factory_id, article_id) DO UPDATE
            SET quantity_available = article_stocks.quantity_available + v_item.quantity_received,
                updated_at         = now();

        UPDATE public.articles
           SET pmp = v_pmp_after, updated_at = now()
         WHERE id  = v_item.article_id;

        v_statut_qc := CASE
            WHEN NOT v_item.gestion_lot       THEN 'Libere'
            WHEN v_item.lot_status = 'Libere' THEN 'Libere'
            WHEN v_item.lot_status = 'Bloque' THEN 'Bloque'
            ELSE 'EnControle'
        END;

        INSERT INTO public.lots (
            organization_id, factory_id, article_id,
            batch_number, quantity_initial, quantity_remaining,
            statut_qc, unit_cost, goods_receipt_id, expiry_date
        ) VALUES (
            NEW.organization_id, v_factory_id, v_item.article_id,
            v_item.batch_number, v_item.quantity_received, v_item.quantity_received,
            v_statut_qc, v_unit_price, NEW.id, v_item.expiry_date
        )
        ON CONFLICT (organization_id, factory_id, batch_number) DO NOTHING;

    END LOOP;

    -- Auto-close BC/BA
    IF NEW.purchase_order_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.purchase_order_items
            WHERE  purchase_order_id = NEW.purchase_order_id
              AND  article_id IS NOT NULL
        ) AND NOT EXISTS (
            SELECT 1
            FROM   public.purchase_order_items poi
            LEFT JOIN public.articles a ON a.id = poi.article_id
            WHERE  poi.purchase_order_id = NEW.purchase_order_id
              AND  poi.article_id IS NOT NULL
              AND  poi.quantity * COALESCE(a.coeff_conversion_achat, 1) >
                   COALESCE((
                       SELECT SUM(gri.quantity_received)
                       FROM   public.goods_receipt_items gri
                       JOIN   public.goods_receipts gr ON gr.id = gri.goods_receipt_id
                       WHERE  gr.purchase_order_id = NEW.purchase_order_id
                         AND  gr.status            = 'VALIDATED'
                         AND  gri.article_id       = poi.article_id
                   ), 0)
        ) THEN
            UPDATE public.purchase_orders
               SET status = 'RECEIVED', updated_at = now()
             WHERE id     = NEW.purchase_order_id
               AND status NOT IN ('RECEIVED', 'CANCELLED');
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_goods_receipt ON public.goods_receipts;
CREATE TRIGGER trg_validate_goods_receipt
    AFTER UPDATE ON public.goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validate_goods_receipt();

-- ── TRIGGER ETAT LOT (014/016) ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_lot_etat_auto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.etat := CASE
        WHEN NEW.statut_qc IN ('EnControle', 'Bloque') THEN 'Quarantaine'
        ELSE 'Disponible'
    END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lot_etat_auto ON public.lots;
CREATE TRIGGER trg_lot_etat_auto
    BEFORE INSERT OR UPDATE OF statut_qc ON public.lots
    FOR EACH ROW EXECUTE FUNCTION public.fn_lot_etat_auto();

-- ── INDEXES ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org           ON public.purchase_orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_fournisseur   ON public.purchase_orders(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status        ON public.purchase_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_po_items_order                ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_article              ON public.purchase_order_items(article_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_org            ON public.goods_receipts(organization_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po             ON public.goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_receipt   ON public.goods_receipt_items(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_article   ON public.goods_receipt_items(article_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_org         ON public.purchase_receipts(organization_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_fournisseur ON public.purchase_receipts(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_receipt              ON public.purchase_receipt_items(purchase_receipt_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_article              ON public.purchase_receipt_items(article_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_org         ON public.supplier_payments(organization_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_receipt     ON public.supplier_payments(purchase_receipt_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_order       ON public.supplier_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_org              ON public.purchase_requisitions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requisitions_article          ON public.purchase_requisitions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_stocks_org_article    ON public.article_stocks(organization_id, article_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org           ON public.stock_movements(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_article       ON public.stock_movements(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contrats_achat_fournisseur    ON public.contrats_achat(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_lots_org_article              ON public.lots(organization_id, article_id);
CREATE INDEX IF NOT EXISTS idx_lots_batch                    ON public.lots(organization_id, batch_number);
CREATE INDEX IF NOT EXISTS idx_lots_statut_qc               ON public.lots(organization_id, statut_qc);
CREATE INDEX IF NOT EXISTS idx_lots_goods_receipt            ON public.lots(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_inventory_docs_org            ON public.inventory_documents(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_doc           ON public.inventory_document_items(inventory_document_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_org           ON public.inventory_document_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_article       ON public.inventory_document_items(article_id);
CREATE INDEX IF NOT EXISTS idx_qil_org                       ON public.quality_inspection_lots(organization_id);
CREATE INDEX IF NOT EXISTS idx_qil_factory                   ON public.quality_inspection_lots(factory_id);
CREATE INDEX IF NOT EXISTS idx_qil_article                   ON public.quality_inspection_lots(article_id);
CREATE INDEX IF NOT EXISTS idx_qil_status                    ON public.quality_inspection_lots(status);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

ALTER TABLE public.purchase_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisitions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_stocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrats_achat           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspection_lots  ENABLE ROW LEVEL SECURITY;

-- Lecture
DROP POLICY IF EXISTS purchase_orders_select    ON public.purchase_orders;
DROP POLICY IF EXISTS po_items_select           ON public.purchase_order_items;
DROP POLICY IF EXISTS goods_receipts_select     ON public.goods_receipts;
DROP POLICY IF EXISTS gr_items_select           ON public.goods_receipt_items;
DROP POLICY IF EXISTS purchase_receipts_select  ON public.purchase_receipts;
DROP POLICY IF EXISTS pr_items_select           ON public.purchase_receipt_items;
DROP POLICY IF EXISTS supplier_payments_select  ON public.supplier_payments;
DROP POLICY IF EXISTS requisitions_select       ON public.purchase_requisitions;
DROP POLICY IF EXISTS article_stocks_select     ON public.article_stocks;
DROP POLICY IF EXISTS stock_movements_select    ON public.stock_movements;
DROP POLICY IF EXISTS contrats_achat_select     ON public.contrats_achat;
DROP POLICY IF EXISTS lots_select               ON public.lots;
DROP POLICY IF EXISTS inventory_docs_select     ON public.inventory_documents;
DROP POLICY IF EXISTS inventory_items_select    ON public.inventory_document_items;
DROP POLICY IF EXISTS qil_select                ON public.quality_inspection_lots;

CREATE POLICY purchase_orders_select    ON public.purchase_orders         FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY po_items_select           ON public.purchase_order_items    FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY goods_receipts_select     ON public.goods_receipts          FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY gr_items_select           ON public.goods_receipt_items     FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY purchase_receipts_select  ON public.purchase_receipts       FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY pr_items_select           ON public.purchase_receipt_items  FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY supplier_payments_select  ON public.supplier_payments       FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY requisitions_select       ON public.purchase_requisitions   FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY article_stocks_select     ON public.article_stocks          FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY stock_movements_select    ON public.stock_movements         FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY contrats_achat_select     ON public.contrats_achat          FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY lots_select               ON public.lots                    FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY inventory_docs_select     ON public.inventory_documents     FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY inventory_items_select    ON public.inventory_document_items FOR SELECT USING (organization_id = public.fn_user_org());
CREATE POLICY qil_select                ON public.quality_inspection_lots FOR SELECT USING (organization_id = public.fn_user_org());

-- Écriture
DROP POLICY IF EXISTS purchase_orders_write   ON public.purchase_orders;
DROP POLICY IF EXISTS po_items_write          ON public.purchase_order_items;
DROP POLICY IF EXISTS goods_receipts_write    ON public.goods_receipts;
DROP POLICY IF EXISTS gr_items_write          ON public.goods_receipt_items;
DROP POLICY IF EXISTS purchase_receipts_write ON public.purchase_receipts;
DROP POLICY IF EXISTS pr_items_write          ON public.purchase_receipt_items;
DROP POLICY IF EXISTS supplier_payments_write ON public.supplier_payments;
DROP POLICY IF EXISTS requisitions_write      ON public.purchase_requisitions;
DROP POLICY IF EXISTS article_stocks_write    ON public.article_stocks;
DROP POLICY IF EXISTS stock_movements_insert  ON public.stock_movements;
DROP POLICY IF EXISTS contrats_achat_write    ON public.contrats_achat;
DROP POLICY IF EXISTS lots_write              ON public.lots;
DROP POLICY IF EXISTS inventory_docs_insert   ON public.inventory_documents;
DROP POLICY IF EXISTS inventory_docs_update   ON public.inventory_documents;
DROP POLICY IF EXISTS inventory_items_insert  ON public.inventory_document_items;
DROP POLICY IF EXISTS inventory_items_update  ON public.inventory_document_items;
DROP POLICY IF EXISTS qil_insert              ON public.quality_inspection_lots;
DROP POLICY IF EXISTS qil_update              ON public.quality_inspection_lots;

CREATE POLICY purchase_orders_write    ON public.purchase_orders        USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY po_items_write           ON public.purchase_order_items   USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY goods_receipts_write     ON public.goods_receipts         USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY gr_items_write           ON public.goods_receipt_items    USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY purchase_receipts_write  ON public.purchase_receipts      USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY pr_items_write           ON public.purchase_receipt_items USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY supplier_payments_write  ON public.supplier_payments      USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY requisitions_write       ON public.purchase_requisitions  USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY article_stocks_write     ON public.article_stocks         USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY contrats_achat_write     ON public.contrats_achat         USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY lots_write               ON public.lots                   USING (organization_id = public.fn_user_org()) WITH CHECK (organization_id = public.fn_user_org());
-- stock_movements : INSERT seulement (journal immuable)
CREATE POLICY stock_movements_insert   ON public.stock_movements        FOR INSERT WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY inventory_docs_insert    ON public.inventory_documents    FOR INSERT WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY inventory_docs_update    ON public.inventory_documents    FOR UPDATE USING (organization_id = public.fn_user_org());
CREATE POLICY inventory_items_insert   ON public.inventory_document_items FOR INSERT WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY inventory_items_update   ON public.inventory_document_items FOR UPDATE USING (organization_id = public.fn_user_org());
CREATE POLICY qil_insert               ON public.quality_inspection_lots FOR INSERT WITH CHECK (organization_id = public.fn_user_org());
CREATE POLICY qil_update               ON public.quality_inspection_lots FOR UPDATE USING (organization_id = public.fn_user_org());
