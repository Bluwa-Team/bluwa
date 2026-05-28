'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  FileText, MoreHorizontal, TrendingUp, Clock, CheckCheck,
  AlertCircle, Loader2, ChevronRight, Search, X, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  FactureClient, StatutFacture,
  STATUT_FACTURE_COLORS, STATUT_FACTURE_LABELS,
} from './_components/types'
import {
  CommandeClientHeader, StatutCommande,
  STATUT_COMMANDE_COLORS, STATUT_COMMANDE_LABELS, STATUT_COMMANDE_NEXT,
} from '../ventes/_components/types'
import {
  getCustomerInvoices, createInvoiceFromOrder, updateInvoiceStatus,
} from '@/lib/actions/adv'
import { getSalesOrders, updateSalesOrderStatus } from '@/lib/actions/ventes'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'

type Tab = 'commandes' | 'factures'

// ── Colonnes ──────────────────────────────────────────────────────────────────

const INVOICE_COLS: ResizableColumn[] = [
  { id: 'numero',       defaultWidth: 150, minWidth: 120 },
  { id: 'commande',     defaultWidth: 130, minWidth: 100 },
  { id: 'client',       defaultWidth: 200, minWidth: 150 },
  { id: 'date',         defaultWidth: 120, minWidth: 95  },
  { id: 'echeance',     defaultWidth: 125, minWidth: 100 },
  { id: 'montantHT',    defaultWidth: 150, minWidth: 120 },
  { id: 'montantTTC',   defaultWidth: 150, minWidth: 120 },
  { id: 'statut',       defaultWidth: 140, minWidth: 110 },
  { id: 'actions',      defaultWidth: 72,  minWidth: 60  },
]

