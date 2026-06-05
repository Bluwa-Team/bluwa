'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ClipboardList,
  Archive,
  CalendarRange,
  Plus,
  Pencil,
  Printer,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  PackageCheck,
  TrendingDown,
  Factory,
  List,
  LayoutGrid,
  Barcode,
  Calendar,
  ChevronLeft,
  Loader2,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns,
  ColumnResizer,
  type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  OrdreFabrication,
  StatutOF,
  STATUT_OF_LABELS,
  STATUT_OF_COLORS,
  STATUT_OF_TRANSITION,
  STATUT_OF_NEXT,
} from './_components/types'
import {
  getProductionOrders,
  createProductionOrder,
  updateProductionOrder,
  transitionProductionOrder,
  validatePickingOrder,
} from '@/lib/actions/production'
import { HelpPopover } from '@/components/ui/help-popover'
import { OFModal }  from './_components/of-modal'
import { printOf }  from '@/lib/of-print'

// ── Colonnes tableau ─────────────────────────────────────────────────────────

const OF_COLUMNS: ResizableColumn[] = [
  { id: 'numero',      defaultWidth: 140, minWidth: 120 },
  { id: 'produitFini', defaultWidth: 200, minWidth: 160  },
  { id: 'qty',         defaultWidth: 80,  minWidth: 65  },
  { id: 'realise',     defaultWidth: 90,  minWidth: 70  },
  { id: 'lotPF',       defaultWidth: 130, minWidth: 100 },
  { id: 'ligne',       defaultWidth: 70,  minWidth: 58  },
  { id: 'operateur',   defaultWidth: 130, minWidth: 100 },
  { id: 'dateBesoin',  defaultWidth: 110, minWidth: 90  },
  { id: 'debutPlanif', defaultWidth: 110, minWidth: 90  },
  { id: 'picking',     defaultWidth: 130, minWidth: 110 },
  { id: 'statut',      defaultWidth: 160, minWidth: 130 },
  { id: 'action',      defaultWidth: 130, minWidth: 110 },
]

