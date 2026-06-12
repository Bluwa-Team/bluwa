-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 010 — Réceptions directes : auto-création BA + fournisseur persisté
--
-- Nouvelle architecture : la réception directe crée automatiquement un BA
-- (purchase_orders type='BA', status='RECEIVED') avant d'enregistrer la réception.
-- Cela permet au trigger de lire unit_price_ht depuis purchase_order_items →
-- PMP calculé correctement, BA imprimable et partageable avec le fournisseur.
--
-- Changements :
--   1. purchase_orders.fournisseur_id devient nullable (fournisseurs informels non référencés)
--   2. Ajouter purchase_orders.fournisseur_nom pour les BAs sans fournisseur référencé
--   3. Ajouter goods_receipt_items.unit_price_ht (fallback si pas de POI)
--   4. Ajouter goods_receipts.fournisseur_nom + fournisseur_type
--   5. Mettre à jour fn_validate_goods_receipt pour utiliser unit_price_ht en priorité
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. purchase_orders : fournisseur_id nullable + nom libre
ALTER TABLE public.purchase_orders
    ALTER COLUMN fournisseur_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS fournisseur_nom TEXT;

-- 2. goods_receipt_items : prix unitaire direct (fallback réceptions directes)
ALTER TABLE public.goods_receipt_items
    ADD COLUMN IF NOT EXISTS unit_price_ht NUMERIC NOT NULL DEFAULT 0;

-- 3. goods_receipts : fournisseur libre + type
ALTER TABLE public.goods_receipts
    ADD COLUMN IF NOT EXISTS fournisseur_nom  TEXT,
    ADD COLUMN IF NOT EXISTS fournisseur_type TEXT NOT NULL DEFAULT 'Formel'
        CHECK (fournisseur_type IN ('Formel', 'Informel'));

-- ── Trigger mis à jour ────────────────────────────────────────────────────────

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
    v_statut_qc      TEXT;
BEGIN
    IF NEW.status <> 'VALIDATED' OR OLD.status = 'VALIDATED' THEN
        RETURN NEW;
    END IF;

    v_factory_id := NEW.factory_id;

    FOR v_item IN
        SELECT gri.article_id,
               gri.quantity_received,
               gri.batch_number,
               gri.expiry_date,
               gri.lot_status,
               COALESCE(a.gestion_lot, TRUE)                                AS gestion_lot,
               -- Prix : champ direct en priorité, sinon celui du BC/BA
               COALESCE(
                   NULLIF(gri.unit_price_ht, 0),
                   poi.unit_price_ht,
                   0
               )                                                             AS unit_price_achat,
               COALESCE(a.coeff_conversion_achat, 1)                        AS coeff_achat
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

        v_pmp_after := CASE
            WHEN (v_qty_before + v_item.quantity_received) = 0 THEN v_unit_price
            ELSE (v_qty_before * v_pmp_before + v_item.quantity_received * v_unit_price)
                 / (v_qty_before + v_item.quantity_received)
        END;

        INSERT INTO public.stock_movements (
            organization_id, factory_id, article_id,
            movement_type, quantity, unit_price, pmp_before, pmp_after,
            batch_number, reference_type, reference_id
        ) VALUES (
            NEW.organization_id, v_factory_id, v_item.article_id,
            'ENTREE_RECEPTION', v_item.quantity_received,
            v_unit_price, v_pmp_before, v_pmp_after,
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
            statut_qc, goods_receipt_id, expiry_date
        ) VALUES (
            NEW.organization_id, v_factory_id, v_item.article_id,
            v_item.batch_number, v_item.quantity_received, v_item.quantity_received,
            v_statut_qc, NEW.id, v_item.expiry_date
        )
        ON CONFLICT (organization_id, factory_id, batch_number) DO NOTHING;

    END LOOP;

    -- Auto-close BC/BA : uniquement si au moins une ligne est liée au référentiel MDM.
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
