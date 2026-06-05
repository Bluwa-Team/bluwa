'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  OrdreFabrication, StatutOF, StatutOFDB,
} from '@/app/[locale]/(dashboard)/production/_components/types'

// ── Mapping statuts DB ↔ UI ───────────────────────────────────────────────────

function dbToUi(status: string): StatutOF {
  switch (status as StatutOFDB) {
    case 'PLANNED':     return 'Planifie'
    case 'RELEASED':    return 'EnCours'
    case 'IN_PROGRESS': return 'EnCours'
    case 'COMPLETED':   return 'Dispo'
    case 'CANCELLED':   return 'Termine'
    default:            return 'Planifie'
  }
}

function uiToDb(statut: StatutOF): StatutOFDB {
  switch (statut) {
    case 'EnAttenteComposants': return 'PLANNED'
    case 'Planifie':            return 'PLANNED'
    case 'EnCours':             return 'IN_PROGRESS'
    case 'ControleQualite':     return 'IN_PROGRESS'
    case 'Dispo':               return 'COMPLETED'
    case 'Termine':             return 'COMPLETED'
  }
}

// ── Mapper DB row → OrdreFabrication ─────────────────────────────────────────

function toOf(row: Record<string, unknown>): OrdreFabrication {
  const article = row.articles as {
    code: string
    designation: string
    unite_stock: string
  } | null

  const outputs = row.production_outputs as Array<{ product_batch_number: string }> | null
  const lotPF = outputs?.[0]?.product_batch_number ?? null

  const status  = row.status as string
  const statut  = dbToUi(status)
  const archive = status === 'CANCELLED' || status === 'COMPLETED'

  return {
    id:              row.id as string,
    numero:          row.order_number as string,
    produitFini:     article?.designation ?? '',
    sku:             article?.code ?? '',
    qty:             Number(row.quantity_target)   || 0,
    realise:         Number(row.quantity_produced) || 0,
    unite:           article?.unite_stock ?? 'u',
    lotPF,
    ligne:           (row.ligne as string | null) ?? '',
    operateurPrep:   (row.operateur as string | null) ?? null,
    dateBesoin:      ((row.end_date   as string) ?? '').split('T')[0],
    debutPlanif:     ((row.start_date as string) ?? '').split('T')[0],
    picking:         (row.picking as 'AValider' | 'Valide' | null) ?? 'AValider',
    statut,
    archive,
  }
}

// ── Lecture ───────────────────────────────────────────────────────────────────

export async function getProductionOrders(): Promise<OrdreFabrication[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('production_orders')
      .select(`
        *,
        articles!article_id ( code, designation, unite_stock ),
        production_outputs ( product_batch_number )
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(toOf)
  } catch (e) {
    console.error('[getProductionOrders]', e)
    return []
  }
}

// ── Création ─────────────────────────────────────────────────────────────────

export async function createProductionOrder(
  of_: Omit<OrdreFabrication, 'id' | 'numero'> & { articleId?: string },
  articleId?: string,
): Promise<OrdreFabrication | null> {
  try {
    const { supabase, orgId, factoryId } = await getSupabaseWithOrg()

    // Résoudre article_id depuis le sku si non fourni
    let artId = articleId ?? of_.articleId
    if (!artId && of_.sku) {
      const { data: art } = await supabase
        .from('articles')
        .select('id')
        .eq('organization_id', orgId)
        .eq('code', of_.sku)
        .maybeSingle()
      artId = (art as any)?.id
    }
    if (!artId) throw new Error('article_id introuvable pour sku: ' + of_.sku)

    // Générer le numéro d'OF
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('production_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
    const seq = String((count ?? 0) + 1).padStart(4, '0')
    const orderNumber = `OF-${year}-${seq}`

    const { data, error } = await supabase
      .from('production_orders')
      .insert({
        organization_id:   orgId,
        factory_id:        factoryId,
        article_id:        artId,
        order_number:      orderNumber,
        quantity_target:   of_.qty,
        quantity_produced: 0,
        status:            uiToDb(of_.statut),
        start_date:        of_.debutPlanif || new Date().toISOString().split('T')[0],
        end_date:          of_.dateBesoin  || new Date().toISOString().split('T')[0],
        ligne:             of_.ligne   || null,
        operateur:         of_.operateurPrep || null,
        picking:           of_.picking ?? 'AValider',
      })
      .select(`*, articles!article_id ( code, designation, unite_stock ), production_outputs ( product_batch_number )`)
      .single()
    if (error) throw error
    return data ? toOf(data) : null
  } catch (e) {
    console.error('[createProductionOrder]', e)
    return null
  }
}

// ── Mise à jour ───────────────────────────────────────────────────────────────

export async function updateProductionOrder(
  id: string,
  of_: Partial<OrdreFabrication>,
): Promise<OrdreFabrication | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const patch: Record<string, unknown> = {}
    if (of_.qty       !== undefined) patch.quantity_target   = of_.qty
    if (of_.statut    !== undefined) patch.status            = uiToDb(of_.statut)
    if (of_.debutPlanif !== undefined) patch.start_date      = of_.debutPlanif
    if (of_.dateBesoin  !== undefined) patch.end_date        = of_.dateBesoin
    if (of_.ligne       !== undefined) patch.ligne           = of_.ligne || null
    if (of_.operateurPrep !== undefined) patch.operateur     = of_.operateurPrep || null
    if (of_.picking     !== undefined) patch.picking         = of_.picking

    const { data, error } = await supabase
      .from('production_orders')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select(`*, articles!article_id ( code, designation, unite_stock ), production_outputs ( product_batch_number )`)
      .single()
    if (error) throw error
    return data ? toOf(data) : null
  } catch (e) {
    console.error('[updateProductionOrder]', e)
    return null
  }
}

// ── Transition de statut ──────────────────────────────────────────────────────

export async function transitionProductionOrder(
  id: string,
  nextStatut: StatutOF,
): Promise<OrdreFabrication | null> {
  return updateProductionOrder(id, { statut: nextStatut })
}

// ── Valider picking ───────────────────────────────────────────────────────────

export async function validatePickingOrder(id: string): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('production_orders')
      .update({ picking: 'Valide' })
      .eq('id', id)
      .eq('organization_id', orgId)
    return !error
  } catch {
    return false
  }
}
