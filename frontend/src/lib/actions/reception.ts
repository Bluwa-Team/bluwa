'use server'

import { getSupabaseWithOrg } from './helpers'
import { generateBatchNumber } from '@/lib/batch-number'
import type {
  ReceptionHeader, ReceptionItem,
  StatutReception, QualiteStatut, TypeFournisseur,
} from '@/app/[locale]/(dashboard)/reception/_components/types'
import type { DirectItemInput } from '@/app/[locale]/(dashboard)/reception/_components/reception-directe-modal'
import type { StatutQC } from '@/types/erp'

// ── Lecture des bons de réception ─────────────────────────────────────────────

export async function getGoodsReceipts(params: {
  page?:     number
  pageSize?: number
  search?:   string
  statut?:   string
} = {}): Promise<{
  headers: ReceptionHeader[]
  items:   ReceptionItem[]
  total:   number
}> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { page = 0, pageSize = 50, search, statut } = params

    let q = supabase
      .from('goods_receipts')
      .select(`
        id, receipt_number, received_at, delivery_note_number, status, purchase_order_id,
        fournisseur_nom, fournisseur_type,
        purchase_orders!purchase_order_id (
          order_number,
          order_type,
          fournisseurs!fournisseur_id ( raison_sociale, statut )
        )
      `, { count: 'exact' })
      .eq('organization_id', orgId)

    if (statut && statut !== 'all') q = q.eq('status', statut)
    if (search && search.trim()) {
      const like = `%${search.trim()}%`
      q = q.or(`receipt_number.ilike.${like},fournisseur_nom.ilike.${like}`)
    }

    const { data: receipts, error: recErr, count } = await q
      .order('received_at', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1)
    if (recErr) throw recErr
    if (!receipts?.length) return { headers: [], items: [], total: count ?? 0 }

    const receiptIds = receipts.map((r) => r.id as string)

    const { data: receiptItems, error: itemsErr } = await supabase
      .from('goods_receipt_items')
      .select(`
        id, goods_receipt_id, quantity_received, batch_number, supplier_batch_number, expiry_date, lot_status,
        articles ( code, designation, unite_stock, pmp )
      `)
      .eq('organization_id', orgId)
      .in('goods_receipt_id', receiptIds)
    if (itemsErr) throw itemsErr

    // Statut qualité agrégé par bon de réception : le statut le plus défavorable l'emporte
    // Priorité : Bloque = NonConforme > EnControle > Libere
    const qualitePriority: Record<string, number> = {
      Bloque: 3, NonConforme: 3, EnControle: 2, Libere: 1,
    }
    const qualiteByReceipt = new Map<string, QualiteStatut>()
    for (const item of receiptItems ?? []) {
      const receiptId = item.goods_receipt_id as string
      const lotStatut = (item.lot_status as string | null) ?? 'EnControle'
      // NonConforme remonte comme Bloqué au niveau de la réception
      const mapped: QualiteStatut = lotStatut === 'NonConforme' ? 'Bloque' : lotStatut as QualiteStatut
      const current = qualiteByReceipt.get(receiptId) ?? 'EnControle'
      if ((qualitePriority[lotStatut] ?? 0) > (qualitePriority[current] ?? 0)) {
        qualiteByReceipt.set(receiptId, mapped)
      }
    }

    const headers: ReceptionHeader[] = receipts.map((r) => {
      const po          = (r as any).purchase_orders
      const fournisseur = po?.fournisseurs
      const vType       = (fournisseur?.statut ?? (r as any).fournisseur_type ?? 'Formel') as string
      return {
        id:                 r.id as string,
        numero:             (r.receipt_number as string) || `REC-${(r.id as string).substring(0, 8)}`,
        date:               ((r.received_at as string) ?? '').split('T')[0],
        deliveryNoteNumber: (r.delivery_note_number as string | null) ?? null,
        numeroBon:          po?.order_number ?? null,
        fournisseur:        fournisseur?.raison_sociale ?? (r as any).fournisseur_nom ?? '',
        typeFournisseur:    (vType === 'Informel' ? 'Informel' : 'Formel') as TypeFournisseur,
        statut:             r.status as StatutReception,
        qualiteStatut:      qualiteByReceipt.get(r.id as string) ?? 'EnControle',
      }
    })

    const items: ReceptionItem[] = (receiptItems ?? []).map((i) => {
      const art = (i as any).articles
      const poi = (i as any).purchase_order_items
      return {
        id:          i.id as string,
        headerId:    i.goods_receipt_id as string,
        article:     art?.designation ?? '',
        quantite:    Number(i.quantity_received) || 0,
        unite:       art?.unite_stock ?? '',
        lot:         (i.batch_number as string | null) ?? null,
        lotFourn:    (i.supplier_batch_number as string | null) ?? null,
        dlc:         (i.expiry_date as string | null) ?? null,
        humidite:    null,
        codeBarres:  null,
        statutLot:   (i.lot_status as StatutQC | null) ?? null,
      }
    })

    return { headers, items, total: count ?? 0 }
  } catch (e) {
    console.error('[getGoodsReceipts]', e)
    return { headers: [], items: [], total: 0 }
  }
}

