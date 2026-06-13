-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 019 — Colonnes manquantes sur stock_movements (table pré-existante)
--
-- stock_movements existait avant la migration 018 (CREATE TABLE IF NOT EXISTS
-- n'a pas ajouté les colonnes). On les ajoute ici.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.stock_movements
    ADD COLUMN IF NOT EXISTS goods_receipt_item_id    UUID REFERENCES public.goods_receipt_items(id),
    ADD COLUMN IF NOT EXISTS resulting_stock_quantity NUMERIC;

-- Élargir le CHECK movement_type pour inclure tous les types du composant
ALTER TABLE public.stock_movements
    DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE public.stock_movements
    ADD CONSTRAINT stock_movements_movement_type_check
    CHECK (movement_type IN (
        'ENTREE_RECEPTION', 'ENTREE_PRODUCTION',
        'SORTIE_PRODUCTION', 'SORTIE_VENTE',
        'AJUSTEMENT_INVENTAIRE', 'RETOUR_FOURNISSEUR', 'RETOUR_CLIENT'
    ));
