'use server'

import { getSupabaseWithOrg } from './helpers'
import type { LotStock, EtatLot, OrigineType, Mouvement, Lot, StatutLot, TypeMouvement } from '@/app/[locale]/(dashboard)/stocks/_components/types'
import type { ArticleType, StatutQC } from '@/types/erp'

// ── Entrée stock initiale (go-live) ──────────────────────────────────────────

export async function createInitStock(
  articleCode: string,
  lot: string,
  quantite: number,
  date: string,
  motif: string,
): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    // Résoudre article
    const { data: art } = await supabase
      .from('articles')
      .select('id, gestion_lot, pmp')
      .eq('organization_id', orgId)
      .eq('code', articleCode)
      .maybeSingle()
    if (!(art as any)?.id) throw new Error(`Article introuvable : ${articleCode}`)

    // Résoudre factory_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('factory_id')
      .eq('organization_id', orgId)
      .maybeSingle()
    const factoryId = (profile as any)?.factory_id
    if (!factoryId) throw new Error('Aucune usine trouvée')

    const articleId  = (art as any).id as string
    const pmp        = Number((art as any).pmp) || 0
    const batchNumber = lot || `INIT-${date.replace(/-/g, '')}-${articleCode}`

    // Journal mouvement — entrée initiale go-live traitée comme ajustement
    await supabase.from('stock_movements').insert({
      organization_id: orgId,
      factory_id:      factoryId,
      article_id:      articleId,
      movement_type:   'AJUSTEMENT_INVENTAIRE',
      quantity:        quantite,
      unit_price:      pmp,
      pmp_before:      pmp,
      pmp_after:       pmp,
      batch_number:    batchNumber,
      reference_type:  'manual',
      reference_id:    null,
    })

    // Lot (toujours Libere pour un stock initial)
    await supabase.from('lots').insert({
      organization_id:   orgId,
      factory_id:        factoryId,
      article_id:        articleId,
      batch_number:      batchNumber,
      quantity_initial:  quantite,
      quantity_remaining: quantite,
      statut_qc:         'Libere',
      goods_receipt_id:  null,
      expiry_date:       null,
    }).select().maybeSingle()

    // article_stocks
    await supabase.from('article_stocks').upsert({
      organization_id:   orgId,
      factory_id:        factoryId,
      article_id:        articleId,
      quantity_available: quantite,
      updated_at:        new Date().toISOString(),
    }, {
      onConflict: 'organization_id,factory_id,article_id',
      ignoreDuplicates: false,
    })

    return true
  } catch (e) {
    console.error('[createInitStock]', e)
    return false
  }
}

// ── Mouvements de stock par article ──────────────────────────────────────────

function mvtType(t: string): TypeMouvement {
  if (t === 'SORTIE_PRODUCTION' || t === 'SORTIE_VENTE' || t === 'RETOUR_FOURNISSEUR') return 'Sortie'
  if (t === 'AJUSTEMENT_INVENTAIRE') return 'Ajustement'
  return 'Entree' // ENTREE_RECEPTION
}

export async function getMouvementsByArticle(articleCode: string): Promise<Mouvement[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    // Résoudre article_id depuis le code
    const { data: art } = await supabase
      .from('articles')
      .select('id, designation, unite_stock')
      .eq('organization_id', orgId)
      .eq('code', articleCode)
      .maybeSingle()
    if (!(art as any)?.id) return []

    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('organization_id', orgId)
      .eq('article_id', (art as any).id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error

    return (data ?? []).map((m) => ({
      id:                 m.id as string,
      date:               ((m.created_at as string) ?? '').split('T')[0],
      type:               mvtType(m.movement_type as string),
      articleCode,
      articleDesignation: (art as any).designation ?? '',
      lot:                (m.batch_number as string) ?? '',
      quantite:           Number(m.quantity) || 0,
      unite:              (art as any).unite_stock ?? '',
      entrepotSource:     '',
      entrepotDest:       '',
      reference:          (m.reference_id as string | null) ?? '',
      motif:              (m.movement_type as string) ?? '',
      operateur:          '',
    }))
  } catch (e) {
    console.error('[getMouvementsByArticle]', e)
    return []
  }
}

// ── Lots par article ──────────────────────────────────────────────────────────

