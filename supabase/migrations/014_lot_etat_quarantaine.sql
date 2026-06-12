-- ============================================================
-- Migration 014 — état stock lot + trigger auto-quarantaine
-- ============================================================
-- 1. Ajouter colonne état sur lots
--    Valeurs : 'Disponible' | 'Quarantaine' | 'Réservé' | 'Périmé' | 'Bloqué'
-- 2. Trigger BEFORE INSERT/UPDATE : état = 'Quarantaine'
--    si statut_qc IN ('EnControle', 'Bloque')
-- ============================================================

ALTER TABLE public.lots
    ADD COLUMN IF NOT EXISTS etat TEXT NOT NULL DEFAULT 'Quarantaine'
        CHECK (etat IN ('Disponible', 'Quarantaine', 'Réservé', 'Périmé', 'Bloqué'));

-- Backfill des lots existants
UPDATE public.lots
   SET etat = CASE
       WHEN statut_qc IN ('EnControle', 'Bloque') THEN 'Quarantaine'
       ELSE 'Disponible'
   END;

-- Fonction trigger
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

-- Trigger
DROP TRIGGER IF EXISTS trg_lot_etat_auto ON public.lots;

CREATE TRIGGER trg_lot_etat_auto
    BEFORE INSERT OR UPDATE OF statut_qc ON public.lots
    FOR EACH ROW EXECUTE FUNCTION public.fn_lot_etat_auto();
