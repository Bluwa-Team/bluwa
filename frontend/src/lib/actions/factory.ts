'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface Factory {
  id:        string
  name:      string
  code:      string
  country:   string
  city:      string | null
  is_active: boolean
}

export interface FactoryCostParams {
  oh_rate:           number
  energie_unit_cost: number
}

export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED'

export interface FactorySubscription {
  planName:    string
  priceMonthly: number          // en XOF
  status:      SubscriptionStatus | null
  expiresAt:   string | null    // ISO date
  maxUsers:    number
}

// ── Changer d'usine active ────────────────────────────────────────────────────
export async function switchFactory(factoryId: string) {
  const cookieStore = await cookies()
  cookieStore.set('active_factory_id', factoryId, {
    path:    '/',
    maxAge:  60 * 60 * 24 * 365, // 1 an
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}

// ── Liste des usines accessibles par l'utilisateur ───────────────────────────
export async function getUserFactories(): Promise<Factory[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return []

  const isAdmin = ['owner', 'admin'].includes(profile.role)

  if (isAdmin) {
    // Owner / admin → toutes les usines de l'organisation
    const { data, error } = await supabase
      .from('factories')
      .select('id, name, code, country, city, is_active')
      .eq('organization_id', profile.organization_id)
      .order('name')
    if (error) console.error('[getUserFactories] admin query:', error.message)
    return (data ?? []) as Factory[]
  }

  // Autres rôles → uniquement les usines assignées via user_site_access
  const { data, error } = await supabase
    .from('user_site_access')
    .select('factories(id, name, code, country, city, is_active)')
    .eq('user_id', user.id)
  if (error) console.error('[getUserFactories] site_access query:', error.message)

  return data?.flatMap(r => r.factories ? [r.factories as unknown as Factory] : []) ?? []
}

// ── Paramètres de coût d'un site (migration 021) ──────────────────────────────
// Fetch isolé pour ne pas bloquer getUserFactories() si la migration n'est pas appliquée.

export async function getFactoryCostParams(
  factoryId: string,
): Promise<FactoryCostParams> {
  const fallback: FactoryCostParams = { oh_rate: 0.08, energie_unit_cost: 50 }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('factories')
      .select('oh_rate, energie_unit_cost')
      .eq('id', factoryId)
      .maybeSingle()
    if (error) {
      // Colonnes absentes = migration 021 non appliquée → valeurs par défaut
      console.warn('[getFactoryCostParams] migration 021 non appliquée — appliquer ALTER TABLE factories ADD COLUMN oh_rate / energie_unit_cost')
      return fallback
    }
    if (!data) return fallback
    return {
      oh_rate:           Number(data.oh_rate           ?? fallback.oh_rate),
      energie_unit_cost: Number(data.energie_unit_cost ?? fallback.energie_unit_cost),
    }
  } catch {
    return fallback
  }
}

// ── Abonnement de l'usine active ─────────────────────────────────────────────
export async function getFactorySubscription(
  factoryId: string,
): Promise<FactorySubscription | null> {
  if (!factoryId) return null
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('factories')
    .select(`
      subscription_status,
      subscription_expires_at,
      plan:subscription_plans (
        name,
        price_monthly,
        max_users_allowed
      )
    `)
    .eq('id', factoryId)
    .single()

  if (error || !data?.plan) return null

  const plan = data.plan as unknown as {
    name: string
    price_monthly: number
    max_users_allowed: number
  }

  return {
    planName:     plan.name,
    priceMonthly: plan.price_monthly,
    status:       (data.subscription_status as SubscriptionStatus) ?? null,
    expiresAt:    data.subscription_expires_at ?? null,
    maxUsers:     plan.max_users_allowed,
  }
}

// ── Paramètres coûts usine (migration 021) ────────────────────────────────────

export async function updateFactoryCostSettings(
  factoryId:       string,
  orgId:           string,
  ohRate:          number,
  energieUnitCost: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Seuls owner/admin peuvent modifier les paramètres usine
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!['owner', 'admin'].includes(profile?.role ?? '')) {
    return { error: 'Droits insuffisants' }
  }

  const { error } = await supabase
    .from('factories')
    .update({ oh_rate: ohRate, energie_unit_cost: energieUnitCost })
    .eq('id', factoryId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/analyse-marge')
  return {}
}

// La création de sites est réservée à l'application Bluwa Merchant.
// Voir migration 022 — RLS INSERT factories restreint à @bluwa.io.
