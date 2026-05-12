# ERP Agro-Alimentaire — Guide de Setup

> Document évolutif. Mis à jour à chaque étape du build.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| Animations | Framer Motion |
| Charts | shadcn/ui Charts (Recharts) |
| Base de données | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Hébergement frontend | Vercel |
| Backend | Express.js + TypeScript |
| Agent IA | Claude API (claude-sonnet-4-6) |
| Région serveur | af-south-1 (Cape Town) |

---

## Structure du projet

```
bluwa/
├── frontend/          # Next.js App Router
│   └── src/
│       ├── app/       # Routes (App Router)
│       ├── components/
│       │   ├── ui/    # shadcn/ui components
│       │   ├── layout/# Header, Sidebar, etc.
│       │   └── agent/ # Panel IA latéral
│       ├── hooks/     # Custom React hooks
│       ├── lib/       # Supabase client, utils
│       └── types/     # TypeScript types
│
├── backend/           # Express.js API
│   └── src/
│       ├── routes/    # Routes API
│       ├── middleware/ # Auth, CORS, etc.
│       ├── lib/       # Supabase, Anthropic clients
│       └── types/     # TypeScript types
│
└── SETUP.md           # Ce fichier
```

---

## Étape 1 — Supabase ✅ (en cours)

### 1.1 Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. **CRITIQUE : Choisir la région `af-south-1` (Cape Town)** — ne peut pas être changée après création
3. Noter les clés dans `.env.local` (frontend) et `.env` (backend)

### 1.2 Copier les variables d'environnement

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
```

Remplir avec les vraies valeurs depuis le dashboard Supabase :
- `SUPABASE_URL` → Project Settings > API > Project URL
- `SUPABASE_ANON_KEY` → Project Settings > API > anon public
- `SUPABASE_SERVICE_ROLE_KEY` → Project Settings > API > service_role (⚠️ ne jamais exposer côté client)

### 1.3 Schema fondateur — SQL à exécuter dans Supabase SQL Editor

```sql
-- =====================
-- ORGANIZATIONS
-- =====================
create table organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,  -- ex: 'groupe-sedima'
  created_at   timestamptz default now()
);

comment on table organizations is 'Groupes agro-alimentaires (ex: Groupe Sedima)';
comment on column organizations.slug is 'Identifiant URL unique du groupe, ex: groupe-sedima';

-- =====================
-- FACTORIES
-- =====================
create table factories (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) on delete cascade,
  name             text not null,
  location         text,
  created_at       timestamptz default now()
);

comment on table factories is 'Usines de production appartenant à une organisation';
comment on column factories.location is 'Localisation géographique de l usine, ex: Dakar, Sénégal';

-- =====================
-- PROFILES (lié à auth.users)
-- =====================
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid references organizations(id),
  factory_id       uuid references factories(id),  -- null si org_admin
  role             text check (role in (
    'super_admin',
    'org_admin',
    'factory_admin',
    'operator'
  )),
  full_name        text,
  created_at       timestamptz default now()
);

comment on table profiles is 'Profils utilisateurs liés aux comptes auth Supabase';
comment on column profiles.factory_id is 'Null pour org_admin (accès toutes usines de son organisation)';
comment on column profiles.role is 'super_admin=tout, org_admin=toutes usines, factory_admin=sa factory, operator=opérations limitées';
```

### 1.4 RLS (Row Level Security)

```sql
-- Activer RLS sur toutes les tables
alter table organizations enable row level security;
alter table factories enable row level security;
alter table profiles enable row level security;

-- Une orga est visible uniquement par ses membres
create policy org_access on organizations
  for select using (
    id = (select organization_id from profiles where id = auth.uid())
  );

-- Un user voit les factories de son organisation uniquement
create policy factory_access on factories
  for select using (
    organization_id = (select organization_id from profiles where id = auth.uid())
  );

-- Un user voit son propre profil
-- org_admin et super_admin voient tous les profils de leur organisation
create policy profile_access on profiles
  for select using (
    id = auth.uid()
    or (
      organization_id = (select organization_id from profiles where id = auth.uid())
      and (select role from profiles where id = auth.uid()) in ('org_admin', 'super_admin')
    )
  );
