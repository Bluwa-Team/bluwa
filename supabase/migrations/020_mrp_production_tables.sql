-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 020 — Tables MRP + Ordres de Fabrication
--
-- Débloque le module MRP (mrp.ts / mrp-engine.ts) actuellement en données mockées.
-- Idempotente : CREATE TABLE IF NOT EXISTS, DROP/CREATE policies.
--
-- Tables créées :
--   1. production_orders       — Ordres de Fabrication (OF)
--   2. mrp_runs                — Exécutions du moteur MRP
--   3. mrp_recommendations     — Recommandations BUY / PRODUCE / EXPEDITE
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. PRODUCTION_ORDERS ──────────────────────────────────────────────────────
-- Cycle de vie : PLANNED → RELEASED → IN_PROGRESS → COMPLETED | CANCELLED

CREATE TABLE IF NOT EXISTS public.production_orders (
    id                  UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id     UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id          UUID        NOT NULL REFERENCES public.factories(id),
    article_id          UUID        NOT NULL REFERENCES public.articles(id),
    order_number        TEXT        NOT NULL,                  -- ex. 'OF-2026-0001'
    quantity_target     NUMERIC     NOT NULL CHECK (quantity_target > 0),
    quantity_produced   NUMERIC     NOT NULL DEFAULT 0 CHECK (quantity_produced >= 0),
    status              TEXT        NOT NULL DEFAULT 'PLANNED',
    start_date          DATE,
    end_date            DATE,
    notes               TEXT,
    created_by          UUID        REFERENCES public.profiles(id),
    -- FK vers mrp_recommendations (ajoutée après création de cette table)
    source_mrp_reco_id  UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT production_orders_pkey PRIMARY KEY (id),
    CONSTRAINT production_orders_org_number_key UNIQUE (organization_id, order_number),
    CONSTRAINT production_orders_status_check CHECK (
        status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT production_orders_dates_check CHECK (
        end_date IS NULL OR start_date IS NULL OR end_date >= start_date
    )
);

-- ── 2. MRP_RUNS ───────────────────────────────────────────────────────────────
-- Une passe MRP = un snapshot du plan calculé à un instant T.

CREATE TABLE IF NOT EXISTS public.mrp_runs (
    id                  UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id     UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id          UUID        NOT NULL REFERENCES public.factories(id),
    status              TEXT        NOT NULL DEFAULT 'RUNNING',
    executed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_by_system  BOOLEAN     NOT NULL DEFAULT true,
    triggered_by        UUID        REFERENCES public.profiles(id),
    error_message       TEXT,                                  -- rempli si status = 'FAILED'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT mrp_runs_pkey PRIMARY KEY (id),
    CONSTRAINT mrp_runs_status_check CHECK (
        status IN ('RUNNING', 'SUCCESS', 'FAILED')
    )
);

-- ── 3. MRP_RECOMMENDATIONS ────────────────────────────────────────────────────
-- Résultats du moteur MRP : une ligne par besoin net calculé.
-- Transitions : NEW → CONVERTED (DA ou OF créé) | IGNORED (rejeté).

CREATE TABLE IF NOT EXISTS public.mrp_recommendations (
    id                              UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id                 UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id                      UUID        NOT NULL REFERENCES public.factories(id),
    mrp_run_id                      UUID        NOT NULL REFERENCES public.mrp_runs(id) ON DELETE CASCADE,
    article_id                      UUID        NOT NULL REFERENCES public.articles(id),
    action_type                     TEXT        NOT NULL,
    suggested_quantity              NUMERIC     NOT NULL CHECK (suggested_quantity > 0),
    suggested_order_date            DATE,
    required_date                   DATE,
    status                          TEXT        NOT NULL DEFAULT 'NEW',
    -- Liens vers les documents générés après conversion
    linked_purchase_requisition_id  UUID        REFERENCES public.purchase_requisitions(id),
    linked_production_order_id      UUID        REFERENCES public.production_orders(id),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT mrp_recommendations_pkey PRIMARY KEY (id),
    CONSTRAINT mrp_recommendations_action_type_check CHECK (
        action_type IN ('BUY', 'PRODUCE', 'EXPEDITE')
    ),
    CONSTRAINT mrp_recommendations_status_check CHECK (
        status IN ('NEW', 'CONVERTED', 'IGNORED')
    )
);

-- FK circulaire : production_orders ← source_mrp_reco_id → mrp_recommendations
-- Ajoutée maintenant que mrp_recommendations existe.
ALTER TABLE public.production_orders
    ADD CONSTRAINT IF NOT EXISTS production_orders_source_mrp_reco_fk
    FOREIGN KEY (source_mrp_reco_id) REFERENCES public.mrp_recommendations(id);

-- ── INDEX ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_production_orders_org_factory
    ON public.production_orders (organization_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_article
    ON public.production_orders (article_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status
    ON public.production_orders (status) WHERE status NOT IN ('COMPLETED', 'CANCELLED');

CREATE INDEX IF NOT EXISTS idx_mrp_runs_org_factory
    ON public.mrp_runs (organization_id, factory_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_mrp_recommendations_run
    ON public.mrp_recommendations (mrp_run_id);
CREATE INDEX IF NOT EXISTS idx_mrp_recommendations_org_status
    ON public.mrp_recommendations (organization_id, status) WHERE status = 'NEW';
CREATE INDEX IF NOT EXISTS idx_mrp_recommendations_article
    ON public.mrp_recommendations (article_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

ALTER TABLE public.production_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrp_runs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrp_recommendations    ENABLE ROW LEVEL SECURITY;

-- production_orders
DROP POLICY IF EXISTS production_orders_org ON public.production_orders;
CREATE POLICY production_orders_org ON public.production_orders
    USING (organization_id = public.fn_user_org());

-- mrp_runs
DROP POLICY IF EXISTS mrp_runs_org ON public.mrp_runs;
CREATE POLICY mrp_runs_org ON public.mrp_runs
    USING (organization_id = public.fn_user_org());

-- mrp_recommendations
DROP POLICY IF EXISTS mrp_recommendations_org ON public.mrp_recommendations;
CREATE POLICY mrp_recommendations_org ON public.mrp_recommendations
    USING (organization_id = public.fn_user_org());

-- ── UPDATED_AT TRIGGERS ───────────────────────────────────────────────────────
-- Réutilise la fonction générique si elle existe (définie dans migration 001/baseline).

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_updated_at_column'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        -- production_orders
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'set_production_orders_updated_at'
        ) THEN
            CREATE TRIGGER set_production_orders_updated_at
                BEFORE UPDATE ON public.production_orders
                FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        END IF;

        -- mrp_recommendations
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'set_mrp_recommendations_updated_at'
        ) THEN
            CREATE TRIGGER set_mrp_recommendations_updated_at
                BEFORE UPDATE ON public.mrp_recommendations
                FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        END IF;
    END IF;
END $$;
