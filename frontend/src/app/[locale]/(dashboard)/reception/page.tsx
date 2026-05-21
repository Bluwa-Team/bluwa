'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Printer, FileText, Leaf, Barcode,
  Check, AlertTriangle, Clock, RotateCcw, CheckCheck,
  MoreHorizontal, Package, CheckCircle2,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  Reception, STATUT_RECEPTION_COLORS, STATUT_RECEPTION_LABELS, MOCK_RECEPTIONS,
} from './_components/types'

const STATUT_ICONS: Record<string, React.ReactNode> = {
  Conforme: <Check className="size-3" />,
  Reserve: <AlertTriangle className="size-3" />,
  Attente: <Clock className="size-3" />,
}

// `article` flexes to fill remaining space; every other column has a fixed
// width and can be resized by dragging its right edge.
const RECEPTION_COLUMNS: ResizableColumn[] = [
  { id: 'numero', defaultWidth: 120, minWidth: 90 },
  { id: 'fournisseur', defaultWidth: 190, minWidth: 120 },
  { id: 'type', defaultWidth: 100, minWidth: 80 },
  { id: 'article', defaultWidth: null },
  { id: 'quantite', defaultWidth: 100, minWidth: 72 },
  { id: 'lot', defaultWidth: 140, minWidth: 100 },
  { id: 'bon', defaultWidth: 120, minWidth: 90 },
  { id: 'codeBarres', defaultWidth: 168, minWidth: 110 },
  { id: 'date', defaultWidth: 110, minWidth: 90 },
  { id: 'statut', defaultWidth: 122, minWidth: 96 },
  { id: 'action', defaultWidth: 80, minWidth: 64 },
]
const ARTICLE_MIN = 180

