-- ============================================================
-- Migration 011 — Centre de Libération qualité
-- ============================================================
-- 1. Étendre lots.statut_qc : ajouter LibereUsageInterne
--    (physico-chimique OK, microbio en attente → utilisable en prod, non commercialisable)
-- 2. Créer quality_inspection_lots
--    Stocke les résultats d'analyse + décision de libération
-- ============================================================

-- ── 1. lots.statut_qc — ajouter LibereUsageInterne ────────────

ALTER TABLE public.lots DROP CONSTRAINT IF EXISTS lots_statut_qc_check;

ALTER TABLE public.lots
    ADD CONSTRAINT lots_statut_qc_check
        CHECK (statut_qc IN ('EnControle', 'LibereUsageInterne', 'Libere', 'Bloque'));

-- ── 2. quality_inspection_lots ─────────────────────────────────

CREATE TABLE public.quality_inspection_lots (
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

CREATE INDEX idx_qil_org        ON public.quality_inspection_lots (organization_id);
CREATE INDEX idx_qil_factory    ON public.quality_inspection_lots (factory_id);
CREATE INDEX idx_qil_article    ON public.quality_inspection_lots (article_id);
CREATE INDEX idx_qil_status     ON public.quality_inspection_lots (status);

-- ── RLS ────────────────────────────────────────────────────────

ALTER TABLE public.quality_inspection_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qil_select" ON public.quality_inspection_lots
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "qil_insert" ON public.quality_inspection_lots
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "qil_update" ON public.quality_inspection_lots
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
