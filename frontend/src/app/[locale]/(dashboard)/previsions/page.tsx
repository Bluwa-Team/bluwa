'use client'

import { useEffect, useState, useTransition } from 'react'
import { Save, Loader2, CircleDot, TrendingUp, Info } from 'lucide-react'
import { getForecasts, upsertForecast, type ForecastRow } from '@/lib/actions/forecasts'
import { weekLabel } from '@/lib/planning-utils'

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PrevisionsPage() {
  const [rows,    setRows]    = useState<ForecastRow[]>([])
  const [weeks,   setWeeks]   = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  const [saved,   setSaved]   = useState<string | null>(null)   // "articleId-week"
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    getForecasts(6).then(data => {
      setRows(data)
      if (data.length) setWeeks(Object.keys(data[0].weeks))
      setLoading(false)
    })
  }, [])

  function handleChange(articleId: string, week: string, val: number) {
    setRows(prev => prev.map(r =>
      r.articleId === articleId
        ? { ...r, weeks: { ...r.weeks, [week]: val } }
        : r
    ))
  }

  function handleSave(articleId: string, week: string, quantity: number) {
    setSaved(null)
    setError(null)
    startTransition(async () => {
      const res = await upsertForecast(articleId, week, quantity)
      if (res?.error) { setError(res.error); return }
      setSaved(`${articleId}-${week}`)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  const totalForecast = rows.reduce((s, r) =>
    s + Object.values(r.weeks).reduce((a, v) => a + v, 0), 0
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prévisions de la demande</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saisissez les quantités prévisionnelles par produit et par semaine.
            Ces données alimentent le Supply Planning et le MRP.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border shrink-0">
          <CircleDot className="size-3 text-emerald-500" />
          Données réelles
        </div>
      </div>

      {/* KPI */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="size-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Produits planifiés</span>
            </div>
            <p className="text-2xl font-bold">{rows.length}</p>
          </div>
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="size-4 text-violet-500" />
              <span className="text-xs font-medium text-muted-foreground">Horizon</span>
            </div>
            <p className="text-2xl font-bold">{weeks.length} semaines</p>
          </div>
          <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="size-4 text-teal-500" />
              <span className="text-xs font-medium text-muted-foreground">Total prévu</span>
            </div>
            <p className="text-2xl font-bold">{totalForecast.toLocaleString('fr-FR')} u</p>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Aide */}
      <div className="flex items-start gap-2 rounded-xl border bg-muted/30 px-4 py-3">
        <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Saisissez une quantité et appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs font-mono">Entrée</kbd> ou
          cliquez <Save className="size-3 inline mx-0.5" /> pour enregistrer.
          Les cellules vides valent 0 — elles seront ignorées dans le calcul du Supply Planning.
        </p>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Chargement des articles…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <TrendingUp className="size-8 opacity-30" />
          <p className="text-sm font-medium">Aucun produit fini ou semi-fini actif</p>
          <p className="text-xs">Créez des articles de type PF ou PSF dans le module Articles.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="sticky left-0 z-10 bg-muted/30 text-left px-4 py-3 font-semibold text-xs tracking-wide min-w-[200px]">
                  Produit
                </th>
                {weeks.map(w => (
                  <th key={w} className="text-center px-3 py-3 font-semibold text-xs tracking-wide min-w-[120px]">
                    <div className="text-muted-foreground">{weekLabel(w)}</div>
                  </th>
                ))}
                <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide text-muted-foreground">
                  Total 6 sem.
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const total = Object.values(row.weeks).reduce((s, v) => s + v, 0)
                return (
                  <tr key={row.articleId} className={`border-b last:border-0 ${ri % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    {/* Article */}
                    <td className="sticky left-0 z-10 bg-card px-4 py-2.5 border-r">
                      <p className="font-medium truncate max-w-[180px]" title={row.articleLabel}>
                        {row.articleLabel}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{row.articleCode} · {row.unite}</p>
                    </td>

                    {/* Cellules éditables */}
                    {weeks.map(w => {
                      const key = `${row.articleId}-${w}`
                      const isSaved = saved === key
                      return (
                        <td key={w} className="px-2 py-2 text-center">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="number"
                              min={0}
                              value={row.weeks[w] || ''}
                              placeholder="0"
                              onChange={e => handleChange(row.articleId, w, Number(e.target.value))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSave(row.articleId, w, row.weeks[w] ?? 0)
                              }}
                              onBlur={() => handleSave(row.articleId, w, row.weeks[w] ?? 0)}
                              className="w-[90px] h-8 px-2 text-sm text-right rounded-lg border bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                            {isSaved && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-[8px]">✓</span>
                              </span>
                            )}
                          </div>
                        </td>
                      )
                    })}

                    {/* Total */}
                    <td className="px-4 py-2 text-right font-mono font-semibold text-muted-foreground">
                      {total > 0 ? total.toLocaleString('fr-FR') : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-card border rounded-xl px-4 py-2.5 shadow-lg text-sm">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          Enregistrement…
        </div>
      )}

    </div>
  )
}