function StatCard({
  label, value, sub, trend, trendVariant = 'neutral', bgClass, iconBgClass, iconColorClass, icon: Icon,
}: {
  label: string
  value: number
  sub: string
  trend?: string
  trendVariant?: 'up' | 'down' | 'neutral'
  bgClass: string
  iconBgClass: string
  iconColorClass: string
  icon: React.ElementType
}) {
  const trendColor = { up: 'text-emerald-600', down: 'text-orange-500', neutral: 'text-muted-foreground' }[trendVariant]
  const trendArrow = { up: '↑', down: '↓', neutral: '—' }[trendVariant]

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-lg cursor-default ${bgClass}`}
    >
      {/* Header */}
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

      {/* Value panel */}
      <div className="bg-white dark:bg-background rounded-xl px-4 py-3 shadow-sm">
        <p className="text-3xl font-bold">{value}</p>
        <div className="flex items-end justify-between mt-1 gap-2">
          <p className="text-xs text-muted-foreground leading-tight">{sub}</p>
          {trend && (
            <span className={`text-xs font-semibold shrink-0 flex items-center gap-0.5 ${trendColor}`}>
              {trendArrow} {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReceptionPage() {
  const locale = useLocale()
  const [receptions] = useState<Reception[]>(MOCK_RECEPTIONS)

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:reception',
    RECEPTION_COLUMNS,
  )
  const tableMinWidth = RECEPTION_COLUMNS.reduce(
    (sum, c) => sum + (c.defaultWidth == null ? ARTICLE_MIN : (widths[c.id] ?? c.defaultWidth)),
    0,
  )

  const stats = useMemo(() => ({
    enCours: receptions.filter((r) => !r.cloturee).length,
    archivees: receptions.filter((r) => r.cloturee).length,
    conformes: receptions.filter((r) => r.statut === 'Conforme').length,
    avecReserve: receptions.filter((r) => r.statut === 'Reserve').length,
    codesScannes: receptions.filter((r) => r.codeBarres !== null).length,
  }), [receptions])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Réceptions fournisseurs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            BA formels &amp; informels · Photos marchandises · Scan code-barres / DataMatrix
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Nouvelle réception
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="En cours"
          value={stats.enCours}
          sub="Réceptions non clôturées"
          trend={`${stats.archivees} archivée(s)`}
          trendVariant="neutral"
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900/50"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={Package}
        />
        <StatCard
          label="Conformes"
          value={stats.conformes}
          sub="Libres pour atelier"
          trend="OK"
          trendVariant="up"
          bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/50"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          icon={CheckCircle2}
        />
        <StatCard
          label="Avec réserve"
          value={stats.avecReserve}
          sub="Litige / écart qualité"
          trend={stats.avecReserve > 0 ? 'Litige' : 'Aucun'}
          trendVariant={stats.avecReserve > 0 ? 'down' : 'neutral'}
          bgClass="bg-orange-50 dark:bg-orange-950/30"
          iconBgClass="bg-orange-100 dark:bg-orange-900/50"
          iconColorClass="text-orange-600 dark:text-orange-400"
          icon={AlertTriangle}
        />
        <StatCard
          label="Codes scannés"
          value={stats.codesScannes}
          sub="Traçabilité GS1"
          trend="GS1"
          trendVariant="up"
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900/50"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={Barcode}
        />
      </div>

      {/* Reset columns */}
      {isCustomized && (
        <div className="flex justify-end -mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={reset}
          >
            <RotateCcw className="size-3.5" />
            Réinitialiser les colonnes
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
          <colgroup>
            {RECEPTION_COLUMNS.map((c) => (
              <col
                key={c.id}
                style={c.defaultWidth == null ? undefined : { width: widths[c.id] }}
              />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                N°
                <ColumnResizer columnId="numero" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Fournisseur
                <ColumnResizer columnId="fournisseur" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Type
                <ColumnResizer columnId="type" onStart={startResize} />
              </th>
              <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Article</th>
              <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                Qté
                <ColumnResizer columnId="quantite" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Lot
                <ColumnResizer columnId="lot" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Bon
                <ColumnResizer columnId="bon" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Code-barres
                <ColumnResizer columnId="codeBarres" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Date
                <ColumnResizer columnId="date" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Statut
                <ColumnResizer columnId="statut" onStart={startResize} />
              </th>
              <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {receptions.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">

                {/* N° */}
                <td className="px-4 py-3 font-mono text-xs font-medium truncate">
                  {r.numero}
                </td>

                {/* Fournisseur */}
                <td className="px-4 py-3 text-sm font-medium truncate" title={r.fournisseur}>
                  {r.fournisseur}
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    {r.typeFournisseur === 'Formel'
                      ? <FileText className="size-3.5 shrink-0 text-slate-500" />
                      : <Leaf className="size-3.5 shrink-0 text-emerald-500" />}
                    {r.typeFournisseur}
                  </span>
                </td>

                {/* Article */}
                <td className="px-4 py-3 text-sm truncate" title={r.article}>
                  {r.article}
                </td>

                {/* Qté */}
                <td className="px-4 py-3 text-right text-sm font-mono truncate">
                  {formatNumber(r.quantite, locale)}{' '}
                  <span className="text-muted-foreground text-xs">{r.unite}</span>
                </td>

                {/* Lot */}
                <td className="px-4 py-3 font-mono text-xs truncate">
                  {r.lot ?? <span className="text-muted-foreground">N/A</span>}
                </td>

                {/* Bon */}
                <td className="px-4 py-3 font-mono text-xs truncate">
                  {r.numeroBon ?? <span className="text-muted-foreground">N/A</span>}
                </td>

                {/* Code-barres */}
                <td className="px-4 py-3 truncate">
                  {r.codeBarres ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono">
                      <Barcode className="size-3.5 shrink-0 text-muted-foreground" />
                      {r.codeBarres}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>

                {/* Date */}
                <td className="px-4 py-3 font-mono text-xs truncate">{r.date}</td>

                {/* Statut */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_RECEPTION_COLORS[r.statut]}`}>
                    {STATUT_ICONS[r.statut]}
                    {STATUT_RECEPTION_LABELS[r.statut]}
                  </span>
                </td>

                {/* Action */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="Imprimer les étiquettes"
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <Printer className="size-3.5" />
                    </button>
                    {r.statut === 'Conforme' && !r.cloturee && (
                      <button
                        title="Clôturer la réception"
                        className="p-1.5 rounded text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <CheckCheck className="size-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
