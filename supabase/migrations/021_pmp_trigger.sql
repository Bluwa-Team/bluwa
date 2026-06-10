-- ============================================================
-- Bluwa ERP — Migration 021
-- PMP (Prix Moyen Pondéré) — Trigger de mise à jour automatique
-- ============================================================
--
-- Déclenché après chaque INSERT sur goods_receipt_items.
-- Formule : nouveau_pmp = (stock_actuel × pmp_actuel + qte_reçue × prix_unitaire)
--                        / (stock_actuel + qte_reçue)
--
-- Stock courant = somme des goods_receipt_items précédents pour cet article
-- Prix unitaire = purchase_order_items.unit_price_ht lié à la ligne de réception
-- ============================================================


-- ── Garantir que les colonnes existent bien sur articles ─────────────────────
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS pmp                NUMERIC,
  ADD COLUMN IF NOT EXISTS prix_vente         NUMERIC,
  ADD COLUMN IF NOT EXISTS dernier_prix_achat NUMERIC;


-- ── Fonction de calcul du PMP ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_update_article_pmp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_pmp   NUMERIC := 0;
  v_current_stock NUMERIC := 0;
  v_unit_price    NUMERIC := 0;
  v_new_pmp       NUMERIC := 0;
BEGIN
  -- 1. PMP actuel et stock courant (sans le nouvel item)
  SELECT
    COALESCE(a.pmp, 0),
    COALESCE((
      SELECT SUM(gri.quantity_received)
      FROM goods_receipt_items gri
      WHERE gri.article_id = NEW.article_id
        AND gri.id != NEW.id
    ), 0)
  INTO v_current_pmp, v_current_stock
  FROM articles a
  WHERE a.id = NEW.article_id;

  -- 2. Prix unitaire HT depuis la ligne bon de commande liée
  IF NEW.purchase_order_item_id IS NOT NULL THEN
    SELECT COALESCE(unit_price_ht, 0)
    INTO v_unit_price
    FROM purchase_order_items
    WHERE id = NEW.purchase_order_item_id;
  END IF;

  -- 3. Calcul PMP
  IF v_unit_price > 0 THEN
    IF v_current_stock > 0 THEN
      -- Stock existant : moyenne pondérée
      v_new_pmp := (v_current_stock * v_current_pmp + NEW.quantity_received * v_unit_price)
                  / (v_current_stock + NEW.quantity_received);
    ELSE
      -- Premier stock de l'article : PMP = prix d'achat
      v_new_pmp := v_unit_price;
    END IF;
  ELSE
    -- Pas de prix BC disponible : PMP inchangé
    v_new_pmp := v_current_pmp;
  END IF;

  -- 4. Mise à jour articles.pmp + last_purchase_price
  IF v_new_pmp > 0 THEN
    UPDATE articles
    SET
      pmp                  = ROUND(v_new_pmp::NUMERIC, 4),
      dernier_prix_achat   = CASE WHEN v_unit_price > 0 THEN v_unit_price ELSE dernier_prix_achat END,
      updated_at           = NOW()
    WHERE id = NEW.article_id;
  END IF;

  RETURN NEW;
END;
$$;


-- ── Trigger sur goods_receipt_items ──────────────────────────────────────────
-- Conditionné à l'existence de la table (supprimée dans le nettoyage mai 2026,
-- sera recréée avec la migration des réceptions MP)

DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'goods_receipt_items'
  ) THEN
    DROP TRIGGER IF EXISTS trg_goods_receipt_item_pmp ON goods_receipt_items;

    CREATE TRIGGER trg_goods_receipt_item_pmp
      AFTER INSERT ON goods_receipt_items
      FOR EACH ROW
      EXECUTE FUNCTION fn_update_article_pmp();
  END IF;
END $$;
