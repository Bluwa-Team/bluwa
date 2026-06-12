-- ============================================================
-- Migration 016 — Correction trigger etat lot (cohérence QC)
-- ============================================================
-- Remplace le trigger de migration 014 :
-- EnControle | Bloque → Quarantaine (priorité absolue)
-- LibereUsageInterne  → Disponible
-- Libere              → Disponible
-- ============================================================

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

-- Recréer le trigger s'il n'existe pas (idempotent avec migration 014)
DROP TRIGGER IF EXISTS trg_lot_etat_auto ON public.lots;

CREATE TRIGGER trg_lot_etat_auto
    BEFORE INSERT OR UPDATE OF statut_qc ON public.lots
    FOR EACH ROW EXECUTE FUNCTION public.fn_lot_etat_auto();

-- Backfill immédiat des lots existants
UPDATE public.lots
   SET etat = CASE
       WHEN statut_qc IN ('EnControle', 'Bloque') THEN 'Quarantaine'
       ELSE 'Disponible'
   END
WHERE etat != CASE
    WHEN statut_qc IN ('EnControle', 'Bloque') THEN 'Quarantaine'
    ELSE 'Disponible'
END;
