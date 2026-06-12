'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  BCHeader, BCItem, StatutCommande, TypeCommande,
  ArticleStrategie, NiveauService,
} from '@/app/[locale]/(dashboard)/approvisionnement/_components/types'
import type {
  PurchaseRequisitionRow, StatutDA,
} from '@/app/[locale]/(dashboard)/mrp/_components/types'

type SC = Awaited<ReturnType<typeof getSupabaseWithOrg>>['supabase']

async function resolveFactoryId(supabase: SC, orgId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('factory_id')
    .eq('organization_id', orgId)
    .maybeSingle()
  if ((profile as any)?.factory_id) return (profile as any).factory_id as string
  const { data: factory } = await supabase
    .from('factories')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle()
  if ((factory as any)?.id) return (factory as any).id as string
  throw new Error('Aucune usine trouvée pour cette organisation')
}

// ── Commandes fournisseurs ────────────────────────────────────────────────────

export async function getPurchaseOrders(params: {
  page?:     number
  pageSize?: number
  search?:   string
  type?:     string
  statut?:   string
} = {}): Promise<{ headers: BCHeader[]; items: BCItem[]; total: number }> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { page = 0, pageSize = 50, search, type, statut } = params

    let q = supabase
      .from('purchase_orders')
      .select('*, fournisseur_nom, fournisseurs!fournisseur_id(raison_sociale, statut)', { count: 'exact' })
      .eq('organization_id', orgId)

    if (type   && type   !== 'all') q = q.eq('order_type', type)
    if (statut && statut !== 'all') q = q.eq('status',     statut)
    if (search && search.trim()) {
      const like = `%${search.trim()}%`
      q = q.ilike('order_number', like)
    }

    const { data: orders, error: ordersErr, count } = await q
      .order('created_at', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1)
    if (ordersErr) throw ordersErr
    if (!orders?.length) return { headers: [], items: [], total: count ?? 0 }

    const orderIds = orders.map((o) => o.id as string)

    const { data: poItems, error: itemsErr } = await supabase
      .from('purchase_order_items')
      .select('*, articles!article_id(type, gestion_lot, unite_stock, unite_achat, coeff_conversion, coeff_conversion_achat)')
      .in('purchase_order_id', orderIds)
      .order('item_position')
    if (itemsErr) throw itemsErr

    // Quantités reçues par ligne BC (cumul de tous les BRs)
    const poItemIds = (poItems ?? []).map((i) => i.id as string)
    const receivedMap = new Map<string, number>()
    if (poItemIds.length > 0) {
      const { data: receiptItems } = await supabase
        .from('goods_receipt_items')
        .select('purchase_order_item_id, quantity_received')
        .eq('organization_id', orgId)
        .in('purchase_order_item_id', poItemIds)
      for (const ri of receiptItems ?? []) {
        const k = ri.purchase_order_item_id as string
        receivedMap.set(k, (receivedMap.get(k) ?? 0) + Number(ri.quantity_received))
      }
    }

    // Récupérer les numéros de réception pour les commandes reçues
    const { data: receipts } = await supabase
      .from('goods_receipts')
      .select('purchase_order_id, receipt_number')
      .eq('organization_id', orgId)
      .in('purchase_order_id', orderIds)
      .eq('status', 'VALIDATED')
    const receiptMap = new Map<string, string>()
    for (const r of receipts ?? []) {
      if (r.purchase_order_id && r.receipt_number) {
        receiptMap.set(r.purchase_order_id as string, r.receipt_number as string)
      }
    }

    const headers: BCHeader[] = orders.map((o) => ({
      id:          o.id as string,
      numero:      o.order_number as string,
      type:        o.order_type as TypeCommande,
      date:        ((o.created_at as string) ?? '').split('T')[0],
      fournisseur: ((o as any).fournisseurs as any)?.raison_sociale ?? (o as any).fournisseur_nom ?? '',
      contrat:     (o.contract_number as string | null) ?? null,
      currency:    (o.currency as string) ?? 'XOF',
      reception:   receiptMap.get(o.id as string) ?? null,
      statut:      o.status as StatutCommande,
    }))

    const items: BCItem[] = (poItems ?? []).map((i) => {
      const art = (i as any).articles
      return {
        id:                    i.id as string,
        headerId:              i.purchase_order_id as string,
        itemPosition:          (i.item_position as number) ?? 1,
        articleId:             (i.article_id as string | null) ?? null,
        article:               (i.article_label as string) ?? '',
        quantite:              Number(i.quantity) || 0,
        quantiteRecue:         Math.round(
          ((receivedMap.get(i.id as string) ?? 0) / ((art?.coeff_conversion_achat as number) ?? 1)) * 1000
        ) / 1000,
        unite:                 (art?.unite_achat as string) || (art?.unite_stock as string) || '',
        puHT:                  Number(i.unit_price_ht) || 0,
        livraisonPrevue:       (i.expected_delivery_date as string) ?? '',
        dureeVie:              (i.shelf_life_days as number | null) ?? null,
        purchaseRequisitionId: (i.purchase_requisition_id as string | null) ?? null,
        gestionLot:            (art?.gestion_lot as boolean) ?? true,
        articleType:           (art?.type as string) ?? 'MP',
        coeffConversion:       (art?.coeff_conversion_achat as number) ?? 1,
      }
    })

    return { headers, items, total: count ?? 0 }
  } catch (e) {
    console.error('[getPurchaseOrders]', e)
    return { headers: [], items: [], total: 0 }
  }
}

