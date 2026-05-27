'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ClipboardCheck, Plus, ChevronRight, CheckCircle2,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
  X, Save, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MOCK_INVENTORY_DOCS,
  MOCK_INVENTORY_ITEMS,
  type InventoryDocument,
  type InventoryDocumentItem,
  type InventoryStatus,
  INVENTORY_STATUS_LABELS,
  INVENTORY_STATUS_COLORS,
} from '../stocks/_components/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusChip({ status }: { status: InventoryStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${INVENTORY_STATUS_COLORS[status]}`}>
      {status === 'PROPOSED' && <ClipboardCheck className="size-2.5 mr-1" />}
      {status === 'COUNTED'  && <AlertTriangle  className="size-2.5 mr-1 text-amber-500" />}
      {status === 'POSTED'   && <CheckCircle2   className="size-2.5 mr-1 text-emerald-600" />}
      {INVENTORY_STATUS_LABELS[status]}
    </span>
  )
}

function DiffChip({ diff }: { diff: number | null }) {
  if (diff === null) return <span className="text-xs text-muted-foreground">—</span>
  if (diff === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <Minus className="size-3" /> 0
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {diff > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {diff > 0 ? '+' : ''}{diff.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
    </span>
  )
}

// ── Modal de détail / comptage ────────────────────────────────────────────────

interface DetailModalProps {
  doc:    InventoryDocument
  items:  InventoryDocumentItem[]
  onClose: () => void
  onSave:  (docId: string, counts: Record<string, number | null>) => void
  onPost:  (docId: string) => void
}

function DetailModal({ doc, items, onClose, onSave, onPost }: DetailModalProps) {
  const editable = doc.status !== 'POSTED'

  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.countedQuantity !== null ? String(i.countedQuantity) : '']))
  )

  const parsedCounts: Record<string, number | null> = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, v === '' ? null : parseFloat(v)])
  )

  const allCounted = items.every(
    (i) => parsedCounts[i.id] !== null && !isNaN(parsedCounts[i.id] as number)
  )

  const totalEcart = items.reduce((s, i) => {
    const cnt = parsedCounts[i.id]
    if (cnt === null || isNaN(cnt as number)) return s
    return s + (cnt - i.bookQuantity)
  }, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">{doc.documentNumber}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Créé le {fmtDate(doc.createdAt)}
              {doc.postedAt && ` · Validé le ${fmtDate(doc.postedAt)}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusChip status={doc.status} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune ligne dans ce document.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left pb-2 font-semibold">Article</th>
                  <th className="text-left pb-2 font-semibold">Lot</th>
                  <th className="text-right pb-2 font-semibold">Qté système</th>
                  <th className="text-right pb-2 font-semibold">Qté comptée</th>
                  <th className="text-right pb-2 font-semibold">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((item) => {
                  const cnt  = parsedCounts[item.id]
                  const diff = cnt !== null && !isNaN(cnt) ? cnt - item.bookQuantity : null
                  return (
                    <tr
                      key={item.id}
                      className={diff !== null && diff !== 0 ? (diff > 0 ? 'bg-emerald-50/30' : 'bg-red-50/30') : ''}
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium">{item.articleDesignation}</p>
                        <p className="text-xs font-mono text-muted-foreground">{item.articleCode}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs font-mono text-muted-foreground">
                          {item.batchNumber ?? <span className="italic">Sans lot</span>}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        <span className="font-medium">{item.bookQuantity.toLocaleString('fr-FR')}</span>
                        <span className="text-xs text-muted-foreground ml-1">{item.unite}</span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {editable ? (
                          <input
                            type="number"
                            value={counts[item.id]}
                            onChange={(e) => setCounts((p) => ({ ...p, [item.id]: e.target.value }))}
                            placeholder="—"
                            className="w-24 text-right tabular-nums bg-background border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min={0}
                            step="any"
                          />
                        ) : (
                          <span className="tabular-nums font-medium">
                            {item.countedQuantity !== null
                              ? `${item.countedQuantity.toLocaleString('fr-FR')} ${item.unite}`
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <DiffChip diff={diff} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold text-sm">
                    <td className="pt-3" colSpan={3}>Écart total période</td>
                    <td className="pt-3" />
                    <td className="pt-3 text-right">
                      <DiffChip diff={totalEcart} />
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Footer actions */}
        {editable && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t shrink-0 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {allCounted
                ? `Toutes les lignes comptées · Écart : ${totalEcart > 0 ? '+' : ''}${totalEcart.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}`
                : `${items.filter((i) => parsedCounts[i.id] === null || isNaN(parsedCounts[i.id] as number)).length} ligne(s) non comptée(s)`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
              <Button
                variant="outline" size="sm"
                onClick={() => onSave(doc.id, parsedCounts)}
                className="gap-1.5"
              >
                <Save className="size-3.5" /> Sauvegarder
              </Button>
              {allCounted && doc.status !== 'POSTED' && (
                <Button
                  size="sm"
                  onClick={() => { onPost(doc.id); onClose() }}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="size-3.5" /> Valider les écarts
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InventairePage() {
  const [docs,  setDocs]  = useState<InventoryDocument[]>(MOCK_INVENTORY_DOCS)
  const [items, setItems] = useState<InventoryDocumentItem[]>(MOCK_INVENTORY_ITEMS)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus]   = useState<InventoryStatus | 'ALL'>('ALL')

  const selectedDoc   = useMemo(() => docs.find((d) => d.id === selectedDocId) ?? null, [docs, selectedDocId])
  const selectedItems = useMemo(() => items.filter((i) => i.inventoryDocumentId === selectedDocId), [items, selectedDocId])

  const kpis = useMemo(() => {
    const totalEcart = items.reduce((s, i) => s + (i.differenceQuantity ?? 0), 0)
    const nbEcarts   = items.filter((i) => (i.differenceQuantity ?? 0) !== 0).length
    return {
      total:    docs.length,
      proposed: docs.filter((d) => d.status === 'PROPOSED').length,
      counted:  docs.filter((d) => d.status === 'COUNTED').length,
      posted:   docs.filter((d) => d.status === 'POSTED').length,
      totalEcart, nbEcarts,
    }
  }, [docs, items])

  const filtered = useMemo(
    () => filterStatus === 'ALL' ? docs : docs.filter((d) => d.status === filterStatus),
    [docs, filterStatus],
  )

  const handleNewDoc = useCallback(() => {
    const num = `INV-2026-${String(docs.length + 1).padStart(4, '0')}`
    setDocs((prev) => [{
      id: `inv-${Date.now()}`, organizationId: 'org-1', factoryId: 'fac-1',
      documentNumber: num, status: 'PROPOSED',
      createdBy: 'user-1', createdAt: new Date().toISOString(), postedAt: null,
    }, ...prev])
  }, [docs.length])

  const handleSave = useCallback((docId: string, counts: Record<string, number | null>) => {
    setItems((prev) => prev.map((item) => {
      if (item.inventoryDocumentId !== docId) return item
      const cnt = counts[item.id] ?? null
      return { ...item, countedQuantity: cnt, differenceQuantity: cnt !== null ? cnt - item.bookQuantity : null }
    }))
    const docItems = items.filter((i) => i.inventoryDocumentId === docId)
    const allDone  = docItems.every((i) => { const c = counts[i.id]; return c !== null && !isNaN(c) })
    if (allDone) {
      setDocs((prev) => prev.map((d) => d.id === docId && d.status === 'PROPOSED' ? { ...d, status: 'COUNTED' } : d))
    }
  }, [items])

  const handlePost = useCallback((docId: string) => {
    setDocs((prev) => prev.map((d) =>
      d.id === docId ? { ...d, status: 'POSTED', postedAt: new Date().toISOString() } : d
    ))
  }, [])

  const FILTER_TABS: { key: InventoryStatus | 'ALL'; label: string; count: number }[] = [
    { key: 'ALL',      label: 'Tous',    count: kpis.total    },
    { key: 'PROPOSED', label: 'Proposé', count: kpis.proposed },
    { key: 'COUNTED',  label: 'Compté',  count: kpis.counted  },
    { key: 'POSTED',   label: 'Validé',  count: kpis.posted   },
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventaires</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comptage physique · Écarts imputés en stock (<code className="font-mono text-xs bg-muted px-1 rounded">INV_ADJ</code>)
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={handleNewDoc}>
          <Plus className="size-4" /> Nouveau document
        </Button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Documents total',       value: String(kpis.total),    sub: 'sur la période',
            color: 'bg-slate-50/50 border', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', Icon: ClipboardCheck },
          { label: 'En attente de comptage', value: String(kpis.proposed), sub: 'PROPOSED',
            color: 'bg-blue-50/50 border',  iconBg: 'bg-blue-100',  iconColor: 'text-blue-600',  Icon: ClipboardCheck },
          { label: 'Prêts à valider',        value: String(kpis.counted),  sub: 'COUNTED — en attente de posting',
            color: `bg-amber-50/50 border${kpis.counted > 0 ? ' ring-1 ring-amber-300/50' : ''}`,
            iconBg: 'bg-amber-100', iconColor: 'text-amber-600', Icon: AlertTriangle },
          { label: 'Écart période',
            value: `${kpis.totalEcart > 0 ? '+' : ''}${kpis.totalEcart.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`,
            sub: `${kpis.nbEcarts} ligne(s) avec différence`,
            color: kpis.totalEcart !== 0 ? 'bg-red-50/50 border ring-1 ring-red-300/40' : 'bg-emerald-50/50 border',
            iconBg: kpis.totalEcart !== 0 ? 'bg-red-100' : 'bg-emerald-100',
            iconColor: kpis.totalEcart !== 0 ? 'text-red-600' : 'text-emerald-600',
            Icon: kpis.totalEcart > 0 ? TrendingUp : kpis.totalEcart < 0 ? TrendingDown : CheckCircle2 },
        ].map((c) => (
          <div key={c.label} className={`rounded-2xl p-4 transition-all hover:scale-[1.02] hover:shadow-md ${c.color}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.iconBg}`}>
                <c.Icon className={`size-4 ${c.iconColor}`} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1 border-b">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterStatus(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filterStatus === t.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            <span className={`ml-0.5 text-xs rounded-full px-1.5 py-0.5 font-semibold ${
              filterStatus === t.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-xs text-muted-foreground">
              <th className="text-left px-4 py-3 font-semibold">N° Document</th>
              <th className="text-left px-4 py-3 font-semibold">Date création</th>
              <th className="text-left px-4 py-3 font-semibold">Statut</th>
              <th className="text-right px-4 py-3 font-semibold">Lignes</th>
              <th className="text-right px-4 py-3 font-semibold">Lignes comptées</th>
              <th className="text-right px-4 py-3 font-semibold">Écart total</th>
              <th className="text-left px-4 py-3 font-semibold">Date validation</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucun document d'inventaire.
                </td>
              </tr>
            )}
            {filtered.map((doc) => {
              const docItems   = items.filter((i) => i.inventoryDocumentId === doc.id)
              const countedNb  = docItems.filter((i) => i.countedQuantity !== null).length
              const ecartTotal = docItems.reduce((s, i) => s + (i.differenceQuantity ?? 0), 0)
              const hasEcart   = docItems.some((i) => (i.differenceQuantity ?? 0) !== 0)
              return (
                <tr
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`hover:bg-muted/30 transition-colors cursor-pointer ${doc.status === 'COUNTED' ? 'bg-amber-50/20' : ''}`}
                >
                  <td className="px-4 py-3 font-mono font-semibold">{doc.documentNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(doc.createdAt)}</td>
                  <td className="px-4 py-3"><StatusChip status={doc.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{docItems.length}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {docItems.length > 0 ? (
                      <span className={countedNb === docItems.length ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                        {countedNb} / {docItems.length}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {docItems.length > 0 ? <DiffChip diff={ecartTotal} /> : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.postedAt ? fmtDate(doc.postedAt) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.status === 'COUNTED' && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          À valider
                        </span>
                      )}
                      {hasEcart && doc.status !== 'PROPOSED' && (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                          Écart
                        </span>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Méthodologie ── */}
      <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground mb-1">Méthodologie</p>
        <p><strong>PROPOSED</strong> → Document créé, en attente de comptage physique (stock théorique = snapshot à la création).</p>
        <p><strong>COUNTED</strong> → Toutes les lignes ont une quantité comptée. Prêt pour validation comptable.</p>
        <p><strong>POSTED</strong> → Les écarts (counted − book) génèrent des mouvements de type <code className="font-mono bg-muted px-1 rounded">INV_ADJ</code>. Le stock est mis à jour.</p>
      </div>

      {/* ── Detail Modal ── */}
      {selectedDoc && (
        <DetailModal
          doc={selectedDoc}
          items={selectedItems}
          onClose={() => setSelectedDocId(null)}
          onSave={handleSave}
          onPost={handlePost}
        />
      )}

    </div>
  )
}
