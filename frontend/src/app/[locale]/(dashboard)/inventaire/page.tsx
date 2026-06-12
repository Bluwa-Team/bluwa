'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ClipboardCheck, Plus, ChevronRight, CheckCircle2,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
  X, Save, Send, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  InventoryDocument,
  InventoryDocumentItem,
  InventoryStatus,
} from '@/types/erp'
import {
  INVENTORY_STATUS_LABELS,
  INVENTORY_STATUS_COLORS,
} from '@/types/erp'
import {
  getInventoryDocuments,
  getInventoryDocumentItems,
  createInventoryDocument,
  saveInventoryCounts,
  postInventoryDocument,
} from '@/lib/actions/inventaire'
import { HelpPopover } from '@/components/ui/help-popover'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
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
      <Minus className="size-3" />0
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {diff > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {diff > 0 ? '+' : ''}{diff.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
    </span>
  )
}

// ── Modal de comptage ─────────────────────────────────────────────────────────

interface DetailModalProps {
  doc:         InventoryDocument
  items:       InventoryDocumentItem[]
  itemsLoading: boolean
  onClose:     () => void
  onSave:      (docId: string, counts: Record<string, number | null>) => Promise<void>
  onPost:      (docId: string) => Promise<void>
}

function DetailModal({ doc, items, itemsLoading, onClose, onSave, onPost }: DetailModalProps) {
  const editable = doc.status !== 'POSTED'
  const [saving, setSaving]   = useState(false)
  const [posting, setPosting] = useState(false)

  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.map((i) => [i.id, i.countedQuantity !== null ? String(i.countedQuantity) : '']),
    ),
  )

  // Sync si items chargés après ouverture du modal
  useEffect(() => {
    setCounts(
      Object.fromEntries(
        items.map((i) => [i.id, i.countedQuantity !== null ? String(i.countedQuantity) : '']),
      ),
    )
  }, [items])

  const parsed: Record<string, number | null> = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, v === '' ? null : parseFloat(v)]),
  )

  const allCounted = items.length > 0 &&
    items.every((i) => parsed[i.id] !== null && !isNaN(parsed[i.id] as number))

  const totalEcart = items.reduce((s, i) => {
    const cnt = parsed[i.id]
    if (cnt === null || isNaN(cnt as number)) return s
    return s + (cnt - i.bookQuantity)
  }, 0)

  async function handleSave() {
    setSaving(true)
    await onSave(doc.id, parsed)
    setSaving(false)
  }

  async function handlePost() {
    setPosting(true)
    await onPost(doc.id)
    setPosting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold font-mono">{doc.documentNumber}</h2>
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
          {itemsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Chargement des lignes…</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune ligne dans ce document.
            </p>
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
                  const cnt  = parsed[item.id]
                  const diff = cnt !== null && !isNaN(cnt) ? cnt - item.bookQuantity : null
                  return (
                    <tr
                      key={item.id}
                      className={diff !== null && diff !== 0
                        ? diff > 0 ? 'bg-emerald-50/30' : 'bg-red-50/30'
                        : ''}
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
                            value={counts[item.id] ?? ''}
                            onChange={(e) =>
                              setCounts((p) => ({ ...p, [item.id]: e.target.value }))
                            }
                            placeholder="—"
                            min={0}
                            step="any"
                            className="w-24 text-right tabular-nums bg-background border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <td className="pt-3" colSpan={3}>Écart total</td>
                    <td className="pt-3" />
                    <td className="pt-3 text-right"><DiffChip diff={totalEcart} /></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Footer */}
        {editable && !itemsLoading && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t shrink-0 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {allCounted
                ? `Toutes les lignes comptées · Écart : ${totalEcart > 0 ? '+' : ''}${totalEcart.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}`
                : `${items.filter((i) => parsed[i.id] === null || isNaN(parsed[i.id] as number)).length} ligne(s) non comptée(s)`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
              <Button
                variant="outline" size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5"
              >
                {saving
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Save className="size-3.5" />}
                Sauvegarder
              </Button>
              {allCounted && doc.status !== 'POSTED' && (
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={posting}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {posting
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Send className="size-3.5" />}
                  Valider les écarts
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventairePage() {
  const [docs,         setDocs]         = useState<InventoryDocument[]>([])
  const [docsLoading,  setDocsLoading]  = useState(true)
  const [creating,     setCreating]     = useState(false)
  const [filterStatus, setFilterStatus] = useState<InventoryStatus | 'ALL'>('ALL')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  // Cache items par doc pour ne pas recharger à chaque ouverture
  const [itemsCache,   setItemsCache]   = useState<Record<string, InventoryDocumentItem[]>>({})
  const [itemsLoading, setItemsLoading] = useState(false)

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    getInventoryDocuments().then((data) => {
      setDocs(data)
      setDocsLoading(false)
    })
  }, [])

  // ── Chargement des lignes à l'ouverture d'un document ─────────────────────

  useEffect(() => {
    if (!selectedDocId) return
    if (itemsCache[selectedDocId]) return   // déjà en cache
    setItemsLoading(true)
    getInventoryDocumentItems(selectedDocId).then((items) => {
      setItemsCache((c) => ({ ...c, [selectedDocId]: items }))
      setItemsLoading(false)
    })
  }, [selectedDocId, itemsCache])

  // ── Données dérivées ──────────────────────────────────────────────────────

  const selectedDoc   = docs.find((d) => d.id === selectedDocId) ?? null
  const selectedItems = selectedDocId ? (itemsCache[selectedDocId] ?? []) : []

  const kpis = useMemo(() => {
    const allItems = Object.values(itemsCache).flat()
    const totalEcart = allItems.reduce((s, i) => s + (i.differenceQuantity ?? 0), 0)
    const nbEcarts   = allItems.filter((i) => (i.differenceQuantity ?? 0) !== 0).length
    return {
      total:    docs.length,
      proposed: docs.filter((d) => d.status === 'PROPOSED').length,
      counted:  docs.filter((d) => d.status === 'COUNTED').length,
      posted:   docs.filter((d) => d.status === 'POSTED').length,
      totalEcart,
      nbEcarts,
    }
  }, [docs, itemsCache])

  const filtered = useMemo(
    () => filterStatus === 'ALL' ? docs : docs.filter((d) => d.status === filterStatus),
    [docs, filterStatus],
  )

  const FILTER_TABS = [
    { key: 'ALL'      as const, label: 'Tous',    count: kpis.total    },
    { key: 'PROPOSED' as const, label: 'Proposé', count: kpis.proposed },
    { key: 'COUNTED'  as const, label: 'Compté',  count: kpis.counted  },
    { key: 'POSTED'   as const, label: 'Validé',  count: kpis.posted   },
  ]

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleNewDoc = useCallback(async () => {
    setCreating(true)
    const doc = await createInventoryDocument()
    if (doc) {
      setDocs((prev) => [doc, ...prev])
      setSelectedDocId(doc.id)   // ouvre directement le nouveau document
    }
    setCreating(false)
  }, [])

  const handleSave = useCallback(async (
    docId: string,
    counts: Record<string, number | null>,
  ) => {
    const result = await saveInventoryCounts(docId, counts)
    if (!result) return
    // Mise à jour du cache d'items
    setItemsCache((c) => ({ ...c, [docId]: result.items }))
    // Mise à jour du statut du document si passé à COUNTED
    setDocs((prev) =>
      prev.map((d) => d.id === docId ? { ...d, status: result.docStatus } : d),
    )
  }, [])

  const handlePost = useCallback(async (docId: string) => {
    const updated = await postInventoryDocument(docId)
    if (updated) {
      setDocs((prev) => prev.map((d) => d.id === docId ? updated : d))
    }
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Inventaires</h1>
            <HelpPopover section="inventaire" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Comptage physique · Écarts imputés en stock{' '}
            <code className="font-mono text-xs bg-muted px-1 rounded">INV_ADJ</code>
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={handleNewDoc}
          disabled={creating}
        >
          {creating
            ? <Loader2 className="size-4 animate-spin" />
            : <Plus className="size-4" />}
          Nouveau document
        </Button>
      </div>

      {/* Filter tabs */}
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
              filterStatus === t.key
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden">
        {docsLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">N° Document</th>
                <th className="text-left px-4 py-3 font-semibold">Date création</th>
                <th className="text-left px-4 py-3 font-semibold">Statut</th>
                <th className="text-right px-4 py-3 font-semibold">Lignes comptées</th>
                <th className="text-right px-4 py-3 font-semibold">Écart total</th>
                <th className="text-left px-4 py-3 font-semibold">Date validation</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {filterStatus === 'ALL'
                      ? 'Aucun document d\'inventaire. Créez le premier !'
                      : `Aucun document en statut "${INVENTORY_STATUS_LABELS[filterStatus as InventoryStatus]}".`}
                  </td>
                </tr>
              )}
              {filtered.map((doc) => {
                const cachedItems = itemsCache[doc.id]
                const countedNb   = cachedItems
                  ? cachedItems.filter((i) => i.countedQuantity !== null).length
                  : null
                const totalNb     = cachedItems?.length ?? null
                const ecartTotal  = cachedItems
                  ? cachedItems.reduce((s, i) => s + (i.differenceQuantity ?? 0), 0)
                  : null
                const hasEcart    = cachedItems
                  ? cachedItems.some((i) => (i.differenceQuantity ?? 0) !== 0)
                  : false

                return (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                      doc.status === 'COUNTED' ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold">{doc.documentNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(doc.createdAt)}</td>
                    <td className="px-4 py-3"><StatusChip status={doc.status} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {totalNb !== null ? (
                        <span className={countedNb === totalNb ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                          {countedNb} / {totalNb}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ecartTotal !== null
                        ? <DiffChip diff={ecartTotal} />
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.postedAt ? fmtDate(doc.postedAt) : '—'}
                    </td>
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
        )}
      </div>

      {/* Modal */}
      {selectedDoc && (
        <DetailModal
          doc={selectedDoc}
          items={selectedItems}
          itemsLoading={itemsLoading}
          onClose={() => setSelectedDocId(null)}
          onSave={handleSave}
          onPost={handlePost}
        />
      )}
    </div>
  )
}
