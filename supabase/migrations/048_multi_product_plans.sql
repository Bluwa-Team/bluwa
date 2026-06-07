-- ============================================================
-- Migration 048 — Multi-produit : product sur subscription_plans
--                 + crm_plan_id sur organizations
-- ERP → factories.subscription_plan_id (inchangé)
-- WMS → factories.subscription_plan_id (plan product='wms')
-- CRM → organizations.crm_plan_id      (niveau org)
-- ============================================================

-- ── §1  Colonne product sur subscription_plans ────────────────
ALTER TABLE subscription_plans
  ADD COLUMN product VARCHAR(20) NOT NULL DEFAULT 'erp'
    CHECK (product IN ('erp', 'wms', 'crm'));

COMMENT ON COLUMN subscription_plans.product IS 'Produit Bluwa auquel appartient ce plan : erp | wms | crm';

-- Marquer les plans existants comme ERP (déjà le default, explicite pour clarté)
UPDATE subscription_plans SET product = 'erp';

-- ── §2  Plans WMS ─────────────────────────────────────────────
INSERT INTO subscription_plans (name, product, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config)
VALUES
  (
    'WMS Starter', 'wms', 35000, 29000, 5, 'tpe',
    '{"modules": ["locations", "reception_wms", "mouvements", "inventaire_wms"], "support": "email", "users": "1-5", "multi_sites": false}'::jsonb
  ),
  (
    'WMS Growth', 'wms', 120000, 99000, 20, 'pme',
    '{"modules": ["locations", "reception_wms", "mouvements", "inventaire_wms", "picking", "expedition", "kpis_wms"], "support": "email", "users": "jusqu_a_20", "multi_sites": true}'::jsonb
  ),
  (
    'WMS Enterprise', 'wms', 0, 0, 999, 'grande',
    '{"modules": ["locations", "reception_wms", "mouvements", "inventaire_wms", "picking", "expedition", "kpis_wms", "cross_docking", "3pl_multi_clients"], "support": "prioritaire", "users": "illimite", "multi_sites": true, "sur_mesure": true}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ── §3  Plans CRM ─────────────────────────────────────────────
INSERT INTO subscription_plans (name, product, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config)
VALUES
  (
    'CRM Starter', 'crm', 25000, 21000, 3, 'tpe',
    '{"modules": ["leads", "pipeline", "activites"], "support": "email", "users": "1-3", "multi_sites": false}'::jsonb
  ),
  (
    'CRM Growth', 'crm', 90000, 75000, 15, 'pme',
    '{"modules": ["leads", "pipeline", "activites", "reporting_crm", "segmentation"], "support": "email", "users": "jusqu_a_15", "multi_sites": true}'::jsonb
  ),
  (
    'CRM Enterprise', 'crm', 0, 0, 999, 'grande',
    '{"modules": ["leads", "pipeline", "activites", "reporting_crm", "segmentation", "automatisation"], "support": "prioritaire", "users": "illimite", "multi_sites": true, "sur_mesure": true}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ── §4  CRM au niveau organisation ───────────────────────────
ALTER TABLE organizations
  ADD COLUMN crm_plan_id UUID REFERENCES subscription_plans(id);

COMMENT ON COLUMN organizations.crm_plan_id IS 'Plan CRM souscrit au niveau organisation (équipe commerciale transverse, indépendant des factories)';
