'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Printer, Barcode,
  Check, AlertTriangle, Clock, RotateCcw, CheckCheck,
  MoreHorizontal, Package, CheckCircle2, Search, X, FileDown,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  ReceptionHeader, ReceptionItem, ReceptionFlat, Reception,
  STATUT_RECEPTION_COLORS, STATUT_RECEPTION_LABELS,
  StatutReception, flattenReception,
} from './_components/types'
import { ReceptionModal }    from './_components/reception-modal'
import { LabelPrintModal }   from './_components/label-print-modal'
import type { BCHeader, BCItem } from '../approvisionnement/_components/types'
import { getGoodsReceipts, createGoodsReceipt } from '@/lib/actions/reception'
import { getPurchaseOrders } from '@/lib/actions/approvisionnement'
import { HelpPopover } from '@/components/ui/help-popover'

const STATUT_ICONS: Record<string, React.ReactNode> = {
  Libere:     <Check className="size-3" />,
  Bloque:     <AlertTriangle className="size-3" />,
  EnControle: <Clock className="size-3" />,
}

function CommandeBadge({ value }: { value: string | null }) {
  if (!value) return null
  const isBA = value.startsWith('BA')
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isBA ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
    }`}>
      ↳ {value}
    </span>
  )
}


const RECEPTION_COLUMNS: ResizableColumn[] = [
  { id: 'numero', defaultWidth: 130, minWidth: 100 },
  { id: 'commande', defaultWidth: 150, minWidth: 110 },
  { id: 'bon', defaultWidth: 110, minWidth: 90 },
  { id: 'fournisseur', defaultWidth: 170, minWidth: 120 },
  { id: 'article', defaultWidth: 200, minWidth: 160 },
  { id: 'quantite', defaultWidth: 130, minWidth: 100 },
  { id: 'lotStock', defaultWidth: 130, minWidth: 100 },
  { id: 'lotFourn', defaultWidth: 120, minWidth: 90 },
  { id: 'dlc', defaultWidth: 100, minWidth: 80 },
  { id: 'date', defaultWidth: 100, minWidth: 80 },
  { id: 'statut', defaultWidth: 140, minWidth: 110 },
  { id: 'action', defaultWidth: 80, minWidth: 64 },
]

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
  const trendArrow = { up: '↑', down: '↓', neutral: '' }[trendVariant]

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
  // State Header/Item — la vue aplatie est dérivée par useMemo
  const [recHeaders, setRecHeaders] = useState<ReceptionHeader[]>([])
  const [recItems,   setRecItems]   = useState<ReceptionItem[]>([])
  const receptions = useMemo<ReceptionFlat[]>(() => flattenReception(recHeaders, recItems), [recHeaders, recItems])
  const [modalOpen,    setModalOpen]    = useState(false)
  const [printRow,     setPrintRow]     = useState<ReceptionFlat | null>(null)
  const [bcHeaders, setBcHeaders] = useState<BCHeader[]>([])
  const [bcItems,   setBcItems]   = useState<BCItem[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getGoodsReceipts(),
      getPurchaseOrders(),
    ]).then(([rec, po]) => {
      setRecHeaders(rec.headers)
      setRecItems(rec.items)
      // Commandes ouvertes (PENDING ou APPROVED) pour la modale de réception
      setBcHeaders(po.headers.filter((h) => h.statut === 'PENDING' || h.statut === 'APPROVED'))
      setBcItems(po.items)
      setLoading(false)
    })
  }, [])
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutReception | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Formel' | 'Informel'>('all')

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:reception',
    RECEPTION_COLUMNS,
  )
  const tableMinWidth = RECEPTION_COLUMNS.reduce(
    (sum, c) => sum + (widths[c.id] ?? c.defaultWidth ?? 0),
    0,
  )

  // Stats sur les headers (1 réception = 1 header, pas 1 ligne article)
  const stats = useMemo(() => ({
    enCours:      recHeaders.filter((h) => h.statut === 'DRAFT').length,
    archivees:    recHeaders.filter((h) => h.statut !== 'DRAFT').length,
    liberees:     recHeaders.filter((h) => h.qualiteStatut === 'Libere').length,
    bloquees:     recHeaders.filter((h) => h.qualiteStatut === 'Bloque').length,
    codesScannes: recItems.filter((i) => i.codeBarres !== null).length,
  }), [recHeaders, recItems])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return receptions.filter((r) => {
      if (statutFilter !== 'all' && r.statut !== statutFilter) return false
      if (typeFilter !== 'all' && r.typeFournisseur !== typeFilter) return false
      if (q) {
        return (
          r.numero.toLowerCase().includes(q)
          || r.fournisseur.toLowerCase().includes(q)
          || r.article.toLowerCase().includes(q)
          || (r.numeroBon?.toLowerCase().includes(q) ?? false)
          || (r.lot?.toLowerCase().includes(q) ?? false)
          || (r.lotFourn?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [receptions, search, statutFilter, typeFilter])

  const hasActiveFilters = search !== '' || statutFilter !== 'all' || typeFilter !== 'all'

  async function handleSave(
    headerData: Omit<ReceptionHeader, 'id' | 'numero'>,
    newItems: Omit<ReceptionItem, 'id' | 'headerId' | 'lot'>[],
  ): Promise<boolean> {
    const result = await createGoodsReceipt(headerData, newItems)
    if (!result) return false
    // Rafraîchir depuis Supabase pour avoir les lots générés
    const { headers, items } = await getGoodsReceipts()
    setRecHeaders(headers)
    setRecItems(items)
    return true
  }

  function clearFilters() {
    setSearch('')
    setStatutFilter('all')
    setTypeFilter('all')
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Réceptions fournisseurs</h1>
            <HelpPopover section="reception" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            BA formels &amp; informels · Photos marchandises · Scan code-barres / DataMatrix
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
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
          label="Libérées"
          value={stats.liberees}
          sub="Libres pour atelier"
          trend="OK"
          trendVariant="up"
          bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/50"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          icon={CheckCircle2}
        />
        <StatCard
          label="Bloquées"
          value={stats.bloquees}
          sub="Lots en attente de décision"
          trend={stats.bloquees > 0 ? 'Action requise' : 'Aucun'}
          trendVariant={stats.bloquees > 0 ? 'down' : 'neutral'}
          bgClass="bg-red-50 dark:bg-red-950/30"
          iconBgClass="bg-red-100 dark:bg-red-900/50"
          iconColorClass="text-red-600 dark:text-red-400"
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-64 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par N°, fournisseur, article, lot…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          />
        </div>

        {/* Statut filter */}
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value as StatutReception | 'all')}
          className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
        >
          <option value="all">Tous statuts</option>
          <option value="DRAFT">En cours</option>
          <option value="VALIDATED">Validée</option>
          <option value="CANCELLED">Annulée</option>
        </select>

        {/* Type fournisseur filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'Formel' | 'Informel')}
          className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
        >
          <option value="all">Tous types</option>
          <option value="Formel">Formel</option>
          <option value="Informel">Informel</option>
        </select>

        {/* Clear + count + reset columns */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-7 px-2.5 text-xs rounded-md flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="size-3" />
              Réinitialiser
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
          {isCustomized && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
              onClick={reset}
            >
              <RotateCcw className="size-3.5" />
              Réinitialiser les colonnes
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
          <colgroup>
            {RECEPTION_COLUMNS.map((c) => (
              <col key={c.id} style={{ width: widths[c.id] }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                N° Rec
                <ColumnResizer columnId="numero" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Commande
                <ColumnResizer columnId="commande" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Bon
                <ColumnResizer columnId="bon" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Fournisseur
                <ColumnResizer columnId="fournisseur" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Article<ColumnResizer columnId="article" onStart={startResize} />
              </th>
              <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                Qté reçue
                <ColumnResizer columnId="quantite" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Lot stock
                <ColumnResizer columnId="lotStock" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Lot fourn.
                <ColumnResizer columnId="lotFourn" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                DLC
                <ColumnResizer columnId="dlc" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Date
                <ColumnResizer columnId="date" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                Statut
                <ColumnResizer columnId="statut" onStart={startResize} />
              </th>
              <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                Action<ColumnResizer columnId="action" onStart={startResize} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucune réception ne correspond aux filtres.
                </td>
              </tr>
            ) : filtered.map((r) => (
              <tr key={`${r.id}-${r.itemId}`} className="border-b last:border-0 hover:bg-muted/20">

                {/* N° Rec */}
                <td className="px-4 py-3 font-mono text-xs font-semibold truncate">
                  {r.numero}
                </td>

                {/* Commande */}
                <td className="px-4 py-3 truncate">
                  <CommandeBadge value={r.numeroBon} />
                </td>

                {/* Bon */}
                <td className="px-4 py-3">
                  <button
                    title={r.typeFournisseur === 'Formel' ? 'Télécharger le bon de commande' : "Télécharger le bon d'achat"}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      r.typeFournisseur === 'Formel'
                        ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                        : 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                    }`}
                  >
                    <FileDown className="size-3.5 shrink-0" />
                    {r.typeFournisseur === 'Formel' ? 'BC' : 'BA'}
                  </button>
                </td>

                {/* Fournisseur */}
                <td className="px-4 py-3 text-sm truncate" title={r.fournisseur}>
                  {r.fournisseur}
                </td>

                {/* Article */}
                <td className="px-4 py-3 text-sm truncate" title={r.article}>
                  {r.article}
                </td>

                {/* Qté reçue */}
                <td className="px-4 py-3 text-right text-sm font-mono truncate">
                  {formatNumber(r.quantite, locale)}{' '}
                  <span className="text-muted-foreground text-xs">{r.unite}</span>
                </td>

                {/* Lot stock */}
                <td className="px-4 py-3 font-mono text-xs truncate">
                  {r.lot}
                </td>

                {/* Lot fournisseur */}
                <td className="px-4 py-3 font-mono text-xs truncate">
                  {r.lotFourn}
                </td>

                {/* DLC */}
                <td className="px-4 py-3 font-mono text-xs truncate">
                  {r.dlc}
                </td>

                {/* Date */}
                <td className="px-4 py-3 font-mono text-xs truncate">{r.date}</td>

                {/* Statut */}
                <td className="px-4 py-3 overflow-hidden">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUT_RECEPTION_COLORS[r.statut]}`}>
                    {STATUT_ICONS[r.statut]}
                    {STATUT_RECEPTION_LABELS[r.statut]}
                  </span>
                </td>

                {/* Action */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="Imprimer les étiquettes"
                      onClick={() => setPrintRow(r)}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <Printer className="size-3.5" />
                    </button>
                    {r.qualiteStatut === 'Libere' && r.statut !== 'CANCELLED' && (
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

      <LabelPrintModal
        open={printRow !== null}
        row={printRow}
        onClose={() => setPrintRow(null)}
      />

      <ReceptionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bcHeaders={bcHeaders}
        bcItems={bcItems}
        onSave={handleSave}
      />
    </div>
  )
}
