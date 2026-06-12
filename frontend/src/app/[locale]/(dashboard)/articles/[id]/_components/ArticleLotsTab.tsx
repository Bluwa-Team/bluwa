'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, History, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'

const COLUMNS: ResizableColumn[] = [
  { id: 'lot',        defaultWidth: 200, minWidth: 150 },
  { id: 'entrepot',   defaultWidth: null },
  { id: 'qteinit',    defaultWidth: 130, minWidth: 90  },
  { id: 'quantite',   defaultWidth: 130, minWidth: 90  },
  { id: 'reception',  defaultWidth: 110, minWidth: 86  },
  { id: 'peremption', defaultWidth: 120, minWidth: 90  },
  { id: 'statut',     defaultWidth: 160, minWidth: 120 },
]
const ENTREPOT_MIN = 180

function StatusBadge({ quantity, statutQc }: { quantity: number; statutQc: string | null }) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border">
        <History className="size-2.5" /> Épuisé
      </span>
    )
  }
  switch (statutQc) {
    case 'Libere':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="size-2.5" /> Libéré
        </span>
      )
    case 'LibereUsageInterne':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Shield className="size-2.5" /> Usage interne
        </span>
      )
    case 'EnControle':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          En contrôle
        </span>
      )
    case 'Bloque':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="size-2.5" /> Bloqué
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border">
          {statutQc ?? '—'}
        </span>
      )
  }
}

export default function ArticleLotsTab({ articleId }: { articleId: string }) {
  const supabase = createClient()
  const [lots, setLots]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const { widths, startResize } = useResizableColumns('bluwa:cols:article-lots', COLUMNS)
  const tableMinWidth = COLUMNS.reduce(
    (s, c) => s + (c.defaultWidth == null ? ENTREPOT_MIN : (widths[c.id] ?? c.defaultWidth!)), 0,
  )

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('lots')
      .select('id, batch_number, quantity_initial, quantity_remaining, statut_qc, expiry_date, created_at')
      .eq('article_id', articleId)
      .not('batch_number', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)
    setLots(data ?? [])
    setLoading(false)
  }, [articleId, supabase])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6 rounded-lg border">
        <Loader2 className="size-4 animate-spin" />
        Chargement du registre de traçabilité…
      </div>
    )
  }

  if (lots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed flex items-center justify-center py-16 text-sm text-muted-foreground">
        Aucun lot enregistré pour cet article.
      </div>
    )
  }

  const today = new Date()

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
              N° Lot<ColumnResizer columnId="lot" onStart={startResize} />
            </th>
            <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Entrepôt</th>
            <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
              Qté initiale<ColumnResizer columnId="qteinit" onStart={startResize} />
            </th>
            <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
              Qté restante<ColumnResizer columnId="quantite" onStart={startResize} />
            </th>
            <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
              Réception<ColumnResizer columnId="reception" onStart={startResize} />
            </th>
            <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
              Péremption<ColumnResizer columnId="peremption" onStart={startResize} />
            </th>
            <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">
              Statut<ColumnResizer columnId="statut" onStart={startResize} />
            </th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => {
            const qty      = Number(lot.quantity_remaining) || 0
            const isEpuise = qty <= 0
            const expDate  = lot.expiry_date ? new Date(lot.expiry_date) : null
            const isExpire = expDate != null && expDate < today && !isEpuise

            return (
              <tr
                key={lot.id}
                className={`border-b last:border-0 transition-colors ${
                  isEpuise ? 'bg-muted/10' : 'hover:bg-muted/20'
                }`}
              >
                <td className={`px-4 py-3 font-mono text-xs font-semibold ${isEpuise ? 'line-through text-muted-foreground' : ''}`}>
                  {lot.batch_number}
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground">—</td>

                <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                  {lot.quantity_initial != null
                    ? Number(lot.quantity_initial).toLocaleString('fr-FR')
                    : '—'}
                </td>

                <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${isEpuise ? 'text-muted-foreground' : ''}`}>
                  {qty.toLocaleString('fr-FR')}
                </td>

                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {new Date(lot.created_at).toLocaleDateString('fr-FR')}
                </td>

                <td className={`px-4 py-3 font-mono text-xs ${isExpire ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                  {expDate ? expDate.toLocaleDateString('fr-FR') : '—'}
                </td>

                <td className="px-4 py-3">
                  <StatusBadge quantity={qty} statutQc={lot.statut_qc} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
