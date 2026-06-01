'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, CalendarClock, CircleDot, Loader2, AlertTriangle, TrendingUp, Package, User, Hash } from 'lucide-react'
import { getDemandPlan, type DemandPlanWeek, type DemandPlanLine } from '@/lib/actions/demand-plan'
import { weekLabel } from '@/lib/planning-utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

// ── Statuts ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  confirmed:   { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', label: 'Confirmée'  },
  in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/40',       text: 'text-blue-700 dark:text-blue-300',       label: 'En cours'   },
  draft:       { bg: 'bg-amber-100 dark:bg-amber-900/40',     text: 'text-amber-700 dark:text-amber-300',     label: 'Brouillon'  },
}

// ── Modale détail commande ────────────────────────────────────────────────────

function OrderDetailModal({
  line,
  open,
  onOpenChange,
}: {
  line: DemandPlanLine | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!line) return null
  const s = STATUS_STYLE[line.status] ?? STATUS_STYLE.confirmed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {line.orderNumber}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
              {s.label}
            </span>
          </div>
          <DialogTitle>Détail de la commande</DialogTitle>
          <DialogDescription>
            Semaine de livraison · {weekLabel(line.weekStart)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">

          {/* Client */}
          <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-3.5 py-3">
            <User className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Client</p>
              <p className="text-sm font-medium">{line.clientName}</p>
            </div>
          </div>

          {/* Article */}
          <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-3.5 py-3">
            <Package className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Article</p>
              <p className="text-sm font-medium">{line.articleLabel}</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{line.articleCode}</p>
            </div>
          </div>

          {/* Quantité + Date livraison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-3.5 py-3">
              <Hash className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Quantité</p>
                <p className="text-sm font-semibold tabular-nums">
                  {line.quantity.toLocaleString('fr-FR')}
                  <span className="text-muted-foreground font-normal text-xs ml-1">{line.unite}</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-3.5 py-3">
              <CalendarClock className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Livraison</p>
                <p className="text-sm font-medium">
                  {new Date(line.deliveryDate).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long',
                  })}
                </p>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DemandePlanPage() {
  const [weeks,        setWeeks]        = useState<DemandPlanWeek[]>([])
  const [loading,      setLoading]      = useState(true)
  const [selectedLine, setSelectedLine] = useState<DemandPlanLine | null>(null)
  const [modalOpen,    setModalOpen]    = useState(false)

  useEffect(() => {
    getDemandPlan(6).then(data => { setWeeks(data); setLoading(false) })
  }, [])

  function openLine(line: DemandPlanLine) {
    setSelectedLine(line)
    setModalOpen(true)
  }

  const totalUnits  = weeks.reduce((s, w) => s + w.totalUnits, 0)
  const totalOrders = new Set(weeks.flatMap(w => w.lines.map(l => l.orderId))).size
  const hasUrgent   = weeks.slice(0, 2).some(w => w.lines.length > 0)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plan de demande</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Commandes fermes des clients organisées par semaine de livraison.
            Alimente le Supply Planning avec la demande confirmée.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border shrink-0">
          <CircleDot className="size-3 text-emerald-500" />
          Données réelles
        </div>
      </div>

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="size-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Commandes fermes</span>
            </div>
            <p className="text-2xl font-bold">{totalOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">6 semaines glissantes</p>
          </div>
          <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="size-4 text-teal-500" />
              <span className="text-xs font-medium text-muted-foreground">Unités à livrer</span>
            </div>
            <p className="text-2xl font-bold">{totalUnits.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-muted-foreground mt-1">Toutes références</p>
          </div>
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="size-4 text-violet-500" />
              <span className="text-xs font-medium text-muted-foreground">Horizon</span>
            </div>
            <p className="text-2xl font-bold">6 semaines</p>
          </div>
        </div>
      )}

      {/* Alerte S1-S2 */}
      {!loading && hasUrgent && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Des commandes sont planifiées dans les 2 prochaines semaines.
            Vérifiez le Supply Planning pour confirmer la capacité.
          </p>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Chargement des commandes…</span>
        </div>
      ) : totalOrders === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <ShoppingBag className="size-8 opacity-30" />
          <p className="text-sm font-medium">Aucune commande ferme sur les 6 prochaines semaines</p>
          <p className="text-xs">Créez des commandes clients dans le module Ventes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {weeks.map(w => (
            <div key={w.weekStart} className="rounded-xl border bg-card overflow-hidden">

              {/* En-tête semaine */}
              <div className={`flex items-center justify-between px-5 py-3 border-b ${w.lines.length > 0 ? 'bg-muted/30' : 'bg-muted/10'}`}>
                <div>
                  <p className="text-sm font-semibold">{weekLabel(w.weekStart)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Semaine du {new Date(w.weekStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {w.orderCount} commande{w.orderCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {w.totalUnits > 0
                      ? w.totalUnits.toLocaleString('fr-FR') + ' u'
                      : <span className="text-muted-foreground font-normal text-xs">Vide</span>}
                  </span>
                </div>
              </div>

              {/* Lignes — cliquables */}
              {w.lines.length === 0 ? (
                <div className="px-5 py-4 text-xs text-muted-foreground italic">
                  Aucune commande cette semaine
                </div>
              ) : (
                <div className="divide-y">
                  {w.lines.map(line => {
                    const s = STATUS_STYLE[line.status] ?? STATUS_STYLE.confirmed
                    return (
                      <button
                        key={`${line.orderId}-${line.articleCode}`}
                        onClick={() => openLine(line)}
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/10 active:bg-muted/20 transition-colors text-left cursor-pointer"
                      >
                        <p className="font-mono text-xs text-muted-foreground w-24 shrink-0">{line.orderNumber}</p>
                        <p className="text-sm font-medium flex-1 truncate">{line.clientName}</p>
                        <p className="text-sm text-muted-foreground flex-1 truncate">{line.articleLabel}</p>
                        <p className="text-sm font-semibold tabular-nums w-24 text-right">
                          {line.quantity.toLocaleString('fr-FR')} {line.unite}
                        </p>
                        <p className="text-xs text-muted-foreground w-24 text-right">
                          {new Date(line.deliveryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale détail commande */}
      <OrderDetailModal
        line={selectedLine}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

    </div>
  )
}
