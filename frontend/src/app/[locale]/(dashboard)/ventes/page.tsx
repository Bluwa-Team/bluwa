'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, X, MoreHorizontal, ShoppingBag,
  TrendingUp, Clock, CheckCheck, Loader2, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  CommandeClientHeader, CommandeClientItem, CommandeClientFlat,
  StatutCommande, flattenCommandes,
  STATUT_COMMANDE_COLORS, STATUT_COMMANDE_LABELS, STATUT_COMMANDE_NEXT,
} from './_components/types'
import { CommandeModal } from './_components/commande-modal'
import {
  getSalesOrders, createSalesOrder, updateSalesOrderStatus,
  type CreateSalesOrderInput,
} from '@/lib/actions/ventes'
import { Paginator } from '@/components/ui/paginator'

// ── Colonnes ──────────────────────────────────────────────────────────────────

const COLUMNS: ResizableColumn[] = [
  { id: 'numero',          defaultWidth: 140, minWidth: 110 },
  { id: 'date',            defaultWidth: 120, minWidth: 95  },
  { id: 'client',          defaultWidth: 200, minWidth: 150 },
  { id: 'article',         defaultWidth: 220, minWidth: 160 },
  { id: 'quantite',        defaultWidth: 100, minWidth: 80  },
  { id: 'puHT',            defaultWidth: 120, minWidth: 90  },
  { id: 'montantLigne',    defaultWidth: 140, minWidth: 110 },
  { id: 'livraison',       defaultWidth: 145, minWidth: 115 },
  { id: 'statut',          defaultWidth: 150, minWidth: 120 },
  { id: 'actions',         defaultWidth: 72,  minWidth: 60  },
]

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, bgClass, iconBgClass, iconColorClass, icon: Icon,
}: {
  label: string; value: number | string; sub: string
  bgClass: string; iconBgClass: string; iconColorClass: string
  icon: React.ElementType
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
        <button className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5">
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

// ── Statut badge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: StatutCommande }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_COMMANDE_COLORS[statut]}`}>
      {STATUT_COMMANDE_LABELS[statut]}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VentesPage() {
  const PAGE_SIZE = 50

  const [headers,     setHeaders]     = useState<CommandeClientHeader[]>([])
  const [items,       setItems]       = useState<CommandeClientItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [statutFilt,  setStatutFilt]  = useState<StatutCommande | 'all'>('all')
  const [advancingId, setAdvancingId] = useState<string | null>(null)
  const [page,  setPage]  = useState(0)
  const [total, setTotal] = useState(0)
  const [tick,  setTick]  = useState(0)

  const commandes = useMemo<CommandeClientFlat[]>(
    () => flattenCommandes(headers, items),
    [headers, items],
  )

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:ventes',
    COLUMNS,
  )
  const tableMinWidth = COLUMNS.reduce(
    (sum, c) => sum + (widths[c.id] ?? c.defaultWidth ?? 0), 0,
  )

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setLoading(true)
    getSalesOrders({
      page, pageSize: PAGE_SIZE,
      search: search || undefined,
      statut: statutFilt !== 'all' ? statutFilt : undefined,
    }).then(({ headers: h, items: i, total: t }) => {
      setHeaders(h); setItems(i); setTotal(t); setLoading(false)
    })
  }, [page, search, statutFilt, tick])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const caTotal = headers.reduce((s, h) => {
      const hItems = items.filter((i) => i.headerId === h.id)
      return s + hItems.reduce((ss, i) => ss + i.quantite * i.puHT * (1 - i.remisePct / 100), 0)
    }, 0)
    return {
      total,
      enCours:   headers.filter((h) => ['DRAFT','CONFIRMED','IN_PREPARATION'].includes(h.statut)).length,
      aExpedier: headers.filter((h) => h.statut === 'CONFIRMED' || h.statut === 'IN_PREPARATION').length,
      caTotal:   Math.round(caTotal),
    }
  }, [headers, items, total])

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const filtered = commandes

  const hasFilters = searchInput !== '' || statutFilt !== 'all'

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleSave(input: CreateSalesOrderInput): Promise<boolean> {
    const result = await createSalesOrder(input)
    if (!result) return false
    setPage(0)
    setTick((k) => k + 1)
    return true
  }

  async function handleAdvance(id: string, next: StatutCommande) {
    setAdvancingId(id)
    const ok = await updateSalesOrderStatus(id, next)
    if (ok) setTick((k) => k + 1)
    setAdvancingId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Commandes clients · Suivi des expéditions · CA prévisionnel
          </p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setModalOpen(true)}>
          <Plus className="size-4" /> Nouvelle commande
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Commandes en cours"
          value={stats.enCours}
          sub={`sur ${stats.total} commande${stats.total > 1 ? 's' : ''} au total`}
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={ShoppingBag}
        />
        <StatCard
          label="À expédier"
          value={stats.aExpedier}
          sub="Confirmées ou en préparation"
          bgClass="bg-amber-50 dark:bg-amber-950/30"
          iconBgClass="bg-amber-100 dark:bg-amber-900"
          iconColorClass="text-amber-600 dark:text-amber-400"
          icon={Clock}
        />
        <StatCard
          label="Facturées / Livrées"
          value={headers.filter((h) => h.statut === 'INVOICED' || h.statut === 'SHIPPED').length}
          sub="Commandes expédiées ou facturées"
          bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          icon={CheckCheck}
        />
        <StatCard
          label="CA HT total"
          value={`${(stats.caTotal / 1_000_000).toFixed(1)} M`}
          sub={`${stats.caTotal.toLocaleString('fr-FR')} XOF`}
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={TrendingUp}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher n°, client, article…"
            className="w-full h-9 pl-9 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={statutFilt}
          onChange={(e) => { setStatutFilt(e.target.value as StatutCommande | 'all'); setPage(0) }}
          className="h-9 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">Tous statuts</option>
          {(Object.keys(STATUT_COMMANDE_LABELS) as StatutCommande[]).map((s) => (
            <option key={s} value={s}>{STATUT_COMMANDE_LABELS[s]}</option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
            onClick={() => { setSearchInput(''); setSearch(''); setStatutFilt('all'); setPage(0) }}>
            <X className="size-3.5" /> Effacer
          </Button>
        )}
        {isCustomized && (
          <Button variant="ghost" size="sm" className="text-muted-foreground ml-auto"
            onClick={reset}>
            Réinitialiser colonnes
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 rounded-xl border overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm border-collapse" style={{ minWidth: tableMinWidth }}>
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm border-b">
              <tr>
                {[
                  { id: 'numero',       label: 'N° commande' },
                  { id: 'date',         label: 'Date' },
                  { id: 'client',       label: 'Client' },
                  { id: 'article',      label: 'Article' },
                  { id: 'quantite',     label: 'Qté' },
                  { id: 'puHT',         label: 'PU HT' },
                  { id: 'montantLigne', label: 'Montant HT' },
                  { id: 'livraison',    label: 'Livraison souhaitée' },
                  { id: 'statut',       label: 'Statut' },
                  { id: 'actions',      label: '' },
                ].map((col, i, arr) => (
                  <th
                    key={col.id}
                    style={{ width: widths[col.id] ?? COLUMNS.find((c) => c.id === col.id)?.defaultWidth }}
                    className="relative text-left text-xs font-semibold tracking-wide uppercase text-muted-foreground px-4 py-3 select-none whitespace-nowrap"
                  >
                    {col.label}
                    {i < arr.length - 1 && (
                      <ColumnResizer columnId={col.id} onStart={startResize} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin inline mr-2" />
                    Chargement des commandes…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-muted-foreground">
                    {hasFilters ? 'Aucune commande ne correspond aux filtres.' : 'Aucune commande pour le moment.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => {
                  const isFirstOfOrder = idx === 0 || filtered[idx - 1].id !== c.id
                  const next = STATUT_COMMANDE_NEXT[c.statut]
                  return (
                    <tr key={`${c.id}-${c.itemId}`}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-xs whitespace-nowrap">
                        {isFirstOfOrder ? c.numero : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {isFirstOfOrder
                          ? new Date(c.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : ''}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {isFirstOfOrder ? c.client : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap truncate max-w-0" style={{ maxWidth: widths['article'] ?? 220 }}>
                        <span className="truncate block">{c.article}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                        {c.quantite.toLocaleString('fr-FR')} <span className="text-muted-foreground text-xs">{c.unite}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-xs">
                        {c.puHT.toLocaleString('fr-FR')} <span className="text-muted-foreground">{c.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums font-semibold text-xs">
                        {c.montantLigne.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {isFirstOfOrder
                          ? new Date(c.dateLivraisonSouhaitee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isFirstOfOrder ? <StatutBadge statut={c.statut} /> : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isFirstOfOrder && next && (
                          <button
                            onClick={() => handleAdvance(c.id, next)}
                            disabled={advancingId === c.id}
                            title={`Passer à : ${STATUT_COMMANDE_LABELS[next]}`}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            {advancingId === c.id
                              ? <Loader2 className="size-3.5 animate-spin" />
                              : <ChevronRight className="size-3.5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <span>{filtered.length} ligne{filtered.length > 1 ? 's' : ''}</span>
            <span>
              CA affiché :{' '}
              <strong className="text-foreground">
                {filtered.reduce((s, c) => s + c.montantLigne, 0).toLocaleString('fr-FR')} XOF
              </strong>
            </span>
          </div>
        )}
      </div>

      <Paginator page={page} total={total} pageSize={PAGE_SIZE} loading={loading} onPage={setPage} />

      <CommandeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
