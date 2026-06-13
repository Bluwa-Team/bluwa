-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 021 — Ventes, Facturation & Paramètres coûts usine
--
-- Débloque les modules Ventes (sales_orders) et ADV (customer_invoices)
-- actuellement orphelins, et externalise les constantes OH_RATE / ENERGIE_UNIT
-- de marge.ts vers la table factories.
--
-- Tables créées :
--   1. sales_orders           — Entêtes commandes clients (CO-YYYY-NNNN)
--   2. sales_order_items      — Lignes commandes clients
--   3. customer_invoices      — Factures clients (FAC-YYYY-NNNN)
--   4. customer_invoice_items — Lignes factures (avec unit_cost_ht pour COGS)
--
-- Colonnes ajoutées :
--   factories.oh_rate              — Taux frais généraux (défaut 8 %)
--   factories.energie_unit_cost    — Forfait énergie XOF/unité PF (défaut 50)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── PARAMÈTRES COÛTS USINE ────────────────────────────────────────────────────

ALTER TABLE public.factories
    ADD COLUMN IF NOT EXISTS oh_rate           NUMERIC NOT NULL DEFAULT 0.08
        CONSTRAINT factories_oh_rate_check CHECK (oh_rate >= 0 AND oh_rate <= 1),
    ADD COLUMN IF NOT EXISTS energie_unit_cost NUMERIC NOT NULL DEFAULT 50
        CONSTRAINT factories_energie_cost_check CHECK (energie_unit_cost >= 0);

COMMENT ON COLUMN public.factories.oh_rate           IS 'Taux frais généraux (overhead) — % des coûts directs. Ex: 0.08 = 8 %.';
COMMENT ON COLUMN public.factories.energie_unit_cost IS 'Forfait énergie process (vapeur, froid, eau) — XOF par unité de PF produite.';

-- ── 1. SALES_ORDERS ───────────────────────────────────────────────────────────
-- Entête commande client. Cycle : DRAFT → CONFIRMED → IN_PREPARATION →
--   SHIPPED → INVOICED | CANCELLED.

