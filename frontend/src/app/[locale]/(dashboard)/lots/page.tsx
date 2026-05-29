'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Package, CheckCircle2, BookCheck, AlertTriangle,
  RotateCcw, Trash2, Loader2, Plus, Calculator,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  getProductionOutputs,
  confirmProductionOutput,
  postProductionOutput,
  deleteProductionOutput,
} from '@/lib/actions/production-outputs'
import type { ProductionOutputRow, ProductionOutputStatus } from '@/types/erp'
import {
  PRODUCTION_OUTPUT_STATUS_LABELS,
  PRODUCTION_OUTPUT_STATUS_COLORS,
  formatDlcStatus,
} from '@/types/erp'
import { DeclareOutputModal } from './_components/declare-output-modal'
import { HelpPopover }        from '@/components/ui/help-popover'

// ── Colonnes ──────────────────────────────────────────────────────────────────

const OUTPUT_COLS: ResizableColumn[] = [
  { id: 'outputNumber',  defaultWidth: 160, minWidth: 130 },
  { id: 'article',       defaultWidth: 220, minWidth: 160 },
  { id: 'orderNumber',   defaultWidth: 140, minWidth: 110 },
  { id: 'batchNumber',   defaultWidth: 180, minWidth: 140 },
  { id: 'qtyProduced',   defaultWidth: 130, minWidth: 100 },
  { id: 'qtyScrap',      defaultWidth: 110, minWidth: 85  },
  { id: 'expiryDate',    defaultWidth: 140, minWidth: 110 },
  { id: 'declaredAt',    defaultWidth: 130, minWidth: 110 },
  { id: 'status',        defaultWidth: 130, minWidth: 110 },
  { id: 'actions',       defaultWidth: 200, minWidth: 170 },
]