export async function getLotsByArticle(articleCode: string): Promise<Lot[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data: art } = await supabase
      .from('articles')
      .select('id, designation, unite_stock')
      .eq('organization_id', orgId)
      .eq('code', articleCode)
      .maybeSingle()
    if (!(art as any)?.id) return []

    const { data, error } = await supabase
      .from('lots')
      .select('id, batch_number, quantity_remaining, expiry_date, created_at')
      .eq('organization_id', orgId)
      .eq('article_id', (art as any).id)
      .not('batch_number', 'is', null)
      .order('expiry_date', { ascending: true, nullsFirst: false })
    if (error) throw error

    const today = Date.now()
    return (data ?? []).map((row) => {
      const dlc = (row.expiry_date as string | null) ?? null
      let joursRestants: number | null = null
      if (dlc) {
        joursRestants = Math.floor((new Date(dlc).getTime() - today) / 86_400_000)
      }
      let statut: StatutLot = 'OK'
      if (joursRestants !== null) {
        if (joursRestants < 0) statut = 'Expire'
        else if (joursRestants < 90) statut = 'ProcheExpiration'
      }
      return {
        id:                 row.id as string,
        lotCode:            (row.batch_number as string) ?? '',
        articleCode,
        articleDesignation: (art as any).designation ?? '',
        entrepot:           '',
        emplacement:        '',
        quantite:           Number(row.quantity_remaining) || 0,
        unite:              (art as any).unite_stock ?? '',
        dateReception:      ((row.created_at as string) ?? '').split('T')[0],
        datePeremption:     dlc,
        joursRestants,
        statut,
      }
    })
  } catch (e) {
    console.error('[getLotsByArticle]', e)
    return []
  }
}

// ── Lots de stock (MMBE) ──────────────────────────────────────────────────────
//
// Source : lots × goods_receipts × purchase_orders × fournisseurs × articles
// Une ligne = un lot traçable, tous statuts QC confondus (vue SAP MMBE).
// quantity_remaining = stock réel courant (decremented à chaque sortie/rejet).

function mapLotRow(row: Record<string, unknown>): LotStock {
  const gr          = (row as any).goods_receipts
  const po          = gr?.purchase_orders
  const fournisseur = po?.fournisseurs
  const art         = (row as any).articles
  const today       = Date.now()

  const pmp      = Number(art?.pmp) || 0
  const quantite = Number(row.quantity_remaining) || 0
  const dlc      = (row.expiry_date as string | null) ?? ''
  const dateEntree = ((gr?.received_at as string) ?? '').split('T')[0]
  const receivedTs = gr?.received_at ? new Date(gr.received_at as string).getTime() : 0

  // Coût unitaire propre au lot : prix de la ligne BC/BA dont le batch_number correspond
  const griList: any[] = Array.isArray(gr?.goods_receipt_items) ? gr.goods_receipt_items : []
  const gri = griList.find((i: any) => i.batch_number === row.batch_number) ?? null
  const unitCost = Number(gri?.purchase_order_items?.unit_price_ht) || pmp

  let etat: EtatLot = 'Disponible'
  if (dlc) {
    if (Math.floor((new Date(dlc).getTime() - today) / 86_400_000) < 0) etat = 'Obsolete'
  }
  if (etat === 'Disponible' && receivedTs && Math.floor((today - receivedTs) / 86_400_000) >= 60) etat = 'Dormant'

  const rawQC    = (row.statut_qc as string) ?? 'Libere'
  const statutQC: StatutQC = (rawQC === 'EnControle' || rawQC === 'Libere' || rawQC === 'Bloque')
    ? (rawQC as StatutQC) : 'Libere'

  return {
    id:                    row.id as string,
    numero:                (row.batch_number as string) || `XX-${new Date().toISOString().slice(0,10).replace(/-/g,'')}−${(row.id as string).substring(0, 4)}`,
    sku:                   art?.code ?? '',
    designation:           art?.designation ?? '',
    type:                  (art?.type ?? 'MP') as ArticleType,
    quantite,
    unite:                 art?.unite_stock ?? '',
    unitCost,
    valeur:                Math.round(unitCost * quantite),
    bcBa:                  po?.order_number ?? '',
    reception:             gr?.receipt_number ?? '',
    dateEntree,
    dlc,
    origine:               ((fournisseur?.statut ?? gr?.fournisseur_type ?? 'Formel') === 'Informel' ? 'Informel' : 'Formel') as OrigineType,
    statutQC,
    etat,
    seuilAlertePeremption: Number(art?.seuil_alerte_peremption) || 30,
  }
}

const LOT_SELECT = `
  id, batch_number, quantity_initial, quantity_remaining, statut_qc, expiry_date, created_at,
  goods_receipts!goods_receipt_id (
    receipt_number, received_at, fournisseur_type,
    goods_receipt_items ( batch_number, purchase_order_items!purchase_order_item_id ( unit_price_ht ) ),
    purchase_orders!purchase_order_id (
      order_number,
      fournisseurs!fournisseur_id ( raison_sociale, statut )
    )
  ),
  articles!article_id ( code, designation, type, unite_stock, pmp, seuil_alerte_peremption )
`

