-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 011 — Stocker fournisseur_nom et fournisseur_type sur goods_receipts
--
-- Pour les réceptions directes (purchase_order_id IS NULL), le nom du fournisseur
-- saisi en texte libre et le type (Formel/Informel) n'étaient pas persistés.
-- Conséquence : origine affichée "Formel" par défaut dans la page Stocks.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.goods_receipts
    ADD COLUMN IF NOT EXISTS fournisseur_nom  TEXT,
    ADD COLUMN IF NOT EXISTS fournisseur_type TEXT NOT NULL DEFAULT 'Formel'
        CHECK (fournisseur_type IN ('Formel', 'Informel'));
