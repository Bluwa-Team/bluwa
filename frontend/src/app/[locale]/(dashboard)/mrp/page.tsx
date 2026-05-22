'use client'

import { useState, useMemo } from 'react'
import {
  MoreHorizontal, ArrowRight, Settings,
  Package, TrendingUp, AlertTriangle, Calculator,
  RotateCcw,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import { type ProduitMRP, calcMRP, MOCK_PRODUITS_MRP } from './_components/types'

const MRP_COLUMNS: ResizableColumn[] = [
  { id: 'produit',   defaultWidth: null               },
  { id: 'stockPF',  defaultWidth: 100, minWidth: 80  },
  { id: 'ofPlanif', defaultWidth: 110, minWidth: 80  },
  { id: 'cmdFerme', defaultWidth: 130, minWidth: 100 },
  { id: 'prevision',defaultWidth: 130, minWidth: 100 },
  { id: 'source',   defaultWidth: 170, minWidth: 130 },
  { id: 'stockSec', defaultWidth: 110, minWidth: 80  },
  { id: 'tailleLot',defaultWidth: 120, minWidth: 90  },
  { id: 'besoinNet',defaultWidth: 110, minWidth: 80  },
  { id: 'nbOP',     defaultWidth: 80,  minWidth: 60  },
  { id: 'action',   defaultWidth: 220, minWidth: 170 },
]
const PRODUIT_MIN = 200

function StatCard({
  label, value, sub, bgClass, iconBgClass, iconColorClass, icon: Icon,
}: {
  label: string; value: string; sub: string
  bgClass: string; iconBgClass: string; iconColorClass: string; icon: React.ElementType
}) {
  return (
    <div className={`rounded-2xl p-4 transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-lg cursor-default ${bgClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBgClass}`}>
            <Icon className={`size-[18px] ${iconColorClass}`} />
          </div>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <button className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
      <div className="bg-white dark:bg-background rounded-xl px-4 py-3 shadow-sm">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-tight">{sub}</p>
      </div>
    </div>
  )
}

function NumberInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      className="w-full h-7 px-2 text-sm rounded-md border bg-background font-mono text-right focus:outline-none focus:ring-1 focus:ring-ring"
    />
  )
}

