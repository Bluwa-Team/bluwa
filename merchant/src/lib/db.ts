/**
 * db.ts — Couche de requêtes Supabase (données réelles, empty-state si DB vide)
 */
import { createClient } from '@/lib/supabase/server'
import type {
  MerchantOrg, Factory, SubscriptionPlan, UserSiteAccess,
  OnboardingItem, OnboardingCheck, OnboardingComment,
} from '@/types/merchant'

// ─── Types internes ────────────────────────────────────────────────────────

type FactoryRow = {
  id: string; organization_id: string; name: string; code: string
  location_country: string; location_city: string; timezone: string
  currency: string | null; subscription_plan_id: string | null
  subscription_status: string | null; subscription_expires_at: string | null
  is_active: boolean; created_at: string; plan: SubscriptionPlan | null
}

type UserRow = {
  id: string; organization_id: string; email: string
  first_name: string | null; last_name: string | null
  role: string; is_active: boolean; created_at: string
}

type PipelineRow = {
  id: string; org_id: string | null; org_name: string; country: string | null
  stage: string; plan_target: string | null; assigned_to: string | null
  notes: string | null; blocked: boolean; blocked_reason: string | null
  stage_entered_at: string; created_at: string
  onboarding_checklist: { id: string; label: string; done: boolean; sort_order: number }[]
  onboarding_comments: { id: string; author: string; content: string; created_at: string }[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function mapFactory(row: FactoryRow): Factory {
  return {
    id: row.id, organization_id: row.organization_id, name: row.name, code: row.code,
    location_country: row.location_country, location_city: row.location_city,
    timezone: row.timezone, currency: (row.currency as Factory['currency']) ?? 'XOF',
    subscription_plan_id: row.subscription_plan_id,
    subscription_status: row.subscription_status as Factory['subscription_status'],
    subscription_expires_at: row.subscription_expires_at,
    is_active: row.is_active, created_at: row.created_at, plan: row.plan ?? undefined,
  }
}

// ─── Organisations ─────────────────────────────────────────────────────────

export async function getOrgs(): Promise<MerchantOrg[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select(`id, name, country_headquarters, status, created_at,
      factories ( id, is_active, subscription_status,
        plan:subscription_plans ( id, name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config, created_at )
      )`)
    .order('created_at', { ascending: false })
  return (data ?? []).map((org) => ({
    id: org.id, name: org.name, status: org.status as MerchantOrg['status'],
    country: org.country_headquarters ?? null, currency: 'XOF' as const,
    created_at: org.created_at,
    factories: (org.factories as unknown as FactoryRow[]).map(mapFactory),
  }))
}

export async function getOrg(id: string): Promise<(MerchantOrg & { factories: Factory[] }) | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select(`id, name, country_headquarters, status, created_at,
      factories ( id, organization_id, name, code, location_country, location_city, timezone,
        subscription_plan_id, subscription_status, subscription_expires_at, is_active, created_at,
        plan:subscription_plans ( id, name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config, created_at )
      )`)
    .eq('id', id).single()
  if (!data) return null
  return {
    id: data.id, name: data.name, status: data.status as MerchantOrg['status'],
    country: data.country_headquarters ?? null, currency: 'XOF' as const,
    created_at: data.created_at,
    factories: (data.factories as unknown as FactoryRow[]).map(mapFactory),
  }
}

// ─── Factories ─────────────────────────────────────────────────────────────

export async function getFactoriesWithPlan(orgId?: string): Promise<Factory[]> {
  const supabase = await createClient()
  let query = supabase.from('factories').select(`
    id, organization_id, name, code, location_country, location_city, timezone,
    subscription_plan_id, subscription_status, subscription_expires_at, is_active, created_at,
    plan:subscription_plans ( id, name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config, created_at )`)
  if (orgId) query = query.eq('organization_id', orgId)
  const { data } = await query.order('created_at', { ascending: true })
  return (data as unknown as FactoryRow[] ?? []).map(mapFactory)
}

// ─── Plans ─────────────────────────────────────────────────────────────────

export async function getPlans(product: 'erp' | 'wms' | 'crm' = 'erp'): Promise<SubscriptionPlan[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('product', product)
    .order('price_monthly', { ascending: true })
  return (data ?? []) as SubscriptionPlan[]
}

// ─── Installation fees ──────────────────────────────────────────────────────

export async function getInstallFees() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('installation_fees')
    .select(`id, factory_id, size, amount_xof, status, paid_at, notes, created_at,
      factory:factories ( id, organization_id, name, code, location_country, location_city, timezone,
        subscription_plan_id, subscription_status, subscription_expires_at, is_active, created_at,
        organization:organizations ( id, name ) )`)
    .order('created_at', { ascending: false })
  return data ?? []
}