const ORDER_COLS: ResizableColumn[] = [
  { id: 'numero',    defaultWidth: 140, minWidth: 110 },
  { id: 'date',      defaultWidth: 120, minWidth: 95  },
  { id: 'client',    defaultWidth: 200, minWidth: 150 },
  { id: 'livraison', defaultWidth: 145, minWidth: 115 },
  { id: 'statut',    defaultWidth: 155, minWidth: 125 },
  { id: 'actions',   defaultWidth: 160, minWidth: 130 },
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
    <div className={`rounded-2xl p-4 hover:scale-[1.025] hover:shadow-lg transition-all duration-200 cursor-default ${bgClass}`}>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdvPage() {
  const [tab, setTab] = useState<Tab>('factures')

  // Factures
  const [factures, setFactures] = useState<FactureClient[]>([])
  const [loadingFac, setLoadingFac] = useState(true)

  // Commandes (confirmées à facturer)
  const [orders,    setOrders]    = useState<CommandeClientHeader[]>([])
  const [loadingOrd, setLoadingOrd] = useState(true)

  // UI state
  const [searchFac,   setSearchFac]   = useState('')
  const [statutFac,   setStatutFac]   = useState<StatutFacture | 'all'>('all')
  const [searchOrd,   setSearchOrd]   = useState('')
  const [statutOrd,   setStatutOrd]   = useState<StatutCommande | 'all'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const { widths: wFac, startResize: srFac, reset: resetFac, isCustomized: custFac } = useResizableColumns('bluwa:cols:adv:factures', INVOICE_COLS)
  const { widths: wOrd, startResize: srOrd, reset: resetOrd, isCustomized: custOrd } = useResizableColumns('bluwa:cols:adv:commandes', ORDER_COLS)
  const minWidthFac = INVOICE_COLS.reduce((s, c) => s + (wFac[c.id] ?? c.defaultWidth ?? 0), 0)
  const minWidthOrd = ORDER_COLS.reduce((s, c)  => s + (wOrd[c.id] ?? c.defaultWidth ?? 0), 0)

  useEffect(() => {
    getCustomerInvoices().then(({ factures: f }) => { setFactures(f); setLoadingFac(false) })
    getSalesOrders().then(({ headers }) => { setOrders(headers); setLoadingOrd(false) })
  }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const caFacture = factures.filter((f) => f.statut !== 'CANCELLED').reduce((s, f) => s + f.montantHT, 0)
    const impayes   = factures.filter((f) => f.statut === 'OVERDUE').reduce((s, f)  => s + f.montantTTC, 0)
    return {
      total:     factures.length,
      envoyees:  factures.filter((f) => f.statut === 'SENT').length,
      payees:    factures.filter((f) => f.statut === 'PAID').length,
      enRetard:  factures.filter((f) => f.statut === 'OVERDUE').length,
      caFacture: Math.round(caFacture),
      impayes:   Math.round(impayes),
    }
  }, [factures])

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const filteredFac = useMemo(() => {
    const q = searchFac.toLowerCase().trim()
    return factures.filter((f) => {
      if (statutFac !== 'all' && f.statut !== statutFac) return false
      if (q && !(f.numero.toLowerCase().includes(q) || f.client.toLowerCase().includes(q) || (f.commandeNum ?? '').toLowerCase().includes(q))) return false
      return true
    })
  }, [factures, searchFac, statutFac])

  const filteredOrd = useMemo(() => {
    const q = searchOrd.toLowerCase().trim()
    // Only show CONFIRMED or IN_PREPARATION — ready to invoice
    return orders.filter((o) => {
      if (statutOrd !== 'all' && o.statut !== statutOrd) return false
      if (q && !(o.numero.toLowerCase().includes(q) || o.client.toLowerCase().includes(q))) return false
      return true
    })
  }, [orders, searchOrd, statutOrd])

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleCreateInvoice(salesOrderId: string) {
    setProcessingId(salesOrderId)
    const result = await createInvoiceFromOrder(salesOrderId)
    if (result) {
      const { factures: f } = await getCustomerInvoices()
      setFactures(f)
      setTab('factures')
    }
    setProcessingId(null)
  }

  async function handleAdvanceOrder(id: string, next: StatutCommande) {
    setProcessingId(id)
    const ok = await updateSalesOrderStatus(id, next)
    if (ok) {
      const { headers } = await getSalesOrders()
      setOrders(headers)
    }
    setProcessingId(null)
  }

  async function handleAdvanceInvoice(id: string, next: StatutFacture) {
    setProcessingId(id)
    const ok = await updateInvoiceStatus(id, next)
    if (ok) {
      const { factures: f } = await getCustomerInvoices()
      setFactures(f)
    }
    setProcessingId(null)
  }

  const INVOICE_STATUS_NEXT: Partial<Record<StatutFacture, StatutFacture>> = {
    DRAFT: 'SENT',
    SENT:  'PAID',
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administration des Ventes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Facturation clients · Suivi des encaissements · Gestion ADV
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="CA facturé HT"
          value={`${(stats.caFacture / 1_000_000).toFixed(1)} M`}
          sub={`${stats.caFacture.toLocaleString('fr-FR')} XOF`}
          bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          icon={TrendingUp}
        />
        <StatCard
          label="En attente règlement"
          value={stats.envoyees}
          sub="Factures envoyées non réglées"
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={Clock}
        />
        <StatCard
          label="Impayés / Retard"
          value={stats.enRetard}
          sub={stats.impayes > 0 ? `${stats.impayes.toLocaleString('fr-FR')} XOF en souffrance` : 'Aucun impayé'}
          bgClass="bg-red-50 dark:bg-red-950/30"
          iconBgClass="bg-red-100 dark:bg-red-900"
          iconColorClass="text-red-600 dark:text-red-400"
          icon={AlertCircle}
        />
        <StatCard
          label="Factures payées"
          value={stats.payees}
          sub={`sur ${stats.total} facture${stats.total > 1 ? 's' : ''} émises`}
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={CheckCheck}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { id: 'factures',   label: 'Factures clients' },
          { id: 'commandes',  label: 'Commandes à facturer' },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {id === 'commandes' && filteredOrd.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-bold">
                {filteredOrd.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Factures ──────────────────────────────────────────────────── */}
      {tab === 'factures' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                value={searchFac}
                onChange={(e) => setSearchFac(e.target.value)}
                placeholder="Rechercher n° facture, client…"
                className="w-full h-9 pl-9 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <select
              value={statutFac}
              onChange={(e) => setStatutFac(e.target.value as StatutFacture | 'all')}
              className="h-9 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Tous statuts</option>
              {(Object.keys(STATUT_FACTURE_LABELS) as StatutFacture[]).map((s) => (
                <option key={s} value={s}>{STATUT_FACTURE_LABELS[s]}</option>
              ))}
            </select>
            {(searchFac !== '' || statutFac !== 'all') && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                onClick={() => { setSearchFac(''); setStatutFac('all') }}>
                <X className="size-3.5" /> Effacer
              </Button>
            )}
            {custFac && (
              <Button variant="ghost" size="sm" className="text-muted-foreground ml-auto" onClick={resetFac}>
                Réinitialiser colonnes
              </Button>
            )}
          </div>

          <div className="flex-1 rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border-collapse" style={{ minWidth: minWidthFac }}>
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm border-b">
                  <tr>
                    {[
                      { id: 'numero',     label: 'N° facture' },
                      { id: 'commande',   label: 'Commande' },
                      { id: 'client',     label: 'Client' },
                      { id: 'date',       label: 'Date' },
                      { id: 'echeance',   label: 'Échéance' },
                      { id: 'montantHT',  label: 'Montant HT' },
                      { id: 'montantTTC', label: 'Montant TTC' },
                      { id: 'statut',     label: 'Statut' },
                      { id: 'actions',    label: '' },
                    ].map((col, i, arr) => (
                      <th key={col.id}
                        style={{ width: wFac[col.id] ?? INVOICE_COLS.find((c) => c.id === col.id)?.defaultWidth }}
                        className="relative text-left text-xs font-semibold tracking-wide uppercase text-muted-foreground px-4 py-3 select-none whitespace-nowrap"
                      >
                        {col.label}
                        {i < arr.length - 1 && <ColumnResizer columnId={col.id} onStart={srFac} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingFac ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-muted-foreground">
                        <Loader2 className="size-5 animate-spin inline mr-2" /> Chargement…
                      </td>
                    </tr>
                  ) : filteredFac.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-muted-foreground">
                        Aucune facture pour le moment. Créez-en une depuis l'onglet &quot;Commandes à facturer&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredFac.map((f) => {
                      const nextStatut = INVOICE_STATUS_NEXT[f.statut]
                      const isOverdue  = f.statut === 'OVERDUE'
                      return (
                        <tr key={f.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3 font-mono font-semibold text-xs whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <FileText className="size-3.5 text-muted-foreground" />
                              {f.numero}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                            {f.commandeNum ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{f.client}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className={`px-4 py-3 text-xs whitespace-nowrap ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                            {new Date(f.dateEcheance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-xs font-semibold">
                            {f.montantHT.toLocaleString('fr-FR')} <span className="text-muted-foreground font-normal">{f.currency}</span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-xs font-semibold">
                            {f.montantTTC.toLocaleString('fr-FR')} <span className="text-muted-foreground font-normal">{f.currency}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_FACTURE_COLORS[f.statut]}`}>
                              {STATUT_FACTURE_LABELS[f.statut]}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {nextStatut && (
                              <button
                                onClick={() => handleAdvanceInvoice(f.id, nextStatut)}
                                disabled={processingId === f.id}
                                title={`Passer à : ${STATUT_FACTURE_LABELS[nextStatut]}`}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                              >
                                {processingId === f.id
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
            {filteredFac.length > 0 && (
              <div className="px-4 py-2.5 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground shrink-0">
                <span>{filteredFac.length} facture{filteredFac.length > 1 ? 's' : ''}</span>
                <span>Total TTC : <strong className="text-foreground">{filteredFac.reduce((s, f) => s + f.montantTTC, 0).toLocaleString('fr-FR')} XOF</strong></span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab: Commandes à facturer ──────────────────────────────────────── */}
      {tab === 'commandes' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                value={searchOrd}
                onChange={(e) => setSearchOrd(e.target.value)}
                placeholder="Rechercher n° commande, client…"
                className="w-full h-9 pl-9 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <select
              value={statutOrd}
              onChange={(e) => setStatutOrd(e.target.value as StatutCommande | 'all')}
              className="h-9 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Tous statuts</option>
              {(['CONFIRMED','IN_PREPARATION','SHIPPED'] as StatutCommande[]).map((s) => (
                <option key={s} value={s}>{STATUT_COMMANDE_LABELS[s]}</option>
              ))}
            </select>
            {(searchOrd !== '' || statutOrd !== 'all') && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                onClick={() => { setSearchOrd(''); setStatutOrd('all') }}>
                <X className="size-3.5" /> Effacer
              </Button>
            )}
          </div>

          <div className="flex-1 rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border-collapse" style={{ minWidth: minWidthOrd }}>
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm border-b">
                  <tr>
                    {[
                      { id: 'numero',    label: 'N° commande' },
                      { id: 'date',      label: 'Date' },
                      { id: 'client',    label: 'Client' },
                      { id: 'livraison', label: 'Livraison souhaitée' },
                      { id: 'statut',    label: 'Statut' },
                      { id: 'actions',   label: 'Action' },
                    ].map((col, i, arr) => (
                      <th key={col.id}
                        style={{ width: wOrd[col.id] ?? ORDER_COLS.find((c) => c.id === col.id)?.defaultWidth }}
                        className="relative text-left text-xs font-semibold tracking-wide uppercase text-muted-foreground px-4 py-3 select-none whitespace-nowrap"
                      >
                        {col.label}
                        {i < arr.length - 1 && <ColumnResizer columnId={col.id} onStart={srOrd} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingOrd ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground">
                        <Loader2 className="size-5 animate-spin inline mr-2" /> Chargement…
                      </td>
                    </tr>
                  ) : filteredOrd.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground">
                        Aucune commande à facturer pour le moment.
                      </td>
                    </tr>
                  ) : (
                    filteredOrd.map((o) => {
                      const nextStatut = STATUT_COMMANDE_NEXT[o.statut]
                      const alreadyInvoiced = o.statut === 'INVOICED'
                      return (
                        <tr key={o.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3 font-mono font-semibold text-xs whitespace-nowrap">{o.numero}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(o.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{o.client}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(o.dateLivraisonSouhaitee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_COMMANDE_COLORS[o.statut]}`}>
                              {STATUT_COMMANDE_LABELS[o.statut]}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {!alreadyInvoiced && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs h-7"
                                  disabled={processingId === o.id}
                                  onClick={() => handleCreateInvoice(o.id)}
                                >
                                  {processingId === o.id
                                    ? <Loader2 className="size-3 animate-spin" />
                                    : <Plus className="size-3" />}
                                  Créer facture
                                </Button>
                              )}
                              {nextStatut && nextStatut !== 'INVOICED' && (
                                <button
                                  onClick={() => handleAdvanceOrder(o.id, nextStatut)}
                                  disabled={processingId === o.id}
                                  title={`Passer à : ${STATUT_COMMANDE_LABELS[nextStatut]}`}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                                >
                                  <ChevronRight className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
