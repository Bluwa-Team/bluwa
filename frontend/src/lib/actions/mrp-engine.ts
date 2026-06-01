'use server'

import { getSupabaseWithOrg } from './helpers'

const HORIZON_WEEKS    = 6
const DEFAULT_LEAD_TIME = 7  // jours si lead_time_days non configuré

// Statuts de commandes clients actifs (dans la fenêtre de demande)
const ACTIVE_SO_STATUSES = ['confirmed', 'in_progress', 'draft']
// Statuts BC fournisseurs encore ouverts (non encore réceptionnés)
const OPEN_PO_STATUSES   = ['DRAFT', 'CONFIRMED', 'SENT', 'PARTIALLY_RECEIVED']

export interface MrpEngineResult {
  runId:  string | null
  count:  number
  error?: string
}

// ── Helper date ───────────────────────────────────────────────────────────────

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ── Moteur MRP ────────────────────────────────────────────────────────────────

/**
 * Lance une passe MRP complète :
 *   1. Charge la demande brute (prévisions + commandes fermes)
 *   2. Déduit stocks disponibles + commandes fournisseurs en cours
 *   3. Explose les nomenclatures (BOM) pour calculer les besoins composants
 *   4. Génère des recommandations PRODUCE / BUY / EXPEDITE
 */