// ─── Service orders ─────────────────────────────────────────────────────────

export async function getServiceOrders() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('service_orders')
    .select(`id, org_id, factory_id, service_type, description, amount_xof, status,
      scheduled_at, delivered_at, created_at,
      org:organizations ( id, name ),
      factory:factories ( id, name, code )`)
    .order('created_at', { ascending: false })
  return data ?? []
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export async function getInvoices(orgId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('invoices')
    .select(`id, factory_id, amount_xof, status, due_at, paid_at, notes, created_at,
      factory:factories ( id, name, code, organization_id, org:organizations ( id, name ) )`)
    .order('due_at', { ascending: false })
  if (orgId) query = query.eq('factory.organization_id', orgId)
  const { data } = await query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({ subscription_id: '', ...row }))
}

// ─── Support ────────────────────────────────────────────────────────────────

export async function getTickets(): Promise<import('@/types/merchant').SupportTicket[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('support_tickets')
    .select(`id, factory_id, subject, status, priority, assigned_to, messages, created_at, updated_at,
      factory:factories ( id, name, code, org:organizations ( id, name ) )`)
    .order('updated_at', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    factory: Array.isArray(row.factory)
      ? (row.factory[0] ? { ...row.factory[0], org: Array.isArray(row.factory[0].org) ? row.factory[0].org[0] ?? null : row.factory[0].org } : null)
      : row.factory,
  }))
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function getUsers(orgId: string) {
  // Lit profiles (vrais utilisateurs ERP liés à auth.users via trigger)
  // et non la table `users` du merchant portal qui est déconnectée de l'auth
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name, role, is_active, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
  return (data ?? []).map((u) => ({
    id:              u.id,
    organization_id: u.organization_id,
    full_name:       u.full_name ?? '—',
    role:            u.role,
    is_active:       u.is_active,
    created_at:      u.created_at,
  }))
}

export async function getUserSiteAccess(orgId: string): Promise<UserSiteAccess[]> {
  const supabase = await createClient()
  // profiles.id = auth.users.id = user_site_access.user_id
  const { data: profiles } = await supabase.from('profiles').select('id').eq('organization_id', orgId)
  if (!profiles || profiles.length === 0) return []
  const { data } = await supabase.from('user_site_access')
    .select('id, user_id, factory_id, granted_at, granted_by').in('user_id', profiles.map((u) => u.id))
  return (data ?? []) as UserSiteAccess[]
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

export async function getOnboardingItems(): Promise<OnboardingItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_pipeline')
    .select(`id, org_id, org_name, country, stage, plan_target, assigned_to, notes,
      blocked, blocked_reason, stage_entered_at, created_at,
      onboarding_checklist ( id, label, done, sort_order ),
      onboarding_comments ( id, author, content, created_at )`)
    .order('created_at', { ascending: false })
  return (data as unknown as PipelineRow[] ?? []).map((row) => ({
    id: row.id, org_id: row.org_id ?? '', org_name: row.org_name, country: row.country,
    stage: row.stage as OnboardingItem['stage'], plan_target: row.plan_target,
    assigned_to: row.assigned_to, notes: row.notes, blocked: row.blocked,
    blocked_reason: row.blocked_reason, stage_entered_at: row.stage_entered_at,
    created_at: row.created_at,
    checklist: (row.onboarding_checklist ?? []).sort((a, b) => a.sort_order - b.sort_order)
      .map((c): OnboardingCheck => ({ id: c.id, label: c.label, done: c.done })),
    comments: (row.onboarding_comments ?? [])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((c): OnboardingComment => ({ id: c.id, author: c.author, content: c.content, created_at: c.created_at })),
  }))
}

// Mutations onboarding — voir db-client.ts pour les versions browser
