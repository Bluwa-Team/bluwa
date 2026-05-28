'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, X, MoreHorizontal, Truck, Package,
  Clock, CheckCheck, Loader2, ChevronRight, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  BonLivraison, StatutBL,
  STATUT_BL_COLORS, STATUT_BL_LABELS, STATUT_BL_NEXT,
} from './_components/types'
import {
  getDeliveryNotes, createDeliveryNote, updateDeliveryStatus,
  type CreateDeliveryNoteInput,
} from '@/lib/actions/logistique'
import { getSalesOrders } from '@/lib/actions/ventes'
import { CommandeClientHeader } from '../ventes/_components/types'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'

// ── Colonnes ──────────────────────────────────────────────────────────────────

const COLUMNS: ResizableColumn[] = [
  { id: 'numero',       defaultWidth: 145, minWidth: 115 },
  { id: 'commande',     defaultWidth: 130, minWidth: 100 },
  { id: 'client',       defaultWidth: 200, minWidth: 150 },
  { id: 'date',         defaultWidth: 120, minWidth: 95  },
  { id: 'transporteur', defaultWidth: 160, minWidth: 120 },
  { id: 'refSuivi',     defaultWidth: 170, minWidth: 130 },
  { id: 'adresse',      defaultWidth: 200, minWidth: 150 },
  { id: 'statut',       defaultWidth: 140, minWidth: 110 },
  { id: 'actions',      defaultWidth: 72,  minWidth: 60  },
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

// ── Modal création BL ─────────────────────────────────────────────────────────

function CreateBLModal({
  open, orders, onClose, onSave,
}: {
  open:    boolean
  orders:  CommandeClientHeader[]
  onClose: () => void
  onSave:  (input: CreateDeliveryNoteInput) => Promise<boolean>
}) {
  const today = new Date().toISOString().split('T')[0]
  const [salesOrderId,    setSalesOrderId]    = useState('')
  const [deliveryDate,    setDeliveryDate]    = useState(today)
  const [carrier,         setCarrier]         = useState('')
  const [trackingRef,     setTrackingRef]     = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes,           setNotes]           = useState('')
  const [saving,          setSaving]          = useState(false)

  useEffect(() => {
    if (!open) return
    setSalesOrderId(''); setDeliveryDate(today); setCarrier('')
    setTrackingRef(''); setDeliveryAddress(''); setNotes('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const isValid = salesOrderId && deliveryDate

  async function handleSave() {
    if (!isValid) return
    setSaving(true)
    const ok = await onSave({
      salesOrderId,
      deliveryDate,
      carrier:         carrier.trim() || null,
      trackingRef:     trackingRef.trim() || null,
      deliveryAddress: deliveryAddress.trim() || null,
      notes:           notes.trim() || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  // Only show orders that can be shipped (not already cancelled)
  const eligibleOrders = orders.filter((o) => !['CANCELLED','INVOICED'].includes(o.statut))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(560px,96vw)] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b shrink-0">
              <div>
                <p className="font-semibold">Nouveau bon de livraison</p>
                <p className="text-sm text-muted-foreground mt-0.5">Créer un BL depuis une commande client</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Commande client <span className="text-destructive">*</span>
                </Label>
                <select
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner une commande…</option>
                  {eligibleOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.numero} — {o.client}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Date de livraison <span className="text-destructive">*</span>
                </Label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Transporteur</Label>
                  <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="DHL, Véhicule interne…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Réf. suivi</Label>
                  <Input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} placeholder="Numéro de tracking" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Adresse de livraison</Label>
                <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Av. Bourguiba, Dakar…" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instructions particulières…" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end p-4 border-t shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
              <Button onClick={handleSave} disabled={!isValid || saving}>
                {saving ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</> : 'Créer le BL'}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LogistiquePage() {
  const [bls,     setBls]     = useState<BonLivraison[]>([])
  const [orders,  setOrders]  = useState<CommandeClientHeader[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [search,       setSearch]       = useState('')
  const [statutFilt,   setStatutFilt]   = useState<StatutBL | 'all'>('all')
  const [advancingId,  setAdvancingId]  = useState<string | null>(null)

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:logistique',
    COLUMNS,
  )
  const tableMinWidth = COLUMNS.reduce(
    (sum, c) => sum + (widths[c.id] ?? c.defaultWidth ?? 0), 0,
  )

  useEffect(() => {
    Promise.all([getDeliveryNotes(), getSalesOrders()]).then(
      ([{ bls: b }, { headers: h }]) => {
        setBls(b)
        setOrders(h)
        setLoading(false)
      },
    )
  }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     bls.length,
    aPrep:     bls.filter((b) => b.statut === 'DRAFT').length,
    enTransit: bls.filter((b) => b.statut === 'SHIPPED').length,
    livres:    bls.filter((b) => b.statut === 'DELIVERED').length,
  }), [bls])

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return bls.filter((b) => {
      if (statutFilt !== 'all' && b.statut !== statutFilt) return false
      if (q && !(
        b.numero.toLowerCase().includes(q)
        || b.client.toLowerCase().includes(q)
        || (b.commandeNum ?? '').toLowerCase().includes(q)
        || (b.transporteur ?? '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [bls, search, statutFilt])

  const hasFilters = search !== '' || statutFilt !== 'all'

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleSave(input: CreateDeliveryNoteInput): Promise<boolean> {
    const result = await createDeliveryNote(input)
    if (!result) return false
    const { bls: b } = await getDeliveryNotes()
    setBls(b)
    return true
  }

  async function handleAdvance(id: string, next: StatutBL) {
    setAdvancingId(id)
    const ok = await updateDeliveryStatus(id, next)
    if (ok) {
      const { bls: b } = await getDeliveryNotes()
      setBls(b)
    }
    setAdvancingId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logistique</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bons de livraison · Suivi transporteur · Expéditions
          </p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setModalOpen(true)}>
          <Plus className="size-4" /> Nouveau BL
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="À préparer"
          value={stats.aPrep}
          sub="BL en statut brouillon"
          bgClass="bg-amber-50 dark:bg-amber-950/30"
          iconBgClass="bg-amber-100 dark:bg-amber-900"
          iconColorClass="text-amber-600 dark:text-amber-400"
          icon={Package}
        />
        <StatCard
          label="En transit"
          value={stats.enTransit}
          sub="Expédiés, en attente de livraison"
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={Truck}
        />
        <StatCard
          label="Livrés"
          value={stats.livres}
          sub="Bons de livraison confirmés"
          bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          icon={CheckCheck}
        />
        <StatCard
          label="Total BL"
          value={stats.total}
          sub="Tous statuts confondus"
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={Clock}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher n°, client, commande…"
            className="w-full h-9 pl-9 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={statutFilt}
          onChange={(e) => setStatutFilt(e.target.value as StatutBL | 'all')}
          className="h-9 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">Tous statuts</option>
          {(Object.keys(STATUT_BL_LABELS) as StatutBL[]).map((s) => (
            <option key={s} value={s}>{STATUT_BL_LABELS[s]}</option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
            onClick={() => { setSearch(''); setStatutFilt('all') }}>
            <X className="size-3.5" /> Effacer
          </Button>
        )}
        {isCustomized && (
          <Button variant="ghost" size="sm" className="text-muted-foreground ml-auto" onClick={reset}>
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
                  { id: 'numero',       label: 'N° BL' },
                  { id: 'commande',     label: 'Commande' },
                  { id: 'client',       label: 'Client' },
                  { id: 'date',         label: 'Date livraison' },
                  { id: 'transporteur', label: 'Transporteur' },
                  { id: 'refSuivi',     label: 'Réf. suivi' },
                  { id: 'adresse',      label: 'Adresse' },
                  { id: 'statut',       label: 'Statut' },
                  { id: 'actions',      label: '' },
                ].map((col, i, arr) => (
                  <th
                    key={col.id}
                    style={{ width: widths[col.id] ?? COLUMNS.find((c) => c.id === col.id)?.defaultWidth }}
                    className="relative text-left text-xs font-semibold tracking-wide uppercase text-muted-foreground px-4 py-3 select-none whitespace-nowrap"
                  >
                    {col.label}
                    {i < arr.length - 1 && <ColumnResizer columnId={col.id} onStart={startResize} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin inline mr-2" /> Chargement des bons de livraison…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground">
                    {hasFilters ? 'Aucun BL ne correspond aux filtres.' : 'Aucun bon de livraison pour le moment.'}
                  </td>
                </tr>
              ) : (
                filtered.map((bl) => {
                  const next = STATUT_BL_NEXT[bl.statut]
                  return (
                    <tr key={bl.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3 font-mono font-semibold text-xs whitespace-nowrap">{bl.numero}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {bl.commandeNum ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{bl.client}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(bl.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{bl.transporteur ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {bl.refSuivi ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {bl.adresseLivraison ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate max-w-[180px] block">{bl.adresseLivraison}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_BL_COLORS[bl.statut]}`}>
                          {STATUT_BL_LABELS[bl.statut]}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {next && (
                          <button
                            onClick={() => handleAdvance(bl.id, next)}
                            disabled={advancingId === bl.id}
                            title={`Passer à : ${STATUT_BL_LABELS[next]}`}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            {advancingId === bl.id
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
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-muted/30 text-xs text-muted-foreground shrink-0">
            {filtered.length} bon{filtered.length > 1 ? 's' : ''} de livraison
          </div>
        )}
      </div>

      <CreateBLModal
        open={modalOpen}
        orders={orders}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
