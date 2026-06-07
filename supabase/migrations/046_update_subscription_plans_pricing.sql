-- ============================================================
-- Migration 046 — Mise à jour pricing plans (juin 2026)
-- Starter : max_users 3 → 10  (TPE, 1–10 utilisateurs/site)
-- Growth  : max_users 15 → 30 (PME, jusqu'à 30 utilisateurs/site)
-- Enterprise : prix → 0 (sur mesure, affiché "Sur devis" dans l'UI)
-- ============================================================

UPDATE subscription_plans SET
  max_users_allowed = 10,
  target_size       = 'tpe',
  features_config   = features_config || '{"users": "1-10"}'::jsonb
WHERE name = 'Starter';

UPDATE subscription_plans SET
  max_users_allowed = 30,
  target_size       = 'pme',
  features_config   = features_config || '{"users": "jusqu_a_30"}'::jsonb
WHERE name = 'Growth';

UPDATE subscription_plans SET
  price_monthly        = 0,
  price_monthly_annual = 0,
  max_users_allowed    = 999,
  target_size          = 'grande',
  features_config      = features_config || '{"users": "illimite", "sur_mesure": true}'::jsonb
WHERE name = 'Enterprise';
