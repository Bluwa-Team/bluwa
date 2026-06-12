'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  CommandeClientHeader, CommandeClientItem, StatutCommande,
} from '@/app/[locale]/(dashboard)/ventes/_components/types'

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

// ── Lecture des commandes clients ─────────────────────────────────────────────

export async function getSalesOrders(params: {
  page?:     number
  pageSize?: number
  search?:   string
  statut?:   string
} = {}): Promise<{
  headers: CommandeClientHeader[]
  items:   CommandeClientItem[]
  total:   number
}> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { page = 0, pageSize = 50, search, statut } = params

    let q = supabase
      .from('sales_orders')
      .select('*, clients!client_id(raison_sociale)', { count: 'exact' })
      .eq('organization_id', orgId)

    if (statut && statut !== 'all') q = q.eq('status', statut)
    if (search && search.trim()) {
      const like = `%${search.trim()}%`
      const { data: cli } = await supabase
        .from('clients').select('id').eq('organization_id', orgId)
        .ilike('raison_sociale', like)
      const cliIds = (cli ?? []).map((c) => c.id as string)
      const parts = [`order_number.ilike.${like}`]
      if (cliIds.length > 0) parts.push(`client_id.in.(${cliIds.join(',')})`)
      q = q.or(parts.join(','))
    }

    const { data: orders, error: ordersErr, count } = await q
      .order('order_date', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1)
    if (ordersErr) throw ordersErr
    if (!orders?.length) return { headers: [], items: [], total: count ?? 0 }

    const orderIds = orders.map((o) => o.id as string)

    const { data: soItems, error: itemsErr } = await supabase
      .from('sales_order_items')
      .select('*, articles!article_id(code, unite_stock)')
      .in('sales_order_id', orderIds)
      .order('item_position')
    if (itemsErr) throw itemsErr

    const headers: CommandeClientHeader[] = orders.map((o) => ({
      id:                     o.id as string,
      numero:                 o.order_number as string,
      date:                   o.order_date as string,
      client:                 ((o as any).clients as any)?.raison_sociale ?? '',
      clientId:               o.client_id as string,
      currency:               (o.currency as string) ?? 'XOF',
      dateLivraisonSouhaitee: o.requested_delivery_date as string,
      statut:                 o.status as StatutCommande,
      notes:                  (o.notes as string | null) ?? null,
    }))

    const items: CommandeClientItem[] = (soItems ?? []).map((i) => ({
      id:           i.id as string,
      headerId:     i.sales_order_id as string,
      itemPosition: (i.item_position as number) ?? 1,
      article:      (i.article_label as string) ?? '',
      articleId:    (i.article_id as string) ?? '',
      quantite:     Number(i.quantity) || 0,
      unite:        ((i as any).articles as any)?.unite_stock ?? '',
      puHT:         Number(i.unit_price_ht) || 0,
      remisePct:    Number(i.discount_pct) || 0,
    }))

    return { headers, items, total: count ?? 0 }
  } catch (e) {
    console.error('[getSalesOrders]', e)
    return { headers: [], items: [], total: 0 }
  }
}

// ── Créer une commande client ─────────────────────────────────────────────────

export interface CreateSalesOrderInput {
  clientId:               string
  orderDate:              string
  requestedDeliveryDate:  string
  currency:               string
  notes:                  string | null
  items: Array<{
    articleId:    string
    articleLabel: string
    quantity:     number
    unitPriceHT:  number
    discountPct:  number
  }>
}

export async function createSalesOrder(
  input: CreateSalesOrderInput,
): Promise<CommandeClientHeader | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const factoryId = await resolveFactoryId(supabase, orgId)

    // Générer CO-YYYY-NNNN
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('sales_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .like('order_number', `CO-${year}-%`)
    const orderNumber = `CO-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { data: order, error: orderErr } = await supabase
      .from('sales_orders')
      .insert({
        organization_id:         orgId,
        factory_id:              factoryId,
        client_id:               input.clientId,
        order_number:            orderNumber,
        order_date:              input.orderDate,
        requested_delivery_date: input.requestedDeliveryDate,
        currency:                input.currency,
        status:                  'DRAFT',
        notes:                   input.notes,
      })
      .select('*, clients!client_id(raison_sociale)')
      .single()
    if (orderErr) throw orderErr

    if (input.items.length > 0) {
      const { error: itemsErr } = await supabase
        .from('sales_order_items')
        .insert(
          input.items.map((item, idx) => ({
            organization_id: orgId,
            sales_order_id:  (order as any).id,
            article_id:      item.articleId,
            article_label:   item.articleLabel,
            item_position:   idx + 1,
            quantity:        item.quantity,
            unit_price_ht:   item.unitPriceHT,
            discount_pct:    item.discountPct,
          })),
        )
      if (itemsErr) throw itemsErr
    }

    return {
      id:                     (order as any).id as string,
      numero:                 orderNumber,
      date:                   input.orderDate,
      client:                 ((order as any).clients as any)?.raison_sociale ?? '',
      clientId:               input.clientId,
      currency:               input.currency,
      dateLivraisonSouhaitee: input.requestedDeliveryDate,
      statut:                 'DRAFT',
      notes:                  input.notes,
    }
  } catch (e) {
    console.error('[createSalesOrder]', e)
    return null
  }
}

// ── Avancer le statut d'une commande ─────────────────────────────────────────

export async function updateSalesOrderStatus(
  id:     string,
  statut: StatutCommande,
): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('sales_orders')
      .update({ status: statut, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
    if (error) throw error
    return true
  } catch (e) {
    console.error('[updateSalesOrderStatus]', e)
    return false
  }
}
