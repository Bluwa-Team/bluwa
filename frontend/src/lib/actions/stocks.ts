'use server'

import { getSupabaseWithOrg } from './helpers'
import type { LotStock, EtatLot, OrigineType, Mouvement, Lot, StatutLot, TypeMouvement } from '@/app/[locale]/(dashboard)/stocks/_components/types'
import type { ArticleType, StatutQC } from '@/types/erp'

// ── Mouvements de stock par article ──────────────────────────────────────────

function mvtType(t: string): TypeMouvement {
  if (t === 'CONSO_OF') return 'Sortie'
  if (t === 'INV_ADJ')  return 'Ajustement'
  return 'Entree'
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
      reference:          (m.source_document_id as string) ?? '',
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
      .from('goods_receipt_items')
      .select('id, batch_number, quantity_received, expiry_date, created_at')
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
        id:                row.id as string,
        lotCode:           (row.batch_number as string) ?? '',
        articleCode,
        articleDesignation: (art as any).designation ?? '',
        entrepot:          '',
        emplacement:       '',
        quantite:          Number(row.quantity_received) || 0,
        unite:             (art as any).unite_stock ?? '',
        dateReception:     ((row.created_at as string) ?? '').split('T')[0],
        datePeremption:    dlc,
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

export async function getLotStocks(): Promise<LotStock[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data, error } = await supabase
      .from('lots')
      .select(`
        id,
        batch_number,
        quantity_initial,
        quantity_remaining,
        statut_qc,
        expiry_date,
        created_at,
        goods_receipts!goods_receipt_id (
          receipt_number,
          received_at,
          purchase_orders!purchase_order_id (
            order_number,
            fournisseurs!fournisseur_id ( raison_sociale, statut )
          )
        ),
        articles!article_id ( code, designation, type, unite_stock, pmp, seuil_alerte_peremption )
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error

    const today = Date.now()

    return (data ?? []).map((row) => {
      const gr         = (row as any).goods_receipts
      const po         = gr?.purchase_orders
      const fournisseur = po?.fournisseurs
      const art        = (row as any).articles

      const pmp      = Number(art?.pmp) || 0
      const quantite = Number(row.quantity_remaining) || 0
      const dlc      = (row.expiry_date as string | null) ?? ''
      const dateEntree = ((gr?.received_at as string) ?? '').split('T')[0]
      const receivedTs = gr?.received_at ? new Date(gr.received_at).getTime() : 0
      const daysSinceEntry = receivedTs ? Math.floor((today - receivedTs) / 86_400_000) : 0

      let etat: EtatLot = 'Disponible'
      if (dlc) {
        const daysLeft = Math.floor((new Date(dlc).getTime() - today) / 86_400_000)
        if (daysLeft < 0) etat = 'Obsolete'
      }
      if (etat === 'Disponible' && daysSinceEntry >= 60) etat = 'Dormant'

      const rawQC = (row.statut_qc as string) ?? 'Libere'
      const statutQC: StatutQC = (rawQC === 'EnControle' || rawQC === 'Libere' || rawQC === 'Rejete')
        ? (rawQC as StatutQC)
        : 'Libere'

      return {
        id:                    row.id as string,
        numero:                (row.batch_number as string) || `XX-${new Date().toISOString().slice(0,10).replace(/-/g,'')}−${(row.id as string).substring(0, 4)}`,
        sku:                   art?.code ?? '',
        designation:           art?.designation ?? '',
        type:                  (art?.type ?? 'MP') as ArticleType,
        quantite,
        unite:                 art?.unite_stock ?? '',
        pmp,
        valeur:                Math.round(pmp * quantite),
        bcBa:                  po?.order_number ?? '',
        reception:             gr?.receipt_number ?? '',
        dateEntree,
        dlc,
        origine:               ((fournisseur?.statut ?? 'Formel') === 'Informel' ? 'Informel' : 'Formel') as OrigineType,
        statutQC,
        etat,
        seuilAlertePeremption: Number(art?.seuil_alerte_peremption) || 30,
      }
    })
  } catch (e) {
    console.error('[getLotStocks]', e)
    return []
  }
}