type TabStatut = 'Tous' | StatutOF
type Vue = 'liste' | 'periode'

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const STATUS_TABS: { key: TabStatut; label: string }[] = [
  { key: 'Tous',               label: 'Tous' },
  { key: 'EnAttenteComposants',label: 'En attente composants' },
  { key: 'Planifie',           label: 'Planifié' },
  { key: 'EnCours',            label: 'En cours' },
  { key: 'ControleQualite',    label: 'Contrôle qualité' },
  { key: 'Dispo',              label: 'Dispo' },
  { key: 'Termine',            label: 'Terminé' },
]

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, borderClass, icon: Icon, iconClass,
}: {
  label: string; value: string; sub: string
  borderClass: string; icon: React.ElementType; iconClass: string
}) {
  return (
    <div className={`bg-card rounded-xl border border-border border-t-2 ${borderClass} p-4 shadow-sm flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-4 ${iconClass}`} />
      </div>
      <div>
        <p className="text-3xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const locale = useLocale()
  const [ofs,     setOfs]     = useState<OrdreFabrication[]>([])
  const [loading, setLoading] = useState(true)
  const [vue, setVue] = useState<Vue>('liste')

  useEffect(() => {
    getProductionOrders().then((data) => {
      setOfs(data)
      setLoading(false)
    })
  }, [])
  const [tabStatut, setTabStatut] = useState<TabStatut>('Tous')
  const [showArchives, setShowArchives] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0)
  const [ofModalOpen, setOfModalOpen] = useState(false)
  const [selectedOf, setSelectedOf]   = useState<OrdreFabrication | null>(null)

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:production',
    OF_COLUMNS,
  )

  const tableMinWidth = OF_COLUMNS.reduce(
    (sum, c) => sum + (widths[c.id] ?? c.defaultWidth ?? 0),
    0,
  )

  // ── Statistiques ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const actifs = ofs.filter((o) => !o.archive && o.statut !== 'Termine')
    const aProduire = actifs.reduce((s, o) => s + Math.max(0, o.qty - o.realise), 0)
    const dispo = actifs.filter((o) => o.statut === 'Dispo').length
    const archived = ofs.filter((o) => o.archive).length
    return {
      actifs: actifs.length,
      aProduire,
      dispo,
      archived,
      tauxRebut: 0,
    }
  }, [ofs])

  // Compte par statut (hors archives)
  const countByStatut = useMemo(() => {
    const m: Partial<Record<StatutOF, number>> = {}
    ofs
      .filter((o) => !o.archive)
      .forEach((o) => { m[o.statut] = (m[o.statut] ?? 0) + 1 })
    return m
  }, [ofs])

  // ── Liste filtrée ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (showArchives) return ofs.filter((o) => o.archive)
    const base = ofs.filter((o) => !o.archive)
    if (tabStatut === 'Tous') return base
    return base.filter((o) => o.statut === tabStatut)
  }, [ofs, tabStatut, showArchives])

  // ── Vue par période — colonnes 3 mois ────────────────────────────────────────
  const monthColumns = useMemo(() => {
    const today = new Date()
    return [0, 1, 2].map((i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + monthOffset + i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const label = `${MOIS_FR[m]} ${y}`
      const colOfs = ofs.filter((o) => {
        if (o.archive) return false
        const dp = new Date(o.debutPlanif)
        return dp.getFullYear() === y && dp.getMonth() === m
      })
      return {
        label,
        ofs: colOfs,
        totalQty: colOfs.reduce((s, o) => s + o.qty, 0),
        dispo: colOfs.filter((o) => o.statut === 'Dispo').length,
      }
    })
  }, [ofs, monthOffset])

  // ── Transitions d'état ──────────────────────────────────────────────────────
  async function transition(id: string) {
    const of_ = ofs.find((o) => o.id === id)
    if (!of_) return
    const next = STATUT_OF_NEXT[of_.statut]
    if (!next) return
    // Optimistic update
    setOfs((prev) => prev.map((o) =>
      o.id === id ? { ...o, statut: next, archive: next === 'Termine' } : o,
    ))
    // Persist
    const updated = await transitionProductionOrder(id, next)
    if (updated) {
      setOfs((prev) => prev.map((o) => o.id === id ? updated : o))
    }
  }

  async function validatePicking(id: string) {
    setOfs((prev) => prev.map((o) => o.id === id ? { ...o, picking: 'Valide' } : o))
    await validatePickingOrder(id)
  }

  // ── Sauvegarder (création ou modification) ───────────────────────────────────
  async function handleSaveOF(data: Omit<OrdreFabrication, 'id' | 'numero'>): Promise<boolean> {
    if (selectedOf) {
      const updated = await updateProductionOrder(selectedOf.id, data)
      if (!updated) return false
      setOfs((prev) => prev.map((o) => o.id === selectedOf.id ? updated : o))
      return true
    }
    const created = await createProductionOrder(data)
    if (!created) return false
    setOfs((prev) => [created, ...prev])
    return true
  }

  // ── Formatage date ──────────────────────────────────────────────────────────
  function fmtDate(iso: string) {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  // Avancement bar color
  function progressColor(of: OrdreFabrication) {
    const pct = of.qty > 0 ? of.realise / of.qty : 0
    if (pct >= 1) return 'bg-emerald-500'
    if (pct >= 0.5) return 'bg-blue-500'
    return 'bg-orange-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm gap-2">
        <Loader2 className="size-4 animate-spin" />
        Chargement des ordres de fabrication…
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Ordres de Fabrication</h1>
            <HelpPopover section="production" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Planification · Lancement · Traçabilité lot · Contrôle qualité
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarRange className="size-4" />
            Planning OF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Archive className="size-4" />
            Archiver hebdo
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { setSelectedOf(null); setOfModalOpen(true) }}
          >
            <Plus className="size-4" />
            Nouvel OF
          </Button>
        </div>
      </div>

      {/* ── Cartes stats ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="OF actifs"
          value={String(stats.actifs)}
          sub="En production ou planifiés"
          borderClass="border-t-blue-500"
          icon={Factory}
          iconClass="text-blue-500"
        />
        <StatCard
          label="À produire"
          value={`${formatNumber(stats.aProduire, locale)} btl`}
          sub="Reste à fabriquer · OFs actifs"
          borderClass="border-t-orange-500"
          icon={ClipboardList}
          iconClass="text-orange-500"
        />
        <StatCard
          label="Dispo (stock OK)"
          value={String(stats.dispo)}
          sub="Prêt à expédier"
          borderClass="border-t-emerald-500"
          icon={PackageCheck}
          iconClass="text-emerald-500"
        />
        <StatCard
          label="Taux de rebut"
          value={`${formatNumber(stats.tauxRebut, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`}
          sub="Cumul mois en cours"
          borderClass="border-t-red-400"
          icon={TrendingDown}
          iconClass="text-red-400"
        />
      </div>

      {/* ── Barre vue + filtres ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* Vue toggle */}
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
          <button
            onClick={() => setVue('liste')}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-all ${
              vue === 'liste'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="size-3.5" />
            Liste
          </button>
          <button
            onClick={() => setVue('periode')}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-all ${
              vue === 'periode'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="size-3.5" />
            Vue par période (3 mois)
          </button>
        </div>

        {/* Archives */}
        <button
          onClick={() => { setShowArchives((v) => !v); setTabStatut('Tous') }}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border font-medium transition-all ${
            showArchives
              ? 'bg-muted text-muted-foreground border'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Archive className="size-3.5" />
          Archives
          {stats.archived > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center size-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
              {stats.archived}
            </span>
          )}
        </button>
      </div>

      {/* ── Onglets statut ─────────────────────────────────────────────────── */}
      {!showArchives && (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'Tous'
              ? ofs.filter((o) => !o.archive).length
              : (countByStatut[tab.key as StatutOF] ?? 0)
            const isActive = tabStatut === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setTabStatut(tab.key)}
                className={`whitespace-nowrap flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 ${
                    isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Vue tableau (liste) ────────────────────────────────────────────── */}
      {vue === 'liste' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">

          {/* Reset colonnes */}
          {isCustomized && (
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Colonnes personnalisées</span>
              <button onClick={reset} className="text-xs text-blue-600 hover:underline">
                Réinitialiser
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table
              className="w-full text-sm table-fixed"
              style={{ minWidth: tableMinWidth }}
            >
              <colgroup>
                {OF_COLUMNS.map((col) => (
                  <col key={col.id} style={{ width: widths[col.id] }} />
                ))}
              </colgroup>

              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {/* N° OF */}
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    N° OF<ColumnResizer columnId="numero" onStart={startResize} />
                  </th>
                  {/* Produit fini */}
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Produit fini<ColumnResizer columnId="produitFini" onStart={startResize} />
                  </th>
                  {/* Qté */}
                  <th className="relative text-right text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Qté<ColumnResizer columnId="qty" onStart={startResize} />
                  </th>
                  {/* Réalisé */}
                  <th className="relative text-right text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Réalisé<ColumnResizer columnId="realise" onStart={startResize} />
                  </th>
                  {/* Lot PF */}
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Lot PF<ColumnResizer columnId="lotPF" onStart={startResize} />
                  </th>
                  {/* Ligne */}
                  <th className="relative text-center text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Ligne<ColumnResizer columnId="ligne" onStart={startResize} />
                  </th>
                  {/* Opérateur */}
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Opérateur prép.<ColumnResizer columnId="operateur" onStart={startResize} />
                  </th>
                  {/* Date besoin */}
                  <th className="relative text-center text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Date besoin<ColumnResizer columnId="dateBesoin" onStart={startResize} />
                  </th>
                  {/* Début planif. */}
                  <th className="relative text-center text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Début planif.<ColumnResizer columnId="debutPlanif" onStart={startResize} />
                  </th>
                  {/* Picking */}
                  <th className="relative text-center text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Picking<ColumnResizer columnId="picking" onStart={startResize} />
                  </th>
                  {/* Statut */}
                  <th className="relative text-center text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Statut<ColumnResizer columnId="statut" onStart={startResize} />
                  </th>
                  {/* Action */}
                  <th className="relative text-center text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Action<ColumnResizer columnId="action" onStart={startResize} />
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={OF_COLUMNS.length}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      {showArchives
                        ? 'Aucun OF archivé'
                        : 'Aucun OF pour ce filtre'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((of) => {
                    const pct = of.qty > 0 ? Math.round((of.realise / of.qty) * 100) : 0
                    const transLabel = STATUT_OF_TRANSITION[of.statut]

                    return (
                      <tr
                        key={of.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        {/* N° OF */}
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {of.numero}
                          </span>
                        </td>

                        {/* Produit fini */}
                        <td className="px-3 py-3">
                          <p className="font-medium truncate">{of.produitFini}</p>
                          <p className="text-xs text-muted-foreground font-mono">{of.sku}</p>
                        </td>

                        {/* Qté */}
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatNumber(of.qty, locale)}
                          <span className="ml-1 text-xs text-muted-foreground">{of.unite}</span>
                        </td>

                        {/* Réalisé */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-end gap-1">
                            <span className="tabular-nums text-sm">
                              {formatNumber(of.realise, locale)}
                              <span className="ml-1 text-xs text-muted-foreground">{of.unite}</span>
                            </span>
                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressColor(of)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{pct} %</span>
                          </div>
                        </td>

                        {/* Lot PF */}
                        <td className="px-3 py-3">
                          {of.lotPF ? (
                            <span className="flex items-center gap-1 font-mono text-xs text-foreground">
                              <Barcode className="size-3 shrink-0 text-muted-foreground" />
                              {of.lotPF}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Ligne */}
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {of.ligne}
                          </span>
                        </td>

                        {/* Opérateur */}
                        <td className="px-3 py-3 text-sm">
                          {of.operateurPrep ?? (
                            <span className="text-muted-foreground text-xs">Non assigné</span>
                          )}
                        </td>

                        {/* Date besoin */}
                        <td className="px-3 py-3 text-center text-sm tabular-nums">
                          {fmtDate(of.dateBesoin)}
                        </td>

                        {/* Début planif. */}
                        <td className="px-3 py-3 text-center text-sm tabular-nums text-muted-foreground">
                          {fmtDate(of.debutPlanif)}
                        </td>

                        {/* Picking */}
                        <td className="px-3 py-3 text-center">
                          {of.picking === 'Valide' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="size-3" />
                              Validé
                            </span>
                          ) : (
                            <button
                              onClick={() => validatePicking(of.id)}
                              className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-0.5 mx-auto"
                            >
                              Valider picking
                              <ChevronRight className="size-3" />
                            </button>
                          )}
                        </td>

                        {/* Statut */}
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUT_OF_COLORS[of.statut]}`}>
                            {of.statut === 'EnCours' && <Factory className="size-3" />}
                            {of.statut === 'ControleQualite' && <FlaskConical className="size-3" />}
                            {of.statut === 'Dispo' && <PackageCheck className="size-3" />}
                            {STATUT_OF_LABELS[of.statut]}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {transLabel && (
                              <button
                                onClick={() => transition(of.id)}
                                className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded transition-colors whitespace-nowrap"
                              >
                                {transLabel}
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedOf(of); setOfModalOpen(true) }}
                              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Modifier cet OF"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => printOf(of)}
                              title="Imprimer l'ordre de fabrication"
                              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Printer className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} OF{filtered.length > 1 ? 's' : ''}
              {showArchives ? ' archivé' : ''}{filtered.length > 1 ? 's' : ''}
            </span>
            <span className="italic">
              Statuts : En attente → Planifié → En cours → Contrôle qualité → Dispo → Archivé
            </span>
          </div>
        </div>
      )}

      {/* ── Vue par période ────────────────────────────────────────────────── */}
      {vue === 'periode' && (
        <div className="space-y-4">

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthOffset((v) => v - 1)}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Mois précédents"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setMonthOffset(0)}
              className="px-4 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => setMonthOffset((v) => v + 1)}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Mois suivants"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* 3 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {monthColumns.map((col) => (
              <div
                key={col.label}
                className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col gap-3"
              >
                {/* En-tête colonne */}
                <div>
                  <p className="font-bold text-base">{col.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {col.ofs.length} OF
                    {' · '}
                    {formatNumber(col.totalQty, locale)} btl planifiées
                    {' · '}
                    {col.dispo} dispo
                  </p>
                </div>

                {/* Cartes OF */}
                {col.ofs.length === 0 ? (
                  <p className="text-sm text-muted-foreground/50 italic text-center py-10">
                    Aucun OF
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {col.ofs.map((of) => (
                      <div
                        key={of.id}
                        className="bg-background rounded-lg border border-border/70 p-3 space-y-1.5 hover:border-border transition-colors"
                      >
                        {/* Ligne 1 : n° OF + statut */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm tracking-tight">
                            {of.numero}
                          </span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUT_OF_COLORS[of.statut]}`}>
                            {STATUT_OF_LABELS[of.statut]}
                          </span>
                        </div>

                        {/* Ligne 2 : produit */}
                        <p className="text-sm text-foreground/80 leading-tight">
                          {of.produitFini}
                        </p>

                        {/* Ligne 3 : date début + quantité */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 shrink-0" />
                            {of.debutPlanif}
                          </span>
                          <span className="font-medium tabular-nums text-foreground/70">
                            {formatNumber(of.qty, locale)} {of.unite}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal Nouvel OF / Modifier OF ─────────────────────────────────── */}
      <OFModal
        open={ofModalOpen}
        onClose={() => { setOfModalOpen(false); setSelectedOf(null) }}
        of={selectedOf}
        onSave={handleSaveOF}
      />

    </div>
  )
}
