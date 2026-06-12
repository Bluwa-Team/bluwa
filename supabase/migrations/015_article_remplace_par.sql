-- ============================================================
-- Migration 015 — Article : statut Archive + remplace_par_id
-- ============================================================

-- 1. Ajouter 'Archive' au CHECK statut
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_statut_check;

ALTER TABLE public.articles
    ADD CONSTRAINT articles_statut_check
        CHECK (statut IN ('EnCreation', 'Actif', 'Bloque', 'Archive'));

-- 2. Colonne optionnelle de remplacement (auto-référence)
ALTER TABLE public.articles
    ADD COLUMN IF NOT EXISTS remplace_par_id UUID
        REFERENCES public.articles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_remplace_par ON public.articles (remplace_par_id)
    WHERE remplace_par_id IS NOT NULL;
