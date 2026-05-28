-- ================================================================
-- Migration 014 — Ajout receipt_number à goods_receipts
-- Bluwa ERP · Supabase / PostgreSQL 15
--
-- Migration 005 crée goods_receipts sans colonne de numérotation.
-- On ajoute receipt_number (ex. REC-2026-0001) pour la traçabilité
-- et l'affichage en UI.
-- Idempotente : ADD COLUMN IF NOT EXISTS.
-- ================================================================

ALTER TABLE goods_receipts
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);

-- Index unicité partiel (NULL exclu — plusieurs lignes sans numéro autorisées
-- le temps de la migration, puis la contrainte empêche les doublons à la création).
CREATE UNIQUE INDEX IF NOT EXISTS gr_receipt_number_unique
  ON goods_receipts(organization_id, receipt_number)
  WHERE receipt_number IS NOT NULL;

COMMENT ON COLUMN goods_receipts.receipt_number
  IS 'N° séquentiel du bon de réception — ex. REC-2026-0001. Généré à la création par l''application.';
