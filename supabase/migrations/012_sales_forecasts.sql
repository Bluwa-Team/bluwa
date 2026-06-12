-- ============================================================
-- 012 : Table sales_forecasts + vue view_previsions_onboarding
-- Remplace demand_forecasts (week_start ISO) par un format
-- semaine lisible "YYYY-W##" aligné sur l'interface de saisie.
-- ============================================================

-- 1. Table de prévisions de vente ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_forecasts (
  id              uuid    DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid    NOT NULL,
  factory_id      uuid    NOT NULL,
  article_id      uuid    NOT NULL,
  week_code       text    NOT NULL,                     -- ex : "2026-W24"
  quantity_forecasted numeric DEFAULT 0 NOT NULL,
  updated_by      uuid,
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT sales_forecasts_pkey PRIMARY KEY (id),
  CONSTRAINT sales_forecasts_unique UNIQUE (factory_id, article_id, week_code),
  CONSTRAINT sales_forecasts_org_fk
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT sales_forecasts_factory_fk
    FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE,
  CONSTRAINT sales_forecasts_article_fk
    FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE
);

-- Index de lecture rapide par usine + semaine
CREATE INDEX IF NOT EXISTS idx_sales_forecasts_factory_week
  ON public.sales_forecasts (factory_id, week_code);

-- RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.sales_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_forecasts_org_select" ON public.sales_forecasts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "sales_forecasts_org_upsert" ON public.sales_forecasts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 2. Vue pour l'écran de prévisions ───────────────────────────
-- LEFT JOIN : chaque PF/PSF actif apparaît même sans prévision saisie.
CREATE OR REPLACE VIEW public.view_previsions_onboarding AS
SELECT
  a.id            AS article_id,
  a.code          AS article_code,
  a.designation   AS article_name,
  a.type          AS article_type,
  a.organization_id,
  sf.factory_id,
  sf.week_code,
  COALESCE(sf.quantity_forecasted, 0) AS quantity
FROM public.articles a
LEFT JOIN public.sales_forecasts sf ON sf.article_id = a.id
WHERE a.type   IN ('PF', 'PSF')
  AND a.statut = 'actif';
