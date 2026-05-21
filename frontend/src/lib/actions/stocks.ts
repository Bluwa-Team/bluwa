'use server'

import { getSupabaseWithOrg } from './helpers'
import { StockLigne, Mouvement, Lot, StatutStock, TypeMouvement, StatutLot } from '@/app/[locale]/(dashboard)/stocks/_components/types'

function toStock(row: Record<string, unknown>): StockLigne {
  return {
    id: row.id as string,
    articleCode: row.article_code as string,
    articleDesignation: (row.article_designation as string) ?? '',
    articleType: (row.article_type as string) ?? '',
    entrepot: (row.entrepot_code as string) ?? '',
    emplacement: (row.emplacement as string) ?? '',
    lot: (row.lot as string) ?? '',
    datePeremption: (row.date_peremption as string) ?? null,
    quantite: (row.quantite as number) ?? 0,
    unite: (row.unite as string) ?? '',
    pmp: (row.pmp as number) ?? null,
    valeurStock: row.pmp && row.quantite ? (row.pmp as number) * (row.quantite as number) : null,
    stockSecurite: (row.stock_securite as number) ?? null,
    pointCommande: (row.point_commande as number) ?? null,
    statut: (row.statut as StatutStock) ?? 'OK',
  }
}

function toMouvement(row: Record<string, unknown>): Mouvement {
  return {
    id: row.id as string,
    date: ((row.date as string) ?? '').split('T')[0],
    type: row.type as TypeMouvement,
    articleCode: row.article_code as string,
    articleDesignation: (row.article_designation as string) ?? '',
    lot: (row.lot as string) ?? '',
    quantite: (row.quantite as number) ?? 0,
    unite: (row.unite as string) ?? '',
    entrepotSource: (row.entrepot_source as string) ?? '',
    entrepotDest: (row.entrepot_dest as string) ?? '',
    reference: (row.reference as string) ?? '',
    motif: (row.motif as string) ?? '',
    operateur: (row.operateur as string) ?? '',
  }
}

function toLot(row: Record<string, unknown>): Lot {
  const datePeremption = row.date_peremption as string | null
  let joursRestants: number | null = null
  if (datePeremption) {
    const diff = new Date(datePeremption).getTime() - Date.now()
    joursRestants = Math.floor(diff / (1000 * 60 * 60 * 24))
  }
  let statut: StatutLot = 'OK'
  if (joursRestants !== null) {
    if (joursRestants < 0) statut = 'Expire'
    else if (joursRestants < 90) statut = 'ProcheExpiration'
  }
  return {
    id: row.id as string,
    lotCode: (row.lot as string) ?? '',
    articleCode: row.article_code as string,
    articleDesignation: (row.article_designation as string) ?? '',
    entrepot: (row.entrepot_code as string) ?? '',
    emplacement: (row.emplacement as string) ?? '',
    quantite: (row.quantite as number) ?? 0,
    unite: (row.unite as string) ?? '',
    dateReception: ((row.created_at as string) ?? '').split('T')[0],
    datePeremption,
    joursRestants,
    statut,
  }
}

export async function getStocks(): Promise<StockLigne[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('organization_id', orgId)
      .order('article_code')
    if (error) throw error
    return (data ?? []).map(toStock)
  } catch (e) {
    console.error('[supabase action] error:', e)
    return []
  }
}

export async function getMouvements(): Promise<Mouvement[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('mouvements_stock')
      .select('*')
      .eq('organization_id', orgId)
      .order('date', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []).map(toMouvement)
  } catch (e) {
    console.error('[supabase action] error:', e)
    return []
  }
}

export async function getLots(): Promise<Lot[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('organization_id', orgId)
      .not('lot', 'is', null)
      .neq('lot', '')
      .order('date_peremption', { ascending: true, nullsFirst: false })
    if (error) throw error
    return (data ?? []).map(toLot)
  } catch (e) {
    console.error('[supabase action] error:', e)
    return []
  }
}

export async function getMouvementsByArticle(articleCode: string): Promise<Mouvement[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('mouvements_stock')
      .select('*')
      .eq('organization_id', orgId)
      .eq('article_code', articleCode)
      .order('date', { ascending: false })
    if (error) throw error
    return (data ?? []).map(toMouvement)
  } catch (e) {
    console.error('[supabase action] error:', e)
    return []
  }
}

export async function getLotsByArticle(articleCode: string): Promise<Lot[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('organization_id', orgId)
      .eq('article_code', articleCode)
      .not('lot', 'is', null)
      .neq('lot', '')
      .order('date_peremption', { ascending: true, nullsFirst: false })
    if (error) throw error
    return (data ?? []).map(toLot)
  } catch (e) {
    console.error('[supabase action] error:', e)
    return []
  }
}

export async function createMouvement(m: Partial<Mouvement>): Promise<Mouvement | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('mouvements_stock')
      .insert({
        organization_id: orgId,
        date: m.date ?? new Date().toISOString().split('T')[0],
        type: m.type,
        article_code: m.articleCode,
        article_designation: m.articleDesignation,
        lot: m.lot,
        quantite: m.quantite,
        unite: m.unite,
        entrepot_source: m.entrepotSource,
        entrepot_dest: m.entrepotDest,
        reference: m.reference,
        motif: m.motif,
        operateur: m.operateur,
      })
      .select()
      .single()
    if (error) throw error
    return data ? toMouvement(data) : null
  } catch (e) {
    console.error('[supabase action] error:', e)
    return null
  }
}