// ── Demandes d'achat ──────────────────────────────────────────────────────────

export async function getPurchaseRequisitions(): Promise<PurchaseRequisitionRow[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data, error } = await supabase
      .from('purchase_requisitions')
      .select('*, articles!article_id(code, designation, unite_stock), factories!factory_id(name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error

    const ofIds = (data ?? [])
      .map((d) => d.source_production_order_id as string | null)
      .filter(Boolean) as string[]
    const poIds = (data ?? [])
      .map((d) => d.converted_to_order_id as string | null)
      .filter(Boolean) as string[]

    const ofMap = new Map<string, string>()
    if (ofIds.length) {
      const { data: ofs } = await supabase
        .from('production_orders')
        .select('id, order_number')
        .in('id', ofIds)
      for (const row of ofs ?? []) ofMap.set(row.id as string, row.order_number as string)
    }

    const poMap = new Map<string, string>()
    if (poIds.length) {
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, order_number')
        .in('id', poIds)
      for (const row of pos ?? []) poMap.set(row.id as string, row.order_number as string)
    }

    return (data ?? []).map((d) => {
      const art = (d as any).articles
      const fac = (d as any).factories
      const ofId = d.source_production_order_id as string | null
      const poId = d.converted_to_order_id as string | null
      return {
        id:                       d.id as string,
        organizationId:           d.organization_id as string,
        factoryId:                d.factory_id as string,
        articleId:                d.article_id as string,
        requisitionNumber:        d.requisition_number as string,
        quantityRequired:         Number(d.quantity_required),
        requestedDeliveryDate:    d.requested_delivery_date as string,
        status:                   d.status as StatutDA,
        sourceProductionOrderId:  ofId,
        convertedToOrderId:       poId,
        createdAt:                d.created_at as string,
        updatedAt:                d.updated_at as string,
        articleLabel:             art?.designation ?? '',
        articleSku:               art?.code ?? '',
        factoryName:              fac?.name ?? '',
        unitLabel:                art?.unite_stock ?? '',
        sourceOrderNumber:        ofId ? (ofMap.get(ofId) ?? null) : null,
        convertedOrderNumber:     poId ? (poMap.get(poId) ?? null) : null,
      }
    })
  } catch (e) {
    console.error('[getPurchaseRequisitions]', e)
    return []
  }
}

// ── Stratégie d'approvisionnement ─────────────────────────────────────────────

export async function getArticleStrategies(): Promise<ArticleStrategie[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data, error } = await supabase
      .from('article_stocks')
      .select('*, articles!article_id(code, designation, unite_stock)')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })
    if (error) throw error

    return (data ?? []).map((d) => {
      const art = (d as any).articles
      return {
        id:            d.id as string,
        sku:           art?.code ?? '',
        article:       art?.designation ?? '',
        unite:         art?.unite_stock ?? '',
        consoMoy:      0,       // TODO: calculer depuis stock_movements
        sigmaConso:    0,
        delaiMoy:      Number(d.lead_time_days) || 0,
        delaiMax:      Math.round((Number(d.lead_time_days) || 0) * 1.25),
        niveauService: '95' as NiveauService,
        stockActuel:   Number(d.quantity_available) || 0,
      }
    })
  } catch (e) {
    console.error('[getArticleStrategies]', e)
    return []
  }
}

