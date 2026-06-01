'use client'

import { useEffect, useState } from 'react'
import { Factory, AlertTriangle, CheckCircle2, Loader2, CircleDot, TrendingUp, TrendingDown, ShoppingBag, BarChart3, Calculator, ArrowRight } from 'lucide-react'
import { getSupplyPlan, type SupplyPlanSummary, type SupplyPlanLine, type SupplyPlanWeekCell, type SupplyStatus } from '@/lib/actions/supply-plan'
import { weekLabel } from '@/lib/planning-utils'
import { runMrpEngine } from '@/lib/actions/mrp-engine'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

// ── Config statuts ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SupplyStatus, { label: string; bar: string; bg: string; text: string }> = {
  ok:        { label: 'OK',        bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30',  text: 'text-emerald-700 dark:text-emerald-300' },
  tension:   { label: 'Tension',   bar: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',      text: 'text-amber-700 dark:text-amber-300'     },
  surcharge: { label: 'Surcharge', bar: 'bg-red-500',     bg: 'bg-red-50 dark:bg-red-950/30',          text: 'text-red-700 dark:text-red-300'         },
}

// ── Modale détail cellule ─────────────────────────────────────────────────────

function CellDetailModal({
  selection,
  open,
  onOpenChange,
}: {
  selection: { line: SupplyPlanLine; cell: SupplyPlanWeekCell } | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!selection) return null
  const { line, cell } = selection
  const cfg = STATUS_CONFIG[cell.status]

  const forecastPct  = cell.totalDemand > 0 ? Math.round((cell.forecast / cell.totalDemand) * 100) : 0
  const ordersPct    = cell.totalDemand > 0 ? Math.round((cell.confirmedOrders / cell.totalDemand) * 100) : 0
  const isRetained   = cell.forecast >= cell.confirmedOrders  // lequel des deux est retenu

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${cfg.bg} ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.bar}`} />
              {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground">{weekLabel(cell.weekStart)}</span>
          </div>
          <DialogTitle className="truncate" title={line.articleLabel}>{line.articleLabel}</DialogTitle>
          <DialogDescription className="font-mono">{line.articleCode}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">

          {/* Décomposition de la demande */}
          <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Décomposition de la demande</p>

            {/* Prévisions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-3.5 text-blue-500 shrink-0" />
                <span className="text-sm text-muted-foreground">Prévisions</span>
                {isRetained && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                    retenu
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {cell.forecast.toLocaleString('fr-FR')}
                <span className="text-muted-foreground font-normal text-xs ml-1">{line.unite}</span>
              </span>
            </div>

            {/* Commandes fermes */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-3.5 text-violet-500 shrink-0" />
                <span className="text-sm text-muted-foreground">Commandes fermes</span>
                {!isRetained && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
                    retenu
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {cell.confirmedOrders.toLocaleString('fr-FR')}
                <span className="text-muted-foreground font-normal text-xs ml-1">{line.unite}</span>
              </span>
            </div>

            <div className="border-t pt-2.5 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Demande retenue</span>
              <span className="text-sm font-bold tabular-nums">
                {cell.totalDemand.toLocaleString('fr-FR')}
                <span className="text-muted-foreground font-normal text-xs ml-1">{line.unite}</span>
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              La demande retenue est le <strong>maximum</strong> entre prévisions et commandes fermes
              — pour ne jamais sous-estimer la charge.
            </p>
          </div>

          {/* Capacité et taux */}
          <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Capacité de production</p>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Factory className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Capacité allouée</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {cell.capacity > 0
                  ? <>{cell.capacity.toLocaleString('fr-FR')} <span className="text-muted-foreground font-normal text-xs">{line.unite}</span></>
                  : <span className="text-muted-foreground text-xs">Non configurée</span>}
              </span>
            </div>

            {/* Barre de progression */}
            {cell.capacity > 0 && (
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${cfg.bar}`}
                    style={{ width: `${Math.min(cell.coverage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Taux d'utilisation</span>
                  <span className={`text-sm font-bold tabular-nums ${cfg.text}`}>{cell.coverage}%</span>
                </div>
              </div>
            )}

            {/* Seuils */}
            {cell.capacity > 0 && (
              <div className="flex items-center gap-3 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-muted-foreground">OK &lt;85%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] text-muted-foreground">Tension 85–100%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[11px] text-muted-foreground">Surcharge &gt;100%</span>
                </div>
              </div>
            )}
          </div>

          {/* Alerte surcharge */}
          {cell.status === 'surcharge' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-3.5 py-3">
              <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">
                La demande dépasse la capacité.
                Envisagez des heures supplémentaires, une sous-traitance ou un décalage de livraison.
              </p>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupplyPlanningPage() {
  const router = useRouter()
  const [plan,      setPlan]      = useState<SupplyPlanSummary | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [mrpRunning, setMrpRunning] = useState(false)
  const [selection, setSelection] = useState<{ line: SupplyPlanLine; cell: SupplyPlanWeekCell } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    getSupplyPlan(6).then(data => { setPlan(data); setLoading(false) })
  }, [])

  async function handleLancerMrp() {
    setMrpRunning(true)
    await runMrpEngine()
    setMrpRunning(false)
    router.push('/mrp')
  }

  function openCell(line: SupplyPlanLine, cell: SupplyPlanWeekCell) {
    if (cell.totalDemand === 0) return
    setSelection({ line, cell })
    setModalOpen(true)
  }

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

      {/* Alerte surcharge + CTA MRP */}
      {!loading && plan && (tensions > 0 || surcharges > 0) && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {surcharges > 0 && (
                <><span className="font-semibold">{surcharges} semaine{surcharges > 1 ? 's' : ''} en surcharge</span> — la demande dépasse la capacité. </>
              )}
              {tensions > 0 && (
                <><span className="font-semibold">{tensions} semaine{tensions > 1 ? 's' : ''} en tension</span>. </>
              )}
              Lancez le MRP pour générer les recommandations d'achat et de production.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 h-8 gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white"
            onClick={handleLancerMrp}
            disabled={mrpRunning}
          >
            {mrpRunning
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Calculator className="size-3.5" />
            }
            {mrpRunning ? 'Calcul…' : 'Lancer le MRP'}
            {!mrpRunning && <ArrowRight className="size-3.5" />}
          </Button>
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

                  {/* Cellules — cliquables si demande > 0 */}
                  {line.weeks.map(cell => {
                    const cfg       = STATUS_CONFIG[cell.status]
                    const clickable = cell.totalDemand > 0
                    return (
                      <td key={cell.weekStart} className="px-2 py-2 text-center">
                        {!clickable ? (
                          <span className="text-muted-foreground/30 text-xs">—</span>
                        ) : (
                          <button
                            onClick={() => openCell(line, cell)}
                            title="Voir le détail"
                            className={`w-full rounded-lg p-2 transition-all hover:ring-2 hover:ring-offset-1 hover:ring-current/30 active:scale-95 ${cfg.bg}`}
                          >
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
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Légende + hint */}
          <div className="px-5 py-3 border-t bg-muted/10 flex items-center gap-4 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${v.bar}`} />
                <span className="text-xs text-muted-foreground">{v.label}</span>
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              Cliquez sur une cellule pour voir le détail du calcul
            </span>
          </div>
        </div>
      )}

      {/* Modale détail cellule */}
      <CellDetailModal
        selection={selection}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

    </div>
  )
}
