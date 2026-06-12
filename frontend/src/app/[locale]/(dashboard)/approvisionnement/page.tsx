'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Plus, FileDown, FileText, Leaf,
  Clock, CheckCheck, RotateCcw, Search, X,
  ShoppingBag, PackageCheck, Info, ShoppingCart,
  Link2, AlertCircle, ArrowRight, Factory,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  BCHeader, BCItem, BCFlat, CommandeFournisseur,
  STATUT_COMMANDE_COLORS, STATUT_COMMANDE_LABELS,
  StatutCommande, TypeCommande, flattenBC,
  ArticleStrategie, NiveauService, Z_VALUES, calcSS, calcPointCmd,
} from './_components/types'
import { CommandeModal }       from './_components/commande-modal'
import { printBcDoc }         from './_components/bc-print'
import { CommandeDetailModal } from './_components/commande-detail-modal'
import { HelpPopover }         from '@/components/ui/help-popover'
import { Paginator }           from '@/components/ui/paginator'
import {
  type PurchaseRequisitionRow, type StatutDA,
  STATUT_DA_LABELS, STATUT_DA_COLORS,
} from '../mrp/_components/types'
import {
  getPurchaseOrders, getPurchaseRequisitions, getArticleStrategies,
  createPurchaseOrder, convertRequisition, updatePurchaseOrderStatus,
  type CreatePurchaseOrderInput,
} from '@/lib/actions/approvisionnement'
import { getOrgName } from '@/lib/actions/helpers'

type Tab = 'da' | 'commandes' | 'strategie'


const STRATEGIE_COLUMNS: ResizableColumn[] = [
  { id: 'sku',          defaultWidth: 130, minWidth: 100 },
  { id: 'article',      defaultWidth: 200, minWidth: 160  },
  { id: 'consoMoy',     defaultWidth: 150, minWidth: 120 },
  { id: 'sigma',        defaultWidth: 90,  minWidth: 70  },
  { id: 'delaiMoy',     defaultWidth: 140, minWidth: 110 },
  { id: 'delaiMax',     defaultWidth: 100, minWidth: 80  },
  { id: 'service',      defaultWidth: 100, minWidth: 80  },
  { id: 'stockActuel',  defaultWidth: 150, minWidth: 110 },
  { id: 'ssCalcule',    defaultWidth: 110, minWidth: 85  },
  { id: 'pointCmd',     defaultWidth: 110, minWidth: 85  },
  { id: 'statut',       defaultWidth: 160, minWidth: 130 },
]

const COMMANDE_COLUMNS: ResizableColumn[] = [
  { id: 'numero',      defaultWidth: 130, minWidth: 100 },
  { id: 'type',        defaultWidth: 90,  minWidth: 70  },
  { id: 'date',        defaultWidth: 120, minWidth: 95  },
  { id: 'fournisseur', defaultWidth: 180, minWidth: 120 },
  { id: 'lignes',      defaultWidth: 80,  minWidth: 60  },
  { id: 'totalHT',     defaultWidth: 140, minWidth: 100 },
  { id: 'contrat',     defaultWidth: 120, minWidth: 90  },
  { id: 'reception',   defaultWidth: 130, minWidth: 100 },
  { id: 'statut',      defaultWidth: 140, minWidth: 110 },
  { id: 'doc',         defaultWidth: 72,  minWidth: 60  },
]

function StatCard({
  label, value, sub, bgClass, iconBgClass, iconColorClass, icon: Icon,
}: {
  label: string
  value: number
  sub: string
  bgClass: string
  iconBgClass: string
  iconColorClass: string
  icon: React.ElementType
}) {
  return (
    <div className={`rounded-2xl p-4 transition-all hover:scale-[1.02] hover:shadow-md cursor-default ${bgClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`size-4 ${iconColorClass}`} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

function TypeBadge({ type }: { type: 'BC' | 'BA' }) {
  const isBC = type === 'BC'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      isBC ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
    }`}>
      {isBC
        ? <FileText className="size-3.5 shrink-0" />
        : <Leaf className="size-3.5 shrink-0" />}
      {type}
    </span>
  )
}

