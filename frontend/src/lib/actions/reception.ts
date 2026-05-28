'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  ReceptionHeader, ReceptionItem,
  StatutReception, QualiteStatut, TypeFournisseur,
} from '@/app/[locale]/(dashboard)/reception/_components/types'
import type { StatutQC } from '@/types/erp'

// ── Lecture des bons de réception ─────────────────────────────────────────────

export async function getGoodsReceipts(): Promise<{
  headers: ReceptionHeader[]
  items: ReceptionItem[]
}> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data: receipts, error: recErr } = await supabase
      .from('goods_receipts')
      .select(`
        id, receipt_number, received_at, delivery_note_number, status, purchase_order_id,
        purchase_orders!purchase_order_id (
          order_number,
          order_type,
          suppliers!supplier_id ( name, vendor_type )
        )
      `)
      .eq('organization_id', orgId)
      .order('received_at', { ascending: false })
    if (recErr) throw recErr
    if (!receipts?.length) return { headers: [], items: [] }

    const receiptIds = receipts.map((r) => r.id as string)

    const { data: receiptItems, error: itemsErr } = await supabase
      .from('goods_receipt_items')
      .select(`
        id, goods_receipt_id, quantity_received, batch_number, expiry_date,
        articles!article_id ( code, designation, unite_stock, pmp )
      `)
      .eq('organization_id', orgId)
      .in('goods_receipt_id', receiptIds)
    if (itemsErr) throw itemsErr

    const headers: ReceptionHeader[] = receipts.map((r) => {
      const po       = (r as any).purchase_orders
      const supplier = po?.suppliers
      const vType    = (supplier?.vendor_type ?? 'Formel') as string
      return {
        id:                 r.id as string,
        numero:             (r.receipt_number as string) || `REC-${(r.id as string).substring(0, 8)}`,
        date:               ((r.received_at as string) ?? '').split('T')[0],
        deliveryNoteNumber: (r.delivery_note_number as string | null) ?? null,
        numeroBon:          po?.order_number ?? null,
        fournisseur:        supplier?.name ?? '',
        typeFournisseur:    (vType === 'Informel' ? 'Informel' : 'Formel') as TypeFournisseur,
        statut:             r.status as StatutReception,
        qualiteStatut:      'NonJuge' as QualiteStatut,  // TODO: depuis quality_inspection_lots
      }
    })

    const items: ReceptionItem[] = (receiptItems ?? []).map((i) => {
      const art = (i as any).articles
      return {
        id:          i.id as string,
        headerId:    i.goods_receipt_id as string,
        article:     art?.designation ?? '',
        quantite:    Number(i.quantity_received) || 0,
        unite:       art?.unite_stock ?? '',
        lot:         (i.batch_number as string | null) ?? null,
        lotFourn:    null,
        dlc:         (i.expiry_date as string | null) ?? null,
        humidite:    null,
        codeBarres:  null,
        statutLot:   null,
      }
    })

    return { headers, items }
  } catch (e) {
    console.error('[getGoodsReceipts]', e)
    return { headers: [], items: [] }
  }
}

// ── Créer un bon de réception ─────────────────────────────────────────────────

export interface CreateGoodsReceiptItemInput {
  article: string
  quantite: number
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
): Promise<ReceptionHeader | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    // Résoudre purchase_order_id depuis le numéro de commande
    let purchaseOrderId: string | null = null
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

    // Résoudre factory_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('factory_id')
      .eq('organization_id', orgId)
      .maybeSingle()
    const factoryId = (profile as any)?.factory_id ?? null

    // Insérer le bon de réception
    const { data: receipt, error: recErr } = await supabase
      .from('goods_receipts')
      .insert({
        organization_id:      orgId,
        factory_id:           factoryId,
        purchase_order_id:    purchaseOrderId,
        delivery_note_number: headerData.deliveryNoteNumber,
        status:               headerData.statut,
        received_at:          headerData.date,
        receipt_number:       receiptNumber,
      })
      .select()
      .single()
    if (recErr) throw recErr

    // Créer les lignes si on a un BC lié
    if (newItems.length > 0 && purchaseOrderId) {
      const { data: poItems } = await supabase
        .from('purchase_order_items')
        .select('id, article_label, article_id, shelf_life_days')
        .eq('purchase_order_id', purchaseOrderId)

      for (let idx = 0; idx < newItems.length; idx++) {
        const item = newItems[idx]

        // Rapprocher la ligne BC par article_label
        const poItem = (poItems ?? []).find(
          (p) =>
            (p.article_label as string).toLowerCase().trim() ===
            item.article.toLowerCase().trim(),
        )
        if (!poItem || !(poItem as any).article_id) continue

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

        // Numéro de lot interne
        const abbr = item.article
          .substring(0, 3)
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
        const seqPad = receiptNumber.split('-').pop() ?? String(idx + 1).padStart(4, '0')
        const batchNumber = `LOT-${abbr}-${seqPad}${idx > 0 ? `-${idx + 1}` : ''}`

        await supabase.from('goods_receipt_items').insert({
          organization_id:        orgId,
          goods_receipt_id:       (receipt as any).id,
          purchase_order_item_id: poItem.id,
          article_id:             (poItem as any).article_id,
          quantity_received:      item.quantite,
          batch_number:           batchNumber,
          expiry_date:            dlcDate,
        })
      }
    }

    return {
      id:                 (receipt as any).id as string,
      numero:             receiptNumber,
      date:               headerData.date,
      deliveryNoteNumber: headerData.deliveryNoteNumber,
      numeroBon:          headerData.numeroBon,
      fournisseur:        headerData.fournisseur,
      typeFournisseur:    headerData.typeFournisseur,
      statut:             headerData.statut,
      qualiteStatut:      headerData.qualiteStatut,
    }
  } catch (e) {
    console.error('[createGoodsReceipt]', e)
    return null
  }
}