export async function getLotStocks(params: {
  page?:     number
  pageSize?: number
  search?:   string
  type?:     string
  qc?:       string
  etat?:     string
} = {}): Promise<{ lots: LotStock[]; total: number }> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { page = 0, pageSize = 50, search, type, qc, etat } = params

    let query = supabase
      .from('lots')
      .select(LOT_SELECT, { count: 'exact' })
      .eq('organization_id', orgId)

    // Filtre type article — pré-résoudre les IDs
    if (type && type !== 'all') {
      const { data: arts } = await supabase
        .from('articles').select('id')
        .eq('organization_id', orgId).eq('type', type)
      const ids = (arts ?? []).map((a) => a.id as string)
      if (ids.length === 0) return { lots: [], total: 0 }
      query = query.in('article_id', ids)
    }

    // Filtre statut QC (colonne directe)
    if (qc && qc !== 'all') query = query.eq('statut_qc', qc)

    // Filtre état — calculé depuis les dates
    const todayStr = new Date().toISOString().split('T')[0]
    const cutoff60 = new Date(Date.now() - 60 * 86_400_000).toISOString()
    if (etat === 'Obsolete') {
      query = query.not('expiry_date', 'is', null).lt('expiry_date', todayStr)
    } else if (etat === 'Dormant') {
      query = query.lt('created_at', cutoff60)
        .or(`expiry_date.is.null,expiry_date.gte.${todayStr}`)
    }

    // Recherche texte — pré-résoudre article IDs + goods_receipt IDs
    if (search && search.trim()) {
      const q = search.trim()
      const like = `%${q}%`

      const [{ data: arts }, { data: grs }, { data: pos }] = await Promise.all([
        supabase.from('articles').select('id').eq('organization_id', orgId)
          .or(`code.ilike.${like},designation.ilike.${like}`),
        supabase.from('goods_receipts').select('id').eq('organization_id', orgId)
          .ilike('receipt_number', like),
        supabase.from('purchase_orders').select('id').eq('organization_id', orgId)
          .ilike('order_number', like),
      ])

      const artIds = (arts ?? []).map((a) => a.id as string)
      const grIds  = (grs  ?? []).map((g) => g.id as string)
      const poIds  = (pos  ?? []).map((p) => p.id as string)

      if (poIds.length > 0) {
        const { data: poGrs } = await supabase
          .from('goods_receipts').select('id').eq('organization_id', orgId)
          .in('purchase_order_id', poIds)
        grIds.push(...(poGrs ?? []).map((g) => g.id as string))
      }

      const allGrIds = [...new Set(grIds)]
      const parts = [`batch_number.ilike.${like}`]
      if (artIds.length > 0) parts.push(`article_id.in.(${artIds.join(',')})`)
      if (allGrIds.length > 0) parts.push(`goods_receipt_id.in.(${allGrIds.join(',')})`)
      query = query.or(parts.join(','))
    }

    const from = page * pageSize
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw error

    return { lots: (data ?? []).map(mapLotRow), total: count ?? 0 }
  } catch (e) {
    console.error('[getLotStocks]', e)
    return { lots: [], total: 0 }
  }
}

// ── Statistiques agrégées (indépendant de la pagination) ─────────────────────

export async function getLotStocksStats(): Promise<{
  valeurTotale: number
  dormants:     number
  obsoletes:    number
  rotation:     number
  total:        number
}> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data } = await supabase
      .from('lots')
      .select('quantity_remaining, expiry_date, created_at, articles!article_id(pmp)')
      .eq('organization_id', orgId)

    const now    = Date.now()
    const cutoff = now - 60 * 86_400_000
    let valeurTotale = 0, dormants = 0, obsoletes = 0, actifs = 0
    const total = (data ?? []).length

    for (const row of data ?? []) {
      const pmp    = Number((row as any).articles?.pmp) || 0
      const qty    = Number(row.quantity_remaining) || 0
      const valeur = Math.round(pmp * qty)
      valeurTotale += valeur

      const dlcTs       = row.expiry_date ? new Date(row.expiry_date as string).getTime() : null
      const receivedTs  = row.created_at  ? new Date(row.created_at  as string).getTime() : 0

      if (dlcTs && dlcTs < now) {
        obsoletes += valeur
      } else if (receivedTs && receivedTs < cutoff) {
        dormants += valeur
      } else {
        actifs++
      }
    }

    return {
      valeurTotale,
      dormants,
      obsoletes,
      rotation: total > 0 ? Math.round((actifs / total) * 100) : 0,
      total,
    }
  } catch (e) {
    console.error('[getLotStocksStats]', e)
    return { valeurTotale: 0, dormants: 0, obsoletes: 0, rotation: 0, total: 0 }
  }
}
