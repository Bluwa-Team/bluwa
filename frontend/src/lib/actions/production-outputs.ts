'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  ProductionOutput,
  ProductionOutputRow,
  ProductionOutputStatus,
} from '@/types/erp'

// ── Mapper ────────────────────────────────────────────────────────────────────

function toProductionOutputRow(row: Record<string, unknown>): ProductionOutputRow {
  const article = row.articles as {
    designation: string
    code: string
    unite_stock: string
  } | null

  const order = row.production_orders as {
    order_number: string
  } | null

  const produced = parseFloat(String(row.quantity_produced ?? 0))
  const scrap    = parseFloat(String(row.quantity_scrap    ?? 0))
  const tauxRebut =
    produced + scrap > 0
      ? Math.round((scrap / (produced + scrap)) * 10_000) / 100
      : 0

  return {
    id:                  row.id as string,
    organizationId:      row.organization_id as string,
    factoryId:           row.factory_id as string,
    productionOrderId:   row.production_order_id as string,
    articleId:           row.article_id as string,
    outputNumber:        row.output_number as string,
    status:              (row.status as ProductionOutputStatus) ?? 'DRAFT',
    quantityProduced:    produced,
    quantityScrap:       scrap,
    productBatchNumber:  row.product_batch_number as string,
    expiryDate:          row.expiry_date as string,
    declaredBy:          row.declared_by as string,
    declaredAt:          row.declared_at as string,
    confirmedBy:         (row.confirmed_by as string | null) ?? null,
    confirmedAt:         (row.confirmed_at as string | null) ?? null,
    postedAt:            (row.posted_at   as string | null) ?? null,
    notes:               (row.notes       as string | null) ?? null,
    createdAt:           row.created_at as string,
    updatedAt:           row.updated_at as string,
    articleLabel:        article?.designation ?? '',
    articleSku:          article?.code        ?? '',
    articleUnit:         article?.unite_stock ?? '',
    orderNumber:         order?.order_number  ?? '',
    tauxRebut,
  }
}

// ── Helpers internes ──────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseWithOrg>>['supabase']

async function resolveFactoryId(supabase: SupabaseClient, orgId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('factory_id')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (profile?.factory_id) return profile.factory_id as string

  const { data: factory } = await supabase
    .from('factories')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle()

  if (factory?.id) return factory.id as string
  throw new Error('Aucune usine trouvée pour cette organisation')
}

const SELECT_FRAGMENT =
  '*, articles!article_id(designation, code, unite_stock), production_orders!production_order_id(order_number)'

// ── Reads ─────────────────────────────────────────────────────────────────────

/** Toutes les déclarations, filtrables par statut. */
export async function getProductionOutputs(
  filter: ProductionOutputStatus | 'ALL' = 'ALL',
): Promise<ProductionOutputRow[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    let query = supabase
      .from('production_outputs')
      .select(SELECT_FRAGMENT)
      .eq('organization_id', orgId)
      .order('declared_at', { ascending: false })

    if (filter !== 'ALL') query = query.eq('status', filter)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map((r) =>
      toProductionOutputRow(r as unknown as Record<string, unknown>),
    )
  } catch (e) {
    console.error('[production-outputs] getProductionOutputs:', e)
    return []
  }
}

/**
 * Ordres de Fabrication disponibles pour une nouvelle déclaration.
 * Retourne les OF RELEASED et IN_PROGRESS avec infos article (dont durée de vie).
 */
export interface ProductionOrderForDeclaration {
  id:                   string
  orderNumber:          string
  articleId:            string
  articleLabel:         string
  articleSku:           string
  articleUnit:          string
  articleShelfLifeDays: number | null   // pour auto-calculer la DLC
  quantityTarget:       number
  quantityProduced:     number
  status:               string
}

