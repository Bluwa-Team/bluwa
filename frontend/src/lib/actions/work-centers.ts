'use server'

import { getSupabaseWithOrg } from './helpers'
import { WorkCenter } from '@/types/erp'

export type { WorkCenter }

export type WorkCenterInput = Pick<
  WorkCenter,
  'name' | 'code' | 'ratePerHour' | 'currency' | 'dailyCapacityHours' | 'efficiencyPercentage'
>

// ── Mapper ────────────────────────────────────────────────────────────────────

function toWorkCenter(row: Record<string, unknown>): WorkCenter {
  return {
    id:                   row.id as string,
    name:                 (row.name as string) ?? '',
    code:                 (row.code as string | null) ?? null,
    ratePerHour:          parseFloat(String(row.rate_per_hour   ?? 0)),
    currency:             (row.currency as string) ?? 'XOF',
    dailyCapacityHours:   parseFloat(String(row.daily_capacity_hours   ?? 8)),
    efficiencyPercentage: parseFloat(String(row.efficiency_percentage  ?? 100)),
    isActive:             (row.is_active as boolean) ?? true,
    createdAt:            ((row.created_at as string) ?? '').split('T')[0],
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Résout le factory_id pour l'org courante — profile.factory_id ou premier factory */
async function resolveFactoryId(supabase: Awaited<ReturnType<typeof import('./helpers').getSupabaseWithOrg>>['supabase'], orgId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('factory_id')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (profile?.factory_id) return profile.factory_id

  const { data: factory } = await supabase
    .from('factories')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle()

  if (factory?.id) return factory.id
  throw new Error('No factory found for this organization')
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Tous les postes actifs (pour les dropdowns) */
export async function getWorkCenters(): Promise<WorkCenter[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('work_centers')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return (data ?? []).map(toWorkCenter)
  } catch (e) {
    console.error('[wc] getWorkCenters:', e)
    return []
  }
}

/** Tous les postes — actifs + inactifs (pour la page de gestion) */
export async function getAllWorkCenters(): Promise<WorkCenter[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('work_centers')
      .select('*')
      .eq('organization_id', orgId)
      .order('name')
    if (error) throw error
    return (data ?? []).map(toWorkCenter)
  } catch (e) {
    console.error('[wc] getAllWorkCenters:', e)
    return []
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createWorkCenter(input: WorkCenterInput): Promise<WorkCenter | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const factoryId = await resolveFactoryId(supabase, orgId)

    const { data, error } = await supabase
      .from('work_centers')
      .insert({
        organization_id:      orgId,
        factory_id:           factoryId,
        name:                 input.name.trim(),
        code:                 input.code?.trim() || null,
        rate_per_hour:        input.ratePerHour,
        currency:             input.currency || 'XOF',
        daily_capacity_hours: input.dailyCapacityHours,
        efficiency_percentage: input.efficiencyPercentage,
      })
      .select()
      .single()
    if (error) throw error
    return toWorkCenter(data)
  } catch (e) {
    console.error('[wc] createWorkCenter:', e)
    return null
  }
}

export async function updateWorkCenter(
  id: string,
  input: Partial<WorkCenterInput> & { isActive?: boolean },
): Promise<WorkCenter | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const patch: Record<string, unknown> = {}
    if (input.name              !== undefined) patch.name                  = input.name.trim()
    if (input.code              !== undefined) patch.code                  = input.code?.trim() || null
    if (input.ratePerHour       !== undefined) patch.rate_per_hour         = input.ratePerHour
    if (input.currency          !== undefined) patch.currency              = input.currency
    if (input.dailyCapacityHours !== undefined) patch.daily_capacity_hours = input.dailyCapacityHours
    if (input.efficiencyPercentage !== undefined) patch.efficiency_percentage = input.efficiencyPercentage
    if (input.isActive          !== undefined) patch.is_active             = input.isActive

    const { data, error } = await supabase
      .from('work_centers')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()
    if (error) throw error
    return toWorkCenter(data)
  } catch (e) {
    console.error('[wc] updateWorkCenter:', e)
    return null
  }
}