CREATE TABLE IF NOT EXISTS public.sales_orders (
    id                       UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id          UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id               UUID        NOT NULL REFERENCES public.factories(id),
    client_id                UUID        NOT NULL REFERENCES public.clients(id),
    order_number             TEXT        NOT NULL,                    -- CO-2026-NNNN
    order_date               DATE        NOT NULL DEFAULT CURRENT_DATE,
    requested_delivery_date  DATE,
    currency                 TEXT        NOT NULL DEFAULT 'XOF',
    status                   TEXT        NOT NULL DEFAULT 'DRAFT',
    notes                    TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sales_orders_pkey          PRIMARY KEY (id),
    CONSTRAINT sales_orders_org_num_key   UNIQUE (organization_id, order_number),
    CONSTRAINT sales_orders_status_check  CHECK (status IN (
        'DRAFT', 'CONFIRMED', 'IN_PREPARATION', 'SHIPPED', 'INVOICED', 'CANCELLED'
    ))
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_org_factory
    ON public.sales_orders (organization_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_client
    ON public.sales_orders (client_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status
    ON public.sales_orders (status) WHERE status NOT IN ('INVOICED', 'CANCELLED');

-- ── 2. SALES_ORDER_ITEMS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id               UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id  UUID        NOT NULL REFERENCES public.organizations(id),
    sales_order_id   UUID        NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    article_id       UUID        REFERENCES public.articles(id),
    article_label    TEXT        NOT NULL,                            -- dénormalisé pour historique
    item_position    INTEGER     NOT NULL DEFAULT 1,
    quantity         NUMERIC     NOT NULL CHECK (quantity > 0),
    unit_price_ht    NUMERIC     NOT NULL DEFAULT 0 CHECK (unit_price_ht >= 0),
    discount_pct     NUMERIC     NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sales_order_items_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sales_order_items_order
    ON public.sales_order_items (sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_article
    ON public.sales_order_items (article_id);

-- ── 3. CUSTOMER_INVOICES ──────────────────────────────────────────────────────
-- Cycle : DRAFT → SENT → PAID | OVERDUE | CANCELLED.

CREATE TABLE IF NOT EXISTS public.customer_invoices (
    id               UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id  UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id       UUID        NOT NULL REFERENCES public.factories(id),
    client_id        UUID        NOT NULL REFERENCES public.clients(id),
    sales_order_id   UUID        REFERENCES public.sales_orders(id),  -- nullable : facture sans commande
    invoice_number   TEXT        NOT NULL,                             -- FAC-2026-NNNN
    invoice_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
    due_date         DATE,
    status           TEXT        NOT NULL DEFAULT 'DRAFT',
    currency         TEXT        NOT NULL DEFAULT 'XOF',
    tva_pct          NUMERIC     NOT NULL DEFAULT 18 CHECK (tva_pct >= 0),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT customer_invoices_pkey         PRIMARY KEY (id),
    CONSTRAINT customer_invoices_org_num_key  UNIQUE (organization_id, invoice_number),
    CONSTRAINT customer_invoices_status_check CHECK (status IN (
        'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'
    ))
);

CREATE INDEX IF NOT EXISTS idx_customer_invoices_org_factory
    ON public.customer_invoices (organization_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_client
    ON public.customer_invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_order
    ON public.customer_invoices (sales_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_status
    ON public.customer_invoices (status) WHERE status NOT IN ('PAID', 'CANCELLED');

-- ── 4. CUSTOMER_INVOICE_ITEMS ─────────────────────────────────────────────────
-- unit_cost_ht = coût réel de revient (COGS) au moment de la facturation.
-- Permet de calculer la marge réelle par ligne : (unit_price_ht - unit_cost_ht) × qty.

CREATE TABLE IF NOT EXISTS public.customer_invoice_items (
    id                    UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id       UUID        NOT NULL REFERENCES public.organizations(id),
    customer_invoice_id   UUID        NOT NULL REFERENCES public.customer_invoices(id) ON DELETE CASCADE,
    sales_order_item_id   UUID        REFERENCES public.sales_order_items(id),  -- nullable
    article_id            UUID        REFERENCES public.articles(id),
    article_label         TEXT        NOT NULL,
    item_position         INTEGER     NOT NULL DEFAULT 1,
    quantity              NUMERIC     NOT NULL CHECK (quantity > 0),
    unit_price_ht         NUMERIC     NOT NULL DEFAULT 0 CHECK (unit_price_ht >= 0),
    discount_pct          NUMERIC     NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    tva_pct               NUMERIC     NOT NULL DEFAULT 18 CHECK (tva_pct >= 0),
    unit_cost_ht          NUMERIC              DEFAULT 0 CHECK (unit_cost_ht IS NULL OR unit_cost_ht >= 0),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT customer_invoice_items_pkey PRIMARY KEY (id)
);

COMMENT ON COLUMN public.customer_invoice_items.unit_cost_ht IS
    'Coût de revient unitaire HT au moment de la facturation (articles.pmp au moment de la livraison). Permet calcul COGS = unit_cost_ht × quantity.';

CREATE INDEX IF NOT EXISTS idx_customer_invoice_items_invoice
    ON public.customer_invoice_items (customer_invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoice_items_article
    ON public.customer_invoice_items (article_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

ALTER TABLE public.sales_orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoice_items  ENABLE ROW LEVEL SECURITY;

-- sales_orders
DROP POLICY IF EXISTS sales_orders_org ON public.sales_orders;
CREATE POLICY sales_orders_org ON public.sales_orders
    USING (organization_id = public.fn_user_org());

-- sales_order_items
DROP POLICY IF EXISTS sales_order_items_org ON public.sales_order_items;
CREATE POLICY sales_order_items_org ON public.sales_order_items
    USING (organization_id = public.fn_user_org());

-- customer_invoices
DROP POLICY IF EXISTS customer_invoices_org ON public.customer_invoices;
CREATE POLICY customer_invoices_org ON public.customer_invoices
    USING (organization_id = public.fn_user_org());

-- customer_invoice_items
DROP POLICY IF EXISTS customer_invoice_items_org ON public.customer_invoice_items;
CREATE POLICY customer_invoice_items_org ON public.customer_invoice_items
    USING (organization_id = public.fn_user_org());

-- ── UPDATED_AT TRIGGERS ───────────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_updated_at_column'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sales_orders_updated_at') THEN
            CREATE TRIGGER set_sales_orders_updated_at
                BEFORE UPDATE ON public.sales_orders
                FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_customer_invoices_updated_at') THEN
            CREATE TRIGGER set_customer_invoices_updated_at
                BEFORE UPDATE ON public.customer_invoices
                FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        END IF;
    END IF;
END $$;
