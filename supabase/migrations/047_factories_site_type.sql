-- ============================================================
-- Migration 047 — Typage des sites (site_type + is_owned)
-- Prépare l'architecture multi-produit ERP / WMS / CRM
-- ============================================================

ALTER TABLE factories
  ADD COLUMN site_type VARCHAR(30) NOT NULL DEFAULT 'usine'
    CHECK (site_type IN (
      'usine',               -- site de production propre          → ERP
      'entrepot',            -- entrepôt propre dédié              → WMS full
      'depot_vente',         -- point de vente / distribution      → WMS léger
      'centre_distribution', -- hub logistique propre              → WMS full
      '3pl',                 -- prestataire logistique tiers       → WMS (is_owned=false)
      '4pl'                  -- prestataire pilotage supply chain  → WMS (is_owned=false)
    )),
  ADD COLUMN is_owned BOOLEAN NOT NULL DEFAULT TRUE;
-- is_owned = FALSE → site géré par un tiers (3PL/4PL), non propriété de l'org

COMMENT ON COLUMN factories.site_type IS 'Nature du site : usine propre, entrepôt, 3PL externe, etc. Détermine le produit Bluwa applicable.';
COMMENT ON COLUMN factories.is_owned  IS 'TRUE = site appartenant à l''organisation / FALSE = prestataire externe (3PL/4PL)';
