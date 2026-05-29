-- ============================================================
-- Seed Bluwa Merchant Portal — données de démonstration
-- UUIDs fixes pour idempotence
-- ============================================================

-- ============================================================
-- Plans d'abonnement (correspondance avec la migration 016)
-- ============================================================
INSERT INTO subscription_plans (id, name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config)
VALUES
  (
    'a1a1a1a1-0000-0000-0000-000000000001',
    'Starter', 45000.00, 37000.00, 3, 'tpe',
    '{"modules": ["mdm", "achats", "stocks"], "support": "email", "users": "1-3"}'::jsonb
  ),
  (
    'a1a1a1a1-0000-0000-0000-000000000002',
    'Growth', 150000.00, 125000.00, 15, 'pme',
    '{"modules": ["mdm", "achats", "stocks", "gpao", "qualite"], "support": "email", "users": "jusqu_a_15"}'::jsonb
  ),
  (
    'a1a1a1a1-0000-0000-0000-000000000003',
    'Enterprise', 350000.00, 290000.00, 999, 'grande',
    '{"modules": ["mdm", "achats", "stocks", "gpao", "qualite", "crm", "bi"], "support": "prioritaire", "users": "illimite", "multi_sites": true}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Organisations
-- ============================================================
INSERT INTO organizations (id, name, country_headquarters, status)
VALUES
  ('b2b2b2b2-0000-0000-0000-000000000001', 'Groupe SOKA',         'Sénégal',         'active'),
  ('b2b2b2b2-0000-0000-0000-000000000002', 'Agro Côte d''Ivoire', 'Côte d''Ivoire',  'trial'),
  ('b2b2b2b2-0000-0000-0000-000000000003', 'Minoterie du Sahel',  'Mali',            'active'),
  ('b2b2b2b2-0000-0000-0000-000000000004', 'Laiterie de Dakar',   'Sénégal',         'suspended'),
  ('b2b2b2b2-0000-0000-0000-000000000005', 'Huilerie Kossam',     'Burkina Faso',    'churned')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Factories (sites)
-- ============================================================
INSERT INTO factories (id, organization_id, subscription_plan_id, name, code, location_country, location_city, timezone, subscription_status, subscription_expires_at, is_active)
VALUES
  -- Groupe SOKA
  ('c3c3c3c3-0000-0000-0000-000000000001', 'b2b2b2b2-0000-0000-0000-000000000001', 'a1a1a1a1-0000-0000-0000-000000000002', 'Site Dakar',         'DAK', 'Sénégal',       'Dakar',   'Africa/Dakar',   'ACTIVE',   null,                              true),
  ('c3c3c3c3-0000-0000-0000-000000000002', 'b2b2b2b2-0000-0000-0000-000000000001', 'a1a1a1a1-0000-0000-0000-000000000001', 'Site Thiès',         'THI', 'Sénégal',       'Thiès',   'Africa/Dakar',   'ACTIVE',   null,                              true),
  -- Agro Côte d'Ivoire
  ('c3c3c3c3-0000-0000-0000-000000000003', 'b2b2b2b2-0000-0000-0000-000000000002', 'a1a1a1a1-0000-0000-0000-000000000001', 'Usine Abidjan',      'ABJ', 'Côte d''Ivoire','Abidjan', 'Africa/Abidjan', 'ACTIVE',   '2026-05-01T00:00:00Z',            true),
  -- Minoterie du Sahel
  ('c3c3c3c3-0000-0000-0000-000000000004', 'b2b2b2b2-0000-0000-0000-000000000003', 'a1a1a1a1-0000-0000-0000-000000000003', 'Minoterie Bamako',   'BKO', 'Mali',          'Bamako',  'Africa/Bamako',  'ACTIVE',   null,                              true),
  ('c3c3c3c3-0000-0000-0000-000000000005', 'b2b2b2b2-0000-0000-0000-000000000003', 'a1a1a1a1-0000-0000-0000-000000000002', 'Minoterie Ségou',    'SEG', 'Mali',          'Ségou',   'Africa/Bamako',  'ACTIVE',   null,                              true),
  ('c3c3c3c3-0000-0000-0000-000000000006', 'b2b2b2b2-0000-0000-0000-000000000003', 'a1a1a1a1-0000-0000-0000-000000000001', 'Entrepôt Mopti',     'MOP', 'Mali',          'Mopti',   'Africa/Bamako',  'PAST_DUE', null,                              true),
  ('c3c3c3c3-0000-0000-0000-000000000007', 'b2b2b2b2-0000-0000-0000-000000000003', null,                                   'Site Kayes',         'KAY', 'Mali',          'Kayes',   'Africa/Bamako',  'ACTIVE',   null,                              false),
  -- Laiterie de Dakar
  ('c3c3c3c3-0000-0000-0000-000000000008', 'b2b2b2b2-0000-0000-0000-000000000004', null,                                   'Laiterie Dakar',     'LDA', 'Sénégal',       'Dakar',   'Africa/Dakar',   'CANCELED', null,                              false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Utilisateurs (clients ERP, pas admins Bluwa)
-- ============================================================
INSERT INTO users (id, organization_id, email, first_name, last_name, role, is_active)
VALUES
  ('d4d4d4d4-0000-0000-0000-000000000001', 'b2b2b2b2-0000-0000-0000-000000000001', 'amadou.diallo@soka.sn',     'Amadou',    'Diallo',   'SUPER_ADMIN',  true),
  ('d4d4d4d4-0000-0000-0000-000000000002', 'b2b2b2b2-0000-0000-0000-000000000001', 'ibrahima.sow@soka.sn',      'Ibrahima',  'Sow',      'PLANT_MANAGER',true),
  ('d4d4d4d4-0000-0000-0000-000000000003', 'b2b2b2b2-0000-0000-0000-000000000001', 'mariama.ba@soka.sn',        'Mariama',   'Ba',       'OPERATOR',     true),
  ('d4d4d4d4-0000-0000-0000-000000000004', 'b2b2b2b2-0000-0000-0000-000000000001', 'ousmane.faye@soka.sn',      'Ousmane',   'Faye',     'OPERATOR',     false),
  ('d4d4d4d4-0000-0000-0000-000000000005', 'b2b2b2b2-0000-0000-0000-000000000002', 'moussa.traore@agro-ci.ci',  'Moussa',    'Traoré',   'SUPER_ADMIN',  true),
  ('d4d4d4d4-0000-0000-0000-000000000006', 'b2b2b2b2-0000-0000-0000-000000000002', 'awa.coulibaly@agro-ci.ci',  'Awa',       'Coulibaly','OPERATOR',     true),
  ('d4d4d4d4-0000-0000-0000-000000000007', 'b2b2b2b2-0000-0000-0000-000000000003', 'fatoumata.kone@minoterie.ml','Fatoumata', 'Koné',    'SUPER_ADMIN',  true),
  ('d4d4d4d4-0000-0000-0000-000000000008', 'b2b2b2b2-0000-0000-0000-000000000003', 'seydou.diarra@minoterie.ml','Seydou',    'Diarra',   'PLANT_MANAGER',true),
  ('d4d4d4d4-0000-0000-0000-000000000009', 'b2b2b2b2-0000-0000-0000-000000000003', 'kadiatou.bah@minoterie.ml', 'Kadiatou',  'Bah',      'OPERATOR',     true),
  ('d4d4d4d4-0000-0000-0000-000000000010', 'b2b2b2b2-0000-0000-0000-000000000004', 'cheikh.ndoye@laiterie.sn',  'Cheikh',    'Ndoye',    'SUPER_ADMIN',  false),
  ('d4d4d4d4-0000-0000-0000-000000000011', 'b2b2b2b2-0000-0000-0000-000000000005', 'adama.sawadogo@huilerie.bf','Adama',     'Sawadogo', 'SUPER_ADMIN',  false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- user_site_access
-- ============================================================
INSERT INTO user_site_access (user_id, factory_id)
VALUES
  -- u1 → DAK, THI
  ('d4d4d4d4-0000-0000-0000-000000000001', 'c3c3c3c3-0000-0000-0000-000000000001'),
  ('d4d4d4d4-0000-0000-0000-000000000001', 'c3c3c3c3-0000-0000-0000-000000000002'),
  -- u2 → DAK, THI
  ('d4d4d4d4-0000-0000-0000-000000000002', 'c3c3c3c3-0000-0000-0000-000000000001'),
  ('d4d4d4d4-0000-0000-0000-000000000002', 'c3c3c3c3-0000-0000-0000-000000000002'),
  -- u3 → DAK
  ('d4d4d4d4-0000-0000-0000-000000000003', 'c3c3c3c3-0000-0000-0000-000000000001'),
  -- u4 → THI
  ('d4d4d4d4-0000-0000-0000-000000000004', 'c3c3c3c3-0000-0000-0000-000000000002'),
  -- u5 → ABJ
  ('d4d4d4d4-0000-0000-0000-000000000005', 'c3c3c3c3-0000-0000-0000-000000000003'),
  -- u6 → ABJ
  ('d4d4d4d4-0000-0000-0000-000000000006', 'c3c3c3c3-0000-0000-0000-000000000003'),
  -- u7 → BKO, SEG, MOP
  ('d4d4d4d4-0000-0000-0000-000000000007', 'c3c3c3c3-0000-0000-0000-000000000004'),
  ('d4d4d4d4-0000-0000-0000-000000000007', 'c3c3c3c3-0000-0000-0000-000000000005'),
  ('d4d4d4d4-0000-0000-0000-000000000007', 'c3c3c3c3-0000-0000-0000-000000000006'),
  -- u8 → BKO, SEG
  ('d4d4d4d4-0000-0000-0000-000000000008', 'c3c3c3c3-0000-0000-0000-000000000004'),
  ('d4d4d4d4-0000-0000-0000-000000000008', 'c3c3c3c3-0000-0000-0000-000000000005'),
  -- u9 → MOP
  ('d4d4d4d4-0000-0000-0000-000000000009', 'c3c3c3c3-0000-0000-0000-000000000006'),
  -- u10 → LDA
  ('d4d4d4d4-0000-0000-0000-000000000010', 'c3c3c3c3-0000-0000-0000-000000000008')
ON CONFLICT (user_id, factory_id) DO NOTHING;

-- ============================================================
-- Frais d'installation
-- ============================================================
INSERT INTO installation_fees (id, factory_id, size, amount_xof, status, paid_at, notes)
VALUES
  ('e5e5e5e5-0000-0000-0000-000000000001', 'c3c3c3c3-0000-0000-0000-000000000001', 'pme',    500000,   'paid',    '2026-01-14T00:00:00Z', null),
  ('e5e5e5e5-0000-0000-0000-000000000002', 'c3c3c3c3-0000-0000-0000-000000000002', 'tpe',    150000,   'paid',    '2026-01-30T00:00:00Z', null),
  ('e5e5e5e5-0000-0000-0000-000000000003', 'c3c3c3c3-0000-0000-0000-000000000003', 'tpe',    150000,   'pending', null,                    'Acompte de 75k reçu'),
  ('e5e5e5e5-0000-0000-0000-000000000004', 'c3c3c3c3-0000-0000-0000-000000000004', 'grande', 1500000,  'paid',    '2026-02-08T00:00:00Z', null),
  ('e5e5e5e5-0000-0000-0000-000000000005', 'c3c3c3c3-0000-0000-0000-000000000005', 'pme',    500000,   'paid',    '2026-02-28T00:00:00Z', null),
  ('e5e5e5e5-0000-0000-0000-000000000006', 'c3c3c3c3-0000-0000-0000-000000000006', 'tpe',    150000,   'partial', null,                    'Acompte 75k payé')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Services à la carte
-- ============================================================
INSERT INTO service_orders (id, org_id, factory_id, service_type, description, amount_xof, status, scheduled_at, delivered_at)
VALUES
  ('f6f6f6f6-0000-0000-0000-000000000001', 'b2b2b2b2-0000-0000-0000-000000000001', 'c3c3c3c3-0000-0000-0000-000000000001', 'support_prioritaire', 'Support prioritaire mensuel WhatsApp/Meet',                   40000,  'paid',      '2026-04-01T00:00:00Z', null),
  ('f6f6f6f6-0000-0000-0000-000000000002', 'b2b2b2b2-0000-0000-0000-000000000001', 'c3c3c3c3-0000-0000-0000-000000000001', 'support_prioritaire', 'Support prioritaire mensuel WhatsApp/Meet',                   40000,  'paid',      '2026-05-01T00:00:00Z', null),
  ('f6f6f6f6-0000-0000-0000-000000000003', 'b2b2b2b2-0000-0000-0000-000000000003', 'c3c3c3c3-0000-0000-0000-000000000004', 'audit_conseil',       'Audit Supply Chain + diagnostic flux Bamako',                 150000, 'delivered', '2026-04-15T00:00:00Z', '2026-04-15T00:00:00Z'),
  ('f6f6f6f6-0000-0000-0000-000000000004', 'b2b2b2b2-0000-0000-0000-000000000003', null,                                   'formation',           'Formation GPAO — équipe production (demi-journée)',           50000,  'confirmed', '2026-06-05T00:00:00Z', null),
  ('f6f6f6f6-0000-0000-0000-000000000005', 'b2b2b2b2-0000-0000-0000-000000000002', 'c3c3c3c3-0000-0000-0000-000000000003', 'migration_donnees',   'Migration fichiers Excel articles + fournisseurs',            75000,  'quoted',    null,                   null)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Factures SaaS
-- ============================================================
INSERT INTO invoices (id, factory_id, amount_xof, status, due_at, paid_at)
VALUES
  ('a7a7a7a7-0000-0000-0000-000000000001', 'c3c3c3c3-0000-0000-0000-000000000001', 149000, 'paid',    '2026-02-01T00:00:00Z', '2026-01-28T00:00:00Z'),
  ('a7a7a7a7-0000-0000-0000-000000000002', 'c3c3c3c3-0000-0000-0000-000000000001', 149000, 'paid',    '2026-03-01T00:00:00Z', '2026-02-26T00:00:00Z'),
  ('a7a7a7a7-0000-0000-0000-000000000003', 'c3c3c3c3-0000-0000-0000-000000000001', 149000, 'overdue', '2026-04-01T00:00:00Z', null),
  ('a7a7a7a7-0000-0000-0000-000000000004', 'c3c3c3c3-0000-0000-0000-000000000002', 49000,  'paid',    '2026-03-01T00:00:00Z', '2026-02-27T00:00:00Z'),
  ('a7a7a7a7-0000-0000-0000-000000000005', 'c3c3c3c3-0000-0000-0000-000000000002', 49000,  'paid',    '2026-04-01T00:00:00Z', '2026-03-29T00:00:00Z'),
  ('a7a7a7a7-0000-0000-0000-000000000006', 'c3c3c3c3-0000-0000-0000-000000000004', 399000, 'paid',    '2026-03-10T00:00:00Z', '2026-03-08T00:00:00Z'),
  ('a7a7a7a7-0000-0000-0000-000000000007', 'c3c3c3c3-0000-0000-0000-000000000004', 399000, 'paid',    '2026-04-10T00:00:00Z', '2026-04-09T00:00:00Z'),
  ('a7a7a7a7-0000-0000-0000-000000000008', 'c3c3c3c3-0000-0000-0000-000000000004', 399000, 'pending', '2026-05-10T00:00:00Z', null),
  ('a7a7a7a7-0000-0000-0000-000000000009', 'c3c3c3c3-0000-0000-0000-000000000005', 149000, 'paid',    '2026-04-01T00:00:00Z', '2026-03-30T00:00:00Z'),
  ('a7a7a7a7-0000-0000-0000-000000000010', 'c3c3c3c3-0000-0000-0000-000000000003', 49000,  'pending', '2026-05-01T00:00:00Z', null)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Tickets de support
-- ============================================================
INSERT INTO support_tickets (id, org_id, subject, status, priority, assigned_to, messages)
VALUES
  (
    'b8b8b8b8-0000-0000-0000-000000000001',
    'b2b2b2b2-0000-0000-0000-000000000001',
    'Impossible de créer un ordre de fabrication',
    'open', 'high', 'john@bluwa.io',
    '[{"id":"m1","author":"Amadou Diallo","content":"Quand je clique sur Nouvel OF, la page se fige.","created_at":"2026-05-27T09:00:00Z","is_internal":false},{"id":"m2","author":"john@bluwa.io","content":"Je regarde ça, probablement lié au module GPAO.","created_at":"2026-05-27T10:30:00Z","is_internal":true}]'::jsonb
  ),
  (
    'b8b8b8b8-0000-0000-0000-000000000002',
    'b2b2b2b2-0000-0000-0000-000000000003',
    'Export Excel des mouvements de stock vide',
    'in_progress', 'medium', 'john@bluwa.io',
    '[{"id":"m3","author":"Fatoumata Koné","content":"L''export télécharge un fichier vide depuis 2 jours.","created_at":"2026-05-25T14:00:00Z","is_internal":false}]'::jsonb
  ),
  (
    'b8b8b8b8-0000-0000-0000-000000000003',
    'b2b2b2b2-0000-0000-0000-000000000002',
    'Demande d''ajout d''un 2ème site',
    'open', 'low', null,
    '[{"id":"m4","author":"Moussa Traoré","content":"On ouvre un deuxième entrepôt à Abidjan, comment ajouter le site ?","created_at":"2026-05-28T07:00:00Z","is_internal":false}]'::jsonb
  ),
  (
    'b8b8b8b8-0000-0000-0000-000000000004',
    'b2b2b2b2-0000-0000-0000-000000000001',
    'Erreur calcul PMP après réception',
    'resolved', 'critical', 'john@bluwa.io',
    '[{"id":"m5","author":"Ibrahima Sow","content":"Le PMP ne se recalcule plus depuis hier soir.","created_at":"2026-05-20T18:00:00Z","is_internal":false},{"id":"m6","author":"john@bluwa.io","content":"Corrigé — trigger manquant après la migration 013.","created_at":"2026-05-21T09:00:00Z","is_internal":true}]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Onboarding pipeline
-- ============================================================
INSERT INTO onboarding_pipeline (id, org_id, org_name, country, stage, plan_target, assigned_to, blocked, blocked_reason, stage_entered_at, created_at)
VALUES
  ('c9c9c9c9-0000-0000-0000-000000000001', null,                                   'Boulangerie Soleil',     'Sénégal',       'prospect',      'Starter',    'john@bluwa.io', false, null,                                                            '2026-05-26T00:00:00Z', '2026-05-26T00:00:00Z'),
  ('c9c9c9c9-0000-0000-0000-000000000002', null,                                   'Fromagerie Peul',        'Guinée',        'demo',          'Growth',     'john@bluwa.io', false, null,                                                            '2026-05-20T00:00:00Z', '2026-05-15T00:00:00Z'),
  ('c9c9c9c9-0000-0000-0000-000000000003', 'b2b2b2b2-0000-0000-0000-000000000002', 'Agro Côte d''Ivoire',   'Côte d''Ivoire','trial',         'Starter',    'john@bluwa.io', false, null,                                                            '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
  ('c9c9c9c9-0000-0000-0000-000000000004', null,                                   'Rizerie du Delta',       'Sénégal',       'configuration', 'Growth',     'john@bluwa.io', true,  'En attente liste articles Excel (promis le 25/05)',             '2026-05-10T00:00:00Z', '2026-04-28T00:00:00Z'),
  ('c9c9c9c9-0000-0000-0000-000000000005', null,                                   'Conserverie Atlantique', 'Mauritanie',    'formation',     'Enterprise', 'john@bluwa.io', false, null,                                                            '2026-05-18T00:00:00Z', '2026-04-10T00:00:00Z'),
  ('c9c9c9c9-0000-0000-0000-000000000006', 'b2b2b2b2-0000-0000-0000-000000000003', 'Minoterie du Sahel',    'Mali',          'golive',        'Enterprise', 'john@bluwa.io', false, null,                                                            '2026-02-10T00:00:00Z', '2026-01-15T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Onboarding checklist
-- ============================================================
INSERT INTO onboarding_checklist (id, pipeline_id, label, done, sort_order)
VALUES
  -- ob-1 Boulangerie Soleil
  ('c9c9c9c9-0001-0000-0000-000000000001', 'c9c9c9c9-0000-0000-0000-000000000001', 'Premier contact établi',          true,  1),
  ('c9c9c9c9-0001-0000-0000-000000000002', 'c9c9c9c9-0000-0000-0000-000000000001', 'Besoin qualifié',                 false, 2),
  ('c9c9c9c9-0001-0000-0000-000000000003', 'c9c9c9c9-0000-0000-0000-000000000001', 'Démo planifiée',                  false, 3),
  -- ob-2 Fromagerie Peul
  ('c9c9c9c9-0002-0000-0000-000000000001', 'c9c9c9c9-0000-0000-0000-000000000002', 'Démo réalisée',                   true,  1),
  ('c9c9c9c9-0002-0000-0000-000000000002', 'c9c9c9c9-0000-0000-0000-000000000002', 'Proposition commerciale envoyée', true,  2),
  ('c9c9c9c9-0002-0000-0000-000000000003', 'c9c9c9c9-0000-0000-0000-000000000002', 'Retour client reçu',              false, 3),
  -- ob-3 Agro CI
  ('c9c9c9c9-0003-0000-0000-000000000001', 'c9c9c9c9-0000-0000-0000-000000000003', 'Accès trial créé',                true,  1),
  ('c9c9c9c9-0003-0000-0000-000000000002', 'c9c9c9c9-0000-0000-0000-000000000003', 'MDM configuré',                   true,  2),
  ('c9c9c9c9-0003-0000-0000-000000000003', 'c9c9c9c9-0000-0000-0000-000000000003', 'Première réception enregistrée',  true,  3),
  ('c9c9c9c9-0003-0000-0000-000000000004', 'c9c9c9c9-0000-0000-0000-000000000003', 'Équipe terrain autonome',         false, 4),
  -- ob-4 Rizerie du Delta
  ('c9c9c9c9-0004-0000-0000-000000000001', 'c9c9c9c9-0000-0000-0000-000000000004', 'Sites créés',                     true,  1),
  ('c9c9c9c9-0004-0000-0000-000000000002', 'c9c9c9c9-0000-0000-0000-000000000004', 'Utilisateurs invités',            true,  2),
  ('c9c9c9c9-0004-0000-0000-000000000003', 'c9c9c9c9-0000-0000-0000-000000000004', 'Articles MDM importés',           false, 3),
  ('c9c9c9c9-0004-0000-0000-000000000004', 'c9c9c9c9-0000-0000-0000-000000000004', 'Fournisseurs créés',              false, 4),
  ('c9c9c9c9-0004-0000-0000-000000000005', 'c9c9c9c9-0000-0000-0000-000000000004', 'BOM saisi',                       false, 5),
  -- ob-5 Conserverie Atlantique
  ('c9c9c9c9-0005-0000-0000-000000000001', 'c9c9c9c9-0000-0000-0000-000000000005', 'Formation réception',             true,  1),
  ('c9c9c9c9-0005-0000-0000-000000000002', 'c9c9c9c9-0000-0000-0000-000000000005', 'Formation stocks & lots',         true,  2),
  ('c9c9c9c9-0005-0000-0000-000000000003', 'c9c9c9c9-0000-0000-0000-000000000005', 'Formation GPAO',                  false, 3),
  ('c9c9c9c9-0005-0000-0000-000000000004', 'c9c9c9c9-0000-0000-0000-000000000005', 'Formation qualité HACCP',         false, 4),
  ('c9c9c9c9-0005-0000-0000-000000000005', 'c9c9c9c9-0000-0000-0000-000000000005', 'Test utilisateurs validé',        false, 5),
  -- ob-6 Minoterie du Sahel
  ('c9c9c9c9-0006-0000-0000-000000000001', 'c9c9c9c9-0000-0000-0000-000000000006', 'Go-live effectué',                true,  1),
  ('c9c9c9c9-0006-0000-0000-000000000002', 'c9c9c9c9-0000-0000-0000-000000000006', 'Premier OF en production réelle', true,  2),
  ('c9c9c9c9-0006-0000-0000-000000000003', 'c9c9c9c9-0000-0000-0000-000000000006', 'Abonnement payant activé',        true,  3),
  ('c9c9c9c9-0006-0000-0000-000000000004', 'c9c9c9c9-0000-0000-0000-000000000006', 'Suivi J+30 planifié',             true,  4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Onboarding comments
-- ============================================================
INSERT INTO onboarding_comments (id, pipeline_id, author, content, created_at)
VALUES
  -- ob-1
  ('c9c9c9c9-0010-0000-0000-000000000001', 'c9c9c9c9-0000-0000-0000-000000000001', 'john@bluwa.io', 'Référence via le réseau CNCAS. À relancer la semaine prochaine.', '2026-05-26T09:00:00Z'),
  -- ob-2
  ('c9c9c9c9-0010-0000-0000-000000000002', 'c9c9c9c9-0000-0000-0000-000000000002', 'john@bluwa.io', 'Démo très positive. Ils veulent voir le module GPAO en détail avant de décider.', '2026-05-20T16:30:00Z'),
  ('c9c9c9c9-0010-0000-0000-000000000003', 'c9c9c9c9-0000-0000-0000-000000000002', 'john@bluwa.io', 'Proposition envoyée par email. Attente retour avant vendredi.', '2026-05-22T11:00:00Z'),
  -- ob-4
  ('c9c9c9c9-0010-0000-0000-000000000004', 'c9c9c9c9-0000-0000-0000-000000000004', 'john@bluwa.io', 'Client n''a toujours pas envoyé le fichier Excel des articles. Relance envoyée le 27/05.', '2026-05-27T10:00:00Z'),
  -- ob-6
  ('c9c9c9c9-0010-0000-0000-000000000005', 'c9c9c9c9-0000-0000-0000-000000000006', 'john@bluwa.io', 'Go-live sans incident. Équipe très autonome. Suivi J+30 prévu le 12/03.', '2026-02-10T18:00:00Z')
ON CONFLICT (id) DO NOTHING;
