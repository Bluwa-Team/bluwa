import {
  MerchantOrg, SubscriptionPlan, Invoice, SupportTicket,
  OnboardingItem, Factory, InstallationFee, ServiceOrder,
  CurrencyCode,
} from '@/types/merchant'
import { xofToLocal } from './utils'

// ─── Plans ──────────────────────────────────────────────────────────────────

export const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-1',
    name: 'Starter',
    price_monthly: 45000,
    price_monthly_annual: 37000,
    max_users_allowed: 3,
    target_size: 'tpe',
    features_config: { modules: ['mdm', 'achats', 'stocks'], support: 'email', users: '1–3' },
    prices: { XOF: 45000, GHS: 800, NGN: 102000, GNF: 600000, GMD: 4300, SLE: 1450, LRD: 13200, CVE: 7400, MRU: 2800 },
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan-2',
    name: 'Growth',
    price_monthly: 150000,
    price_monthly_annual: 125000,
    max_users_allowed: 15,
    target_size: 'pme',
    features_config: { modules: ['mdm', 'achats', 'stocks', 'gpao', 'qualite'], support: 'email', users: "jusqu'à 15" },
    prices: { XOF: 150000, GHS: 2600, NGN: 340000, GNF: 2000000, GMD: 14300, SLE: 4840, LRD: 44100, CVE: 24600, MRU: 9400 },
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan-3',
    name: 'Enterprise',
    price_monthly: 350000,
    price_monthly_annual: 290000,
    max_users_allowed: 999,
    target_size: 'grande',
    features_config: { modules: ['mdm', 'achats', 'stocks', 'gpao', 'qualite', 'crm', 'bi'], support: 'prioritaire', users: 'illimité', multi_sites: true },
    prices: { XOF: 350000, GHS: 6000, NGN: 796000, GNF: 4600000, GMD: 33300, SLE: 11300, LRD: 103000, CVE: 57400, MRU: 21900 },
    created_at: '2026-01-01T00:00:00Z',
  },
]