// ── Créer une commande fournisseur ────────────────────────────────────────────

export interface CreatePurchaseOrderInput {
  type: TypeCommande
  date: string
  fournisseur: string
  contrat: string | null
  currency: string
  items: Array<{
    article: string
    articleId: string | null
    quantite: number
    puHT: number
    livraisonPrevue: string
    dureeVie: number | null
    purchaseRequisitionId: string | null
  }>
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
): Promise<BCHeader | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const factoryId = await resolveFactoryId(supabase, orgId)

    // Trouver le fournisseur par raison_sociale
    const { data: supplier, error: supErr } = await supabase
      .from('fournisseurs')
      .select('id')
      .eq('organization_id', orgId)
      .eq('raison_sociale', input.fournisseur)
      .maybeSingle()
    if (supErr) throw supErr
    if (!supplier) throw new Error(`Fournisseur introuvable : ${input.fournisseur}`)

    // Générer le prochain numéro (BC/BA-YYYY-NNN)
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('order_type', input.type)
      .like('order_number', `${input.type}-${year}-%`)
    const orderNumber = `${input.type}-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`

    // Insérer la commande
    const { data: order, error: orderErr } = await supabase
      .from('purchase_orders')
      .insert({
        organization_id: orgId,
        factory_id:      factoryId,
        fournisseur_id:  (supplier as any).id,
        order_number:    orderNumber,
        order_type:      input.type,
        contract_number: input.contrat,
        status:          'DRAFT',
        currency:        input.currency,
      })
      .select()
      .single()
    if (orderErr) throw orderErr

    // Insérer les lignes
    if (input.items.length > 0) {
      const { error: itemsErr } = await supabase
        .from('purchase_order_items')
        .insert(
          input.items.map((item, idx) => ({
            organization_id:         orgId,
            purchase_order_id:       (order as any).id,
            article_id:              item.articleId ?? null,
            article_label:           item.article,
            item_position:           idx + 1,
            quantity:                item.quantite,
            unit_price_ht:           item.puHT,
            shelf_life_days:         item.dureeVie ?? null,
            expected_delivery_date:  item.livraisonPrevue,
            purchase_requisition_id: item.purchaseRequisitionId ?? null,
          })),
        )
      if (itemsErr) throw itemsErr
    }

    return {
      id:          (order as any).id as string,
      numero:      orderNumber,
      type:        input.type,
      date:        input.date,
      fournisseur: input.fournisseur,
      contrat:     input.contrat,
      currency:    input.currency,
      reception:   null,
      statut:      'DRAFT',
    }
  } catch (e) {
    console.error('[createPurchaseOrder]', e)
    return null
  }
}

// ── Changer le statut d'une commande ─────────────────────────────────────────

export async function updatePurchaseOrderStatus(
  orderId: string,
  newStatus: string,
): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('organization_id', orgId)
    if (error) throw error
    return true
  } catch (e) {
    console.error('[updatePurchaseOrderStatus]', e)
    return false
  }
}

// ── Convertir une DA en commande fournisseur ──────────────────────────────────

export async function convertRequisition(
  requisitionId: string,
  orderId: string,
): Promise<boolean> {
  try {
    const { supabase } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({ status: 'CONVERTED', converted_to_order_id: orderId })
      .eq('id', requisitionId)
    if (error) throw error
    return true
  } catch (e) {
    console.error('[convertRequisition]', e)
    return false
  }
}

// ── Contrats cadre (conservé) ─────────────────────────────────────────────────

export async function getContratActifByFournisseur(
  supplierId: string,
): Promise<{ reference: string } | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('contrats_achat')
      .select('reference')
      .eq('organization_id', orgId)
      .eq('fournisseur_id', supplierId)
      .eq('statut', 'Actif')
      .lte('date_debut', today)
      .gte('date_fin', today)
      .order('date_debut', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ?? null
  } catch {
    return null
  }
}
