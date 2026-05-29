/**
 * db.ts — Couche de requêtes Supabase avec fallback sur mock-data si DB vide
 */
import { createClient } from '@/lib/supabase/server'
import type {
  MerchantOrg, Factory, SubscriptionPlan, InstallationFee,
  ServiceOrder, Invoice, SupportTicket, UserSiteAccess,
  OnboardingItem, OnboardingCheck, OnboardingComment,
} from '@/types/merchant'
import {
  MOCK_ORGS, MOCK_FACTORIES, MOCK_PLANS, MOCK_INSTALLATION_FEES,
  MOCK_SERVICE_ORDERS, MOCK_INVOICES, MOCK_TICKETS, MOCK_ONBOARDING,
  MOCK_USERS_BY_ORG, MOCK_USER_SITE_ACCESS,
} from './mock-data'

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
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organizations')
      .select(`id, name, country_headquarters, status, created_at,
        factories ( id, is_active, subscription_status,
          plan:subscription_plans ( id, name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config, created_at )
        )`)
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) return MOCK_ORGS
    return data.map((org) => ({
      id: org.id, name: org.name, status: org.status as MerchantOrg['status'],
      country: org.country_headquarters ?? null, currency: 'XOF' as const,
      created_at: org.created_at,
      factories: (org.factories as unknown as FactoryRow[]).map(mapFactory),
    }))
  } catch { return MOCK_ORGS }
}

export async function getOrg(id: string): Promise<(MerchantOrg & { factories: Factory[] }) | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organizations')
      .select(`id, name, country_headquarters, status, created_at,
        factories ( id, organization_id, name, code, location_country, location_city, timezone,
          subscription_plan_id, subscription_status, subscription_expires_at, is_active, created_at,
          plan:subscription_plans ( id, name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config, created_at )
        )`)
      .eq('id', id).single()
    if (error || !data) {
      const mock = MOCK_ORGS.find((o) => o.id === id)
      if (!mock) return null
      return { ...mock, factories: MOCK_FACTORIES.filter((f) => f.organization_id === id) }
    }
    return {
      id: data.id, name: data.name, status: data.status as MerchantOrg['status'],
      country: data.country_headquarters ?? null, currency: 'XOF' as const,
      created_at: data.created_at,
      factories: (data.factories as unknown as FactoryRow[]).map(mapFactory),
    }
  } catch {
    const mock = MOCK_ORGS.find((o) => o.id === id)
    if (!mock) return null
    return { ...mock, factories: MOCK_FACTORIES.filter((f) => f.organization_id === id) }
  }
}

// ─── Factories ─────────────────────────────────────────────────────────────

export async function getFactoriesWithPlan(orgId?: string): Promise<Factory[]> {
  try {
    const supabase = await createClient()
    let query = supabase.from('factories').select(`
      id, organization_id, name, code, location_country, location_city, timezone,
      subscription_plan_id, subscription_status, subscription_expires_at, is_active, created_at,
      plan:subscription_plans ( id, name, price_monthly, price_monthly_annual, max_users_allowed, target_size, features_config, created_at )`)
    if (orgId) query = query.eq('organization_id', orgId)
    const { data, error } = await query.order('created_at', { ascending: true })
    if (error || !data || data.length === 0) {
      return orgId ? MOCK_FACTORIES.filter((f) => f.organization_id === orgId) : MOCK_FACTORIES
    }
    return (data as unknown as FactoryRow[]).map(mapFactory)
  } catch {
    return orgId ? MOCK_FACTORIES.filter((f) => f.organization_id === orgId) : MOCK_FACTORIES
  }
}

// ─── Plans ─────────────────────────────────────────────────────────────────

export async function getPlans(): Promise<SubscriptionPlan[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('subscription_plans').select('*').order('price_monthly', { ascending: true })
    if (error || !data || data.length === 0) return MOCK_PLANS
    return data as SubscriptionPlan[]
  } catch { return MOCK_PLANS }
}

