-- ============================================================
-- Bluwa ERP — Migration 031
-- Unités et coefficient de conversion côté Achat
-- ============================================================
--
-- Contexte : articles.coeff_conversion est orienté vente (unite_stock → unite_vente).
-- Les MP sont achetés dans une unité différente de l'unité de stock
-- (ex : boîte 3 552 g achetée, stockée en g, utilisée en g en BOM).
-- Cette migration ajoute les colonnes symétriques côté achat.
--
-- Règles :
--   unite_achat            = unité utilisée dans BC / réception   (ex : "boite", "kg", "sac 50 kg")
--   coeff_conversion_achat = nb d'unités de stock par unité achat  (ex : 3552 pour g/boite)
--   DEFAULT 1 → pas de conversion = unité achat = unité stock (cas le plus courant)
--
-- Usage par type article :
--   MP / AC / CS  : unite_achat + coeff_conversion_achat renseignés, unite_vente NULL
--   PF / PSF      : unite_achat NULL (fabriqués, non achetés), unite_vente + coeff_conversion renseignés
-- ============================================================

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS unite_achat            TEXT,
  ADD COLUMN IF NOT EXISTS coeff_conversion_achat NUMERIC NOT NULL DEFAULT 1
    CHECK (coeff_conversion_achat > 0);

COMMENT ON COLUMN articles.unite_achat            IS 'Unité utilisée dans BC et réception (ex : boite, sac 50 kg). NULL si article fabriqué (PF/PSF).';
COMMENT ON COLUMN articles.coeff_conversion_achat IS 'Nb unités stock par unité achat. Ex : 3552 si 1 boite = 3552 g. DEFAULT 1 = pas de conversion.';
