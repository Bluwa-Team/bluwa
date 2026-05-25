'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Trash2, Settings2, AlertTriangle } from 'lucide-react'
import {
  BillOfMaterial,
  BOMIngredient,
  UNITE_OPTIONS,
  AVAILABLE_COMPONENTS,
} from './bom'

// ── Types ─────────────────────────────────────────────────────────────────────

type BomHeader = Pick<BillOfMaterial, 'version' | 'batchSize' | 'batchUnit'>

interface Props {
  open: boolean
  onClose: () => void
  bom: BillOfMaterial | null
  ingredients: BOMIngredient[]
  onSave: (header: BomHeader, ingredients: BOMIngredient[]) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BATCH_UNIT_OPTIONS = ['btl', 'L', 'kg', 'u', 'pièce']

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

// ── Modal ─────────────────────────────────────────────────────────────────────

export function BomEditModal({ open, onClose, bom, ingredients, onSave }: Props) {
  const [version, setVersion]       = useState('v1.0')
  const [batchSize, setBatchSize]   = useState('100')
  const [batchUnit, setBatchUnit]   = useState('btl')
  const [rows, setRows]             = useState<BOMIngredient[]>([])
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (open) {
      setVersion(bom?.version ?? 'v1.0')
      setBatchSize(String(bom?.batchSize ?? 100))
      setBatchUnit(bom?.batchUnit ?? 'btl')
      setRows(ingredients.map((i) => ({ ...i })))
    }
  }, [open, bom, ingredients])

  // ── Row helpers ─────────────────────────────────────────────────────────────

  function selectComponent(rowId: string, code: string) {
    const comp = AVAILABLE_COMPONENTS.find((c) => c.code === code)
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              ingredientCode: comp?.code ?? code,
              designation:    comp?.designation ?? '',
              unite:          comp?.unite ?? 'kg',
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
      id:              `new-${Date.now()}`,
      bomId:           bom?.id ?? '',
      ingredientCode:  '',
      designation:     '',
      unite:           'kg',
      qtyPerUnit:      0,
      tolerance:       5,
    }
    setRows((prev) => [...prev, newRow])
  }

  function handleSave() {
    setSaving(true)
    const valid = rows.filter((r) => r.ingredientCode.trim() || r.designation.trim())
    onSave(
      {
        version:   version.trim() || 'v1.0',
        batchSize: parseFloat(batchSize) || 100,
        batchUnit: batchUnit.trim() || 'btl',
      },
      valid,
    )
    setSaving(false)
    onClose()
  }

  const hasInvalidRow = rows.some(
    (r) => (r.ingredientCode.trim() || r.designation.trim()) && r.qtyPerUnit <= 0,
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
          <div className="w-[min(780px,92vw)] max-h-[88vh] flex flex-col rounded-xl border bg-card shadow-lg">

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

            {/* ── Mock warning ──────────────────────────────────────── */}
            <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800 shrink-0">
              <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Données simulées.</strong> Les modifications sont sauvegardées en mémoire
                et prises en compte dans le module Production (modal &quot;Nouvel OF&quot;)
                jusqu&apos;au rechargement de la page.
              </span>
            </div>

            {/* ── Body ──────────────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

              {/* BOM header */}
              <div className="rounded-lg border bg-muted/20 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Paramètres généraux
                </p>
                <div className="grid grid-cols-3 gap-x-5 gap-y-3">
                  <Field label="Version BOM" required>
                    <Input
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="v1.0"
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

                {/* Column headers */}
                <div className="flex items-center gap-x-2 mb-2 px-1">
                  <span className="flex-1 min-w-0 text-xs font-semibold text-muted-foreground">
                    Composant
                  </span>
                  <span className="w-[90px] shrink-0 text-xs font-semibold text-muted-foreground text-right">
                    Qté / unité PF
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
                    const qtyInvalid = (row.ingredientCode.trim() || row.designation.trim()) && row.qtyPerUnit <= 0
                    return (
                      <div key={row.id} className="flex items-center gap-x-2">

                        {/* Composant dropdown */}
                        <select
                          value={row.ingredientCode}
                          onChange={(e) => selectComponent(row.id, e.target.value)}
                          className="flex-1 min-w-0 h-9 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 truncate"
                        >
                          <option value="">— Sélectionner un composant —</option>
                          {AVAILABLE_COMPONENTS.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code} · {c.designation}
                            </option>
                          ))}
                        </select>

                        {/* Quantité / unité PF */}
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
                        <select
                          value={row.unite}
                          onChange={(e) => updateRow(row.id, 'unite', e.target.value)}
                          className="w-[68px] shrink-0 h-9 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          {UNITE_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>

                        {/* Tolérance % */}
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={row.tolerance}
                          onChange={(e) =>
                            updateRow(row.id, 'tolerance', parseInt(e.target.value) || 0)
                          }
                          placeholder="5"
                          className="w-[72px] shrink-0 h-9 text-right font-mono tabular-nums text-xs"
                        />

                        {/* Supprimer */}
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="flex shrink-0 items-center justify-center size-9 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Supprimer ce composant"
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
                  <strong>Qté / unité PF</strong> : quantité de ce composant pour produire
                  1 unité de produit fini.
                  <span className="mx-1.5">·</span>
                  <strong>Tol. (%)</strong> : marge de variance autorisée en production.
                </p>
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
                  disabled={saving || hasInvalidRow}
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
