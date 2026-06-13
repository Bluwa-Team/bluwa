'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2, ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'

const COLUMNS: ResizableColumn[] = [
  { id: 'date',     defaultWidth: 120, minWidth: 100 },
  { id: 'flux',     defaultWidth: 100, minWidth: 80  },
  { id: 'lot',      defaultWidth: 150, minWidth: 110 },
  { id: 'quantite', defaultWidth: 110, minWidth: 90  },
  { id: 'solde',    defaultWidth: 130, minWidth: 100 },
  { id: 'doc',      defaultWidth: 180, minWidth: 130 },
  { id: 'motif',    defaultWidth: null },
]
const MOTIF_MIN = 180

function formatReason(type: string | null): string {
  switch (type) {
    case 'ENTREE_RECEPTION':      return 'Réception fournisseur'
    case 'SORTIE_PRODUCTION':     return 'Consommation production'
    case 'ENTREE_PRODUCTION':     return 'Entrée produits finis'
    case 'AJUSTEMENT_INVENTAIRE': return 'Ajustement inventaire'
    case 'SORTIE_VENTE':          return 'Sortie vente'
    case 'RETOUR_FOURNISSEUR':    return 'Retour fournisseur'
    case 'RETOUR_CLIENT':         return 'Retour client'
    default: return type?.replace(/_/g, ' ') ?? 'Mouvement manuel'
  }
}

function docLink(locale: string, refType: string | null, refId: string | null): string | null {
  if (!refId) return null
  switch (refType) {
    case 'GOODS_RECEIPT':      return `/${locale}/reception?id=${refId}`
    case 'PURCHASE_ORDER':     return `/${locale}/achats?id=${refId}`
    case 'DELIVERY_NOTE':      return `/${locale}/ventes?id=${refId}`
    case 'PRODUCTION_ORDER':   return `/${locale}/mrp?id=${refId}`
    case 'INVENTORY_DOCUMENT': return `/${locale}/stocks?id=${refId}`
    default: return null
  }
}

type Movement = {
  id: string
  created_at: string
  movement_type: string
  quantity: number
  batch_number: string | null
  reference_type: string | null
  reference_id: string | null
  doc_label: string | null
  computed_stock: number
}

export default function MouvementsStockTab({ articleId }: { articleId: string }) {
  const supabase  = createClient()
  const { locale } = useParams<{ locale: string }>()
  const [mouvements, setMouvements] = useState<Movement[]>([])
  const [loading, setLoading]       = useState(true)

  const { widths, startResize } = useResizableColumns('bluwa:cols:article-mouvements', COLUMNS)
  const tableMinWidth = COLUMNS.reduce(
    (s, c) => s + (c.defaultWidth == null ? MOTIF_MIN : (widths[c.id] ?? c.defaultWidth!)), 0,
  )

  const load = useCallback(async () => {
    setLoading(true)

    // ASC pour calculer le stock cumulé chronologiquement
    const { data: mvts } = await supabase
      .from('stock_movements')
      .select('id, created_at, movement_type, quantity, batch_number, reference_type, reference_id')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (!mvts?.length) { setMouvements([]); setLoading(false); return }

    // Calcul du stock résultant (running total)
    let running = 0
    const withStock = mvts.map(m => {
      running += Number(m.quantity)
      return { ...m, computed_stock: running }
    })

    // Résoudre les numéros de document pour GOODS_RECEIPT
    const receiptIds = [...new Set(
      mvts.filter(m => m.reference_type === 'GOODS_RECEIPT' && m.reference_id)
          .map(m => m.reference_id as string)
    )]
    let receiptMap: Record<string, string> = {}
    if (receiptIds.length > 0) {
      const { data: receipts } = await supabase
        .from('goods_receipts')
        .select('id, receipt_number')
        .in('id', receiptIds)
      receiptMap = Object.fromEntries((receipts ?? []).map(r => [r.id, r.receipt_number]))
    }

    const resolved: Movement[] = withStock.reverse().map(m => ({
      ...m,
      doc_label: m.reference_type === 'GOODS_RECEIPT'
        ? (receiptMap[m.reference_id!] ?? null)
        : m.reference_id?.slice(0, 8) ?? null,
    }))

    setMouvements(resolved)
    setLoading(false)
  }, [articleId, supabase])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6 rounded-lg border">
        <Loader2 className="size-4 animate-spin" />
        Chargement de l&apos;historique des flux…
      </div>
    )
  }

  if (mouvements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed flex items-center justify-center py-16 text-sm text-muted-foreground">
        Aucun mouvement de stock enregistré sur cet article.
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
        <colgroup>
          {COLUMNS.map(c => (
            <col key={c.id} style={c.defaultWidth == null ? undefined : { width: widths[c.id] }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
              Date<ColumnResizer columnId="date" onStart={startResize} />
            </th>
            <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
              Flux<ColumnResizer columnId="flux" onStart={startResize} />
            </th>
            <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
              N° Lot<ColumnResizer columnId="lot" onStart={startResize} />
            </th>
            <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
              Quantité<ColumnResizer columnId="quantite" onStart={startResize} />
            </th>
            <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
              Stock résultant<ColumnResizer columnId="solde" onStart={startResize} />
            </th>
            <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
              Doc. origine<ColumnResizer columnId="doc" onStart={startResize} />
            </th>
            <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Motif</th>
          </tr>
        </thead>
        <tbody>
          {mouvements.map((mvt) => {
            const isEntree = Number(mvt.quantity) > 0
            const href     = docLink(locale, mvt.reference_type, mvt.reference_id)

            return (
              <tr key={mvt.id} className="border-b last:border-0 hover:bg-muted/20">

                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {new Date(mvt.created_at).toLocaleDateString('fr-FR')}
                  <span className="text-muted-foreground/50 ml-1">
                    {new Date(mvt.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    isEntree
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {isEntree
                      ? <ArrowDownLeft className="size-2.5" />
                      : <ArrowUpRight  className="size-2.5" />}
                    {isEntree ? 'Entrée' : 'Sortie'}
                  </span>
                </td>

                <td className="px-4 py-3 font-mono text-xs">
                  {mvt.batch_number || <span className="text-muted-foreground">—</span>}
                </td>

                <td className="px-4 py-3 text-right font-mono font-semibold">
                  <span className={isEntree ? 'text-emerald-700' : 'text-red-700'}>
                    {isEntree ? '+' : '−'}{Math.abs(Number(mvt.quantity)).toLocaleString('fr-FR')}
                  </span>
                </td>

                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                  {mvt.computed_stock.toLocaleString('fr-FR')}
                </td>

                <td className="px-4 py-3 font-mono text-xs">
                  {mvt.doc_label ? (
                    href ? (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {mvt.doc_label}
                        <ExternalLink className="size-3 opacity-60" />
                      </Link>
                    ) : (
                      <span>{mvt.doc_label}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground truncate">
                  {formatReason(mvt.movement_type)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
