'use server'

import { getSupabaseWithOrg } from './helpers'
import { getWeekStarts } from '@/lib/planning-utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DemandPlanLine {
  orderId:      string
  orderNumber:  string
  clientName:   string
  articleId:    string
  articleCode:  string
  articleLabel: string
  quantity:     number
  unite:        string
  deliveryDate: string
  weekStart:    string
  status:       string
}

export interface DemandPlanWeek {
  weekStart:    string
  totalUnits:   number
  orderCount:   number
  lines:        DemandPlanLine[]
}

// ── Lecture ───────────────────────────────────────────────────────────────────

export async function getDemandPlan(weeksCount = 6): Promise<DemandPlanWeek[]> {
  const { supabase, orgId, factoryId } = await getSupabaseWithOrg()
  const weeks = getWeekStarts(weeksCount)

  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + weeksCount * 7)

  let query = supabase
    .from('sales_order_items')
    .select(`
      id, quantity, article_id,
      sales_orders!sales_order_id(
        id, order_number, delivery_date, status,
        clients!client_id(nom)
      ),
      articles!article_id(code, designation, unite_stock)
    `)
    .eq('organization_id', orgId)
    .not('sales_orders', 'is', null)

  if (factoryId) query = query.eq('sales_orders.factory_id', factoryId)

  const { data: items } = await query

  // Filtrer par fenêtre de livraison
  const todayStr = today.toISOString().split('T')[0]
  const endStr   = endDate.toISOString().split('T')[0]

  const lines: DemandPlanLine[] = (items ?? [])
    .filter((item: any) => {
      const d = item.sales_orders?.delivery_date
      return d && d >= todayStr && d <= endStr
        && !['cancelled', 'delivered'].includes(item.sales_orders?.status)
    })
    .map((item: any) => {
      const order   = item.sales_orders
      const article = item.articles
      const delivery = order.delivery_date as string

      // Lundi de la semaine de livraison
      const d = new Date(delivery)
      const ws = new Date(d)
      ws.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      const weekStart = ws.toISOString().split('T')[0]

      return {
        orderId:      order.id,
        orderNumber:  order.order_number,
        clientName:   order.clients?.nom ?? '—',
        articleId:    item.article_id as string,
        articleCode:  article?.code ?? '—',
        articleLabel: article?.designation ?? '—',
        quantity:     Number(item.quantity),
        unite:        article?.unite_stock ?? 'u',
        deliveryDate: delivery,
        weekStart,
        status:       order.status,
      }
    })

  // Regrouper par semaine
  const weekMap: Record<string, DemandPlanLine[]> = {}
  weeks.forEach(w => { weekMap[w] = [] })
  lines.forEach(l => {
    if (weekMap[l.weekStart] !== undefined) weekMap[l.weekStart].push(l)
  })

  return weeks.map(w => ({
    weekStart:  w,
    totalUnits: weekMap[w].reduce((s, l) => s + l.quantity, 0),
    orderCount: new Set(weekMap[w].map(l => l.orderId)).size,
    lines:      weekMap[w].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate)),
  }))
}
