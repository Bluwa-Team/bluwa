'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  BonLivraison, BonLivraisonItem, StatutBL,
} from '@/app/[locale]/(dashboard)/logistique/_components/types'

type SC = Awaited<ReturnType<typeof getSupabaseWithOrg>>['supabase']

async function resolveFactoryId(supabase: SC, orgId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles').select('factory_id').eq('organization_id', orgId).maybeSingle()
  if ((profile as any)?.factory_id) return (profile as any).factory_id as string
  const { data: factory } = await supabase
    .from('factories').select('id').eq('organization_id', orgId).limit(1).maybeSingle()
  if ((factory as any)?.id) return (factory as any).id as string
  throw new Error('Aucune usine trouvée')
}

// ── Lecture des bons de livraison ─────────────────────────────────────────────

export async function getDeliveryNotes(): Promise<{
  bls:   BonLivraison[]
  items: BonLivraisonItem[]
}> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data: notes, error: notesErr } = await supabase
      .from('delivery_notes')
      .select(`
        id, delivery_number, delivery_date, status, carrier, tracking_ref,
        delivery_address, notes, client_id, sales_order_id,
        clients!client_id ( raison_sociale ),
        sales_orders!sales_order_id ( order_number )
      `)
      .eq('organization_id', orgId)
      .order('delivery_date', { ascending: false })
    if (notesErr) throw notesErr
    if (!notes?.length) return { bls: [], items: [] }

    const noteIds = notes.map((n) => n.id as string)

    const { data: noteItems, error: itemsErr } = await supabase
      .from('delivery_note_items')
      .select('*, articles!article_id(unite_stock)')
      .in('delivery_note_id', noteIds)
      .order('item_position')
    if (itemsErr) throw itemsErr

    const bls: BonLivraison[] = notes.map((n) => ({
      id:               n.id as string,
      numero:           n.delivery_number as string,
      salesOrderId:     (n.sales_order_id as string | null) ?? null,
      commandeNum:      ((n as any).sales_orders as any)?.order_number ?? null,
      client:           ((n as any).clients as any)?.raison_sociale ?? '',
      clientId:         n.client_id as string,
      date:             n.delivery_date as string,
      statut:           n.status as StatutBL,
      transporteur:     (n.carrier as string | null) ?? null,
      refSuivi:         (n.tracking_ref as string | null) ?? null,
      adresseLivraison: (n.delivery_address as string | null) ?? null,
      notes:            (n.notes as string | null) ?? null,
    }))

    const items: BonLivraisonItem[] = (noteItems ?? []).map((i) => ({
      id:                i.id as string,
      blId:              i.delivery_note_id as string,
      salesOrderItemId:  (i.sales_order_item_id as string | null) ?? null,
      articleId:         i.article_id as string,
      article:           i.article_label as string,
      itemPosition:      i.item_position as number,
      quantiteCommandee: Number(i.quantity_ordered),
      quantiteLivree:    Number(i.quantity_delivered),
      unite:             ((i as any).articles as any)?.unite_stock ?? '',
      lot:               (i.batch_number as string | null) ?? null,
    }))

    return { bls, items }
  } catch (e) {
    console.error('[getDeliveryNotes]', e)
    return { bls: [], items: [] }
  }
}

// ── Créer un bon de livraison depuis une commande ─────────────────────────────

export interface CreateDeliveryNoteInput {
  salesOrderId:    string
  deliveryDate:    string
  carrier:         string | null
  trackingRef:     string | null
  deliveryAddress: string | null
  notes:           string | null
}

export async function createDeliveryNote(
  input: CreateDeliveryNoteInput,
): Promise<BonLivraison | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const factoryId = await resolveFactoryId(supabase, orgId)

    // Récupérer la commande
    const { data: order } = await supabase
      .from('sales_orders')
      .select('*, clients!client_id(raison_sociale), sales_order_items(*, articles!article_id(unite_stock))')
      .eq('organization_id', orgId)
      .eq('id', input.salesOrderId)
      .single()
    if (!order) throw new Error('Commande introuvable')

    // Générer BL-YYYY-NNNN
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('delivery_notes')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .like('delivery_number', `BL-${year}-%`)
    const deliveryNumber = `BL-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { data: note, error: noteErr } = await supabase
      .from('delivery_notes')
      .insert({
        organization_id:  orgId,
        factory_id:       factoryId,
        client_id:        order.client_id,
        sales_order_id:   input.salesOrderId,
        delivery_number:  deliveryNumber,
        delivery_date:    input.deliveryDate,
        status:           'DRAFT',
        carrier:          input.carrier,
        tracking_ref:     input.trackingRef,
        delivery_address: input.deliveryAddress,
        notes:            input.notes,
      })
      .select()
      .single()
    if (noteErr) throw noteErr

    // Copier les lignes de la commande dans le BL
    const soItems = (order as any).sales_order_items as any[]
    if (soItems?.length) {
      await supabase.from('delivery_note_items').insert(
        soItems.map((item: any, idx: number) => ({
          organization_id:     orgId,
          delivery_note_id:    (note as any).id,
          sales_order_item_id: item.id,
          article_id:          item.article_id,
          article_label:       item.article_label,
          item_position:       idx + 1,
          quantity_ordered:    item.quantity,
          quantity_delivered:  item.quantity,
        })),
      )
    }

    return {
      id:               (note as any).id as string,
      numero:           deliveryNumber,
      salesOrderId:     input.salesOrderId,
      commandeNum:      order.order_number as string,
      client:           ((order as any).clients as any)?.raison_sociale ?? '',
      clientId:         order.client_id as string,
      date:             input.deliveryDate,
      statut:           'DRAFT',
      transporteur:     input.carrier,
      refSuivi:         input.trackingRef,
      adresseLivraison: input.deliveryAddress,
      notes:            input.notes,
    }
  } catch (e) {
    console.error('[createDeliveryNote]', e)
    return null
  }
}

// ── Mettre à jour le statut d'un BL ──────────────────────────────────────────

export async function updateDeliveryStatus(
  id:     string,
  statut: StatutBL,
): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('delivery_notes')
      .update({ status: statut, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
    if (error) throw error
    return true
  } catch (e) {
    console.error('[updateDeliveryStatus]', e)
    return false
  }
}