```

### 1.5 Trigger auto-création de profil

```sql
-- Fonction appelée à chaque nouveau signup
create or replace function handle_new_user()
returns trigger as $$
begin
  -- Le profil sera créé manuellement via l'onboarding
  -- Ce trigger gère uniquement les invitations (metadata présentes)
  if new.raw_user_meta_data->>'organization_id' is not null then
    insert into profiles (id, organization_id, factory_id, role, full_name)
    values (
      new.id,
      (new.raw_user_meta_data->>'organization_id')::uuid,
      (new.raw_user_meta_data->>'factory_id')::uuid,
      new.raw_user_meta_data->>'role',
      new.raw_user_meta_data->>'full_name'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

---

## Étape 2 — Frontend (Next.js) ✅ Initialisé

### Installation faite
- Next.js 15 + TypeScript + Tailwind CSS v4
- shadcn/ui (avec composant Button + utils)
- Framer Motion
- @supabase/supabase-js + @supabase/ssr

### Lancer le frontend
```bash
cd frontend
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                   # http://localhost:3000
```

### Prochaines tâches frontend
- [ ] Configurer le client Supabase (`src/lib/supabase/`)
- [ ] Layout principal (sidebar + header)
- [ ] Pages d'onboarding (Parcours A)
- [ ] Dashboard vide fonctionnel
- [ ] Panel agent IA latéral

---

## Étape 3 — Backend (Express.js) ✅ Initialisé

### Installation faite
- Express.js + TypeScript + ts-node
- @supabase/supabase-js
- @anthropic-ai/sdk
- cors + dotenv

### Lancer le backend
```bash
cd backend
cp .env.example .env   # puis remplir les valeurs
npm run dev            # http://localhost:4000
```

### Prochaines tâches backend
- [ ] Serveur Express de base (`src/index.ts`)
- [ ] Middleware auth (vérification JWT Supabase)
- [ ] Route `/api/agent` (agent IA avec Claude API)
- [ ] Route `/api/onboarding` (création org + factory + profil en transaction)

---

## Étape 4 — Onboarding 🔜

### Parcours A : Créer une organisation
1. Compte (nom, email, mot de passe)
2. Nom de l'organisation → génère le slug
3. Première factory (nom + localisation)
→ Dashboard vide mais fonctionnel
→ Rôle attribué automatiquement : `org_admin`

### Parcours B : Rejoindre par invitation
- Déclenché depuis Settings > Team > Inviter
- Supabase Auth envoie un magic link avec metadata : `organization_id`, `factory_id`, `role`
- Le trigger SQL crée le profil automatiquement

---

## Étape 5 — Agent IA 🔜

### Architecture
```
Dirigeant → question (panel latéral)
     ↓
Next.js → Backend /api/agent
     ↓
Vérification rôle (403 si operator)
     ↓
Claude API + system prompt contextualisé
     ↓
Tool use : query Supabase avec JWT utilisateur (RLS auto)
     ↓
Réponse langage naturel → panel
```

### Règles de sécurité
- Utilise le **JWT utilisateur** (jamais la service role key)
- **READ ONLY** — aucune écriture en base
- Accessible uniquement aux rôles `org_admin` et `factory_admin`

---

## Étape 6 — Modules métier 🔜

À définir avec le Lovable de l'associé :
- Lots de production
- Stocks & matières premières
- Traçabilité (HACCP, DLC/DLUO, allergènes)
- Non-conformités
- Fournisseurs
- Rapports & exports

---

## Variables d'environnement — Récapitulatif

| Variable | Fichier | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/.env.local` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env.local` | Clé publique Supabase |
| `NEXT_PUBLIC_BACKEND_URL` | `frontend/.env.local` | URL du backend Express |
| `SUPABASE_URL` | `backend/.env` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | `backend/.env` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | Clé service (⚠️ backend only) |
| `ANTHROPIC_API_KEY` | `backend/.env` | Clé API Claude (Anthropic) |
| `PORT` | `backend/.env` | Port du serveur Express (4000) |
| `FRONTEND_URL` | `backend/.env` | URL du frontend pour CORS |
