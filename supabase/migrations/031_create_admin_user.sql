-- ============================================================
-- Migration 031 — Création compte admin Merchant Portal
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================
-- Crée : john@bluwa.io   /   mot de passe : BluwaAdmin2026!
-- ============================================================

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'john@bluwa.io',
  crypt('BluwaAdmin2026!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  NOW(),
  NOW(),
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'john@bluwa.io'
);

-- Vérification
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'john@bluwa.io';
