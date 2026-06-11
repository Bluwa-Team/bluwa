-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 006 — Conversion d'unités : unité d'achat ≠ unité de stock
--
-- Nouveau champ articles.coeff_conversion : facteur de conversion
--   unite_achat → unite_stock  (ex : kg → g = 1000)
-- Nouveau champ articles.unite_achat : unité de saisie sur BC / réception
-- Trigger mis à jour : auto-close compare en unités de stock
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS coeff_conversion NUMERIC  DEFAULT 1   NOT NULL
    CHECK (coeff_conversion > 0),
  ADD COLUMN IF NOT EXISTS unite_achat      TEXT     DEFAULT '';

COMMENT ON COLUMN public.articles.coeff_conversion IS
  '1 unite_achat = coeff_conversion × unite_stock  (ex: 1 kg = 1000 g → 1000)';
COMMENT ON COLUMN public.articles.unite_achat IS
  'Unité de commande / réception (ex: kg). Si vide, utiliser unite_stock.';

-- ── Mettre à jour fn_validate_goods_receipt ───────────────────────────────────
-- Auto-close : comparer quantités reçues (stock) vs commandées × coeff (stock)

CREATE OR REPLACE FUNCTION public.fn_validate_goods_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_item             RECORD;
    v_factory_id       UUID;
    v_pmp_before       NUMERIC;
    v_pmp_after        NUMERIC;
    v_unit_price       NUMERIC;
    v_qty_before       NUMERIC;
    v_total_recu       NUMERIC;
    v_total_commande   NUMERIC;
    v_statut_qc        TEXT;
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
               COALESCE(a.gestion_lot, TRUE)   AS gestion_lot,
               COALESCE(poi.unit_price_ht, 0)  AS unit_price
        FROM   public.goods_receipt_items gri
        LEFT JOIN public.articles             a   ON a.id   = gri.article_id
        LEFT JOIN public.purchase_order_items poi ON poi.id = gri.purchase_order_item_id
        WHERE  gri.goods_receipt_id = NEW.id
    LOOP
        SELECT COALESCE(pmp, 0) INTO v_pmp_before
        FROM   public.articles WHERE id = v_item.article_id;

        v_unit_price := CASE
            WHEN v_item.unit_price > 0 THEN v_item.unit_price
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

    -- Auto-close BC — comparaison en unités de stock (quantités commandées × coeff)
    IF NEW.purchase_order_id IS NOT NULL THEN

        SELECT COALESCE(SUM(gri.quantity_received), 0)
        INTO   v_total_recu
        FROM   public.goods_receipt_items gri
        JOIN   public.goods_receipts gr ON gr.id = gri.goods_receipt_id
        WHERE  gr.purchase_order_id = NEW.purchase_order_id
          AND  gr.status            = 'VALIDATED';

        -- Quantités commandées converties en unités de stock
        SELECT COALESCE(SUM(poi.quantity * COALESCE(a.coeff_conversion, 1)), 0)
        INTO   v_total_commande
        FROM   public.purchase_order_items poi
        LEFT JOIN public.articles a ON a.id = poi.article_id
        WHERE  poi.purchase_order_id = NEW.purchase_order_id;

        IF v_total_recu >= v_total_commande AND v_total_commande > 0 THEN
            UPDATE public.purchase_orders
               SET status = 'RECEIVED', updated_at = now()
             WHERE id     = NEW.purchase_order_id
               AND status NOT IN ('RECEIVED', 'CANCELLED');
        END IF;

    END IF;

    RETURN NEW;
END;
$function$;
