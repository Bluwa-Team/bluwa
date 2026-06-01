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

async function getWeeklyCapacity(supabase: any, factoryId: string | null): Promise<number> {
  if (!factoryId) return 0

  const { data } = await supabase
    .from('work_centers')
    .select('daily_capacity_hours, efficiency_pct')
    .eq('factory_id', factoryId)
    .eq('is_active', true)

  if (!data?.length) return 0

  // Capacité = Σ (heures/jour × 5j × efficacité%) — en heures-machine/semaine
  // On suppose que chaque produit prend en moyenne 0.01h de fabrication par unité
  // → convert heures-machine → unités produisibles
  const UNITS_PER_HOUR = 100  // hypothèse moyenne — à affiner par gamme produit

  return data.reduce((sum: number, wc: any) => {
    const dailyHours = Number(wc.daily_capacity_hours ?? 8)
    const efficiency = Number(wc.efficiency_pct ?? 100) / 100
    return sum + dailyHours * 5 * efficiency * UNITS_PER_HOUR
  }, 0)
}

// ── Calcul du plan d'approvisionnement ───────────────────────────────────────

export async function getSupplyPlan(weeksCount = 6): Promise<SupplyPlanSummary> {
  const { supabase, factoryId } = await getSupabaseWithOrg()
  const weeks = getWeekStarts(weeksCount)

  const [forecasts, demandWeeks, weeklyCapacity] = await Promise.all([
    getForecasts(weeksCount),
    getDemandPlan(weeksCount),
    getWeeklyCapacity(supabase, factoryId),
  ])

  // Index commandes fermes : articleCode → weekStart → quantité
  const ordersIndex: Record<string, Record<string, number>> = {}
  demandWeeks.forEach(dw => {
    dw.lines.forEach(l => {
      if (!ordersIndex[l.articleCode]) ordersIndex[l.articleCode] = {}
      ordersIndex[l.articleCode][dw.weekStart] =
        (ordersIndex[l.articleCode][dw.weekStart] ?? 0) + l.quantity
    })
  })

  // Capacité par article = capacité totale / nb articles (simplification sans gamme)
  const nbArticles = Math.max(forecasts.length, 1)
  const capacityPerArticle = weeklyCapacity > 0 ? Math.round(weeklyCapacity / nbArticles) : 0

  const lines: SupplyPlanLine[] = forecasts.map(f => ({
    articleId:    f.articleId,
    articleCode:  f.articleCode,
    articleLabel: f.articleLabel,
    unite:        f.unite,
    weeks: weeks.map(w => {
      const forecast       = f.weeks[w] ?? 0
      const confirmedOrders = ordersIndex[f.articleCode]?.[w] ?? 0
      const totalDemand    = Math.max(forecast, confirmedOrders)
      const capacity       = capacityPerArticle
      const coverage       = capacity > 0 ? Math.min(Math.round((totalDemand / capacity) * 100), 200) : 0
      const status: SupplyStatus =
        totalDemand === 0          ? 'ok' :
        coverage > 100             ? 'surcharge' :
        coverage > 85              ? 'tension' : 'ok'

      return { weekStart: w, forecast, confirmedOrders, totalDemand, capacity, coverage, status }
    }),
  }))

  // Semaines globales en tension / surcharge (au moins 1 article concerné)
  const tensionWeeks   = weeks.filter(w => lines.some(l => l.weeks.find(c => c.weekStart === w)?.status === 'tension'))
  const surchargeWeeks = weeks.filter(w => lines.some(l => l.weeks.find(c => c.weekStart === w)?.status === 'surcharge'))

  return { lines, weeks, weekCapacity: weeklyCapacity, tensionWeeks, surchargeWeeks }
}
