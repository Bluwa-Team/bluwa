'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  MrpRun,
  MrpRecommendationRow,
  MrpRecommendationStatus,
} from '@/types/erp'

// ── Mappers ───────────────────────────────────────────────────────────────────

function toMrpRun(row: Record<string, unknown>): MrpRun {
  return {
    id:               row.id as string,
    organizationId:   row.organization_id as string,
    factoryId:        row.factory_id as string,
    executedAt:       row.executed_at as string,
    executedBySystem: (row.executed_by_system as boolean) ?? true,
    status:           (row.status as MrpRun['status']) ?? 'SUCCESS',
  }
}

function toMrpRecommendationRow(row: Record<string, unknown>): MrpRecommendationRow {
  const article = row.articles as {
    designation: string
    code: string
    unite_stock: string
  } | null

  return {
    id:                          row.id as string,
    organizationId:              row.organization_id as string,
    factoryId:                   row.factory_id as string,
    mrpRunId:                    row.mrp_run_id as string,
    articleId:                   row.article_id as string,
    actionType:                  (row.action_type as MrpRecommendationRow['actionType']),
    suggestedQuantity:           parseFloat(String(row.suggested_quantity ?? 0)),
    suggestedOrderDate:          row.suggested_order_date as string,
    requiredDate:                row.required_date as string,
    status:                      (row.status as MrpRecommendationStatus) ?? 'NEW',
    linkedPurchaseRequisitionId: (row.linked_purchase_requisition_id as string | null) ?? null,
    linkedProductionOrderId:     (row.linked_production_order_id as string | null) ?? null,
    createdAt:                   row.created_at as string,
    updatedAt:                   row.updated_at as string,
    // Dénormalisé depuis le JOIN articles
    articleLabel: article?.designation ?? '',
    articleSku:   article?.code ?? '',
    articleUnit:  article?.unite_stock ?? '',
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** Dernière passe MRP réussie pour l'organisation courante. */
export async function getLatestMrpRun(): Promise<MrpRun | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('mrp_runs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'SUCCESS')
      .order('executed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data ? toMrpRun(data as unknown as Record<string, unknown>) : null
  } catch (e) {
    console.error('[mrp] getLatestMrpRun:', e)
    return null
  }
}

/** Toutes les recommandations, optionnellement filtrées par statut. */
export async function getMrpRecommendations(
  filter: MrpRecommendationStatus | 'ALL' = 'ALL',
): Promise<MrpRecommendationRow[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    let query = supabase
      .from('mrp_recommendations')
      .select('*, articles!article_id(designation, code, unite_stock)')
      .eq('organization_id', orgId)
      .order('required_date', { ascending: true })

    if (filter !== 'ALL') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row) =>
      toMrpRecommendationRow(row as unknown as Record<string, unknown>),
    )
  } catch (e) {
    console.error('[mrp] getMrpRecommendations:', e)
    return []
  }
}

/** Recommandations par passe MRP spécifique. */
export async function getRecommendationsByRun(
  runId: string,
): Promise<MrpRecommendationRow[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('mrp_recommendations')
      .select('*, articles!article_id(designation, code, unite_stock)')
      .eq('organization_id', orgId)
      .eq('mrp_run_id', runId)
      .order('required_date', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row) =>
      toMrpRecommendationRow(row as unknown as Record<string, unknown>),
    )
  } catch (e) {
    console.error('[mrp] getRecommendationsByRun:', e)
    return []
  }
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Marque une recommandation comme CONVERTED.
 * Optionnellement lie une DA ou un OF créé.
 */
export async function convertRecommendation(
  id: string,
  opts?: {
    linkedPurchaseRequisitionId?: string
    linkedProductionOrderId?: string
  },
): Promise<MrpRecommendationRow | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('mrp_recommendations')
      .update({
        status:                          'CONVERTED',
        linked_purchase_requisition_id:  opts?.linkedPurchaseRequisitionId ?? null,
        linked_production_order_id:      opts?.linkedProductionOrderId ?? null,
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('status', 'NEW')   // RLS guard côté DB aussi, mais double vérif côté app
      .select('*, articles!article_id(designation, code, unite_stock)')
      .single()
    if (error) throw error
    return data
      ? toMrpRecommendationRow(data as unknown as Record<string, unknown>)
      : null
  } catch (e) {
    console.error('[mrp] convertRecommendation:', e)
    return null
  }
}

/** Marque une recommandation comme IGNORED. */
export async function ignoreRecommendation(
  id: string,
): Promise<MrpRecommendationRow | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('mrp_recommendations')
      .update({ status: 'IGNORED' })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('status', 'NEW')
      .select('*, articles!article_id(designation, code, unite_stock)')
      .single()
    if (error) throw error
    return data
      ? toMrpRecommendationRow(data as unknown as Record<string, unknown>)
      : null
  } catch (e) {
    console.error('[mrp] ignoreRecommendation:', e)
    return null
  }
}

/** Crée une nouvelle passe MRP en statut RUNNING (à compléter côté moteur). */
export async function createMrpRun(factoryId: string): Promise<MrpRun | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('mrp_runs')
      .insert({
        organization_id:    orgId,
        factory_id:         factoryId,
        executed_by_system: false,
        status:             'RUNNING',
      })
      .select()
      .single()
    if (error) throw error
    return data ? toMrpRun(data as unknown as Record<string, unknown>) : null
  } catch (e) {
    console.error('[mrp] createMrpRun:', e)
    return null
  }
}
