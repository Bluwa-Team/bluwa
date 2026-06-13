'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface Factory {
  id:                string
  name:              string
  code:              string
  country:           string
  city:              string | null
  is_active:         boolean
  oh_rate:           number   // taux FG — ex: 0.08 = 8 %
  energie_unit_cost: number   // forfait énergie XOF/unité PF
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
    const { data } = await supabase
      .from('factories')
      .select('id, name, code, country, city, is_active, oh_rate, energie_unit_cost')
      .eq('organization_id', profile.organization_id)
      .order('name')
    return (data ?? []) as Factory[]
  }

  // Autres rôles → uniquement les usines assignées
  const { data } = await supabase
    .from('user_site_access')
    .select('factories(id, name, code, country, city, is_active, oh_rate, energie_unit_cost)')
    .eq('user_id', user.id)

  return data?.flatMap(r => r.factories ? [r.factories as unknown as Factory] : []) ?? []
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
  factoryId:       string | null,   // null = aucun site existant → on en crée un
  orgId:           string,
  ohRate:          number,
  energieUnitCost: number,
): Promise<{ error?: string; createdFactoryId?: string }> {
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

  // ── Cas 1 : aucun site existant → création du site par défaut ────────────
  if (!factoryId) {
    const { data: newFactory, error: createErr } = await supabase
      .from('factories')
      .insert({
        organization_id:   orgId,
        name:              'Site Principal',
        code:              'SITE1',
        country:           'Sénégal',
        timezone:          'Africa/Dakar',
        currency:          'XOF',
        site_type:         'usine',
        is_owned:          true,
        is_active:         true,
        oh_rate:           ohRate,
        energie_unit_cost: energieUnitCost,
      })
      .select('id')
      .single()

    if (createErr) return { error: createErr.message }

    revalidatePath('/settings')
    revalidatePath('/analyse-marge')
    return { createdFactoryId: (newFactory as any).id as string }
  }

  // ── Cas 2 : site existant → mise à jour des deux colonnes ────────────────
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