export async function runMrpEngine(): Promise<MrpEngineResult> {
  let runId: string | null = null

  const { supabase, orgId, factoryId } = await getSupabaseWithOrg()
  if (!factoryId) return { runId: null, count: 0, error: 'Aucune usine configurée' }

  try {
    // ── 1. Créer le run MRP ─────────────────────────────────────────────────
    const { data: run, error: runErr } = await supabase
      .from('mrp_runs')
      .insert({ organization_id: orgId, factory_id: factoryId, executed_by_system: false, status: 'RUNNING' })
      .select('id')
      .single()
    if (runErr || !run) throw runErr ?? new Error('Impossible de créer le MRP run')
    runId = run.id as string

    // ── 2. Charger toutes les données en parallèle ──────────────────────────
    const today   = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + HORIZON_WEEKS * 7)
    const endStr  = endDate.toISOString().split('T')[0]

    const [
      { data: articles },
      { data: stocks },
      { data: forecasts },
      { data: salesItems },
      { data: poItems },
      { data: bomHeaders },
    ] = await Promise.all([
      supabase
        .from('articles')
        .select('id, code, designation, type, unite_stock')
        .eq('organization_id', orgId)
        .eq('is_active', true),

      supabase
        .from('article_stocks')
        .select('article_id, quantity_available, lead_time_days')
        .eq('organization_id', orgId),

      supabase
        .from('forecasts')
        .select('article_id, week, quantity')
        .eq('organization_id', orgId)
        .gte('week', todayStr)
        .lte('week', endStr),

      supabase
        .from('sales_order_items')
        .select('article_id, quantity, sales_orders!sales_order_id(delivery_date, status)')
        .eq('organization_id', orgId)
        .not('sales_orders', 'is', null),

      supabase
        .from('purchase_order_items')
        .select('article_id, quantity, purchase_orders!purchase_order_id(status, expected_delivery_date)')
        .eq('organization_id', orgId)
        .not('purchase_orders', 'is', null),

      supabase
        .from('bom_headers')
        .select('article_id, batch_size, bom_items(component_id, quantity, scrap_pct)')
        .eq('organization_id', orgId)
        .eq('is_active', true),
    ])

    // ── 3. Construire les index ─────────────────────────────────────────────

    type ArticleInfo = { code: string; designation: string; type: string; unite: string }
    const articleMap = new Map<string, ArticleInfo>(
      (articles ?? []).map((a: any) => [a.id, { code: a.code, designation: a.designation, type: a.type, unite: a.unite_stock }])
    )

    type StockInfo = { available: number; leadTime: number }
    const stockMap = new Map<string, StockInfo>(
      (stocks ?? []).map((s: any) => [s.article_id, {
        available: Math.max(0, Number(s.quantity_available) || 0),
        leadTime:  Number(s.lead_time_days) || DEFAULT_LEAD_TIME,
      }])
    )

    // Demande prévisions : article_id → quantité totale sur l'horizon
    const forecastDemand = new Map<string, number>()
    for (const f of forecasts as any[] ?? []) {
      forecastDemand.set(f.article_id, (forecastDemand.get(f.article_id) ?? 0) + Number(f.quantity))
    }

    // Demande ferme (commandes clients) : article_id → quantité dans la fenêtre
    const orderDemand = new Map<string, number>()
    for (const item of salesItems as any[] ?? []) {
      const order = item.sales_orders
      if (!order || !ACTIVE_SO_STATUSES.includes(order.status)) continue
      const delivery = order.delivery_date as string
      if (!delivery || delivery < todayStr || delivery > endStr) continue
      orderDemand.set(item.article_id, (orderDemand.get(item.article_id) ?? 0) + Number(item.quantity))
    }

    // En-cours fournisseur : article_id → { qty commandée, date livraison attendue }
    type OnOrderInfo = { qty: number; deliveryDate: string | null }
    const onOrderMap = new Map<string, OnOrderInfo>()
    for (const item of poItems as any[] ?? []) {
      const po = item.purchase_orders
      if (!po || !OPEN_PO_STATUSES.includes(po.status)) continue
      const prev = onOrderMap.get(item.article_id) ?? { qty: 0, deliveryDate: null }
      onOrderMap.set(item.article_id, {
        qty:          prev.qty + Number(item.quantity),
        deliveryDate: po.expected_delivery_date ?? prev.deliveryDate,
      })
    }

    // Nomenclatures : article_id → { batchSize, composants }
    type BomComp = { componentId: string; qty: number; scrapPct: number }
    const bomMap = new Map<string, { batchSize: number; items: BomComp[] }>(
      (bomHeaders as any[] ?? []).map((b: any) => [b.article_id, {
        batchSize: Math.max(1, Number(b.batch_size) || 1),
        items: (b.bom_items ?? []).map((i: any) => ({
          componentId: i.component_id as string,
          qty:         Number(i.quantity) || 0,
          scrapPct:    Number(i.scrap_pct) || 0,
        })),
      }])
    )

    // ── 4. Calcul des besoins nets ──────────────────────────────────────────

    const requiredDate = endStr

    type Rec = {
      articleId:         string
      actionType:        'BUY' | 'PRODUCE' | 'EXPEDITE'
      suggestedQty:      number
      suggestedOrderDate: string
      requiredDate:      string
    }
    const recommendations: Rec[] = []

    // Besoins composants issus de l'explosion BOM
    const componentDemand = new Map<string, number>()

    // Explosion BOM récursive — descend tous les niveaux avec garde anti-cycle.
    // `ancestors` = set des articleId déjà traversés dans la branche courante.
    const explodeBom = (articleId: string, netQty: number, ancestors: Set<string>): void => {
      if (ancestors.has(articleId)) return
      const bom = bomMap.get(articleId)
      if (!bom) return
      const batches = Math.ceil(netQty / bom.batchSize)
      const nextAncestors = new Set(ancestors).add(articleId)
      for (const comp of bom.items) {
        const need = batches * comp.qty * (1 + comp.scrapPct / 100)
        componentDemand.set(comp.componentId, (componentDemand.get(comp.componentId) ?? 0) + need)
        explodeBom(comp.componentId, need, nextAncestors)
      }
    }

    // Passe 1 — Produits finis et semi-finis (PRODUCE)
    for (const article of articles as any[] ?? []) {
      if (!['PF', 'PSF'].includes(article.type)) continue

      const grossReq = Math.max(
        forecastDemand.get(article.id) ?? 0,
        orderDemand.get(article.id)    ?? 0,
      )
      if (grossReq <= 0) continue

      const stock   = stockMap.get(article.id)
      const avail   = stock?.available ?? 0
      const onOrder = onOrderMap.get(article.id)?.qty ?? 0
      const netReq  = Math.max(0, grossReq - avail - onOrder)
      if (netReq <= 0) continue

      const leadTime         = stock?.leadTime ?? DEFAULT_LEAD_TIME
      const suggestedOrderDate = offsetDate(requiredDate, -leadTime)

      recommendations.push({ articleId: article.id, actionType: 'PRODUCE', suggestedQty: Math.ceil(netReq), suggestedOrderDate, requiredDate })

      // Explosion BOM complète (tous niveaux)
      explodeBom(article.id, netReq, new Set())
    }

    // Passe 2 — Composants : MP, AC, CS (BUY) + PSF composants (PRODUCE récursif)
    const allComponentIds = new Set([
      ...componentDemand.keys(),
      // MP/AC/CS avec demande directe (prévisions ou commandes)
      ...(articles as any[] ?? [])
        .filter((a: any) => ['MP', 'AC', 'CS'].includes(a.type))
        .filter((a: any) => (forecastDemand.get(a.id) ?? 0) > 0 || (orderDemand.get(a.id) ?? 0) > 0)
        .map((a: any) => a.id),
    ])

    for (const componentId of allComponentIds) {
      const art = articleMap.get(componentId)
      if (!art) continue

      const bomNeed     = componentDemand.get(componentId) ?? 0
      const directNeed  = Math.max(forecastDemand.get(componentId) ?? 0, orderDemand.get(componentId) ?? 0)
      const grossReq    = Math.max(bomNeed, directNeed)
      if (grossReq <= 0) continue

      const stock    = stockMap.get(componentId)
      const avail    = stock?.available ?? 0
      const onOrderInfo = onOrderMap.get(componentId)
      const onOrder  = onOrderInfo?.qty ?? 0
      const netReq   = Math.max(0, grossReq - avail - onOrder)
      if (netReq <= 0) continue

      const leadTime = stock?.leadTime ?? DEFAULT_LEAD_TIME

      // EXPEDITE si BC existant mais livraison après la date requise
      if (onOrder > 0 && onOrderInfo?.deliveryDate && onOrderInfo.deliveryDate > requiredDate) {
        recommendations.push({
          articleId: componentId, actionType: 'EXPEDITE',
          suggestedQty: Math.ceil(netReq), suggestedOrderDate: todayStr, requiredDate,
        })
        continue
      }

      const actionType       = art.type === 'PSF' ? 'PRODUCE' : 'BUY'
      const suggestedOrderDate = offsetDate(requiredDate, -leadTime)
      recommendations.push({ articleId: componentId, actionType, suggestedQty: Math.ceil(netReq), suggestedOrderDate, requiredDate })
    }

    // ── 5. Insérer les recommandations ─────────────────────────────────────
    if (recommendations.length > 0) {
      const { error: recErr } = await supabase
        .from('mrp_recommendations')
        .insert(recommendations.map(r => ({
          organization_id:      orgId,
          factory_id:           factoryId,
          mrp_run_id:           runId,
          article_id:           r.articleId,
          action_type:          r.actionType,
          suggested_quantity:   r.suggestedQty,
          suggested_order_date: r.suggestedOrderDate,
          required_date:        r.requiredDate,
          status:               'NEW',
        })))
      if (recErr) throw recErr
    }

    // ── 6. Marquer le run SUCCESS + purge des anciennes recs NEW ───────────
    await supabase.from('mrp_runs').update({ status: 'SUCCESS' }).eq('id', runId)
    // Ne supprime que les recs des passes précédentes — pas celles du run courant
    await supabase
      .from('mrp_recommendations')
      .delete()
      .eq('organization_id', orgId)
      .eq('status', 'NEW')
      .neq('mrp_run_id', runId)

    return { runId, count: recommendations.length }

  } catch (e) {
    console.error('[mrp-engine]', e)
    if (runId) {
      await supabase.from('mrp_runs').update({ status: 'FAILED' }).eq('id', runId)
    }
    return { runId, count: 0, error: String(e) }
  }
}