export default function MrpPage() {
  const locale = useLocale()
  const [produits, setProduits] = useState<ProduitMRP[]>(MOCK_PRODUITS_MRP)

  function updateProduit(id: string, patch: Partial<ProduitMRP>) {
    setProduits((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const { widths, startResize, reset, isCustomized } = useResizableColumns('bluwa:cols:mrp', MRP_COLUMNS)
  const tableMinWidth = MRP_COLUMNS.reduce(
    (s, c) => s + (c.defaultWidth == null ? PRODUIT_MIN : (widths[c.id] ?? c.defaultWidth ?? 0)),
    0,
  )

  const computed = useMemo(() => produits.map((p) => ({ ...p, ...calcMRP(p) })), [produits])

  const stats = useMemo(() => {
    const avecOP = computed.filter((p) => p.besoinNet > 0)
    const totalBtl = avecOP.reduce((s, p) => s + p.nbOP * p.tailleLot, 0)
    const totalOP6mois = computed.reduce((s, p) => s + p.nbOP * 6, 0)
    const composants = 0
    return { pfAnalyses: produits.length, opALancer: avecOP.length, totalBtl, totalOP6mois, composants }
  }, [computed, produits.length])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MRP — Material Requirements Planning</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Stocks + Commandes + Prévisions → Ordres Planifiés (OP) sur 6 mois → conversion en OF par la production
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="PF analysés"
          value={String(stats.pfAnalyses)}
          sub="Saveurs Bissap Pourpre"
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900/50"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={Package}
        />
        <StatCard
          label="OP à lancer (M+0)"
          value={String(stats.opALancer)}
          sub={`${stats.opALancer} PF · ${formatNumber(stats.totalBtl, locale)} btl`}
          bgClass="bg-orange-50 dark:bg-orange-950/30"
          iconBgClass="bg-orange-100 dark:bg-orange-900/50"
          iconColorClass="text-orange-600 dark:text-orange-400"
          icon={ArrowRight}
        />
        <StatCard
          label="OP horizon 6 mois"
          value={String(stats.totalOP6mois)}
          sub="À convertir en OF par la production"
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900/50"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={TrendingUp}
        />
        <StatCard
          label="Composants à commander"
          value={String(stats.composants)}
          sub={`M+0 · ${formatNumber(stats.totalBtl, locale)} sur 6 mois`}
          bgClass="bg-red-50 dark:bg-red-950/30"
          iconBgClass="bg-red-100 dark:bg-red-900/50"
          iconColorClass="text-red-600 dark:text-red-400"
          icon={AlertTriangle}
        />
      </div>

      {/* MRP Section */}
      <div className="rounded-lg border bg-card">

        {/* Section header */}
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <span className="text-muted-foreground text-base">①</span>
              Demande PF → Ordres Planifiés (OP) — M+0
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Le MRP génère des OP. La conversion OP → OF est réalisée par le responsable production dans le module Ordres de Fabrication.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCustomized && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={reset}>
                <RotateCcw className="size-3.5" />
                Réinitialiser les colonnes
              </Button>
            )}
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <ArrowRight className="size-3.5" />
              Convertir en OF (Production)
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
            <colgroup>
              {MRP_COLUMNS.map((c) => (
                <col key={c.id} style={c.defaultWidth == null ? undefined : { width: widths[c.id] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Produit fini
                </th>
                <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Stock PF<ColumnResizer columnId="stockPF" onStart={startResize} />
                </th>
                <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  OF planif.<ColumnResizer columnId="ofPlanif" onStart={startResize} />
                </th>
                <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Cmd ferme<ColumnResizer columnId="cmdFerme" onStart={startResize} />
                </th>
                <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Prévision<ColumnResizer columnId="prevision" onStart={startResize} />
                </th>
                <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Source<ColumnResizer columnId="source" onStart={startResize} />
                </th>
                <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Stock séc.<ColumnResizer columnId="stockSec" onStart={startResize} />
                </th>
                <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Taille lot<ColumnResizer columnId="tailleLot" onStart={startResize} />
                </th>
                <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Besoin net<ColumnResizer columnId="besoinNet" onStart={startResize} />
                </th>
                <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Nb OP<ColumnResizer columnId="nbOP" onStart={startResize} />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {computed.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">

                  {/* Produit */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm truncate" title={p.designation}>{p.designation}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                  </td>

                  {/* Stock PF */}
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatNumber(p.stockPF, locale)}
                    <span className="text-muted-foreground text-xs ml-1">{p.unite}</span>
                  </td>

                  {/* OF planifié */}
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatNumber(p.ofPlanif, locale)}
                  </td>

                  {/* Cmd ferme — éditable */}
                  <td className="px-4 py-3">
                    <NumberInput
                      value={p.cmdFerme}
                      onChange={(v) => updateProduit(p.id, { cmdFerme: v })}
                    />
                  </td>

                  {/* Prévision — éditable */}
                  <td className="px-4 py-3">
                    <NumberInput
                      value={p.prevision}
                      onChange={(v) => updateProduit(p.id, { prevision: v })}
                    />
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3 overflow-hidden">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      p.source === 'Commandes fermes'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {p.source}
                    </span>
                  </td>

                  {/* Stock séc. — éditable */}
                  <td className="px-4 py-3">
                    <NumberInput
                      value={p.stockSec}
                      onChange={(v) => updateProduit(p.id, { stockSec: v })}
                    />
                  </td>

                  {/* Taille lot — éditable */}
                  <td className="px-4 py-3">
                    <NumberInput
                      value={p.tailleLot}
                      onChange={(v) => updateProduit(p.id, { tailleLot: Math.max(1, v) })}
                    />
                  </td>

                  {/* Besoin net — calculé */}
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    <span className={p.besoinNet > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                      {formatNumber(p.besoinNet, locale)}
                    </span>
                  </td>

                  {/* Nb OP */}
                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                    {p.nbOP > 0 ? p.nbOP : <span className="text-muted-foreground font-normal">0</span>}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        title="Paramètres du lot"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                      >
                        <Settings className="size-3.5" />
                      </button>
                      {p.besoinNet > 0 ? (
                        <button className="text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                          Convertir {p.nbOP} OP → OF · {formatNumber(p.nbOP * p.tailleLot, locale)} {p.unite}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pas de besoin</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t bg-muted/10 flex items-center gap-2">
          <Calculator className="size-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Formule : Besoin net = max(Cmd ferme, Prévision) − Stock PF + Stock séc. − OF planifié · NB OP = ⌈Besoin net / Taille lot⌉
          </p>
        </div>
      </div>
    </div>
  )
}
