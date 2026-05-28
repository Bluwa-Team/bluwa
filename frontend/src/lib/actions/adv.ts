'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  FactureClient, FactureClientItem, StatutFacture,
} from '@/app/[locale]/(dashboard)/adv/_components/types'

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

// ── Lecture des factures clients ──────────────────────────────────────────────

export async function getCustomerInvoices(): Promise<{
  factures: FactureClient[]
  items:    FactureClientItem[]
}> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data: invoices, error: invErr } = await supabase
      .from('customer_invoices')
      .select(`
        id, invoice_number, invoice_date, due_date, status, currency, tva_pct, notes,
        client_id, sales_order_id,
        clients!client_id ( raison_sociale ),
        sales_orders!sales_order_id ( order_number )
      `)
      .eq('organization_id', orgId)
      .order('invoice_date', { ascending: false })
    if (invErr) throw invErr
    if (!invoices?.length) return { factures: [], items: [] }

    const invoiceIds = invoices.map((i) => i.id as string)

    const { data: invItems, error: itemsErr } = await supabase
      .from('customer_invoice_items')
      .select('*, articles!article_id(unite_stock)')
      .in('customer_invoice_id', invoiceIds)
      .order('item_position')
    if (itemsErr) throw itemsErr

    // Calculer le montant HT par facture depuis les items
    const montantMap = new Map<string, number>()
    for (const i of invItems ?? []) {
      const invId = i.customer_invoice_id as string
      const ht    = Number(i.quantity) * Number(i.unit_price_ht) * (1 - Number(i.discount_pct) / 100)
      montantMap.set(invId, (montantMap.get(invId) ?? 0) + ht)
    }

    const factures: FactureClient[] = invoices.map((inv) => {
      const montantHT  = Math.round(montantMap.get(inv.id as string) ?? 0)
      const tvaPct     = Number(inv.tva_pct) || 18
      const montantTTC = Math.round(montantHT * (1 + tvaPct / 100))
      return {
        id:           inv.id as string,
        numero:       inv.invoice_number as string,
        salesOrderId: (inv.sales_order_id as string | null) ?? null,
        commandeNum:  ((inv as any).sales_orders as any)?.order_number ?? null,
        client:       ((inv as any).clients as any)?.raison_sociale ?? '',
        clientId:     inv.client_id as string,
        date:         inv.invoice_date as string,
        dateEcheance: inv.due_date as string,
        statut:       inv.status as StatutFacture,
        currency:     (inv.currency as string) ?? 'XOF',
        tvaPct,
        montantHT,
        montantTTC,
        notes:        (inv.notes as string | null) ?? null,
      }
    })

    const items: FactureClientItem[] = (invItems ?? []).map((i) => {
      const montantHT = Math.round(
        Number(i.quantity) * Number(i.unit_price_ht) * (1 - Number(i.discount_pct) / 100),
      )
      return {
        id:               i.id as string,
        factureId:        i.customer_invoice_id as string,
        salesOrderItemId: (i.sales_order_item_id as string | null) ?? null,
        articleId:        i.article_id as string,
        article:          i.article_label as string,
        itemPosition:     i.item_position as number,
        quantite:         Number(i.quantity),
        unite:            ((i as any).articles as any)?.unite_stock ?? '',
        puHT:             Number(i.unit_price_ht),
        remisePct:        Number(i.discount_pct) || 0,
        tvaPct:           Number(i.tva_pct) || 18,
        montantHT,
      }
    })

    return { factures, items }
  } catch (e) {
    console.error('[getCustomerInvoices]', e)
    return { factures: [], items: [] }
  }
}

// ── Créer une facture depuis une commande ─────────────────────────────────────

export async function createInvoiceFromOrder(salesOrderId: string): Promise<FactureClient | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const factoryId = await resolveFactoryId(supabase, orgId)

    // Récupérer la commande
    const { data: order } = await supabase
      .from('sales_orders')
      .select('*, clients!client_id(raison_sociale), sales_order_items(*)')
      .eq('organization_id', orgId)
      .eq('id', salesOrderId)
      .single()
    if (!order) throw new Error('Commande introuvable')

    // Générer FAC-YYYY-NNNN
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('customer_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .like('invoice_number', `FAC-${year}-%`)
    const invoiceNumber = `FAC-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const today      = new Date().toISOString().split('T')[0]
    const dueDate    = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const { data: invoice, error: invErr } = await supabase
      .from('customer_invoices')
      .insert({
        organization_id: orgId,
        factory_id:      factoryId,
        client_id:       order.client_id,
        sales_order_id:  salesOrderId,
        invoice_number:  invoiceNumber,
        invoice_date:    today,
        due_date:        dueDateStr,
        status:          'DRAFT',
        currency:        order.currency,
        tva_pct:         18,
      })
      .select()
      .single()
    if (invErr) throw invErr

    // Copier les lignes de la commande dans la facture
    const soItems = (order as any).sales_order_items as any[]
    if (soItems?.length) {
      await supabase.from('customer_invoice_items').insert(
        soItems.map((item: any, idx: number) => ({
          organization_id:      orgId,
          customer_invoice_id:  (invoice as any).id,
          sales_order_item_id:  item.id,
          article_id:           item.article_id,
          article_label:        item.article_label,
          item_position:        idx + 1,
          quantity:             item.quantity,
          unit_price_ht:        item.unit_price_ht,
          discount_pct:         item.discount_pct,
          tva_pct:              18,
        })),
      )
    }

    const montantHT = Math.round(
      soItems.reduce(
        (s: number, i: any) =>
          s + Number(i.quantity) * Number(i.unit_price_ht) * (1 - Number(i.discount_pct) / 100),
        0,
      ),
    )

    return {
      id:           (invoice as any).id as string,
      numero:       invoiceNumber,
      salesOrderId: salesOrderId,
      commandeNum:  order.order_number as string,
      client:       ((order as any).clients as any)?.raison_sociale ?? '',
      clientId:     order.client_id as string,
      date:         today,
      dateEcheance: dueDateStr,
      statut:       'DRAFT',
      currency:     (order.currency as string) ?? 'XOF',
      tvaPct:       18,
      montantHT,
      montantTTC:   Math.round(montantHT * 1.18),
      notes:        null,
    }
  } catch (e) {
    console.error('[createInvoiceFromOrder]', e)
    return null
  }
}

// ── Mettre à jour le statut d'une facture ─────────────────────────────────────

export async function updateInvoiceStatus(
  id:     string,
  statut: StatutFacture,
): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('customer_invoices')
      .update({ status: statut, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
    if (error) throw error
    return true
  } catch (e) {
    console.error('[updateInvoiceStatus]', e)
    return false
  }
}
