-- ============================================================
-- Migration 051 — Plan Pilote ERP
-- Accès complet ["*"] pour les clients en co-construction
-- Prix : 0 XOF — durée recommandée : 3 mois
-- ============================================================

INSERT INTO subscription_plans (
  name,
  product,
  price_monthly,
  price_monthly_annual,
  max_users_allowed,
  target_size,
  features_config
)
VALUES (
  'Pilote 3 mois',
  'erp',
  0,
  0,
  999,
  'pilote',
  '{
    "modules":     ["*"],
    "support":     "prioritaire",
    "users":       "illimite",
    "multi_sites": true,
    "pilote":      true,
    "duree_mois":  3
  }'::jsonb
);
