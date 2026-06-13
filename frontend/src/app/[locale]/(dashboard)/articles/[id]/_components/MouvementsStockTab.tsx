'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
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
  { id: 'doc',      defaultWidth: 160, minWidth: 120 },
  { id: 'motif',    defaultWidth: null },
]
const MOTIF_MIN = 180

function formatReason(reason: string | null): string {
  switch (reason) {
    case 'ENTREE_RECEPTION':        return 'Réception fournisseur'
    case 'SORTIE_PRODUCTION':       return 'Consommation production'
    case 'ENTREE_PRODUCTION':       return 'Entrée produits finis'
    case 'AJUSTEMENT_INVENTAIRE':   return 'Ajustement inventaire'
    case 'SORTIE_VENTE':            return 'Sortie vente'
    case 'RETOUR_FOURNISSEUR':      return 'Retour fournisseur'
    case 'RETOUR_CLIENT':           return 'Retour client'
    default: return reason?.replace(/_/g, ' ') ?? 'Mouvement manuel'
  }
}

export default function MouvementsStockTab({ articleId }: { articleId: string }) {
  const supabase = createClient()
  const [mouvements, setMouvements] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  const { widths, startResize } = useResizableColumns('bluwa:cols:article-mouvements', COLUMNS)
  const tableMinWidth = COLUMNS.reduce(
    (s, c) => s + (c.defaultWidth == null ? MOTIF_MIN : (widths[c.id] ?? c.defaultWidth!)), 0,
  )

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('id, created_at, movement_type, quantity, batch_number, reference_type, reference_id')
      .eq('article_id', articleId)
      .order('created_at', { ascending: false })
      .limit(200)

    setMouvements(data ?? [])
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
            const isEntree  = mvt.movement_type === 'IN' || Number(mvt.quantity) > 0
            const docNumber = mvt.reference_id
              ? `${mvt.reference_type ?? ''}#${mvt.reference_id.slice(0, 8)}`
              : null

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
                    {isEntree ? '+' : '−'}{Math.abs(Number(mvt.quantity))}
                  </span>
                </td>

                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                  <span className="text-muted-foreground/50">—</span>
                </td>

                <td className="px-4 py-3 font-mono text-xs">
                  {docNumber ?? <span className="text-muted-foreground">—</span>}
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