export async function getProductionOrdersForDeclaration(): Promise<ProductionOrderForDeclaration[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('production_orders')
      .select(
        'id, order_number, article_id, quantity_target, quantity_produced, status, articles!article_id(code, designation, unite_stock, duree_vie)',
      )
      .eq('organization_id', orgId)
      .in('status', ['RELEASED', 'IN_PROGRESS'])
      .order('created_at', { ascending: false })
    if (error) throw error

    return (data ?? []).map((r) => {
      const row = r as unknown as Record<string, unknown>
      const art = row.articles as {
        code: string
        designation: string
        unite_stock: string
        duree_vie: number | null
      } | null
      return {
        id:                   row.id as string,
        orderNumber:          row.order_number as string,
        articleId:            row.article_id as string,
        articleLabel:         art?.designation    ?? '',
        articleSku:           art?.code           ?? '',
        articleUnit:          art?.unite_stock    ?? '',
        articleShelfLifeDays: art?.duree_vie      ?? null,
        quantityTarget:       parseFloat(String(row.quantity_target   ?? 0)),
        quantityProduced:     parseFloat(String(row.quantity_produced ?? 0)),
        status:               row.status as string,
      }
    })
  } catch (e) {
    console.error('[production-outputs] getProductionOrdersForDeclaration:', e)
    return []
  }
}

// ── Writes ────────────────────────────────────────────────────────────────────

export interface CreateProductionOutputInput {
  productionOrderId:   string
  articleId:           string
  quantityProduced:    number
  quantityScrap:       number
  productBatchNumber:  string
  expiryDate:          string   // ISO date YYYY-MM-DD
  notes?:              string
}

/** Crée une déclaration en statut DRAFT. Le numéro DP-YYYY-NNNN est auto-généré. */
export async function createProductionOutput(
  input: CreateProductionOutputInput,
): Promise<ProductionOutputRow | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const factoryId = await resolveFactoryId(supabase, orgId)

    // Génération séquentielle du numéro DP-YYYY-NNNN
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('production_outputs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .like('output_number', `DP-${year}-%`)
    const seq = String((count ?? 0) + 1).padStart(4, '0')
    const outputNumber = `DP-${year}-${seq}`

    const { data, error } = await supabase
      .from('production_outputs')
      .insert({
        organization_id:      orgId,
        factory_id:           factoryId,
        production_order_id:  input.productionOrderId,
        article_id:           input.articleId,
        output_number:        outputNumber,
        status:               'DRAFT',
        quantity_produced:    input.quantityProduced,
        quantity_scrap:       input.quantityScrap,
        product_batch_number: input.productBatchNumber,
        expiry_date:          input.expiryDate,
        notes:                input.notes ?? null,
      })
      .select(SELECT_FRAGMENT)
      .single()
    if (error) throw error
    return data
      ? toProductionOutputRow(data as unknown as Record<string, unknown>)
      : null
  } catch (e) {
    console.error('[production-outputs] createProductionOutput:', e)
    return null
  }
}

/** DRAFT → CONFIRMED (validation chef d'équipe). */
export async function confirmProductionOutput(
  id: string,
): Promise<ProductionOutputRow | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('production_outputs')
      .update({ status: 'CONFIRMED', confirmed_by: user?.id ?? null, confirmed_at: now })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('status', 'DRAFT')
      .select(SELECT_FRAGMENT)
      .single()
    if (error) throw error
    return data
      ? toProductionOutputRow(data as unknown as Record<string, unknown>)
      : null
  } catch (e) {
    console.error('[production-outputs] confirmProductionOutput:', e)
    return null
  }
}

/** CONFIRMED → POSTED (comptabilisation, lot PF créé en stock). */
export async function postProductionOutput(
  id: string,
): Promise<ProductionOutputRow | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('production_outputs')
      .update({ status: 'POSTED', posted_at: now })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('status', 'CONFIRMED')
      .select(SELECT_FRAGMENT)
      .single()
    if (error) throw error
    return data
      ? toProductionOutputRow(data as unknown as Record<string, unknown>)
      : null
  } catch (e) {
    console.error('[production-outputs] postProductionOutput:', e)
    return null
  }
}

/** Suppression d'un brouillon (DRAFT uniquement — protégé par RLS). */
export async function deleteProductionOutput(id: string): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('production_outputs')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('status', 'DRAFT')
    if (error) throw error
    return true
  } catch (e) {
    console.error('[production-outputs] deleteProductionOutput:', e)
    return false
  }
}
