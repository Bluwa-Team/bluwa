'use client'

import { useEffect, useState } from 'react'
import { Factory, AlertTriangle, CheckCircle2, Loader2, CircleDot, TrendingUp } from 'lucide-react'
import { getSupplyPlan, type SupplyPlanSummary, type SupplyStatus } from '@/lib/actions/supply-plan'
import { weekLabel } from '@/lib/planning-utils'

const STATUS_CONFIG: Record<SupplyStatus, { label: string; bar: string; bg: string; text: string }> = {
  ok:       { label: 'OK',        bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30',   text: 'text-emerald-700 dark:text-emerald-300' },
  tension:  { label: 'Tension',   bar: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',       text: 'text-amber-700 dark:text-amber-300'     },
  surcharge:{ label: 'Surcharge', bar: 'bg-red-500',     bg: 'bg-red-50 dark:bg-red-950/30',           text: 'text-red-700 dark:text-red-300'         },
}

export default function SupplyPlanningPage() {
  const [plan,    setPlan]    = useState<SupplyPlanSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupplyPlan(6).then(data => { setPlan(data); setLoading(false) })
  }, [])

  const tensions   = plan?.tensionWeeks.length ?? 0
  const surcharges = plan?.surchargeWeeks.length ?? 0
  const nbArticles = plan?.lines.length ?? 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Supply Planning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calcul automatique — équilibre entre la demande (prévisions + commandes) et la capacité de production.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border shrink-0">
          <CircleDot className="size-3 text-emerald-500" />
          Calculé automatiquement
        </div>
      </div>

      {/* KPIs */}
      {!loading && plan && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Factory className="size-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Produits planifiés</span>
            </div>
            <p className="text-2xl font-bold">{nbArticles}</p>
          </div>
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="size-4 text-violet-500" />
              <span className="text-xs font-medium text-muted-foreground">Capacité / semaine</span>
            </div>
            <p className="text-2xl font-bold">
              {plan.weekCapacity > 0 ? plan.weekCapacity.toLocaleString('fr-FR') + ' u' : '—'}
            </p>
          </div>
          <div className={`rounded-xl p-4 ${tensions > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`size-4 ${tensions > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
              <span className="text-xs font-medium text-muted-foreground">Semaines en tension</span>
            </div>
            <p className={`text-2xl font-bold ${tensions > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{tensions}</p>
          </div>
          <div className={`rounded-xl p-4 ${surcharges > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`size-4 ${surcharges > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
              <span className="text-xs font-medium text-muted-foreground">Semaines en surcharge</span>
            </div>
            <p className={`text-2xl font-bold ${surcharges > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{surcharges}</p>
          </div>
        </div>
      )}

      {/* Alertes globales */}
      {!loading && plan && surcharges > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-4 py-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">
            <span className="font-semibold">{surcharges} semaine{surcharges > 1 ? 's' : ''} en surcharge</span> — la demande dépasse la capacité de production.
            Envisagez des heures supplémentaires, une sous-traitance ou un décalage de livraison.
          </p>
        </div>
      )}

      {/* Grille */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Calcul du plan en cours…</span>
        </div>
      ) : !plan || plan.lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Factory className="size-8 opacity-30" />
          <p className="text-sm font-medium">Aucune donnée de planification</p>
          <p className="text-xs">Saisissez des prévisions dans la page Prévisions pour démarrer.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="sticky left-0 z-10 bg-muted/30 text-left px-4 py-3 font-semibold text-xs tracking-wide min-w-[200px]">
                  Produit
                </th>
                {plan.weeks.map(w => (
                  <th key={w} className="text-center px-3 py-3 font-semibold text-xs tracking-wide min-w-[130px]">
                    <div className="text-muted-foreground">{weekLabel(w)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.lines.map((line, ri) => (
                <tr key={line.articleId} className={`border-b last:border-0 ${ri % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  {/* Article */}
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 border-r">
                    <p className="font-medium truncate max-w-[180px]" title={line.articleLabel}>
                      {line.articleLabel}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{line.articleCode}</p>
                  </td>

                  {/* Cellules semaine */}
                  {line.weeks.map(cell => {
                    const cfg = STATUS_CONFIG[cell.status]
                    return (
                      <td key={cell.weekStart} className="px-2 py-2 text-center">
                        {cell.totalDemand === 0 ? (
                          <span className="text-muted-foreground/30 text-xs">—</span>
                        ) : (
                          <div className={`rounded-lg p-2 ${cfg.bg}`}>
                            <p className={`text-xs font-bold tabular-nums ${cfg.text}`}>
                              {cell.totalDemand.toLocaleString('fr-FR')}
                              <span className="font-normal ml-0.5">{line.unite}</span>
                            </p>
                            {cell.capacity > 0 && (
                              <>
                                <div className="h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-1.5">
                                  <div
                                    className={`h-full rounded-full ${cfg.bar}`}
                                    style={{ width: `${Math.min(cell.coverage, 100)}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{cell.coverage}%</p>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Légende */}
          <div className="px-5 py-3 border-t bg-muted/10 flex items-center gap-4 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${v.bar}`} />
                <span className="text-xs text-muted-foreground">{v.label}</span>
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              % = utilisation de la capacité · Tension &gt;85% · Surcharge &gt;100%
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
