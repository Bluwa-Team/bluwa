'use server'

import { getSupabaseWithOrg } from './helpers'
import { getForecasts } from './forecasts'
import { getWeekStarts } from '@/lib/planning-utils'
import { getDemandPlan } from './demand-plan'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SupplyStatus = 'ok' | 'tension' | 'surcharge'

export interface SupplyPlanWeekCell {
  weekStart:       string
  forecast:        number
  confirmedOrders: number
  totalDemand:     number
  capacity:        number
  coverage:        number    // % utilisation capacité
  status:          SupplyStatus
}

export interface SupplyPlanLine {
  articleId:    string
  articleCode:  string
  articleLabel: string
  unite:        string
  weeks:        SupplyPlanWeekCell[]
}

export interface SupplyPlanSummary {
  lines:          SupplyPlanLine[]
  weeks:          string[]
  weekCapacity:   number    // capacité hebdo totale de l'usine (toutes lignes confondues)
  tensionWeeks:   string[]  // semaines en tension
  surchargeWeeks: string[]  // semaines en surcharge
}

// ── Capacité hebdo de l'usine ─────────────────────────────────────────────────
// Somme des postes de charge actifs : capacity_per_day × daily_capacity_hours × 5 jours

// Capacité hebdo d'un poste de charge en heures-machine
function wcWeeklyHours(wc: { daily_capacity_hours: number; efficiency_pct: number }): number {
  return Number(wc.daily_capacity_hours ?? 8) * 5 * (Number(wc.efficiency_pct ?? 100) / 100)
}

/**
 * Retourne la capacité hebdomadaire par article (unités/semaine) calculée
 * depuis la gamme de fabrication (routing_steps + work_centers).
 *
 * Logique : pour chaque étape de la gamme, le débit max =
 *   heures_poste_semaine × (60 / run_time_minutes_per_unit)
 * La capacité de l'article = min des débits sur toutes les étapes
 * (goulot d'étranglement = étape la plus lente).
 *
 * Fallback si aucune gamme : capacité totale usine / nb articles sans gamme.
 */
async function getCapacityPerArticle(
  supabase: any,
  factoryId: string | null,
  articleIds: string[],
): Promise<{ byArticle: Map<string, number>; factoryTotal: number }> {
  const empty = { byArticle: new Map<string, number>(), factoryTotal: 0 }
  if (!factoryId || !articleIds.length) return empty

  const [wcRes, routingRes] = await Promise.all([
    supabase
      .from('work_centers')
      .select('id, daily_capacity_hours, efficiency_pct')
      .eq('factory_id', factoryId)
      .eq('is_active', true),

    supabase
      .from('routing_headers')
      .select(`
        article_id,
        routing_steps (
          run_time_minutes_per_unit,
          work_center_id
        )
      `)
      .in('article_id', articleIds)
      .eq('is_active', true),
  ])

  const wcs: Record<string, number> = {}  // wc_id → heures/semaine
  for (const wc of wcRes.data ?? []) {
    wcs[wc.id as string] = wcWeeklyHours(wc)
  }

  // Capacité totale usine (heures/semaine, tous postes confondus)
  const factoryTotal = Object.values(wcs).reduce((s, h) => s + h, 0)

  const byArticle = new Map<string, number>()

  for (const rh of routingRes.data ?? []) {
    const steps: Array<{ run_time_minutes_per_unit: number; work_center_id: string | null }> =
      rh.routing_steps ?? []

    if (!steps.length) continue

    // Débit par étape = heures_poste / (run_time_min / 60)
    const stepThroughputs = steps
      .filter(s => (s.run_time_minutes_per_unit ?? 0) > 0)
      .map(s => {
        const wcHours   = s.work_center_id ? (wcs[s.work_center_id] ?? factoryTotal) : factoryTotal
        const cycleHours = s.run_time_minutes_per_unit / 60
        return wcHours / cycleHours
      })

    if (!stepThroughputs.length) continue

    // Goulot = étape avec le débit minimum
    const bottleneck = Math.min(...stepThroughputs)
    byArticle.set(rh.article_id as string, Math.round(bottleneck))
  }

  return { byArticle, factoryTotal }
}

// ── Calcul du plan d'approvisionnement ───────────────────────────────────────

export async function getSupplyPlan(weeksCount = 6): Promise<SupplyPlanSummary> {
  const { supabase, factoryId } = await getSupabaseWithOrg()
  const weeks = getWeekStarts(weeksCount)

  const [forecasts, demandWeeks] = await Promise.all([
    getForecasts(weeksCount),
    getDemandPlan(weeksCount),
  ])

  const articleIds = forecasts.map(f => f.articleId)
  const { byArticle: capacityByArticle, factoryTotal } =
    await getCapacityPerArticle(supabase, factoryId, articleIds)

  // Articles sans gamme configurée → capacité 0 (affichée "Non configurée" dans la grille)
  const fallbackCapacity = 0

  // Index commandes fermes : articleId → weekStart → quantité
  const ordersIndex: Record<string, Record<string, number>> = {}
  demandWeeks.forEach(dw => {
    dw.lines.forEach(l => {
      if (!ordersIndex[l.articleId]) ordersIndex[l.articleId] = {}
      ordersIndex[l.articleId][dw.weekStart] =
        (ordersIndex[l.articleId][dw.weekStart] ?? 0) + l.quantity
    })
  })

  const lines: SupplyPlanLine[] = forecasts.map(f => {
    const capacity = capacityByArticle.get(f.articleId) ?? fallbackCapacity
    return {
      articleId:    f.articleId,
      articleCode:  f.articleCode,
      articleLabel: f.articleLabel,
      unite:        f.unite,
      weeks: weeks.map(w => {
        const forecast        = f.weeks[w] ?? 0
        const confirmedOrders = ordersIndex[f.articleId]?.[w] ?? 0
        const totalDemand     = Math.max(forecast, confirmedOrders)
        const coverage        = capacity > 0 ? Math.min(Math.round((totalDemand / capacity) * 100), 200) : 0
        const status: SupplyStatus =
          totalDemand === 0 ? 'ok' :
          coverage > 100    ? 'surcharge' :
          coverage > 85     ? 'tension' : 'ok'

        return { weekStart: w, forecast, confirmedOrders, totalDemand, capacity, coverage, status }
      }),
    }
  })

  // Semaines globales en tension / surcharge (au moins 1 article concerné)
  const tensionWeeks   = weeks.filter(w => lines.some(l => l.weeks.find(c => c.weekStart === w)?.status === 'tension'))
  const surchargeWeeks = weeks.filter(w => lines.some(l => l.weeks.find(c => c.weekStart === w)?.status === 'surcharge'))

  return { lines, weeks, weekCapacity: factoryTotal, tensionWeeks, surchargeWeeks }
}
