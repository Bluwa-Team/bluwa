-- ── Bluwa Academy Backend — Migration 018 ────────────────────────────────────
-- Profils apprenants, progression, certifications

-- 1. Profils apprenants ────────────────────────────────────────────────────────
create table if not exists academy_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null,
  organisation text,
  created_at   timestamptz default now()
);

alter table academy_profiles enable row level security;

create policy "academy_profiles_select" on academy_profiles
  for select using (auth.uid() = id);
create policy "academy_profiles_insert" on academy_profiles
  for insert with check (auth.uid() = id);
create policy "academy_profiles_update" on academy_profiles
  for update using (auth.uid() = id);

-- 2. Progression par section ───────────────────────────────────────────────────
create table if not exists academy_section_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  module_slug   text not null,   -- ex. "fondations-mdm"
  section_title text not null,
  completed_at  timestamptz default now(),
  unique(user_id, module_slug, section_title)
);

alter table academy_section_progress enable row level security;

create policy "academy_progress_select" on academy_section_progress
  for select using (auth.uid() = user_id);
create policy "academy_progress_insert" on academy_section_progress
  for insert with check (auth.uid() = user_id);
create policy "academy_progress_delete" on academy_section_progress
  for delete using (auth.uid() = user_id);

-- 3. Certifications débloquées ─────────────────────────────────────────────────
create table if not exists academy_certifications (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  level     text not null check (level in ('user', 'metier', 'cbscp')),
  issued_at timestamptz default now(),
  unique(user_id, level)
);

alter table academy_certifications enable row level security;

create policy "academy_certifs_select" on academy_certifications
  for select using (auth.uid() = user_id);
create policy "academy_certifs_insert" on academy_certifications
  for insert with check (auth.uid() = user_id);