// ─── Installation fees ──────────────────────────────────────────────────────

export async function getInstallFees() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('installation_fees')
      .select(`id, factory_id, size, amount_xof, status, paid_at, notes, created_at,
        factory:factories ( id, organization_id, name, code, location_country, location_city, timezone,
          subscription_plan_id, subscription_status, subscription_expires_at, is_active, created_at,
          organization:organizations ( id, name ) )`)
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) {
      return MOCK_INSTALLATION_FEES.map((fee) => {
        const fac = MOCK_FACTORIES.find((f) => f.id === fee.factory_id)
        const org = fac ? MOCK_ORGS.find((o) => o.id === fac.organization_id) : undefined
        return { ...fee, factory: fac ? { ...fac, organization: org ? { id: org.id, name: org.name } : undefined } : undefined }
      })
    }
    return data
  } catch {
    return MOCK_INSTALLATION_FEES.map((fee) => {
      const fac = MOCK_FACTORIES.find((f) => f.id === fee.factory_id)
      const org = fac ? MOCK_ORGS.find((o) => o.id === fac.organization_id) : undefined
      return { ...fee, factory: fac ? { ...fac, organization: org ? { id: org.id, name: org.name } : undefined } : undefined }
    })
  }
}

// ─── Service orders ─────────────────────────────────────────────────────────

export async function getServiceOrders() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('service_orders')
      .select(`id, org_id, factory_id, service_type, description, amount_xof, status,
        scheduled_at, delivered_at, created_at,
        org:organizations ( id, name ),
        factory:factories ( id, name, code )`)
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) {
      return MOCK_SERVICE_ORDERS.map((svc) => {
        const org = MOCK_ORGS.find((o) => o.id === svc.org_id)
        const fac = svc.factory_id ? MOCK_FACTORIES.find((f) => f.id === svc.factory_id) : null
        return { ...svc, org: org ? { id: org.id, name: org.name } : undefined, factory: fac ? { id: fac.id, name: fac.name, code: fac.code } : null }
      })
    }
    return data
  } catch {
    return MOCK_SERVICE_ORDERS.map((svc) => {
      const org = MOCK_ORGS.find((o) => o.id === svc.org_id)
      const fac = svc.factory_id ? MOCK_FACTORIES.find((f) => f.id === svc.factory_id) : null
      return { ...svc, org: org ? { id: org.id, name: org.name } : undefined, factory: fac ? { id: fac.id, name: fac.name, code: fac.code } : null }
    })
  }
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export async function getInvoices(orgId?: string) {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('invoices')
      .select(`id, factory_id, amount_xof, status, due_at, paid_at, notes, created_at,
        factory:factories ( id, name, code, organization_id, org:organizations ( id, name ) )`)
      .order('due_at', { ascending: false })
    if (orgId) query = query.eq('factory.organization_id', orgId)
    const { data, error } = await query
    if (error || !data || data.length === 0) {
      let invoices = MOCK_INVOICES
      if (orgId) {
        const orgFactoryIds = MOCK_FACTORIES.filter((f) => f.organization_id === orgId).map((f) => f.id)
        invoices = MOCK_INVOICES.filter((i) => orgFactoryIds.includes(i.factory_id))
      }
      return invoices.map((inv) => {
        const fac = MOCK_FACTORIES.find((f) => f.id === inv.factory_id)
        const org = fac ? MOCK_ORGS.find((o) => o.id === fac.organization_id) : undefined
        return { ...inv, factory: fac ? { ...fac, org: org ? { id: org.id, name: org.name } : undefined } : undefined }
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((row: any) => ({ subscription_id: '', ...row }))
  } catch {
    let invoices = MOCK_INVOICES
    if (orgId) {
      const orgFactoryIds = MOCK_FACTORIES.filter((f) => f.organization_id === orgId).map((f) => f.id)
      invoices = MOCK_INVOICES.filter((i) => orgFactoryIds.includes(i.factory_id))
    }
    return invoices.map((inv) => {
      const fac = MOCK_FACTORIES.find((f) => f.id === inv.factory_id)
      const org = fac ? MOCK_ORGS.find((o) => o.id === fac.organization_id) : undefined
      return { ...inv, factory: fac ? { ...fac, org: org ? { id: org.id, name: org.name } : undefined } : undefined }
    })
  }
}

// ─── Support ────────────────────────────────────────────────────────────────

export async function getTickets() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`id, org_id, subject, status, priority, assigned_to, messages, created_at, updated_at,
        org:organizations ( id, name )`)
      .order('updated_at', { ascending: false })
    if (error || !data || data.length === 0) {
      return MOCK_TICKETS.map((t) => {
        const org = MOCK_ORGS.find((o) => o.id === t.org_id)
        return { ...t, org: org ? { id: org.id, name: org.name } : undefined }
      })
    }
    return data
  } catch {
    return MOCK_TICKETS.map((t) => {
      const org = MOCK_ORGS.find((o) => o.id === t.org_id)
      return { ...t, org: org ? { id: org.id, name: org.name } : undefined }
    })
  }
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function getUsers(orgId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, organization_id, email, first_name, last_name, role, is_active, created_at')
      .eq('organization_id', orgId).order('created_at', { ascending: true })
    if (error || !data || data.length === 0) {
      return (MOCK_USERS_BY_ORG[orgId] ?? []).map((u) => ({
        id: u.id, organization_id: orgId, email: `${u.full_name.toLowerCase().replace(' ', '.')}@client.io`,
        first_name: u.full_name.split(' ')[0], last_name: u.full_name.split(' ')[1] ?? null,
        full_name: u.full_name, role: u.role, is_active: u.is_active, created_at: u.created_at,
      }))
    }
    return (data as UserRow[]).map((u) => ({
      ...u, full_name: [u.first_name, u.last_name].filter(Boolean).join(' '),
    }))
  } catch {
    return (MOCK_USERS_BY_ORG[orgId] ?? []).map((u) => ({
      id: u.id, organization_id: orgId, email: `${u.full_name.toLowerCase().replace(' ', '.')}@client.io`,
      first_name: u.full_name.split(' ')[0], last_name: u.full_name.split(' ')[1] ?? null,
      full_name: u.full_name, role: u.role, is_active: u.is_active, created_at: u.created_at,
    }))
  }
}