export default function ApprovisionnementPage() {
  const locale = useLocale()
  const [tab,       setTab]       = useState<Tab>('commandes')
  const [prefillDa, setPrefillDa] = useState<PurchaseRequisitionRow | null>(null)
  // State Header/Item — la vue aplatie est dérivée par useMemo
  const [bcHeaders, setBcHeaders] = useState<BCHeader[]>([])
  const [bcItems,   setBcItems]   = useState<BCItem[]>([])
  const commandes = useMemo<BCFlat[]>(() => flattenBC(bcHeaders, bcItems), [bcHeaders, bcItems])
  const [modalOpen,       setModalOpen]       = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [strategie, setStrategie] = useState<ArticleStrategie[]>([])
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [page,  setPage]  = useState(0)
  const [total, setTotal] = useState(0)
  const [tick,  setTick]  = useState(0)

  const PAGE_SIZE = 50

  const [sSearch, setSSearch] = useState('')
  const [sStatutFilter, setSStatutFilter] = useState<'all' | 'aCommander' | 'ok'>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutCommande | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'BC' | 'BA'>('all')

  // Reference data: DAs, strategies, org name — loaded once
  useEffect(() => {
    Promise.all([
      getPurchaseRequisitions(),
      getArticleStrategies(),
      getOrgName(),
    ]).then(([da, strat, name]) => {
      setDaRows(da)
      setStrategie(strat)
      setOrgName(name)
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Paginated purchase orders
  useEffect(() => {
    setLoading(true)
    getPurchaseOrders({
      page, pageSize: PAGE_SIZE,
      search: search || undefined,
      type:   typeFilter !== 'all' ? typeFilter : undefined,
      statut: statutFilter !== 'all' ? statutFilter : undefined,
    }).then(({ headers, items, total: t }) => {
      setBcHeaders(headers); setBcItems(items); setTotal(t); setLoading(false)
    })
  }, [page, search, statutFilter, typeFilter, tick])

  // ── DA state ───────────────────────────────────────────────────────────────
  const [daRows, setDaRows] = useState<PurchaseRequisitionRow[]>([])
  const [daSearch, setDaSearch] = useState('')
  const [daStatutFilter, setDaStatutFilter] = useState<StatutDA | 'all'>('all')

  const { widths: sWidths, startResize: sSR, reset: sReset, isCustomized: sCust } = useResizableColumns(
    'bluwa:cols:approvisionnement:strategie',
    STRATEGIE_COLUMNS,
  )
  const strategieMinWidth = STRATEGIE_COLUMNS.reduce(
    (sum, c) => sum + (sWidths[c.id] ?? c.defaultWidth ?? 0),
    0,
  )

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:approvisionnement',
    COMMANDE_COLUMNS,
  )
  const tableMinWidth = COMMANDE_COLUMNS.reduce(
    (sum, c) => sum + (widths[c.id] ?? c.defaultWidth ?? 0),
    0,
  )

  const strategieFiltree = useMemo(() => {
    const q = sSearch.toLowerCase().trim()
    return strategie.filter((a) => {
      const ss = calcSS(a)
      const pointCmd = calcPointCmd(a, ss)
      const aCommander = a.stockActuel <= pointCmd
      if (sStatutFilter === 'aCommander' && !aCommander) return false
      if (sStatutFilter === 'ok' && aCommander) return false
      if (q) return a.sku.toLowerCase().includes(q) || a.article.toLowerCase().includes(q)
      return true
    })
  }, [strategie, sSearch, sStatutFilter])

  async function handleSaveCommande(
    headerData: Omit<BCHeader, 'id' | 'numero' | 'reception' | 'statut'>,
    newItems: Omit<BCItem, 'id' | 'headerId'>[],
  ): Promise<BCHeader | null> {
    const input: CreatePurchaseOrderInput = {
      type:        headerData.type,
      date:        headerData.date,
      fournisseur: headerData.fournisseur,
      contrat:     headerData.contrat,
      currency:    headerData.currency,
      items:       newItems.map((i) => ({
        article:               i.article,
        articleId:             i.articleId ?? null,
        quantite:              i.quantite,
        puHT:                  i.puHT,
        livraisonPrevue:       i.livraisonPrevue,
        dureeVie:              i.dureeVie,
        purchaseRequisitionId: i.purchaseRequisitionId,
      })),
    }
    const result = await createPurchaseOrder(input)
    if (!result) return null

    // Si conversion depuis une DA, mettre à jour son statut
    if (prefillDa) {
      await convertRequisition(prefillDa.id, result.id)
      setDaRows((prev) => prev.map((d) =>
        d.id === prefillDa.id
          ? { ...d, status: 'CONVERTED' as const, convertedToOrderId: result.id, convertedOrderNumber: result.numero }
          : d,
      ))
      setPrefillDa(null)
    }

    setPage(0)
    setTick((k) => k + 1)
    return result
  }

  async function handleStatusChange(orderId: string, newStatus: StatutCommande) {
    await updatePurchaseOrderStatus(orderId, newStatus)
    setTick((k) => k + 1)
  }

  function handlePrintDoc(headerId: string) {
    const h = bcHeaders.find((bh) => bh.id === headerId)
    if (!h) return
    const its = bcItems.filter((i) => i.headerId === headerId)
    printBcDoc({ ...h, orgName }, its.map((i) => ({
      article:         i.article,
      quantite:        i.quantite,
      unite:           i.unite || '',
      puHT:            i.puHT,
      livraisonPrevue: i.livraisonPrevue,
    })))
  }

  const stats = useMemo(() => ({
    enCours: bcHeaders.filter((h) => h.statut === 'DRAFT' || h.statut === 'PENDING_APPROVAL' || h.statut === 'APPROVED' || h.statut === 'SENT').length,
    recues:  bcHeaders.filter((h) => h.statut === 'RECEIVED').length,
    total:   bcHeaders.length,
  }), [bcHeaders])

  const filtered = bcHeaders

  const hasActiveFilters = searchInput !== '' || statutFilter !== 'all' || typeFilter !== 'all'

  const TODAY = new Date().toISOString().split('T')[0]

  const daFiltered = useMemo(() => {
    const q = daSearch.toLowerCase().trim()
    return daRows.filter((da) => {
      if (daStatutFilter !== 'all' && da.status !== daStatutFilter) return false
      if (q) {
        return (
          da.requisitionNumber.toLowerCase().includes(q)
          || da.articleLabel.toLowerCase().includes(q)
          || da.articleSku.toLowerCase().includes(q)
          || da.factoryName.toLowerCase().includes(q)
          || (da.sourceOrderNumber?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [daRows, daSearch, daStatutFilter])

  const daStats = useMemo(() => ({
    pending:   daRows.filter((d) => d.status === 'PENDING').length,
    converted: daRows.filter((d) => d.status === 'CONVERTED').length,
    cancelled: daRows.filter((d) => d.status === 'CANCELLED').length,
  }), [daRows])

  // ── Détail commande sélectionnée ───────────────────────────────────────────
  const selectedHeader = selectedOrderId
    ? bcHeaders.find((h) => h.id === selectedOrderId) ?? null
    : null
  const selectedItems = selectedOrderId
    ? bcItems.filter((i) => i.headerId === selectedOrderId)
    : []

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Approvisionnement</h1>
            <HelpPopover section="approvisionnement" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Stratégie de stock dynamique · Suivi des commandes fournisseurs
          </p>
        </div>
        {tab === 'commandes' && (
          <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Nouvelle commande
          </Button>
        )}
        {tab === 'da' && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Link2 className="size-3.5" />
            Générées automatiquement par le MRP
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: 'commandes' as Tab, label: 'Commandes fournisseurs',   count: undefined },
          { key: 'da'        as Tab, label: 'Suggestions MRP',          count: daStats.pending > 0 ? daStats.pending : undefined },
          { key: 'strategie' as Tab, label: 'Stratégie de stock',       count: undefined },
        ] as { key: Tab; label: string; count: number | undefined }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              tab === key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {count !== undefined && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  TAB : Demandes d'achat                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'da' && (
        <div className="space-y-4">

          {/* Chips compteurs statut */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: 'all',       label: 'Toutes',                    count: daRows.length,    cls: 'bg-muted border text-foreground' },
              { key: 'PENDING',   label: STATUT_DA_LABELS.PENDING,    count: daStats.pending,   cls: STATUT_DA_COLORS.PENDING },
              { key: 'CONVERTED', label: STATUT_DA_LABELS.CONVERTED,  count: daStats.converted, cls: STATUT_DA_COLORS.CONVERTED },
              { key: 'CANCELLED', label: STATUT_DA_LABELS.CANCELLED,  count: daStats.cancelled, cls: STATUT_DA_COLORS.CANCELLED },
            ] as { key: StatutDA | 'all'; label: string; count: number; cls: string }[]).map(({ key, label, count, cls }) => (
              <button
                key={key}
                onClick={() => setDaStatutFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  daStatutFilter === key ? cls + ' ring-2 ring-offset-1 ring-current' : cls + ' opacity-60 hover:opacity-100'
                }`}
              >
                {label}
                <span className="font-bold">{count}</span>
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="N° DA, article, site, OF…"
                  value={daSearch}
                  onChange={(e) => setDaSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-56"
                />
              </div>
              {(daSearch !== '' || daStatutFilter !== 'all') && (
                <button
                  onClick={() => { setDaSearch(''); setDaStatutFilter('all') }}
                  className="h-7 px-2.5 text-xs rounded-md flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="size-3" />
                  Réinitialiser
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {daFiltered.length} résultat{daFiltered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Table DA */}
          <div className="rounded-2xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 860 }}>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide w-[130px]">N° DA</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Article</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide w-[120px]">Site</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide w-[110px]">Qté requise</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide w-[120px]">Date limite</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide w-[120px]">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide w-[135px]">Source OF</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide w-[155px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {daFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucune demande d'achat ne correspond aux filtres.
                    </td>
                  </tr>
                ) : daFiltered.map((da) => {
                  const isUrgent = da.requestedDeliveryDate <= TODAY && da.status === 'PENDING'
                  return (
                    <tr key={da.id} className="hover:bg-muted/20">

                      {/* N° DA */}
                      <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">
                        {da.requisitionNumber}
                      </td>

                      {/* Article */}
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <span className="block font-medium text-sm truncate" title={da.articleLabel}>
                            {da.articleLabel}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {da.articleSku}
                          </span>
                        </div>
                      </td>

                      {/* Site */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Factory className="size-3 shrink-0" />
                          {da.factoryName}
                        </span>
                      </td>

                      {/* Qté */}
                      <td className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap">
                        {formatNumber(da.quantityRequired, locale)}{' '}
                        <span className="text-muted-foreground text-xs">{da.unitLabel}</span>
                      </td>

                      {/* Date limite */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-mono text-xs ${
                          isUrgent ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                        }`}>
                          {isUrgent && <AlertCircle className="size-3 shrink-0" />}
                          {da.requestedDeliveryDate}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUT_DA_COLORS[da.status]}`}>
                          {STATUT_DA_LABELS[da.status]}
                        </span>
                      </td>

                      {/* Source OF */}
                      <td className="px-4 py-3">
                        {da.sourceOrderNumber ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-200 font-mono whitespace-nowrap">
                            <Link2 className="size-2.5 shrink-0" />
                            {da.sourceOrderNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        {da.status === 'CONVERTED' && da.convertedOrderNumber ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono whitespace-nowrap">
                            <CheckCheck className="size-3 shrink-0" />
                            {da.convertedOrderNumber}
                          </span>
                        ) : da.status === 'PENDING' ? (
                          <button
                            onClick={() => { setPrefillDa(da); setModalOpen(true) }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors whitespace-nowrap"
                          >
                            Créer BC/BA
                            <ArrowRight className="size-3 shrink-0" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Note traçabilité MRP */}
          <div className="rounded-lg border bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 px-5 py-4 flex gap-3">
            <Link2 className="size-4 text-violet-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-300">
                Demandes d'achat issues du MRP
              </p>
              <p className="text-xs text-violet-700 dark:text-violet-400 leading-relaxed">
                Ces suggestions sont générées automatiquement par le calcul MRP à partir des besoins nets en matières premières.
                Cliquez sur <strong>Créer BC/BA</strong> pour ouvrir un bon de commande pré-rempli (article, quantité, date).
                La traçabilité <span className="font-mono">OF → Suggestion → BC/BA</span> est maintenue automatiquement.
              </p>
            </div>
          </div>

        </div>
      )}

      {tab === 'strategie' && (
        <div className="space-y-4">

          {/* Méthode de calcul */}
          <div className="rounded-lg border bg-muted/30 px-5 py-4 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <span>📐</span> Méthode de calcul
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Conso moyenne</strong> = moyenne des sorties stock sur 30 j &nbsp;·&nbsp;
              <strong className="text-foreground">Délai moyen</strong> = moyenne des délais des dernières livraisons
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Stock de sécurité = Z × √délai_moy × σ(conso) + (délai_max – délai_moy) × conso
            </p>
            <p className="text-xs text-muted-foreground flex flex-wrap gap-4 pt-0.5">
              {Object.entries(Z_VALUES).map(([pct, z]) => (
                <span key={pct}>Niveau {pct}% → Z={z}</span>
              ))}
            </p>
          </div>

          {/* Filtres stratégie */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-64 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par SKU ou article…"
                value={sSearch}
                onChange={(e) => setSSearch(e.target.value)}
                className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
              />
            </div>
            <select
              value={sStatutFilter}
              onChange={(e) => setSStatutFilter(e.target.value as 'all' | 'aCommander' | 'ok')}
              className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
            >
              <option value="all">Tous statuts</option>
              <option value="aCommander">À commander</option>
              <option value="ok">OK</option>
            </select>
            <div className="flex items-center gap-2 ml-auto">
              {(sSearch !== '' || sStatutFilter !== 'all') && (
                <button
                  onClick={() => { setSSearch(''); setSStatutFilter('all') }}
                  className="h-7 px-2.5 text-xs rounded-md flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="size-3" />
                  Réinitialiser
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {strategieFiltree.length} résultat{strategieFiltree.length !== 1 ? 's' : ''}
              </span>
              {sCust && (
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={sReset}>
                  <RotateCcw className="size-3.5" />
                  Réinitialiser les colonnes
                </Button>
              )}
            </div>
          </div>

          {/* Table stratégie */}
          <div className="rounded-2xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: strategieMinWidth }}>
              <colgroup>
                {STRATEGIE_COLUMNS.map((c) => (
                  <col key={c.id} style={{ width: sWidths[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    SKU<ColumnResizer columnId="sku" onStart={sSR} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Désignation<ColumnResizer columnId="article" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Conso moy. (30j)<ColumnResizer columnId="consoMoy" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    σ Conso<ColumnResizer columnId="sigma" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Délai moy.<ColumnResizer columnId="delaiMoy" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Délai max<ColumnResizer columnId="delaiMax" onStart={sSR} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Service<ColumnResizer columnId="service" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Stock actuel<ColumnResizer columnId="stockActuel" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    SS calculé<ColumnResizer columnId="ssCalcule" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Point cmd.<ColumnResizer columnId="pointCmd" onStart={sSR} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Statut<ColumnResizer columnId="statut" onStart={sSR} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {strategieFiltree.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucun article ne correspond aux filtres.
                    </td>
                  </tr>
                ) : strategieFiltree.map((a) => {
                  const ss = calcSS(a)
                  const pointCmd = calcPointCmd(a, ss)
                  const aCommander = a.stockActuel <= pointCmd
                  const joursRestants = a.consoMoy > 0 ? Math.round(a.stockActuel / a.consoMoy) : null

                  return (
                    <tr key={a.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-medium truncate">{a.sku}</td>
                      <td className="px-4 py-3 text-sm font-medium truncate" title={a.article}>{a.article}</td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.consoMoy}</td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.sigmaConso}</td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.delaiMoy}j</td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.delaiMax}j</td>
                      <td className="px-4 py-3 truncate">
                        <select
                          value={a.niveauService}
                          onChange={(e) => setStrategie((prev) =>
                            prev.map((item) => item.id === a.id
                              ? { ...item, niveauService: e.target.value as NiveauService }
                              : item
                            )
                          )}
                          className="h-7 px-2 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="90">90%</option>
                          <option value="95">95%</option>
                          <option value="99">99%</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.stockActuel}</td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-right truncate">
                        <span className={aCommander ? 'text-orange-500' : 'text-blue-600'}>{ss}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{pointCmd}</td>
                      <td className="px-4 py-3 overflow-hidden">
                        {aCommander ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200">
                            <ShoppingCart className="size-3 shrink-0" />
                            À commander
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCheck className="size-3 shrink-0" />
                            OK{joursRestants !== null ? ` · ${joursRestants}j` : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Source des données */}
          <div className="rounded-lg border bg-muted/30 px-5 py-4 space-y-1">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Info className="size-4 text-muted-foreground" /> Source des données
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La <strong className="text-foreground">consommation moyenne</strong> est recalculée à partir des sorties de stock (OF + ventes)
              sur les 30 derniers jours. Le <strong className="text-foreground">délai moyen fournisseur</strong> est recalculé à chaque réception
              en comparant la date de commande et la date de livraison effective. Aucune saisie manuelle requise.
            </p>
          </div>
        </div>
      )}

      {tab === 'commandes' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-64 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par N°, fournisseur, article, contrat…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
              />
            </div>

            <select
              value={statutFilter}
              onChange={(e) => { setStatutFilter(e.target.value as StatutCommande | 'all'); setPage(0) }}
              className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
            >
              <option value="all">Tous statuts</option>
              <option value="DRAFT">Brouillon</option>
              <option value="PENDING_APPROVAL">Attente approbation</option>
              <option value="APPROVED">Approuvée</option>
              <option value="SENT">Envoyée</option>
              <option value="RECEIVED">Reçue</option>
              <option value="CANCELLED">Annulée</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as 'all' | 'BC' | 'BA'); setPage(0) }}
              className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
            >
              <option value="all">Tous types</option>
              <option value="BC">BC · Bon de commande</option>
              <option value="BA">BA · Bon d'achat</option>
            </select>

            <div className="flex items-center gap-2 ml-auto">
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearchInput(''); setSearch(''); setStatutFilter('all'); setTypeFilter('all'); setPage(0) }}
                  className="h-7 px-2.5 text-xs rounded-md flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="size-3" />
                  Réinitialiser
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {total} résultat{total !== 1 ? 's' : ''}
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
          <div className="rounded-2xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
              <colgroup>
                {COMMANDE_COLUMNS.map((c) => (
                  <col key={c.id} style={{ width: widths[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    N° Doc<ColumnResizer columnId="numero" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Type<ColumnResizer columnId="type" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Date<ColumnResizer columnId="date" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Fournisseur<ColumnResizer columnId="fournisseur" onStart={startResize} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Lignes<ColumnResizer columnId="lignes" onStart={startResize} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Total HT<ColumnResizer columnId="totalHT" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Contrat<ColumnResizer columnId="contrat" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Réception<ColumnResizer columnId="reception" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Statut<ColumnResizer columnId="statut" onStart={startResize} />
                  </th>
                  <th className="relative text-center px-4 py-3 font-semibold text-xs tracking-wide">
                    Doc<ColumnResizer columnId="doc" onStart={startResize} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucune commande ne correspond aux filtres.
                    </td>
                  </tr>
                ) : filtered.map((h) => {
                  const hItems    = bcItems.filter((i) => i.headerId === h.id)
                  const nbLignes  = hItems.length
                  const totalHT   = hItems.reduce((sum, i) => sum + i.quantite * i.puHT, 0)
                  const isPartial = (h.statut === 'APPROVED' || h.statut === 'SENT') &&
                    hItems.some((i) => i.quantiteRecue > 0) &&
                    hItems.some((i) => i.quantiteRecue < i.quantite)
                  return (
                  <tr
                    key={h.id}
                    className="hover:bg-muted/20 cursor-pointer"
                    onClick={() => setSelectedOrderId(h.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold truncate">{h.numero}</td>

                    <td className="px-4 py-3 truncate">
                      <TypeBadge type={h.type} />
                    </td>

                    <td className="px-4 py-3 font-mono text-xs truncate">{h.date}</td>

                    <td className="px-4 py-3 text-sm truncate" title={h.fournisseur}>{h.fournisseur}</td>

                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground truncate">
                      {nbLignes} ligne{nbLignes !== 1 ? 's' : ''}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-sm truncate">
                      {formatNumber(totalHT, locale)}{' '}
                      <span className="text-muted-foreground text-xs">{h.currency}</span>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs truncate">{h.contrat}</td>

                    <td className="px-4 py-3 font-mono text-xs truncate">{h.reception}</td>

                    <td className="px-4 py-3 overflow-hidden">
                      {isPartial ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-violet-100 text-violet-700 border border-violet-200">
                          <PackageCheck className="size-3 shrink-0" />
                          Partielle
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUT_COMMANDE_COLORS[h.statut]}`}>
                          {h.statut === 'RECEIVED'
                            ? <CheckCheck className="size-3 shrink-0" />
                            : <Clock className="size-3 shrink-0" />}
                          {STATUT_COMMANDE_LABELS[h.statut]}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        title={h.type === 'BC' ? 'Imprimer le bon de commande' : "Imprimer le bon d'achat"}
                        onClick={() => handlePrintDoc(h.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                          h.type === 'BC'
                            ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                            : 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                        }`}
                      >
                        <FileDown className="size-3.5 shrink-0" />
                        {h.type}
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
          <Paginator page={page} total={total} pageSize={PAGE_SIZE} loading={loading} onPage={setPage} />
        </>
      )}

      <CommandeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPrefillDa(null) }}
        prefill={prefillDa}
        onSave={handleSaveCommande}
      />

      <CommandeDetailModal
        open={selectedOrderId !== null}
        onClose={() => setSelectedOrderId(null)}
        header={selectedHeader}
        items={selectedItems}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
