'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Trash2, Settings2, Search, Loader2 } from 'lucide-react'
import { BillOfMaterial, BOMIngredient } from './bom'
import { getArticles } from '@/lib/actions/articles'
import type { Article } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

type BomHeader = Pick<BillOfMaterial, 'version' | 'versionName' | 'batchSize' | 'baseQuantity' | 'batchUnit'>

interface Props {
  open: boolean
  onClose: () => void
  bom: BillOfMaterial | null
  ingredients: BOMIngredient[]
  onSave: (header: BomHeader, ingredients: BOMIngredient[]) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BATCH_UNIT_OPTIONS = ['kg', 'L', 'btl', 'u', 'pièce', 'sachet', 'carton']

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

// ── Sélecteur de composant avec recherche ─────────────────────────────────────

function ComponentSelector({
  value,
  articles,
  onChange,
}: {
  value: string
  articles: Article[]
  onChange: (article: Article) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return articles.slice(0, 50)
    const q = search.toLowerCase()
    return articles
      .filter((a) =>
        a.code.toLowerCase().includes(q) ||
        a.designation.toLowerCase().includes(q),
      )
      .slice(0, 50)
  }, [articles, search])

  const selected = articles.find((a) => a.code === value)

  return (
    <div className="relative flex-1 min-w-0">
      {open ? (
        <div className="flex flex-col rounded-md border border-ring bg-background shadow-sm z-10 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 border-b">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code ou désignation…"
              className="flex-1 py-1.5 text-sm outline-none bg-transparent"
              onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setSearch('') } }}
            />
            <button onClick={() => { setOpen(false); setSearch('') }} className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Aucun article trouvé</p>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.code}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => { onChange(a); setOpen(false); setSearch('') }}
                >
                  <span className="font-mono text-xs text-muted-foreground shrink-0 w-20 truncate">{a.code}</span>
                  <span className="truncate">{a.designation}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">{a.uniteStock}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left flex items-center gap-2 h-9 rounded-md border border-input bg-background px-2 text-sm hover:border-ring transition-colors"
        >
          {selected ? (
            <>
              <span className="font-mono text-xs text-muted-foreground shrink-0">{selected.code}</span>
              <span className="truncate">{selected.designation}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Sélectionner un article…</span>
          )}
        </button>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function BomEditModal({ open, onClose, bom, ingredients, onSave }: Props) {
  const [version, setVersion]         = useState('v1.0')
  const [versionName, setVersionName] = useState('')
  const [batchSize, setBatchSize]     = useState('100')
  const [batchUnit, setBatchUnit]     = useState('kg')
  const [rows, setRows]               = useState<BOMIngredient[]>([])
  const [saving, setSaving]           = useState(false)
  const [articles, setArticles]       = useState<Article[]>([])
  const [loadingArticles, setLoadingArticles] = useState(false)

  // Charge les articles de l'organisation au premier ouverture
  useEffect(() => {
    if (!open) return
    setVersion(bom?.version ?? 'v1.0')
    setVersionName(bom?.versionName ?? '')
    setBatchSize(String(bom?.batchSize ?? 100))
    setBatchUnit(bom?.batchUnit ?? 'kg')
    setRows(ingredients.map((i) => ({ ...i })))

    if (articles.length === 0) {
      setLoadingArticles(true)
      getArticles().then((data) => {
        setArticles(data)
        setLoadingArticles(false)
      })
    }
  }, [open, bom, ingredients])

  // ── Row helpers ─────────────────────────────────────────────────────────────

  function selectComponent(rowId: string, article: Article) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              ingredientCode: article.code,
              designation:    article.designation,
              unite:          article.uniteStock,
            }
          : r,
      ),
    )
  }

  function updateRow(id: string, field: keyof BOMIngredient, value: string | number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function deleteRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function addRow() {
    const newRow: BOMIngredient = {
      id:                    `new-${Date.now()}`,
      bomId:                 bom?.id ?? '',
      ingredientCode:        '',
      designation:           '',
      unite:                 'kg',
      qtyPerUnit:            0,
      tolerance:             0,
      scrapFactorPercentage: 0,
    }
    setRows((prev) => [...prev, newRow])
  }

  function handleSave() {
    setSaving(true)
    const valid = rows.filter((r) => r.ingredientCode.trim())
    const qty   = parseFloat(batchSize) || 100
    onSave(
      {
        version:      version.trim() || 'v1.0',
        versionName:  versionName.trim(),
        batchSize:    qty,
        baseQuantity: qty,
        batchUnit:    batchUnit.trim() || 'kg',
      },
      valid,
    )
    setSaving(false)
    onClose()
  }

  const hasInvalidRow = rows.some(
    (r) => r.ingredientCode.trim() && r.qtyPerUnit <= 0,
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(760px,94vw)] max-h-[88vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Settings2 className="size-[18px] text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-base">Configurer la Nomenclature</p>
                  {bom && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bom.articleCode} · {bom.articleDesignation}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* ── Body ──────────────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

              {/* BOM header */}
              <div className="rounded-lg border bg-muted/20 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Paramètres généraux
                </p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  <Field label="Version" required>
                    <Input
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="v1.0"
                    />
                  </Field>
                  <Field label="Nom de version">
                    <Input
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      placeholder="Recette Standard"
                    />
                  </Field>
                  <Field label="Quantité de référence" required>
                    <Input
                      type="number"
                      min="1"
                      value={batchSize}
                      onChange={(e) => setBatchSize(e.target.value)}
                      placeholder="100"
                    />
                  </Field>
                  <Field label="Unité du lot" required>
                    <select
                      value={batchUnit}
                      onChange={(e) => setBatchUnit(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {BATCH_UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* Ingredient rows */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Composants de la recette
                </p>

                {loadingArticles ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Chargement des articles…
                  </div>
                ) : (
                  <>
                    {/* Column headers */}
                    <div className="flex items-center gap-x-2 mb-2 px-1">
                      <span className="flex-1 min-w-0 text-xs font-semibold text-muted-foreground">
                        Article
                      </span>
                      <span className="w-[90px] shrink-0 text-xs font-semibold text-muted-foreground text-right">
                        Qté / unité lot
                      </span>
                      <span className="w-[68px] shrink-0 text-xs font-semibold text-muted-foreground">
                        Unité
                      </span>
                      <span className="w-[72px] shrink-0 text-xs font-semibold text-muted-foreground text-right">
                        Tol. (%)
                      </span>
                      <span className="w-9 shrink-0" />
                    </div>

                    {/* Rows */}
                    <div className="space-y-2">
                      {rows.map((row) => {
                        const qtyInvalid = row.ingredientCode.trim() && row.qtyPerUnit <= 0
                        return (
                          <div key={row.id} className="flex items-start gap-x-2">

                            {/* Composant — sélecteur avec recherche */}
                            <ComponentSelector
                              value={row.ingredientCode}
                              articles={articles}
                              onChange={(article) => selectComponent(row.id, article)}
                            />

                            {/* Quantité */}
                            <Input
                              type="number"
                              min="0"
                              step="0.0001"
                              value={row.qtyPerUnit === 0 ? '' : row.qtyPerUnit}
                              onChange={(e) =>
                                updateRow(row.id, 'qtyPerUnit', parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className={`w-[90px] shrink-0 h-9 text-right font-mono tabular-nums text-xs ${
                                qtyInvalid ? 'border-red-400 focus-visible:ring-red-300' : ''
                              }`}
                            />

                            {/* Unité */}
                            <Input
                              value={row.unite}
                              onChange={(e) => updateRow(row.id, 'unite', e.target.value)}
                              placeholder="kg"
                              className="w-[68px] shrink-0 h-9 text-sm font-mono text-center"
                            />

                            {/* Tolérance % */}
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={row.tolerance === 0 ? '' : row.tolerance}
                              onChange={(e) =>
                                updateRow(row.id, 'tolerance', parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-[72px] shrink-0 h-9 text-right font-mono tabular-nums text-xs"
                            />

                            {/* Supprimer */}
                            <button
                              onClick={() => deleteRow(row.id)}
                              className="flex shrink-0 items-center justify-center size-9 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Add row */}
                    <button
                      onClick={addRow}
                      className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline underline-offset-2"
                    >
                      <Plus className="size-3.5" />
                      Ajouter un composant
                    </button>

                    <p className="mt-3 text-xs text-muted-foreground">
                      <strong>Qté / unité lot</strong> : quantité de ce composant pour produire
                      1 unité du lot de référence.
                      <span className="mx-1.5">·</span>
                      <strong>Tol. (%)</strong> : marge de variance autorisée lors de la pesée.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/20 shrink-0">
              <span className="text-xs text-muted-foreground">
                {rows.length} composant{rows.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || hasInvalidRow || loadingArticles}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  Sauvegarder la nomenclature
                </Button>
              </div>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