export async function getUserSiteAccess(orgId: string): Promise<UserSiteAccess[]> {
  try {
    const supabase = await createClient()
    const { data: users, error: uErr } = await supabase.from('users').select('id').eq('organization_id', orgId)
    if (uErr || !users || users.length === 0) {
      const orgUsers = MOCK_USERS_BY_ORG[orgId] ?? []
      return orgUsers.flatMap((u) =>
        (MOCK_USER_SITE_ACCESS[u.id] ?? []).map((factoryId, i) => ({
          id: `${u.id}-${i}`, user_id: u.id, factory_id: factoryId,
          granted_at: u.created_at, granted_by: null,
        }))
      )
    }
    const userIds = users.map((u) => u.id)
    const { data, error } = await supabase.from('user_site_access')
      .select('id, user_id, factory_id, granted_at, granted_by').in('user_id', userIds)
    if (error || !data) return []
    return data as UserSiteAccess[]
  } catch { return [] }
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

export async function getOnboardingItems(): Promise<OnboardingItem[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('onboarding_pipeline')
      .select(`id, org_id, org_name, country, stage, plan_target, assigned_to, notes,
        blocked, blocked_reason, stage_entered_at, created_at,
        onboarding_checklist ( id, label, done, sort_order ),
        onboarding_comments ( id, author, content, created_at )`)
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) return MOCK_ONBOARDING
    return (data as unknown as PipelineRow[]).map((row) => ({
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
  } catch { return MOCK_ONBOARDING }
}

// Mutations onboarding — voir db-client.ts pour les versions browser
