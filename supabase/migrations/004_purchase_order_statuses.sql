-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 004 — Statuts purchase_orders alignés sur le workflow métier
--
-- Nouveaux statuts : DRAFT → PENDING_APPROVAL → APPROVED → SENT → RECEIVED
-- Supprime : PENDING, RECEIVED, CANCELLED
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Migrer les valeurs existantes ─────────────────────────────────────────

UPDATE public.purchase_orders SET status = 'PENDING_APPROVAL' WHERE status = 'PENDING';
UPDATE public.purchase_orders SET status = 'RECEIVED'           WHERE status = 'RECEIVED';
UPDATE public.purchase_orders SET status = 'RECEIVED'           WHERE status = 'CANCELLED';

-- ── 2. Remplacer le CHECK constraint ─────────────────────────────────────────

ALTER TABLE public.purchase_orders
    DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders
    ADD CONSTRAINT purchase_orders_status_check
    CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'RECEIVED', 'CANCELLED'));

-- ── 3. Attacher le trigger à goods_receipts (manquant dans baseline) ────────────

CREATE TRIGGER trg_validate_goods_receipt
    AFTER UPDATE ON public.goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validate_goods_receipt();

-- ── 4. Mettre à jour fn_validate_goods_receipt — auto-close → RECEIVED ─────────

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
    v_total_recu       NUMERIC;
    v_total_commande   NUMERIC;
    v_statut_qc        TEXT;
BEGIN
    IF NEW.status <> 'VALIDATED' OR OLD.status = 'VALIDATED' THEN
        RETURN NEW;
    END IF;

    -- Résoudre factory_id
    SELECT factory_id INTO v_factory_id
    FROM   public.goods_receipts
    WHERE  id = NEW.id;

    FOR v_item IN
        SELECT gri.article_id,
               gri.quantity_received,
               gri.batch_number,
               gri.expiry_date,
               gri.lot_status,
               COALESCE(a.gestion_lot, TRUE) AS gestion_lot
        FROM   public.goods_receipt_items gri
        LEFT JOIN public.articles a ON a.id = gri.article_id
        WHERE  gri.goods_receipt_id = NEW.id
    LOOP
        -- PMP avant
        SELECT COALESCE(pmp, 0) INTO v_pmp_before
        FROM   public.articles
        WHERE  id = v_item.article_id;

        -- Recalcul PMP (moyenne pondérée avec stock existant)
        SELECT COALESCE(
            (v_pmp_before * COALESCE(quantity_available, 0) + v_item.quantity_received * v_pmp_before)
            / NULLIF(COALESCE(quantity_available, 0) + v_item.quantity_received, 0),
            v_pmp_before
        )
        INTO v_pmp_after
        FROM public.article_stocks
        WHERE organization_id = NEW.organization_id
          AND article_id      = v_item.article_id
        LIMIT 1;

        IF v_pmp_after IS NULL THEN
            v_pmp_after := v_pmp_before;
        END IF;

        -- Mouvement ENTREE_RECEPTION
        INSERT INTO public.stock_movements (
            organization_id, factory_id, article_id,
            movement_type, quantity, unit_price, pmp_before, pmp_after,
            batch_number, reference_type, reference_id
        ) VALUES (
            NEW.organization_id, v_factory_id, v_item.article_id,
            'ENTREE_RECEPTION', v_item.quantity_received, v_pmp_before, v_pmp_before, v_pmp_after,
            v_item.batch_number, 'GOODS_RECEIPT', NEW.id
        );

        -- Mise à jour article_stocks
        INSERT INTO public.article_stocks (
            organization_id, factory_id, article_id, quantity_available, updated_at
        ) VALUES (
            NEW.organization_id, v_factory_id, v_item.article_id,
            v_item.quantity_received, now()
        )
        ON CONFLICT (organization_id, factory_id, article_id) DO UPDATE
            SET quantity_available = article_stocks.quantity_available + v_item.quantity_received,
                updated_at         = now();

        -- Mise à jour PMP article
        UPDATE public.articles
           SET pmp        = v_pmp_after,
               updated_at = now()
         WHERE id = v_item.article_id;

        -- Statut QC lot : gestion_lot=false → Libéré direct ; true → dérivé du lot_status saisi
        v_statut_qc := CASE
            WHEN NOT v_item.gestion_lot              THEN 'Libere'
            WHEN v_item.lot_status = 'Libere'        THEN 'Libere'
            WHEN v_item.lot_status = 'Bloque'        THEN 'Bloque'
            ELSE 'EnControle'
        END;

        -- Création du lot
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

    RETURN NEW;
END;
$function$;
