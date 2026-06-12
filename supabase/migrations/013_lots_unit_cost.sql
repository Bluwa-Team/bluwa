-- Migration 013 — Coût unitaire d'entrée sur les lots
-- Objectif : stocker le prix d'entrée unitaire directement sur le lot
--            pour que la valorisation par lot soit exacte et indépendante
--            du PMP global de l'article (qui est une moyenne pondérée).
--
-- Utilisé en priorité dans getLotStocks/mapLotRow :
--   lots.unit_cost > goods_receipt_items.purchase_order_items.unit_price_ht > articles.pmp

ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC NOT NULL DEFAULT 0
  CONSTRAINT lots_unit_cost_positive CHECK (unit_cost >= 0);

COMMENT ON COLUMN public.lots.unit_cost IS
  'Prix unitaire d''entrée du lot (XOF). '
  'Alimenté à la réception (unit_price_ht du BC/BA) ou lors d''une entrée initiale. '
  'Écrasé par le coût réel à la clôture d''un OF pour les lots PF.';