type FilterTab = ProductionOutputStatus | 'ALL'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LotsProductionPage() {
  const locale  = useLocale()
  const today   = new Date().toISOString().split('T')[0]

  const [outputs,    setOutputs]    = useState<ProductionOutputRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [actingId,   setActingId]   = useState<string | null>(null)
  const [filter,     setFilter]     = useState<FilterTab>('ALL')
  const [showModal,  setShowModal]  = useState(false)

  const { widths: wO, startResize: srO, reset: rO, isCustomized: icO } =
    useResizableColumns('bluwa:cols:lots-production', OUTPUT_COLS)

  const minWidth = OUTPUT_COLS.reduce((s, c) => s + (wO[c.id] ?? c.defaultWidth ?? 0), 0)

  // ── Chargement ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getProductionOutputs('ALL')
    setOutputs(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const posted    = outputs.filter((o) => o.status === 'POSTED')
    const confirmed = outputs.filter((o) => o.status === 'CONFIRMED')
    const draft     = outputs.filter((o) => o.status === 'DRAFT')
    const totalPosted  = posted.reduce((s, o) => s + o.quantityProduced, 0)
    const avgRebut  = posted.length > 0
      ? Math.round(
          (posted.reduce((s, o) => s + o.tauxRebut, 0) / posted.length) * 100,
        ) / 100
      : 0
    return {
      postedCount:    posted.length,
      confirmedCount: confirmed.length,
      draftCount:     draft.length,
      totalProduced:  totalPosted,
      avgRebut,
    }
  }, [outputs])

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const visible = useMemo(
    () => filter === 'ALL' ? outputs : outputs.filter((o) => o.status === filter),
    [outputs, filter],
  )

  const counts = useMemo(() => ({
    ALL:       outputs.length,
    DRAFT:     outputs.filter((o) => o.status === 'DRAFT').length,
    CONFIRMED: outputs.filter((o) => o.status === 'CONFIRMED').length,
    POSTED:    outputs.filter((o) => o.status === 'POSTED').length,
  }), [outputs])

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleConfirm(id: string) {
    setActingId(id)
    const updated = await confirmProductionOutput(id)
    if (updated) setOutputs((prev) => prev.map((o) => o.id === id ? updated : o))
    setActingId(null)
  }

  async function handlePost(id: string) {
    setActingId(id)
    const updated = await postProductionOutput(id)
    if (updated) setOutputs((prev) => prev.map((o) => o.id === id ? updated : o))
    setActingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce brouillon ?')) return
    setActingId(id)
    const ok = await deleteProductionOutput(id)
    if (ok) setOutputs((prev) => prev.filter((o) => o.id !== id))
    setActingId(null)
  }

  function handleSave(output: ProductionOutputRow) {
    setOutputs((prev) => [output, ...prev])
    setShowModal(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Lots de production</h1>
            <HelpPopover section="lots" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Déclarations de fin de fabrication · Lots PF · Entrées stock produit fini
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
          <Plus className="size-3.5" />
          Nouvelle déclaration
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-950/30 hover:scale-[1.02] hover:shadow-md transition-all cursor-default">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BookCheck className="size-[18px] text-emerald-600" />
            </div>
            <span className="text-sm font-semibold">En stock</span>
          </div>
          <div className="bg-white dark:bg-background rounded-xl px-4 py-3 shadow-sm">
            <p className="text-3xl font-bold">{stats.postedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(stats.totalProduced, locale)} unités comptabilisées
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-950/30 hover:scale-[1.02] hover:shadow-md transition-all cursor-default">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <CheckCircle2 className="size-[18px] text-amber-600" />
            </div>
            <span className="text-sm font-semibold">À comptabiliser</span>
          </div>
          <div className="bg-white dark:bg-background rounded-xl px-4 py-3 shadow-sm">
            <p className="text-3xl font-bold">{stats.confirmedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Confirmés · en attente POSTED</p>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-gray-50 dark:bg-gray-900/20 hover:scale-[1.02] hover:shadow-md transition-all cursor-default">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <Package className="size-[18px] text-gray-500" />
            </div>
            <span className="text-sm font-semibold">Brouillons</span>
          </div>
          <div className="bg-white dark:bg-background rounded-xl px-4 py-3 shadow-sm">
            <p className="text-3xl font-bold">{stats.draftCount}</p>
            <p className="text-xs text-muted-foreground mt-1">En attente de confirmation</p>
          </div>
        </div>

        <div className={`rounded-2xl p-4 hover:scale-[1.02] hover:shadow-md transition-all cursor-default ${
          stats.avgRebut > 5 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-orange-50 dark:bg-orange-950/20'
        }`}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              stats.avgRebut > 5 ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              <AlertTriangle className={`size-[18px] ${stats.avgRebut > 5 ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
            <span className="text-sm font-semibold">Taux rebut moyen</span>
          </div>
          <div className="bg-white dark:bg-background rounded-xl px-4 py-3 shadow-sm">
            <p className={`text-3xl font-bold font-mono ${stats.avgRebut > 5 ? 'text-red-600' : ''}`}>
              {stats.avgRebut.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Sur lots comptabilisés</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Statut :</span>
        {(['ALL', 'DRAFT', 'CONFIRMED', 'POSTED'] as FilterTab[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {f === 'ALL' ? 'Tous' : PRODUCTION_OUTPUT_STATUS_LABELS[f]}
            <span className="ml-1.5 font-mono opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              Déclarations de production
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              DRAFT → Confirmer → CONFIRMED → Comptabiliser → POSTED (immuable)
            </p>
          </div>
          {icO && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={rO}>
              <RotateCcw className="size-3.5" />Réinitialiser colonnes
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Package className="size-8 opacity-30" />
            <p className="text-sm font-medium">
              {filter === 'ALL'
                ? 'Aucune déclaration de fin de production'
                : `Aucun lot en statut "${PRODUCTION_OUTPUT_STATUS_LABELS[filter as ProductionOutputStatus]}"`}
            </p>
            {filter === 'ALL' && (
              <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => setShowModal(true)}>
                <Plus className="size-3.5" />Créer la première déclaration
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth }}>
              <colgroup>
                {OUTPUT_COLS.map((c) => <col key={c.id} style={{ width: wO[c.id] }} />)}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    N° Déclaration<ColumnResizer columnId="outputNumber" onStart={srO} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Article PF<ColumnResizer columnId="article" onStart={srO} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    N° OF<ColumnResizer columnId="orderNumber" onStart={srO} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
                    Lot PF<ColumnResizer columnId="batchNumber" onStart={srO} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Qté produite<ColumnResizer columnId="qtyProduced" onStart={srO} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Rebuts<ColumnResizer columnId="qtyScrap" onStart={srO} />
                  </th>
                  <th className="relative text-center px-4 py-3 font-semibold text-xs tracking-wide">
                    DLC<ColumnResizer columnId="expiryDate" onStart={srO} />
                  </th>
                  <th className="relative text-center px-4 py-3 font-semibold text-xs tracking-wide">
                    Déclaré le<ColumnResizer columnId="declaredAt" onStart={srO} />
                  </th>
                  <th className="relative text-center px-4 py-3 font-semibold text-xs tracking-wide">
                    Statut<ColumnResizer columnId="status" onStart={srO} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                    Actions<ColumnResizer columnId="actions" onStart={srO} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((output) => {
                  const isActing = actingId === output.id
                  const dlc = formatDlcStatus(output.expiryDate, today)
                  return (
                    <tr
                      key={output.id}
                      className={`border-b last:border-0 hover:bg-muted/20 ${
                        dlc.expired ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                      }`}
                    >
                      {/* N° Déclaration */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded-md">
                          {output.outputNumber}
                        </span>
                      </td>

                      {/* Article */}
                      <td className="px-4 py-3 overflow-hidden">
                        <p className="font-medium text-sm truncate" title={output.articleLabel}>
                          {output.articleLabel}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">{output.articleSku}</p>
                      </td>

                      {/* N° OF */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {output.orderNumber || '—'}
                        </span>
                      </td>

                      {/* Lot PF */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium">
                          {output.productBatchNumber}
                        </span>
                      </td>

                      {/* Qté produite */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-semibold text-sm">
                          {formatNumber(output.quantityProduced, locale)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{output.articleUnit}</span>
                      </td>

                      {/* Rebuts */}
                      <td className="px-4 py-3 text-right">
                        <p className={`font-mono text-sm ${output.quantityScrap > 0 ? 'text-orange-600 font-semibold' : 'text-muted-foreground'}`}>
                          {formatNumber(output.quantityScrap, locale)}
                        </p>
                        {output.tauxRebut > 0 && (
                          <p className={`text-[10px] font-mono font-medium ${output.tauxRebut > 5 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {output.tauxRebut.toFixed(2)}%
                          </p>
                        )}
                      </td>

                      {/* DLC */}
                      <td className="px-4 py-3 text-center">
                        <p className="font-mono text-xs">
                          {new Date(output.expiryDate).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                        <p className={`text-[10px] font-medium mt-0.5 ${
                          dlc.expired ? 'text-red-600' : dlc.urgent ? 'text-amber-600' : 'text-muted-foreground'
                        }`}>
                          {dlc.label}
                        </p>
                      </td>

                      {/* Date déclaration */}
                      <td className="px-4 py-3 text-center">
                        <p className="font-mono text-xs text-muted-foreground">
                          {new Date(output.declaredAt).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          PRODUCTION_OUTPUT_STATUS_COLORS[output.status]
                        }`}>
                          {PRODUCTION_OUTPUT_STATUS_LABELS[output.status]}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {output.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleConfirm(output.id)}
                                disabled={isActing}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {isActing
                                  ? <Loader2 className="size-3 animate-spin" />
                                  : <CheckCircle2 className="size-3 shrink-0" />
                                }
                                Confirmer
                              </button>
                              <button
                                onClick={() => handleDelete(output.id)}
                                disabled={isActing}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                                title="Supprimer le brouillon"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </>
                          )}
                          {output.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handlePost(output.id)}
                              disabled={isActing}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isActing
                                ? <Loader2 className="size-3 animate-spin" />
                                : <BookCheck className="size-3 shrink-0" />
                              }
                              Comptabiliser
                            </button>
                          )}
                          {output.status === 'POSTED' && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t bg-muted/10 flex items-center gap-2">
          <Calculator className="size-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Taux rebut = Rebuts / (Produit + Rebuts) × 100 ·{' '}
            <span className="font-medium">POSTED</span> est immuable (audit trail) ·{' '}
            Seuls les DRAFT sont supprimables
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <DeclareOutputModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
