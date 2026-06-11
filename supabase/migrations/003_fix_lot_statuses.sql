-- ============================================================
-- Migration 003 — Statuts lots alignés + trigger auto_close
-- ============================================================
-- Trois statuts stock sur un lot : EnControle | Libere | Bloque
-- Les statuts qualité (NonConforme, Rejete…) appartiennent au
-- module Qualité — pas à la table lots ni goods_receipt_items.
-- ============================================================

-- ── 1. goods_receipt_items.lot_status ──────────────────────

UPDATE public.goods_receipt_items
   SET lot_status = 'Bloque'
 WHERE lot_status = 'NonConforme';

ALTER TABLE public.goods_receipt_items
    DROP CONSTRAINT IF EXISTS goods_receipt_items_lot_status_check;

ALTER TABLE public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_lot_status_check
        CHECK (lot_status IN ('EnControle', 'Libere', 'Bloque'));

-- ── 2. lots.statut_qc ─────────────────────────────────────

UPDATE public.lots SET statut_qc = 'Bloque' WHERE statut_qc = 'Rejete';
UPDATE public.lots SET statut_qc = 'Libere' WHERE statut_qc = 'Consomme';

ALTER TABLE public.lots
    DROP CONSTRAINT IF EXISTS lots_statut_qc_check;

ALTER TABLE public.lots
    ADD CONSTRAINT lots_statut_qc_check
        CHECK (statut_qc IN ('EnControle', 'Libere', 'Bloque'));

-- ── 3. fn_validate_goods_receipt — auto_close sur quantités ─

CREATE OR REPLACE FUNCTION public.fn_validate_goods_receipt()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_item          RECORD;
    v_current_qty   NUMERIC;
    v_current_pmp   NUMERIC;
    v_unit_price    NUMERIC;
    v_new_pmp       NUMERIC;
    v_factory_id    UUID;
    v_statut_qc     TEXT;
    v_total_recu    NUMERIC;
    v_total_commande NUMERIC;
BEGIN
    IF OLD.status = 'DRAFT' AND NEW.status = 'VALIDATED' THEN

        v_factory_id := NEW.factory_id;

        FOR v_item IN
            SELECT
                gri.id,
                gri.article_id,
                gri.quantity_received,
                gri.batch_number,
                gri.purchase_order_item_id,
                gri.expiry_date,
                a.pmp                    AS current_pmp,
                a.gestion_lot            AS gestion_lot,
                a.coeff_conversion_achat AS coeff_conversion_achat
            FROM   public.goods_receipt_items  gri
            JOIN   public.articles             a ON a.id = gri.article_id
            WHERE  gri.goods_receipt_id = NEW.id
        LOOP
            SELECT COALESCE(quantity_available, 0)
            INTO   v_current_qty
            FROM   public.article_stocks
            WHERE  organization_id = NEW.organization_id
              AND  factory_id      = v_factory_id
              AND  article_id      = v_item.article_id;

            v_current_qty := COALESCE(v_current_qty, 0);
            v_current_pmp := COALESCE(v_item.current_pmp, 0);

            SELECT COALESCE(unit_price_ht, 0)
            INTO   v_unit_price
            FROM   public.purchase_order_items
            WHERE  id = v_item.purchase_order_item_id;

            v_unit_price := COALESCE(v_unit_price, 0)
                          / GREATEST(COALESCE(v_item.coeff_conversion_achat, 1), 1);

            IF (v_current_qty + v_item.quantity_received) > 0 THEN
                v_new_pmp := (v_current_qty * v_current_pmp + v_item.quantity_received * v_unit_price)
                             / (v_current_qty + v_item.quantity_received);
            ELSE
                v_new_pmp := v_current_pmp;
            END IF;

            INSERT INTO public.stock_movements (
                organization_id, factory_id, article_id,
                movement_type, quantity, unit_price,
                pmp_before, pmp_after,
                batch_number, reference_type, reference_id
            ) VALUES (
                NEW.organization_id, v_factory_id, v_item.article_id,
                'ENTREE_RECEPTION',
                v_item.quantity_received, v_unit_price,
                v_current_pmp, v_new_pmp,
                v_item.batch_number, 'goods_receipt', NEW.id
            );

            INSERT INTO public.article_stocks (
                organization_id, factory_id, article_id,
                quantity_available, updated_at
            ) VALUES (
                NEW.organization_id, v_factory_id, v_item.article_id,
                v_item.quantity_received, now()
            )
            ON CONFLICT (organization_id, factory_id, article_id)
            DO UPDATE SET
                quantity_available = public.article_stocks.quantity_available + EXCLUDED.quantity_available,
                updated_at         = now();

            UPDATE public.articles
               SET pmp                = v_new_pmp,
                   dernier_prix_achat = CASE WHEN v_unit_price > 0 THEN v_unit_price ELSE dernier_prix_achat END,
                   updated_at         = now()
             WHERE id = v_item.article_id;

            -- Lot : EnControle si gestion_lot=true, Libere sinon
            v_statut_qc := CASE WHEN v_item.gestion_lot THEN 'EnControle' ELSE 'Libere' END;

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

        -- Auto-close BC : RECEIVED quand quantités reçues (tous BRs validés) ≥ quantités commandées
        IF NEW.purchase_order_id IS NOT NULL THEN

            SELECT COALESCE(SUM(gri.quantity_received), 0)
            INTO   v_total_recu
            FROM   public.goods_receipt_items gri
            JOIN   public.goods_receipts      gr  ON gr.id = gri.goods_receipt_id
            WHERE  gr.purchase_order_id = NEW.purchase_order_id
              AND  gr.status            = 'VALIDATED';

            SELECT COALESCE(SUM(poi.quantity), 0)
            INTO   v_total_commande
            FROM   public.purchase_order_items poi
            WHERE  poi.purchase_order_id = NEW.purchase_order_id;

            IF v_total_recu >= v_total_commande AND v_total_commande > 0 THEN
                UPDATE public.purchase_orders
                   SET status     = 'RECEIVED',
                       updated_at = now()
                 WHERE id     = NEW.purchase_order_id
                   AND status NOT IN ('RECEIVED', 'CANCELLED');
            END IF;

        END IF;

    END IF;
    RETURN NEW;
END;
$$;