export const INSTALLATION_FEE_AMOUNTS: Record<string, number> = {
  tpe: 150000, pme: 500000, grande: 1500000,
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function localInstall(size: 'tpe' | 'pme' | 'grande', currency: CurrencyCode) {
  return xofToLocal(INSTALLATION_FEE_AMOUNTS[size], currency)
}
function localPlan(planIdx: 0 | 1 | 2, currency: CurrencyCode): number {
  return MOCK_PLANS[planIdx].prices?.[currency] ?? xofToLocal(MOCK_PLANS[planIdx].price_monthly, currency)
}

// ─── Factories ───────────────────────────────────────────────────────────────

export const MOCK_FACTORIES: Factory[] = [
  // ── org-1  Groupe SOKA (Sénégal, XOF)
  { id: 'fac-1',  organization_id: 'org-1',  name: 'Site Dakar',                  code: 'DAK', location_country: 'Sénégal',       location_city: 'Dakar',       timezone: 'Africa/Dakar',     currency: 'XOF', subscription_plan_id: 'plan-2', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-01-15T00:00:00Z', plan: MOCK_PLANS[1] },
  { id: 'fac-2',  organization_id: 'org-1',  name: 'Site Thiès',                  code: 'THI', location_country: 'Sénégal',       location_city: 'Thiès',       timezone: 'Africa/Dakar',     currency: 'XOF', subscription_plan_id: 'plan-1', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-02-01T00:00:00Z', plan: MOCK_PLANS[0] },
  // ── org-2  Agro Côte d'Ivoire (XOF)
  { id: 'fac-3',  organization_id: 'org-2',  name: "Usine Abidjan",               code: 'ABJ', location_country: "Côte d'Ivoire", location_city: 'Abidjan',     timezone: 'Africa/Abidjan',   currency: 'XOF', subscription_plan_id: 'plan-1', subscription_status: 'ACTIVE',   subscription_expires_at: '2026-06-01T00:00:00Z', is_active: true,  created_at: '2026-04-01T00:00:00Z', plan: MOCK_PLANS[0] },
  // ── org-3  Minoterie du Sahel (Mali, XOF) — 4 sites
  { id: 'fac-4',  organization_id: 'org-3',  name: 'Minoterie Bamako',            code: 'BKO', location_country: 'Mali',          location_city: 'Bamako',      timezone: 'Africa/Bamako',    currency: 'XOF', subscription_plan_id: 'plan-3', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-02-10T00:00:00Z', plan: MOCK_PLANS[2] },
  { id: 'fac-5',  organization_id: 'org-3',  name: 'Minoterie Ségou',             code: 'SEG', location_country: 'Mali',          location_city: 'Ségou',       timezone: 'Africa/Bamako',    currency: 'XOF', subscription_plan_id: 'plan-2', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-03-01T00:00:00Z', plan: MOCK_PLANS[1] },
  { id: 'fac-6',  organization_id: 'org-3',  name: 'Entrepôt Mopti',             code: 'MOP', location_country: 'Mali',          location_city: 'Mopti',       timezone: 'Africa/Bamako',    currency: 'XOF', subscription_plan_id: 'plan-1', subscription_status: 'PAST_DUE', subscription_expires_at: null,                  is_active: true,  created_at: '2026-04-01T00:00:00Z', plan: MOCK_PLANS[0] },
  { id: 'fac-7',  organization_id: 'org-3',  name: 'Site Kayes',                  code: 'KAY', location_country: 'Mali',          location_city: 'Kayes',       timezone: 'Africa/Bamako',    currency: 'XOF', subscription_plan_id: null,     subscription_status: null,       subscription_expires_at: null,                  is_active: false, created_at: '2026-05-01T00:00:00Z' },
  // ── org-4  Laiterie de Dakar (suspendu, XOF)
  { id: 'fac-8',  organization_id: 'org-4',  name: 'Laiterie Dakar',              code: 'LDA', location_country: 'Sénégal',       location_city: 'Dakar',       timezone: 'Africa/Dakar',     currency: 'XOF', subscription_plan_id: null,     subscription_status: 'CANCELED', subscription_expires_at: '2026-02-28T00:00:00Z', is_active: false, created_at: '2025-11-20T00:00:00Z' },
  // ── org-6  GoldCoast Foods (Ghana, GHS)
  { id: 'fac-9',  organization_id: 'org-6',  name: 'Cocoa Plant Kumasi',          code: 'KMS', location_country: 'Ghana',         location_city: 'Kumasi',      timezone: 'Africa/Accra',     currency: 'GHS', subscription_plan_id: 'plan-3', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-03-10T00:00:00Z', plan: MOCK_PLANS[2] },
  { id: 'fac-10', organization_id: 'org-6',  name: 'Palm Oil Factory Accra',      code: 'ACC', location_country: 'Ghana',         location_city: 'Accra',       timezone: 'Africa/Accra',     currency: 'GHS', subscription_plan_id: 'plan-2', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-03-20T00:00:00Z', plan: MOCK_PLANS[1] },
  // ── org-7  Sunrise Agro Industries (Nigeria, NGN)
  { id: 'fac-11', organization_id: 'org-7',  name: 'Processing Plant Lagos',      code: 'LOS', location_country: 'Nigeria',       location_city: 'Lagos',       timezone: 'Africa/Lagos',     currency: 'NGN', subscription_plan_id: 'plan-3', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-04-05T00:00:00Z', plan: MOCK_PLANS[2] },
  { id: 'fac-12', organization_id: 'org-7',  name: 'Flour Mill Kano',             code: 'KAN', location_country: 'Nigeria',       location_city: 'Kano',        timezone: 'Africa/Lagos',     currency: 'NGN', subscription_plan_id: 'plan-3', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-04-12T00:00:00Z', plan: MOCK_PLANS[2] },
  { id: 'fac-13', organization_id: 'org-7',  name: 'Distribution Hub Abuja',      code: 'ABV', location_country: 'Nigeria',       location_city: 'Abuja',       timezone: 'Africa/Lagos',     currency: 'NGN', subscription_plan_id: 'plan-2', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-05-02T00:00:00Z', plan: MOCK_PLANS[1] },
  // ── org-8  Sahel Agro (Niger, XOF)
  { id: 'fac-14', organization_id: 'org-8',  name: 'Usine Niamey',                code: 'NIM', location_country: 'Niger',         location_city: 'Niamey',      timezone: 'Africa/Niamey',    currency: 'XOF', subscription_plan_id: 'plan-2', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-03-15T00:00:00Z', plan: MOCK_PLANS[1] },
  // ── org-9  Togo Alimentation (Togo, XOF) — 2 sites
  { id: 'fac-15', organization_id: 'org-9',  name: 'Usine Lomé',                  code: 'LFW', location_country: 'Togo',          location_city: 'Lomé',        timezone: 'Africa/Lome',      currency: 'XOF', subscription_plan_id: 'plan-2', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-02-20T00:00:00Z', plan: MOCK_PLANS[1] },
  { id: 'fac-16', organization_id: 'org-9',  name: 'Entrepôt Kara',              code: 'KAR', location_country: 'Togo',          location_city: 'Kara',        timezone: 'Africa/Lome',      currency: 'XOF', subscription_plan_id: 'plan-1', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-03-05T00:00:00Z', plan: MOCK_PLANS[0] },
  // ── org-10  Cotonou Foods (Bénin, XOF)
  { id: 'fac-17', organization_id: 'org-10', name: 'Site Cotonou',                code: 'COT', location_country: 'Bénin',         location_city: 'Cotonou',     timezone: 'Africa/Porto-Novo', currency: 'XOF', subscription_plan_id: 'plan-1', subscription_status: 'ACTIVE',   subscription_expires_at: '2026-08-01T00:00:00Z', is_active: true,  created_at: '2026-04-10T00:00:00Z', plan: MOCK_PLANS[0] },
  // ── org-12  Conakry Agro (Guinée, GNF)
  { id: 'fac-18', organization_id: 'org-12', name: 'Usine Conakry',               code: 'CKY', location_country: 'Guinée',        location_city: 'Conakry',     timezone: 'Africa/Conakry',   currency: 'GNF', subscription_plan_id: 'plan-2', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-03-25T00:00:00Z', plan: MOCK_PLANS[1] },
  // ── org-13  Sierra Food Co. (Sierra Leone, SLE)
  { id: 'fac-19', organization_id: 'org-13', name: 'Factory Freetown',            code: 'FNA', location_country: 'Sierra Leone',  location_city: 'Freetown',    timezone: 'Africa/Freetown',  currency: 'SLE', subscription_plan_id: 'plan-1', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-04-18T00:00:00Z', plan: MOCK_PLANS[0] },
  // ── org-14  West Africa Grains (Liberia, LRD)
  { id: 'fac-20', organization_id: 'org-14', name: 'Mill Monrovia',               code: 'ROB', location_country: 'Liberia',       location_city: 'Monrovia',    timezone: 'Africa/Monrovia',  currency: 'LRD', subscription_plan_id: 'plan-1', subscription_status: 'ACTIVE',   subscription_expires_at: '2026-09-01T00:00:00Z', is_active: true,  created_at: '2026-05-01T00:00:00Z', plan: MOCK_PLANS[0] },
  // ── org-15  Gambia Processors (Gambie, GMD)
  { id: 'fac-21', organization_id: 'org-15', name: 'Plant Banjul',                code: 'BJL', location_country: 'Gambie',        location_city: 'Banjul',      timezone: 'Africa/Banjul',    currency: 'GMD', subscription_plan_id: 'plan-1', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-04-28T00:00:00Z', plan: MOCK_PLANS[0] },
  // ── org-17  Nouakchott Lait (Mauritanie, MRU)
  { id: 'fac-22', organization_id: 'org-17', name: 'Laiterie Nouakchott',         code: 'NKC', location_country: 'Mauritanie',    location_city: 'Nouakchott',  timezone: 'Africa/Nouakchott', currency: 'MRU', subscription_plan_id: 'plan-2', subscription_status: 'ACTIVE',   subscription_expires_at: null,                  is_active: true,  created_at: '2026-03-28T00:00:00Z', plan: MOCK_PLANS[1] },
]

// ─── Organisations ──────────────────────────────────────────────────────────

export const MOCK_ORGS: MerchantOrg[] = [
  { id: 'org-1',  name: 'Groupe SOKA',              status: 'active',    country: 'Sénégal',        currency: 'XOF', created_at: '2026-01-15T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-1'),  users_count: 12 },
  { id: 'org-2',  name: "Agro Côte d'Ivoire",       status: 'trial',     country: "Côte d'Ivoire",  currency: 'XOF', created_at: '2026-04-01T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-2'),  users_count: 4  },
  { id: 'org-3',  name: 'Minoterie du Sahel',        status: 'active',    country: 'Mali',           currency: 'XOF', created_at: '2026-02-10T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-3'),  users_count: 38 },
  { id: 'org-4',  name: 'Laiterie de Dakar',         status: 'suspended', country: 'Sénégal',        currency: 'XOF', created_at: '2025-11-20T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-4'),  users_count: 6  },
  { id: 'org-5',  name: 'Huilerie Kossam',           status: 'churned',   country: 'Burkina Faso',   currency: 'XOF', created_at: '2025-09-05T00:00:00Z', factories: [],                                                         users_count: 3  },
  { id: 'org-6',  name: 'GoldCoast Foods',           status: 'active',    country: 'Ghana',          currency: 'GHS', created_at: '2026-03-10T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-6'),  users_count: 22 },
  { id: 'org-7',  name: 'Sunrise Agro Industries',   status: 'active',    country: 'Nigeria',        currency: 'NGN', created_at: '2026-04-05T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-7'),  users_count: 47 },
  { id: 'org-8',  name: 'Sahel Agro Niger',          status: 'active',    country: 'Niger',          currency: 'XOF', created_at: '2026-03-15T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-8'),  users_count: 8  },
  { id: 'org-9',  name: 'Togo Alimentation',         status: 'active',    country: 'Togo',           currency: 'XOF', created_at: '2026-02-20T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-9'),  users_count: 14 },
  { id: 'org-10', name: 'Cotonou Foods',             status: 'trial',     country: 'Bénin',          currency: 'XOF', created_at: '2026-04-10T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-10'), users_count: 5  },
  { id: 'org-11', name: 'Agri Bissau',               status: 'churned',   country: 'Guinée-Bissau',  currency: 'XOF', created_at: '2025-12-01T00:00:00Z', factories: [],                                                         users_count: 2  },
  { id: 'org-12', name: 'Conakry Agro',              status: 'active',    country: 'Guinée',         currency: 'GNF', created_at: '2026-03-25T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-12'), users_count: 9  },
  { id: 'org-13', name: 'Sierra Food Co.',           status: 'active',    country: 'Sierra Leone',   currency: 'SLE', created_at: '2026-04-18T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-13'), users_count: 6  },
  { id: 'org-14', name: 'West Africa Grains',        status: 'trial',     country: 'Liberia',        currency: 'LRD', created_at: '2026-05-01T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-14'), users_count: 4  },
  { id: 'org-15', name: 'Gambia Processors',         status: 'active',    country: 'Gambie',         currency: 'GMD', created_at: '2026-04-28T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-15'), users_count: 5  },
  { id: 'org-16', name: 'Cabo Verde Agro',           status: 'churned',   country: 'Cap-Vert',       currency: 'CVE', created_at: '2025-10-15T00:00:00Z', factories: [],                                                         users_count: 2  },
  { id: 'org-17', name: 'Nouakchott Lait',           status: 'active',    country: 'Mauritanie',     currency: 'MRU', created_at: '2026-03-28T00:00:00Z', factories: MOCK_FACTORIES.filter(f => f.organization_id === 'org-17'), users_count: 7  },
]

// ─── Frais d'installation ────────────────────────────────────────────────────

export const MOCK_INSTALLATION_FEES: InstallationFee[] = [
  // XOF
  { id: 'if-1',  factory_id: 'fac-1',  size: 'pme',    amount_xof: 500000,  currency: 'XOF', amount_local: 500000,                             status: 'paid',    paid_at: '2026-01-14T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-01-10T00:00:00Z' },
  { id: 'if-2',  factory_id: 'fac-2',  size: 'tpe',    amount_xof: 150000,  currency: 'XOF', amount_local: 150000,                             status: 'paid',    paid_at: '2026-01-30T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-01-28T00:00:00Z' },
  { id: 'if-3',  factory_id: 'fac-3',  size: 'tpe',    amount_xof: 150000,  currency: 'XOF', amount_local: 150000,                             status: 'pending', paid_at: null,                   notes: 'Acompte 75k reçu',                 payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-28T00:00:00Z' },
  { id: 'if-4',  factory_id: 'fac-4',  size: 'grande', amount_xof: 1500000, currency: 'XOF', amount_local: 1500000,                            status: 'paid',    paid_at: '2026-02-08T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-02-01T00:00:00Z' },
  { id: 'if-5',  factory_id: 'fac-5',  size: 'pme',    amount_xof: 500000,  currency: 'XOF', amount_local: 500000,                             status: 'paid',    paid_at: '2026-02-28T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-02-25T00:00:00Z' },
  { id: 'if-6',  factory_id: 'fac-6',  size: 'tpe',    amount_xof: 150000,  currency: 'XOF', amount_local: 150000,                             status: 'partial', paid_at: null,                   notes: 'Acompte 75k payé',                 payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-28T00:00:00Z' },
  // Ghana — GHS
  { id: 'if-7',  factory_id: 'fac-9',  size: 'grande', amount_xof: 1500000, currency: 'GHS', amount_local: localInstall('grande', 'GHS'),      status: 'paid',    paid_at: '2026-03-05T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-01T00:00:00Z' },
  { id: 'if-8',  factory_id: 'fac-10', size: 'pme',    amount_xof: 500000,  currency: 'GHS', amount_local: localInstall('pme', 'GHS'),         status: 'paid',    paid_at: '2026-03-20T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-15T00:00:00Z' },
  // Nigeria — NGN
  { id: 'if-9',  factory_id: 'fac-11', size: 'grande', amount_xof: 1500000, currency: 'NGN', amount_local: localInstall('grande', 'NGN'),      status: 'paid',    paid_at: '2026-04-02T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-28T00:00:00Z' },
  { id: 'if-10', factory_id: 'fac-12', size: 'grande', amount_xof: 1500000, currency: 'NGN', amount_local: localInstall('grande', 'NGN'),      status: 'paid',    paid_at: '2026-04-10T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-05T00:00:00Z' },
  { id: 'if-11', factory_id: 'fac-13', size: 'pme',    amount_xof: 500000,  currency: 'NGN', amount_local: localInstall('pme', 'NGN'),         status: 'pending', paid_at: null,                   notes: 'Wire transfer pending — Lagos bank', payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-05-01T00:00:00Z' },
  // Niger — XOF
  { id: 'if-12', factory_id: 'fac-14', size: 'pme',    amount_xof: 500000,  currency: 'XOF', amount_local: 500000,                             status: 'paid',    paid_at: '2026-03-20T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-15T00:00:00Z' },
  // Togo — XOF
  { id: 'if-13', factory_id: 'fac-15', size: 'pme',    amount_xof: 500000,  currency: 'XOF', amount_local: 500000,                             status: 'paid',    paid_at: '2026-02-28T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-02-20T00:00:00Z' },
  { id: 'if-14', factory_id: 'fac-16', size: 'tpe',    amount_xof: 150000,  currency: 'XOF', amount_local: 150000,                             status: 'paid',    paid_at: '2026-03-12T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-05T00:00:00Z' },
  // Bénin — XOF
  { id: 'if-15', factory_id: 'fac-17', size: 'tpe',    amount_xof: 150000,  currency: 'XOF', amount_local: 150000,                             status: 'pending', paid_at: null,                   notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-10T00:00:00Z' },
  // Guinée — GNF
  { id: 'if-16', factory_id: 'fac-18', size: 'pme',    amount_xof: 500000,  currency: 'GNF', amount_local: localInstall('pme', 'GNF'),         status: 'paid',    paid_at: '2026-04-05T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-25T00:00:00Z' },
  // Sierra Leone — SLE
  { id: 'if-17', factory_id: 'fac-19', size: 'tpe',    amount_xof: 150000,  currency: 'SLE', amount_local: localInstall('tpe', 'SLE'),         status: 'partial', paid_at: null,                   notes: 'Acompte 50% reçu',                 payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-18T00:00:00Z' },
  // Liberia — LRD
  { id: 'if-18', factory_id: 'fac-20', size: 'tpe',    amount_xof: 150000,  currency: 'LRD', amount_local: localInstall('tpe', 'LRD'),         status: 'pending', paid_at: null,                   notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-05-01T00:00:00Z' },
  // Gambie — GMD
  { id: 'if-19', factory_id: 'fac-21', size: 'tpe',    amount_xof: 150000,  currency: 'GMD', amount_local: localInstall('tpe', 'GMD'),         status: 'paid',    paid_at: '2026-05-05T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-28T00:00:00Z' },
  // Mauritanie — MRU
  { id: 'if-20', factory_id: 'fac-22', size: 'pme',    amount_xof: 500000,  currency: 'MRU', amount_local: localInstall('pme', 'MRU'),         status: 'paid',    paid_at: '2026-04-05T00:00:00Z', notes: null,                               payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-28T00:00:00Z' },
]

// ─── Service orders ──────────────────────────────────────────────────────────

export const MOCK_SERVICE_ORDERS: ServiceOrder[] = [
  { id: 'svc-1',  org_id: 'org-1',  factory_id: 'fac-1',  service_type: 'support_prioritaire', description: 'Support prioritaire mensuel WhatsApp/Meet',             amount_xof: 40000,  currency: 'XOF', amount_local: 40000,                         status: 'paid',      scheduled_at: '2026-04-01T00:00:00Z', delivered_at: null,                   created_at: '2026-04-01T00:00:00Z' },
  { id: 'svc-2',  org_id: 'org-1',  factory_id: 'fac-1',  service_type: 'support_prioritaire', description: 'Support prioritaire mensuel WhatsApp/Meet',             amount_xof: 40000,  currency: 'XOF', amount_local: 40000,                         status: 'paid',      scheduled_at: '2026-05-01T00:00:00Z', delivered_at: null,                   created_at: '2026-05-01T00:00:00Z' },
  { id: 'svc-3',  org_id: 'org-3',  factory_id: 'fac-4',  service_type: 'audit_conseil',       description: 'Audit Supply Chain + diagnostic flux Bamako',           amount_xof: 150000, currency: 'XOF', amount_local: 150000,                        status: 'delivered', scheduled_at: '2026-04-15T00:00:00Z', delivered_at: '2026-04-15T00:00:00Z', created_at: '2026-04-10T00:00:00Z' },
  { id: 'svc-4',  org_id: 'org-3',  factory_id: null,      service_type: 'formation',           description: 'Formation GPAO — équipe production (demi-journée)',     amount_xof: 50000,  currency: 'XOF', amount_local: 50000,                         status: 'confirmed', scheduled_at: '2026-06-05T00:00:00Z', delivered_at: null,                   created_at: '2026-05-20T00:00:00Z' },
  { id: 'svc-5',  org_id: 'org-2',  factory_id: 'fac-3',  service_type: 'migration_donnees',   description: 'Migration fichiers Excel articles + fournisseurs',      amount_xof: 75000,  currency: 'XOF', amount_local: 75000,                         status: 'quoted',    scheduled_at: null,                   delivered_at: null,                   created_at: '2026-05-25T00:00:00Z' },
  // Ghana — GHS
  { id: 'svc-6',  org_id: 'org-6',  factory_id: 'fac-9',  service_type: 'audit_conseil',       description: 'Supply chain audit — cocoa processing line',            amount_xof: 200000, currency: 'GHS', amount_local: xofToLocal(200000, 'GHS'),     status: 'paid',      scheduled_at: '2026-04-20T00:00:00Z', delivered_at: '2026-04-20T00:00:00Z', created_at: '2026-04-15T00:00:00Z' },
  { id: 'svc-7',  org_id: 'org-6',  factory_id: 'fac-9',  service_type: 'support_prioritaire', description: 'Monthly priority support — English',                    amount_xof: 40000,  currency: 'GHS', amount_local: xofToLocal(40000, 'GHS'),      status: 'paid',      scheduled_at: '2026-05-01T00:00:00Z', delivered_at: null,                   created_at: '2026-05-01T00:00:00Z' },
  // Nigeria — NGN
  { id: 'svc-8',  org_id: 'org-7',  factory_id: 'fac-11', service_type: 'formation',           description: 'GPAO & quality module training — production team (2d)', amount_xof: 100000, currency: 'NGN', amount_local: xofToLocal(100000, 'NGN'),     status: 'delivered', scheduled_at: '2026-05-12T00:00:00Z', delivered_at: '2026-05-13T00:00:00Z', created_at: '2026-05-05T00:00:00Z' },
  { id: 'svc-9',  org_id: 'org-7',  factory_id: null,      service_type: 'audit_conseil',       description: 'HACCP compliance audit — all 3 Nigerian sites',         amount_xof: 450000, currency: 'NGN', amount_local: xofToLocal(450000, 'NGN'),     status: 'confirmed', scheduled_at: '2026-06-10T00:00:00Z', delivered_at: null,                   created_at: '2026-05-22T00:00:00Z' },
  // Togo — XOF
  { id: 'svc-10', org_id: 'org-9',  factory_id: 'fac-15', service_type: 'formation',           description: 'Formation stocks & réception — équipe Lomé',            amount_xof: 50000,  currency: 'XOF', amount_local: 50000,                         status: 'paid',      scheduled_at: '2026-03-15T00:00:00Z', delivered_at: '2026-03-15T00:00:00Z', created_at: '2026-03-10T00:00:00Z' },
  // Guinée — GNF
  { id: 'svc-11', org_id: 'org-12', factory_id: 'fac-18', service_type: 'migration_donnees',   description: 'Migration base articles depuis logiciel local',          amount_xof: 75000,  currency: 'GNF', amount_local: xofToLocal(75000, 'GNF'),      status: 'delivered', scheduled_at: '2026-04-10T00:00:00Z', delivered_at: '2026-04-12T00:00:00Z', created_at: '2026-04-05T00:00:00Z' },
  // Mauritanie — MRU
  { id: 'svc-12', org_id: 'org-17', factory_id: 'fac-22', service_type: 'audit_conseil',       description: 'Audit process laitier + paramétrage qualité',           amount_xof: 150000, currency: 'MRU', amount_local: xofToLocal(150000, 'MRU'),     status: 'confirmed', scheduled_at: '2026-06-15T00:00:00Z', delivered_at: null,                   created_at: '2026-05-20T00:00:00Z' },
]

// ─── Factures ────────────────────────────────────────────────────────────────

export const MOCK_INVOICES: Invoice[] = [
  // Groupe SOKA (XOF)
  { id: 'inv-1',  factory_id: 'fac-1',  subscription_id: 'sub-1',  amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'paid',    due_at: '2026-02-01T00:00:00Z', paid_at: '2026-01-28T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-01-15T00:00:00Z' },
  { id: 'inv-2',  factory_id: 'fac-1',  subscription_id: 'sub-1',  amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'paid',    due_at: '2026-03-01T00:00:00Z', paid_at: '2026-02-26T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-02-15T00:00:00Z' },
  { id: 'inv-3',  factory_id: 'fac-1',  subscription_id: 'sub-1',  amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'overdue', due_at: '2026-04-01T00:00:00Z', paid_at: null,                   notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-15T00:00:00Z' },
  { id: 'inv-4',  factory_id: 'fac-2',  subscription_id: 'sub-2',  amount_xof: 49000,  currency: 'XOF', amount_local: 49000,                       status: 'paid',    due_at: '2026-03-01T00:00:00Z', paid_at: '2026-02-27T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-02-01T00:00:00Z' },
  { id: 'inv-5',  factory_id: 'fac-2',  subscription_id: 'sub-2',  amount_xof: 49000,  currency: 'XOF', amount_local: 49000,                       status: 'paid',    due_at: '2026-04-01T00:00:00Z', paid_at: '2026-03-29T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-01T00:00:00Z' },
  // Minoterie du Sahel (XOF)
  { id: 'inv-6',  factory_id: 'fac-4',  subscription_id: 'sub-4',  amount_xof: 399000, currency: 'XOF', amount_local: 399000,                      status: 'paid',    due_at: '2026-03-10T00:00:00Z', paid_at: '2026-03-08T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-02-10T00:00:00Z' },
  { id: 'inv-7',  factory_id: 'fac-4',  subscription_id: 'sub-4',  amount_xof: 399000, currency: 'XOF', amount_local: 399000,                      status: 'paid',    due_at: '2026-04-10T00:00:00Z', paid_at: '2026-04-09T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-10T00:00:00Z' },
  { id: 'inv-8',  factory_id: 'fac-4',  subscription_id: 'sub-4',  amount_xof: 399000, currency: 'XOF', amount_local: 399000,                      status: 'pending', due_at: '2026-05-10T00:00:00Z', paid_at: null,                   notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-10T00:00:00Z' },
  { id: 'inv-9',  factory_id: 'fac-5',  subscription_id: 'sub-5',  amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'paid',    due_at: '2026-04-01T00:00:00Z', paid_at: '2026-03-30T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-01T00:00:00Z' },
  // Agro CI (XOF)
  { id: 'inv-10', factory_id: 'fac-3',  subscription_id: 'sub-3',  amount_xof: 49000,  currency: 'XOF', amount_local: 49000,                       status: 'pending', due_at: '2026-05-01T00:00:00Z', paid_at: null,                   notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-01T00:00:00Z' },
  // GoldCoast Foods (GHS)
  { id: 'inv-11', factory_id: 'fac-9',  subscription_id: 'sub-9',  amount_xof: 399000, currency: 'GHS', amount_local: localPlan(2, 'GHS'),         status: 'paid',    due_at: '2026-04-10T00:00:00Z', paid_at: '2026-04-08T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-10T00:00:00Z' },
  { id: 'inv-12', factory_id: 'fac-9',  subscription_id: 'sub-9',  amount_xof: 399000, currency: 'GHS', amount_local: localPlan(2, 'GHS'),         status: 'paid',    due_at: '2026-05-10T00:00:00Z', paid_at: '2026-05-09T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-10T00:00:00Z' },
  { id: 'inv-13', factory_id: 'fac-9',  subscription_id: 'sub-9',  amount_xof: 399000, currency: 'GHS', amount_local: localPlan(2, 'GHS'),         status: 'pending', due_at: '2026-06-10T00:00:00Z', paid_at: null,                   notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-05-10T00:00:00Z' },
  { id: 'inv-14', factory_id: 'fac-10', subscription_id: 'sub-10', amount_xof: 149000, currency: 'GHS', amount_local: localPlan(1, 'GHS'),         status: 'paid',    due_at: '2026-04-20T00:00:00Z', paid_at: '2026-04-18T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-20T00:00:00Z' },
  { id: 'inv-15', factory_id: 'fac-10', subscription_id: 'sub-10', amount_xof: 149000, currency: 'GHS', amount_local: localPlan(1, 'GHS'),         status: 'paid',    due_at: '2026-05-20T00:00:00Z', paid_at: '2026-05-19T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-20T00:00:00Z' },
  // Sunrise Agro (NGN)
  { id: 'inv-16', factory_id: 'fac-11', subscription_id: 'sub-11', amount_xof: 399000, currency: 'NGN', amount_local: localPlan(2, 'NGN'),         status: 'paid',    due_at: '2026-05-05T00:00:00Z', paid_at: '2026-05-03T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-05T00:00:00Z' },
  { id: 'inv-17', factory_id: 'fac-11', subscription_id: 'sub-11', amount_xof: 399000, currency: 'NGN', amount_local: localPlan(2, 'NGN'),         status: 'pending', due_at: '2026-06-05T00:00:00Z', paid_at: null,                   notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-05-05T00:00:00Z' },
  { id: 'inv-18', factory_id: 'fac-12', subscription_id: 'sub-12', amount_xof: 399000, currency: 'NGN', amount_local: localPlan(2, 'NGN'),         status: 'paid',    due_at: '2026-05-12T00:00:00Z', paid_at: '2026-05-10T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-12T00:00:00Z' },
  { id: 'inv-19', factory_id: 'fac-13', subscription_id: 'sub-13', amount_xof: 149000, currency: 'NGN', amount_local: localPlan(1, 'NGN'),         status: 'overdue', due_at: '2026-05-02T00:00:00Z', paid_at: null,                   notes: 'Wire transfer pending — Lagos bank', payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-05-02T00:00:00Z' },
  // Sahel Agro Niger (XOF)
  { id: 'inv-20', factory_id: 'fac-14', subscription_id: 'sub-14', amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'paid',    due_at: '2026-04-15T00:00:00Z', paid_at: '2026-04-14T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-15T00:00:00Z' },
  { id: 'inv-21', factory_id: 'fac-14', subscription_id: 'sub-14', amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'paid',    due_at: '2026-05-15T00:00:00Z', paid_at: '2026-05-13T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-15T00:00:00Z' },
  // Togo Alimentation (XOF)
  { id: 'inv-22', factory_id: 'fac-15', subscription_id: 'sub-15', amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'paid',    due_at: '2026-03-20T00:00:00Z', paid_at: '2026-03-18T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-02-20T00:00:00Z' },
  { id: 'inv-23', factory_id: 'fac-15', subscription_id: 'sub-15', amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'paid',    due_at: '2026-04-20T00:00:00Z', paid_at: '2026-04-19T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-20T00:00:00Z' },
  { id: 'inv-24', factory_id: 'fac-15', subscription_id: 'sub-15', amount_xof: 149000, currency: 'XOF', amount_local: 149000,                      status: 'pending', due_at: '2026-05-20T00:00:00Z', paid_at: null,                   notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-20T00:00:00Z' },
  { id: 'inv-25', factory_id: 'fac-16', subscription_id: 'sub-16', amount_xof: 49000,  currency: 'XOF', amount_local: 49000,                       status: 'paid',    due_at: '2026-04-05T00:00:00Z', paid_at: '2026-04-04T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-05T00:00:00Z' },
  // Conakry Agro (GNF)
  { id: 'inv-26', factory_id: 'fac-18', subscription_id: 'sub-18', amount_xof: 149000, currency: 'GNF', amount_local: localPlan(1, 'GNF'),         status: 'paid',    due_at: '2026-04-25T00:00:00Z', paid_at: '2026-04-23T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-25T00:00:00Z' },
  { id: 'inv-27', factory_id: 'fac-18', subscription_id: 'sub-18', amount_xof: 149000, currency: 'GNF', amount_local: localPlan(1, 'GNF'),         status: 'pending', due_at: '2026-05-25T00:00:00Z', paid_at: null,                   notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-25T00:00:00Z' },
  // Sierra Food Co. (SLE)
  { id: 'inv-28', factory_id: 'fac-19', subscription_id: 'sub-19', amount_xof: 49000,  currency: 'SLE', amount_local: localPlan(0, 'SLE'),         status: 'paid',    due_at: '2026-05-18T00:00:00Z', paid_at: '2026-05-17T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-18T00:00:00Z' },
  // Gambia Processors (GMD)
  { id: 'inv-29', factory_id: 'fac-21', subscription_id: 'sub-21', amount_xof: 49000,  currency: 'GMD', amount_local: localPlan(0, 'GMD'),         status: 'paid',    due_at: '2026-05-28T00:00:00Z', paid_at: '2026-05-27T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-28T00:00:00Z' },
  // Nouakchott Lait (MRU)
  { id: 'inv-30', factory_id: 'fac-22', subscription_id: 'sub-22', amount_xof: 149000, currency: 'MRU', amount_local: localPlan(1, 'MRU'),         status: 'paid',    due_at: '2026-04-28T00:00:00Z', paid_at: '2026-04-26T00:00:00Z', notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-03-28T00:00:00Z' },
  { id: 'inv-31', factory_id: 'fac-22', subscription_id: 'sub-22', amount_xof: 149000, currency: 'MRU', amount_local: localPlan(1, 'MRU'),         status: 'pending', due_at: '2026-05-28T00:00:00Z', paid_at: null,                   notes: null, payment_method: null, payment_reference: null, payment_note: null, created_at: '2026-04-28T00:00:00Z' },
]

// ─── Support tickets ─────────────────────────────────────────────────────────

export const MOCK_TICKETS: SupportTicket[] = [
  { id: 'tkt-1', org_id: 'org-1', subject: 'Impossible de créer un ordre de fabrication',  status: 'open',        priority: 'high',     assigned_to: 'john@bluwa.io', messages: [{ id: 'm1', author: 'Amadou Diallo',  content: 'Quand je clique sur "Nouvel OF", la page se fige.',      created_at: '2026-05-27T09:00:00Z', is_internal: false }, { id: 'm2', author: 'john@bluwa.io', content: 'Je regarde ça, probablement lié au module GPAO.',       created_at: '2026-05-27T10:30:00Z', is_internal: true }],  created_at: '2026-05-27T09:00:00Z', updated_at: '2026-05-27T10:30:00Z' },
  { id: 'tkt-2', org_id: 'org-3', subject: 'Export Excel des mouvements de stock vide',    status: 'in_progress', priority: 'medium',   assigned_to: 'john@bluwa.io', messages: [{ id: 'm3', author: 'Fatoumata Koné', content: "L'export télécharge un fichier vide depuis 2 jours.",   created_at: '2026-05-25T14:00:00Z', is_internal: false }],  created_at: '2026-05-25T14:00:00Z', updated_at: '2026-05-26T08:00:00Z' },
  { id: 'tkt-3', org_id: 'org-2', subject: "Demande d'ajout d'un 2ème site",               status: 'open',        priority: 'low',      assigned_to: null,            messages: [{ id: 'm4', author: 'Moussa Traoré',  content: 'On ouvre un deuxième entrepôt à Abidjan, comment ajouter le site ?', created_at: '2026-05-28T07:00:00Z', is_internal: false }], created_at: '2026-05-28T07:00:00Z', updated_at: '2026-05-28T07:00:00Z' },
  { id: 'tkt-4', org_id: 'org-1', subject: 'Erreur calcul PMP après réception',            status: 'resolved',    priority: 'critical', assigned_to: 'john@bluwa.io', messages: [{ id: 'm5', author: 'Ibrahima Sow',   content: 'Le PMP ne se recalcule plus depuis hier soir.',         created_at: '2026-05-20T18:00:00Z', is_internal: false }, { id: 'm6', author: 'john@bluwa.io', content: 'Corrigé — trigger manquant après la migration 013.', created_at: '2026-05-21T09:00:00Z', is_internal: true }], created_at: '2026-05-20T18:00:00Z', updated_at: '2026-05-21T09:00:00Z' },
  { id: 'tkt-5', org_id: 'org-6', subject: 'Batch traceability labels not printing',       status: 'open',        priority: 'high',     assigned_to: 'john@bluwa.io', messages: [{ id: 'm7', author: 'Kwame Asante',   content: 'Labels for cocoa batches are not generating on the Kumasi line since yesterday.', created_at: '2026-05-28T08:30:00Z', is_internal: false }, { id: 'm8', author: 'john@bluwa.io', content: 'Checking printer config — likely a template variable mismatch.', created_at: '2026-05-28T09:15:00Z', is_internal: true }], created_at: '2026-05-28T08:30:00Z', updated_at: '2026-05-28T09:15:00Z' },
  { id: 'tkt-6', org_id: 'org-7', subject: 'Purchase orders in GHS — need NGN currency',  status: 'open',        priority: 'medium',   assigned_to: null,            messages: [{ id: 'm9', author: 'Chidi Okonkwo',  content: 'All our POs are showing amounts in GHS instead of NGN. Critical for our accounts team.', created_at: '2026-05-29T07:00:00Z', is_internal: false }], created_at: '2026-05-29T07:00:00Z', updated_at: '2026-05-29T07:00:00Z' },
  { id: 'tkt-7', org_id: 'org-7', subject: 'NAFDAC compliance report — custom fields',    status: 'in_progress', priority: 'high',     assigned_to: 'john@bluwa.io', messages: [{ id: 'm10', author: 'Ngozi Adeyemi', content: "We need to add NAFDAC registration numbers to the quality report export.", created_at: '2026-05-26T11:00:00Z', is_internal: false }, { id: 'm11', author: 'john@bluwa.io', content: "Yes, configurable via custom fields. I'll set it up on your end.", created_at: '2026-05-26T14:30:00Z', is_internal: false }], created_at: '2026-05-26T11:00:00Z', updated_at: '2026-05-26T14:30:00Z' },
  { id: 'tkt-8', org_id: 'org-9', subject: 'Impression bon de réception bloquée',          status: 'open',        priority: 'medium',   assigned_to: 'john@bluwa.io', messages: [{ id: 'm12', author: 'Kossi Agbeko',  content: "Depuis ce matin, impossible d'imprimer les bons de réception. Le bouton ne répond pas.", created_at: '2026-05-29T06:30:00Z', is_internal: false }], created_at: '2026-05-29T06:30:00Z', updated_at: '2026-05-29T06:30:00Z' },
  { id: 'tkt-9', org_id: 'org-12', subject: 'Traduction interface en français — erreurs',  status: 'open',        priority: 'low',      assigned_to: null,            messages: [{ id: 'm13', author: 'Mariama Balde', content: "Plusieurs libellés dans le module stocks sont en anglais. Exemples : 'batch', 'receipt'.", created_at: '2026-05-28T14:00:00Z', is_internal: false }], created_at: '2026-05-28T14:00:00Z', updated_at: '2026-05-28T14:00:00Z' },
  { id: 'tkt-10', org_id: 'org-17', subject: 'Calcul DLC incorrect sur les lots',          status: 'in_progress', priority: 'high',     assigned_to: 'john@bluwa.io', messages: [{ id: 'm14', author: 'Fatimetou Mint', content: "Les dates de DLC calculées sur les lots de lait sont décalées de 2 jours. Problème critique.", created_at: '2026-05-27T12:00:00Z', is_internal: false }, { id: 'm15', author: 'john@bluwa.io', content: "Identifié — le timezone Africa/Nouakchott n'était pas correctement configuré. Fix en cours.", created_at: '2026-05-27T15:30:00Z', is_internal: true }], created_at: '2026-05-27T12:00:00Z', updated_at: '2026-05-27T15:30:00Z' },
]

// ─── Onboarding pipeline ─────────────────────────────────────────────────────

export const MOCK_ONBOARDING: OnboardingItem[] = [
  {
    id: 'ob-1', org_id: 'ob-org-1', org_name: 'Boulangerie Soleil', country: 'Sénégal', stage: 'prospect', plan_target: 'Starter', assigned_to: 'john@bluwa.io',
    notes: 'Référence via réseau CNCAS. Intéressé par module stocks.', blocked: false, blocked_reason: null, stage_entered_at: '2026-05-26T00:00:00Z', created_at: '2026-05-26T00:00:00Z',
    checklist: [{ id: 'c1', label: 'Premier contact établi', done: true }, { id: 'c2', label: 'Besoin qualifié', done: false }, { id: 'c3', label: 'Démo planifiée', done: false }],
    comments: [{ id: 'cm1', author: 'john@bluwa.io', content: 'Référence via le réseau CNCAS. À relancer la semaine prochaine.', created_at: '2026-05-26T09:00:00Z' }],
  },
  {
    id: 'ob-2', org_id: 'ob-org-2', org_name: 'Fromagerie Peul', country: 'Guinée', stage: 'demo', plan_target: 'Growth', assigned_to: 'john@bluwa.io',
    notes: 'Démo faite le 20/05. Très intéressé par GPAO et traçabilité lot.', blocked: false, blocked_reason: null, stage_entered_at: '2026-05-20T00:00:00Z', created_at: '2026-05-15T00:00:00Z',
    checklist: [{ id: 'c4', label: 'Démo réalisée', done: true }, { id: 'c5', label: 'Proposition commerciale envoyée', done: true }, { id: 'c6', label: 'Retour client reçu', done: false }],
    comments: [{ id: 'cm2', author: 'john@bluwa.io', content: 'Démo très positive. Ils veulent voir le module GPAO en détail avant de décider.', created_at: '2026-05-20T16:30:00Z' }, { id: 'cm3', author: 'john@bluwa.io', content: 'Proposition envoyée par email. Attente retour avant vendredi.', created_at: '2026-05-22T11:00:00Z' }],
  },
  {
    id: 'ob-3', org_id: 'org-2', org_name: "Agro Côte d'Ivoire", country: "Côte d'Ivoire", stage: 'trial', plan_target: 'Starter', assigned_to: 'john@bluwa.io',
    notes: 'Trial activé le 01/04. Utilisent surtout la réception.', blocked: false, blocked_reason: null, stage_entered_at: '2026-04-01T00:00:00Z', created_at: '2026-04-01T00:00:00Z',
    checklist: [{ id: 'c7', label: 'Accès trial créé', done: true }, { id: 'c8', label: 'MDM configuré', done: true }, { id: 'c9', label: 'Première réception enregistrée', done: true }, { id: 'c10', label: 'Équipe terrain autonome', done: false }],
    comments: [],
  },
  {
    id: 'ob-4', org_id: 'ob-org-4', org_name: 'Rizerie du Delta', country: 'Sénégal', stage: 'configuration', plan_target: 'Growth', assigned_to: 'john@bluwa.io',
    notes: 'BOM complexe — plus de 80 références matières premières.', blocked: true, blocked_reason: "En attente liste articles complète du client (fichier Excel promis le 25/05)", stage_entered_at: '2026-05-10T00:00:00Z', created_at: '2026-04-28T00:00:00Z',
    checklist: [{ id: 'c11', label: 'Sites créés', done: true }, { id: 'c12', label: 'Utilisateurs invités', done: true }, { id: 'c13', label: 'Articles MDM importés', done: false }, { id: 'c14', label: 'Fournisseurs créés', done: false }, { id: 'c15', label: 'BOM saisi', done: false }],
    comments: [{ id: 'cm4', author: 'john@bluwa.io', content: "Client n'a toujours pas envoyé le fichier Excel des articles. Relance envoyée le 27/05.", created_at: '2026-05-27T10:00:00Z' }],
  },
  {
    id: 'ob-5', org_id: 'ob-org-5', org_name: 'Conserverie Atlantique', country: 'Mauritanie', stage: 'formation', plan_target: 'Enterprise', assigned_to: 'john@bluwa.io',
    notes: 'Formation magasiniers faite. Session GPAO prévue semaine prochaine.', blocked: false, blocked_reason: null, stage_entered_at: '2026-05-18T00:00:00Z', created_at: '2026-04-10T00:00:00Z',
    checklist: [{ id: 'c16', label: 'Formation réception', done: true }, { id: 'c17', label: 'Formation stocks & lots', done: true }, { id: 'c18', label: 'Formation GPAO', done: false }, { id: 'c19', label: 'Formation qualité HACCP', done: false }, { id: 'c20', label: 'Test utilisateurs validé', done: false }],
    comments: [],
  },
  {
    id: 'ob-6', org_id: 'org-3', org_name: 'Minoterie du Sahel', country: 'Mali', stage: 'golive', plan_target: 'Enterprise', assigned_to: 'john@bluwa.io',
    notes: 'Go-live le 10/02. RAS, monitoring actif.', blocked: false, blocked_reason: null, stage_entered_at: '2026-02-10T00:00:00Z', created_at: '2026-01-15T00:00:00Z',
    checklist: [{ id: 'c21', label: 'Go-live effectué', done: true }, { id: 'c22', label: 'Premier OF en production réelle', done: true }, { id: 'c23', label: 'Abonnement payant activé', done: true }, { id: 'c24', label: 'Suivi J+30 planifié', done: true }],
    comments: [{ id: 'cm5', author: 'john@bluwa.io', content: 'Go-live sans incident. Équipe très autonome. Suivi J+30 prévu le 12/03.', created_at: '2026-02-10T18:00:00Z' }],
  },
  // Ghana
  {
    id: 'ob-7', org_id: 'ob-org-7', org_name: 'Accra Cereal Co.', country: 'Ghana', stage: 'prospect', plan_target: 'Growth', assigned_to: 'john@bluwa.io',
    notes: 'Referred by GoldCoast Foods. Maize & sorghum processing, 2 sites in Greater Accra.', blocked: false, blocked_reason: null, stage_entered_at: '2026-05-22T00:00:00Z', created_at: '2026-05-22T00:00:00Z',
    checklist: [{ id: 'c25', label: 'Initial contact done', done: true }, { id: 'c26', label: 'Needs assessment call', done: false }, { id: 'c27', label: 'Demo scheduled', done: false }],
    comments: [{ id: 'cm6', author: 'john@bluwa.io', content: 'Warm intro from Kwame at GoldCoast. They process maize and sorghum — good fit for GPAO + traceability.', created_at: '2026-05-22T14:00:00Z' }],
  },
  // Nigeria
  {
    id: 'ob-8', org_id: 'org-7', org_name: 'Sunrise Agro Industries', country: 'Nigeria', stage: 'configuration', plan_target: 'Enterprise', assigned_to: 'john@bluwa.io',
    notes: '3 sites (Lagos, Kano, Abuja). Complex BOM — 150+ SKUs. Regulatory constraints: NAFDAC.', blocked: false, blocked_reason: null, stage_entered_at: '2026-05-01T00:00:00Z', created_at: '2026-03-28T00:00:00Z',
    checklist: [{ id: 'c28', label: 'All 3 sites created', done: true }, { id: 'c29', label: 'Users invited (Lagos + Kano)', done: true }, { id: 'c30', label: 'MDM — products & suppliers', done: true }, { id: 'c31', label: 'NAFDAC fields configured', done: false }, { id: 'c32', label: 'BOM imported', done: false }, { id: 'c33', label: 'Abuja site activated', done: false }],
    comments: [{ id: 'cm7', author: 'john@bluwa.io', content: 'Lagos and Kano teams are up. Abuja warehouse goes live in June. NAFDAC config pending regulatory doc.', created_at: '2026-05-10T16:00:00Z' }, { id: 'cm8', author: 'john@bluwa.io', content: 'Received NAFDAC doc. Will configure custom fields this week.', created_at: '2026-05-27T09:30:00Z' }],
  },
  // Burkina Faso
  {
    id: 'ob-9', org_id: 'ob-org-9', org_name: 'Savane Agrotech', country: 'Burkina Faso', stage: 'demo', plan_target: 'Growth', assigned_to: 'john@bluwa.io',
    notes: 'Transformateur de karité et sésame à Ouagadougou. Forte croissance, cherche à structurer sa production.', blocked: false, blocked_reason: null, stage_entered_at: '2026-05-15T00:00:00Z', created_at: '2026-05-10T00:00:00Z',
    checklist: [{ id: 'c34', label: 'Premier contact', done: true }, { id: 'c35', label: 'Démo réalisée', done: true }, { id: 'c36', label: 'Proposition envoyée', done: false }, { id: 'c37', label: 'Retour client', done: false }],
    comments: [{ id: 'cm9', author: 'john@bluwa.io', content: "Très bon fit sur le module GPAO. Ils tracent déjà leurs lots manuellement — passage au digital naturel.", created_at: '2026-05-15T17:00:00Z' }],
  },
  // Sierra Leone
  {
    id: 'ob-10', org_id: 'org-13', org_name: 'Sierra Food Co.', country: 'Sierra Leone', stage: 'trial', plan_target: 'Starter', assigned_to: 'john@bluwa.io',
    notes: 'Trial activé le 18/04. Rice milling operation — 3 users.', blocked: false, blocked_reason: null, stage_entered_at: '2026-04-18T00:00:00Z', created_at: '2026-04-10T00:00:00Z',
    checklist: [{ id: 'c38', label: 'Trial access created', done: true }, { id: 'c39', label: 'Products & suppliers added', done: true }, { id: 'c40', label: 'First reception logged', done: true }, { id: 'c41', label: 'Team autonomous', done: false }],
    comments: [{ id: 'cm10', author: 'john@bluwa.io', content: 'Onboarding call done. Small team — 1 manager + 2 operators. Language: English. Good adoption so far.', created_at: '2026-04-20T10:00:00Z' }],
  },
  // Cap-Vert
  {
    id: 'ob-11', org_id: 'ob-org-11', org_name: 'Ribeira Grande Foods', country: 'Cap-Vert', stage: 'prospect', plan_target: 'Starter', assigned_to: 'john@bluwa.io',
    notes: "Confiture et conserves artisanales. Petit volume — marché insulaire. Intéressé par traçabilité HACCP.", blocked: false, blocked_reason: null, stage_entered_at: '2026-05-20T00:00:00Z', created_at: '2026-05-20T00:00:00Z',
    checklist: [{ id: 'c42', label: 'Premier contact', done: true }, { id: 'c43', label: 'Qualification besoin', done: false }, { id: 'c44', label: 'Démo planifiée', done: false }],
    comments: [],
  },
  // Liberia
  {
    id: 'ob-12', org_id: 'org-14', org_name: 'West Africa Grains', country: 'Liberia', stage: 'trial', plan_target: 'Starter', assigned_to: 'john@bluwa.io',
    notes: 'Trial depuis le 01/05. Grain processing in Monrovia. English onboarding.', blocked: true, blocked_reason: "Internet connectivity issues at the factory site — remote training on hold", stage_entered_at: '2026-05-01T00:00:00Z', created_at: '2026-04-25T00:00:00Z',
    checklist: [{ id: 'c45', label: 'Trial access created', done: true }, { id: 'c46', label: 'Initial setup done', done: true }, { id: 'c47', label: 'First data entered', done: false }, { id: 'c48', label: 'Remote training completed', done: false }],
    comments: [{ id: 'cm11', author: 'john@bluwa.io', content: "Poor internet connectivity at site. Switched to offline-first mode for now. Will resume training when connectivity is stable.", created_at: '2026-05-08T11:00:00Z' }],
  },
]

// ─── Accès sites / utilisateurs ─────────────────────────────────────────────

export const MOCK_USER_SITE_ACCESS: Record<string, string[]> = {
  'u1':  ['fac-1', 'fac-2'],
  'u2':  ['fac-1', 'fac-2'],
  'u3':  ['fac-1'],
  'u4':  ['fac-2'],
  'u5':  ['fac-3'],
  'u6':  ['fac-3'],
  'u7':  ['fac-4', 'fac-5', 'fac-6'],
  'u8':  ['fac-4', 'fac-5'],
  'u9':  ['fac-6'],
  'u10': ['fac-8'],
  'u11': [],
  'u12': ['fac-9', 'fac-10'],
  'u13': ['fac-9'],
  'u14': ['fac-10'],
  'u15': ['fac-11', 'fac-12', 'fac-13'],
  'u16': ['fac-11', 'fac-12'],
  'u17': ['fac-11'],
  'u18': ['fac-13'],
  'u19': ['fac-14'],
  'u20': ['fac-15', 'fac-16'],
  'u21': ['fac-15'],
  'u22': ['fac-17'],
  'u23': ['fac-18'],
  'u24': ['fac-19'],
  'u25': ['fac-20'],
  'u26': ['fac-21'],
  'u27': ['fac-22'],
}

export const MOCK_USERS_BY_ORG: Record<string, { id: string; full_name: string; role: string; is_active: boolean; created_at: string }[]> = {
  'org-1':  [{ id: 'u1',  full_name: 'Amadou Diallo',      role: 'owner',    is_active: true,  created_at: '2026-01-15T00:00:00Z' }, { id: 'u2',  full_name: 'Ibrahima Sow',      role: 'admin',    is_active: true,  created_at: '2026-01-16T00:00:00Z' }, { id: 'u3',  full_name: 'Mariama Ba',        role: 'operator', is_active: true,  created_at: '2026-02-01T00:00:00Z' }, { id: 'u4',  full_name: 'Ousmane Faye',      role: 'operator', is_active: false, created_at: '2026-02-10T00:00:00Z' }],
  'org-2':  [{ id: 'u5',  full_name: 'Moussa Traoré',      role: 'owner',    is_active: true,  created_at: '2026-04-01T00:00:00Z' }, { id: 'u6',  full_name: 'Awa Coulibaly',     role: 'operator', is_active: true,  created_at: '2026-04-02T00:00:00Z' }],
  'org-3':  [{ id: 'u7',  full_name: 'Fatoumata Koné',     role: 'owner',    is_active: true,  created_at: '2026-02-10T00:00:00Z' }, { id: 'u8',  full_name: 'Seydou Diarra',     role: 'admin',    is_active: true,  created_at: '2026-02-11T00:00:00Z' }, { id: 'u9',  full_name: 'Kadiatou Bah',      role: 'manager',  is_active: true,  created_at: '2026-03-01T00:00:00Z' }],
  'org-4':  [{ id: 'u10', full_name: 'Cheikh Ndoye',       role: 'owner',    is_active: false, created_at: '2025-11-20T00:00:00Z' }],
  'org-5':  [{ id: 'u11', full_name: 'Adama Sawadogo',     role: 'owner',    is_active: false, created_at: '2025-09-05T00:00:00Z' }],
  'org-6':  [{ id: 'u12', full_name: 'Kwame Asante',       role: 'owner',    is_active: true,  created_at: '2026-03-10T00:00:00Z' }, { id: 'u13', full_name: 'Ama Boateng',       role: 'admin',    is_active: true,  created_at: '2026-03-11T00:00:00Z' }, { id: 'u14', full_name: 'Kofi Mensah',        role: 'operator', is_active: true,  created_at: '2026-03-22T00:00:00Z' }],
  'org-7':  [{ id: 'u15', full_name: 'Chidi Okonkwo',      role: 'owner',    is_active: true,  created_at: '2026-04-05T00:00:00Z' }, { id: 'u16', full_name: 'Ngozi Adeyemi',     role: 'admin',    is_active: true,  created_at: '2026-04-06T00:00:00Z' }, { id: 'u17', full_name: 'Emeka Nwosu',        role: 'operator', is_active: true,  created_at: '2026-04-07T00:00:00Z' }, { id: 'u18', full_name: 'Aisha Bello',        role: 'operator', is_active: true,  created_at: '2026-05-02T00:00:00Z' }],
  'org-8':  [{ id: 'u19', full_name: 'Moussa Hamidou',     role: 'owner',    is_active: true,  created_at: '2026-03-15T00:00:00Z' }],
  'org-9':  [{ id: 'u20', full_name: 'Kossi Agbeko',       role: 'owner',    is_active: true,  created_at: '2026-02-20T00:00:00Z' }, { id: 'u21', full_name: 'Afi Mensah',         role: 'operator', is_active: true,  created_at: '2026-03-05T00:00:00Z' }],
  'org-10': [{ id: 'u22', full_name: 'Théodore Adansi',    role: 'owner',    is_active: true,  created_at: '2026-04-10T00:00:00Z' }],
  'org-11': [{ id: 'u23', full_name: 'Armindo Camará',     role: 'owner',    is_active: false, created_at: '2025-12-01T00:00:00Z' }],
  'org-12': [{ id: 'u23', full_name: 'Mariama Baldé',      role: 'owner',    is_active: true,  created_at: '2026-03-25T00:00:00Z' }],
  'org-13': [{ id: 'u24', full_name: 'Ibrahim Kamara',     role: 'owner',    is_active: true,  created_at: '2026-04-18T00:00:00Z' }],
  'org-14': [{ id: 'u25', full_name: 'Moses Flomo',        role: 'owner',    is_active: true,  created_at: '2026-05-01T00:00:00Z' }],
  'org-15': [{ id: 'u26', full_name: 'Lamin Jallow',       role: 'owner',    is_active: true,  created_at: '2026-04-28T00:00:00Z' }],
  'org-16': [{ id: 'u27', full_name: 'Ana Fonseca',        role: 'owner',    is_active: false, created_at: '2025-10-15T00:00:00Z' }],
  'org-17': [{ id: 'u27', full_name: 'Fatimetou Mint Ahd', role: 'owner',    is_active: true,  created_at: '2026-03-28T00:00:00Z' }],
}