// ── Créer un bon de réception ─────────────────────────────────────────────────

export interface CreateGoodsReceiptItemInput {
  purchaseOrderItemId: string | null  // ID direct de la ligne BC — évite le matching par libellé
  article: string
  quantite: number         // en unité d'achat (ex: kg)
  coeffConversion: number  // facteur unite_achat → unite_stock (ex: 1000 pour kg→g)
  unite: string
  lotFourn: string | null
  dlc: string | null
  humidite: number | null
  codeBarres: string | null
  statutLot: StatutQC | null
}

export async function createGoodsReceipt(
  headerData: Omit<ReceptionHeader, 'id' | 'numero'>,
  newItems: CreateGoodsReceiptItemInput[],
  directItems: DirectItemInput[] = [],
): Promise<{ header: ReceptionHeader; error: null } | { header: null; error: string }> {
  try {
    const { supabase, orgId, factoryId } = await getSupabaseWithOrg()
    if (!factoryId) throw new Error('Aucun site (factory) trouvé pour cette organisation')

    // Résoudre purchase_order_id depuis le numéro de commande
    let purchaseOrderId: string | null = null
    let autoBaNumber: string | null = null
    if (headerData.numeroBon) {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('organization_id', orgId)
        .eq('order_number', headerData.numeroBon)
        .maybeSingle()
      purchaseOrderId = (po as any)?.id ?? null
    }

    // Générer REC-YYYY-NNNN
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('goods_receipts')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .like('receipt_number', `REC-${year}-%`)
    const receiptNumber = `REC-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`

    // Insérer le bon de réception en DRAFT — le trigger fn_validate_goods_receipt
    // n'écoute que les transitions UPDATE DRAFT→VALIDATED, pas les INSERT directs
    const { data: receipt, error: recErr } = await supabase
      .from('goods_receipts')
      .insert({
        organization_id:      orgId,
        factory_id:           factoryId,
        purchase_order_id:    purchaseOrderId,
        delivery_note_number: headerData.deliveryNoteNumber,
        fournisseur_nom:      headerData.fournisseur || null,
        fournisseur_type:     headerData.typeFournisseur ?? 'Formel',
        status:               'DRAFT',
        received_at:          headerData.date,
        receipt_number:       receiptNumber,
      })
      .select()
      .single()
    if (recErr) throw recErr

    // Créer les lignes si on a des items BC
    if (newItems.length > 0) {
      // Charger toutes les lignes BC en une seule requête (LEFT JOIN pour inclure article_id=null)
      const poItemIds = newItems
        .map((i) => i.purchaseOrderItemId)
        .filter((id): id is string => id !== null)

      const poItemMap = new Map<string, Record<string, unknown>>()
      if (poItemIds.length > 0) {
        const { data: poRows } = await supabase
          .from('purchase_order_items')
          .select('id, article_id, shelf_life_days, articles(type)')
          .in('id', poItemIds)
        for (const row of poRows ?? []) {
          poItemMap.set(row.id as string, row as Record<string, unknown>)
        }
      }

      const seqBase = parseInt(receiptNumber.split('-').pop() ?? '1', 10)
      for (let idx = 0; idx < newItems.length; idx++) {
        const item   = newItems[idx]
        if (!item.purchaseOrderItemId) continue
        const poItem = poItemMap.get(item.purchaseOrderItemId)
        if (!poItem) continue

        const articleId = poItem.article_id as string | null
        if (!articleId) continue   // impossible de créer un lot sans article_id

        // DLC : fournie ou calculée depuis shelf_life_days
        const dlcDate =
          item.dlc ||
          (poItem.shelf_life_days
            ? (() => {
                const d = new Date(headerData.date)
                d.setDate(d.getDate() + (poItem.shelf_life_days as number))
                return d.toISOString().split('T')[0]
              })()
            : null)

        const articleType = ((poItem.articles as { type?: string } | null)?.type) ?? 'MP'
        const batchNumber = generateBatchNumber(articleType, new Date(headerData.date), seqBase + idx)

        const { error: itemErr } = await supabase.from('goods_receipt_items').insert({
          organization_id:        orgId,
          goods_receipt_id:       (receipt as any).id,
          purchase_order_item_id: item.purchaseOrderItemId,
          article_id:             articleId,
          quantity_received:      item.quantite * item.coeffConversion,
          batch_number:           batchNumber,
          supplier_batch_number:  item.lotFourn ?? null,
          expiry_date:            dlcDate,
          humidity:               item.humidite ?? null,
          barcode:                item.codeBarres ?? null,
          lot_status:             item.statutLot ?? null,
        })
        if (itemErr) throw new Error(`Ligne BC item: ${itemErr.message}`)
      }
    }

    // Réception directe — auto-création d'un BA lié + items
    if (directItems.length > 0) {
      // 1. Générer un numéro BA
      const baYear = new Date().getFullYear()
      const { count: baCount } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .like('order_number', `BA-${baYear}-%`)
      autoBaNumber = `BA-${baYear}-${String((baCount ?? 0) + 1).padStart(3, '0')}`

      // 2. Créer le BA (fournisseur_id nullable pour fournisseurs non référencés)
      const { data: ba, error: baErr } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: orgId,
          factory_id:      factoryId,
          fournisseur_id:  null,
          fournisseur_nom: headerData.fournisseur || null,
          order_type:      'BA',
          order_number:    autoBaNumber,
          status:          'RECEIVED',
          currency:        'XOF',
        })
        .select()
        .single()
      if (baErr) throw new Error(`Création BA: ${baErr.message}`)
      purchaseOrderId = (ba as any).id

      // 3. Créer les lignes BA
      const { data: baItems, error: baItemsErr } = await supabase
        .from('purchase_order_items')
        .insert(
          directItems.map((item, idx) => ({
            organization_id:        orgId,
            purchase_order_id:      purchaseOrderId,
            article_id:             item.articleId,
            article_label:          item.article,
            item_position:          idx + 1,
            quantity:               item.quantite,
            unit_price_ht:          item.puHT,
            expected_delivery_date: headerData.date,
          })),
        )
        .select()
      if (baItemsErr) throw new Error(`Lignes BA: ${baItemsErr.message}`)

      // 4. Lier la réception au BA (maintenant qu'on a l'ID)
      await supabase
        .from('goods_receipts')
        .update({ purchase_order_id: purchaseOrderId })
        .eq('id', (receipt as any).id)

      // 5. Créer les goods_receipt_items liés aux lignes BA
      const seqBase = parseInt(receiptNumber.split('-').pop() ?? '1', 10)
      for (let idx = 0; idx < directItems.length; idx++) {
        const item    = directItems[idx]
        const baItem  = (baItems ?? [])[idx]
        const batchNumber = generateBatchNumber(item.articleType, new Date(headerData.date), seqBase + idx)
        const { error: dItemErr } = await supabase.from('goods_receipt_items').insert({
          organization_id:        orgId,
          goods_receipt_id:       (receipt as any).id,
          purchase_order_item_id: baItem?.id ?? null,
          article_id:             item.articleId,
          quantity_received:      item.quantite,
          batch_number:           batchNumber,
          supplier_batch_number:  item.lotFourn,
          expiry_date:            item.dlc,
          humidity:               item.humidite,
          barcode:                item.codeBarres,
          lot_status:             item.statutLot,
        })
        if (dItemErr) throw new Error(`Réception directe item: ${dItemErr.message}`)
      }
    }

    // Valider la réception : UPDATE DRAFT → VALIDATED déclenche fn_validate_goods_receipt
    // (crée les lots, les mouvements de stock, met à jour le PMP, auto-clôture le BC)
    if (headerData.statut === 'VALIDATED') {
      const { error: validateErr } = await supabase
        .from('goods_receipts')
        .update({ status: 'VALIDATED' })
        .eq('id', (receipt as any).id)
      if (validateErr) throw validateErr
    }

    return {
      header: {
        id:                 (receipt as any).id as string,
        numero:             receiptNumber,
        date:               headerData.date,
        deliveryNoteNumber: headerData.deliveryNoteNumber,
        numeroBon:          autoBaNumber ?? headerData.numeroBon,
        fournisseur:        headerData.fournisseur,
        typeFournisseur:    headerData.typeFournisseur,
        statut:             headerData.statut,
        qualiteStatut:      headerData.qualiteStatut,
      },
      error: null,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[createGoodsReceipt]', msg)
    return { header: null, error: msg }
  }
}
