'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Trash2, ListChecks, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  GammeFabrication,
  GammeEtape,
  OPERATIONS_PREDEFINIES,
} from './gamme'
import { WorkCenter } from '@/types/erp'

// ── Types ─────────────────────────────────────────────────────────────────────

type GammeHeader = Pick<GammeFabrication, 'version'>

interface Props {
  open: boolean
  onClose: () => void
  gamme: GammeFabrication | null
  etapes: GammeEtape[]
  workCenters: WorkCenter[]
  onSave: (header: GammeHeader, etapes: GammeEtape[]) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export function GammeEditModal({ open, onClose, gamme, etapes, workCenters, onSave }: Props) {
  const locale = useLocale()
  const [version, setVersion] = useState('v1.0')
  const [rows, setRows]       = useState<GammeEtape[]>([])
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (open) {
      setVersion(gamme?.version ?? 'v1.0')
      setRows(etapes.map((e) => ({ ...e })))
    }
  }, [open, gamme, etapes])

  // ── Row helpers ─────────────────────────────────────────────────────────────

  function addRow() {
    const newRow: GammeEtape = {
      id:                    `new-${Date.now()}`,
      gammeId:               gamme?.id ?? '',
      ordre:                 rows.length + 1,
      operation:             '',
      duree:                 0,
      setupTimeMinutes:      0,
      runTimeMinutesPerUnit: 0,
      temperature:           undefined,
      equipement:            '',
      workCenterId:          null,
    }
    setRows((prev) => [...prev, newRow])
  }

  function updateRow(id: string, field: keyof GammeEtape, value: string | number | undefined | null) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function setWorkCenter(rowId: string, wcId: string) {
    const wc = workCenters.find((w) => w.id === wcId) ?? null
    setRows((prev) => prev.map((r) => r.id === rowId ? {
      ...r,
      workCenterId:          wc?.id ?? null,
      workCenterName:        wc?.name ?? '',
      workCenterCode:        wc?.code ?? null,
      workCenterRatePerHour: wc?.ratePerHour ?? 0,
    } : r))
  }

  function deleteRow(id: string) {
    setRows((prev) =>
      prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, ordre: i + 1 })),
    )
  }

  function handleSave() {
    setSaving(true)
    const valid = rows.filter((r) => r.operation.trim())
    onSave({ version: version.trim() || 'v1.0' }, valid)
    setSaving(false)
    onClose()
  }

  const totalDuree = rows.reduce((s, r) => s + (r.duree || 0), 0)
  const totalCout  = rows.reduce((s, r) => {
    const rate = r.workCenterRatePerHour ?? 0
    return s + (r.duree + (r.setupTimeMinutes ?? 0)) / 60 * rate
  }, 0)
  const hasInvalid = rows.some((r) => r.operation.trim() && r.duree <= 0)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(1100px,96vw)] max-h-[88vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <ListChecks className="size-[18px] text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-base">Configurer la Gamme de Fabrication</p>
                  {gamme && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {gamme.articleCode} · {gamme.articleDesignation}
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

              {/* Gamme header */}
              <div className="rounded-lg border bg-muted/20 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Paramètres généraux
                </p>
                <div className="max-w-[200px]">
                  <Field label="Version" required>
                    <Input
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="v1.0"
                    />
                  </Field>
                </div>
              </div>

              {/* Step rows */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Étapes de fabrication
                  </p>
                  {workCenters.length === 0 && (
                    <Link
                      href={`/${locale}/production/postes-de-charge`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      onClick={onClose}
                    >
                      <ExternalLink className="size-3" />
                      Gérer les postes de charge
                    </Link>
                  )}
                </div>

                {/* Column headers */}
                <div className="flex items-center gap-x-2 mb-2 px-1">
                  <span className="w-7 shrink-0 text-xs font-semibold text-muted-foreground text-center">#</span>
                  <span className="w-[180px] shrink-0 text-xs font-semibold text-muted-foreground">Opération</span>
                  <span className="w-[160px] shrink-0 text-xs font-semibold text-muted-foreground">Poste de charge</span>
                  <span className="w-[60px] shrink-0 text-xs font-semibold text-muted-foreground text-right">Lot (min)</span>
                  <span className="w-[60px] shrink-0 text-xs font-semibold text-muted-foreground text-right">Rég. (min)</span>
                  <span className="w-[60px] shrink-0 text-xs font-semibold text-muted-foreground text-right">T° (°C)</span>
                  <span className="flex-1 min-w-0 text-xs font-semibold text-muted-foreground">Point de contrôle</span>
                  <span className="w-9 shrink-0" />
                </div>

                {/* Rows */}
                <div className="space-y-2">
                  {rows.map((row) => {
                    const invalid = row.operation.trim() && row.duree <= 0
                    return (
                      <div key={row.id} className="flex items-center gap-x-2">

                        {/* Ordre */}
                        <span className="w-7 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
                          {row.ordre}
                        </span>

                        {/* Opération */}
                        <input
                          list="gamme-operations-list"
                          value={row.operation}
                          onChange={(e) => updateRow(row.id, 'operation', e.target.value)}
                          placeholder="Ex : Macération hibiscus"
                          className="w-[180px] shrink-0 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        />

                        {/* Poste de charge */}
                        <select
                          value={row.workCenterId ?? ''}
                          onChange={(e) => setWorkCenter(row.id, e.target.value)}
                          className="w-[160px] shrink-0 h-9 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 truncate"
                        >
                          <option value="">— Aucun poste —</option>
                          {workCenters.map((wc) => (
                            <option key={wc.id} value={wc.id}>
                              {wc.code ? `[${wc.code}] ` : ''}{wc.name}
                            </option>
                          ))}
                        </select>

                        {/* Lot (min) = duree */}
                        <Input
                          type="number"
                          min="0"
                          value={row.duree === 0 ? '' : row.duree}
                          onChange={(e) => updateRow(row.id, 'duree', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className={`w-[60px] shrink-0 h-9 text-right font-mono tabular-nums text-xs ${
                            invalid ? 'border-red-400 focus-visible:ring-red-300' : ''
                          }`}
                        />

                        {/* Réglage (min) */}
                        <Input
                          type="number"
                          min="0"
                          value={row.setupTimeMinutes === 0 ? '' : row.setupTimeMinutes}
                          onChange={(e) => updateRow(row.id, 'setupTimeMinutes', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-[60px] shrink-0 h-9 text-right font-mono tabular-nums text-xs"
                        />

                        {/* Température */}
                        <Input
                          type="number"
                          min="0"
                          max="200"
                          value={row.temperature ?? ''}
                          onChange={(e) =>
                            updateRow(row.id, 'temperature', e.target.value ? parseInt(e.target.value) : undefined)
                          }
                          placeholder="—"
                          className="w-[60px] shrink-0 h-9 text-right font-mono tabular-nums text-xs"
                        />

                        {/* Point de contrôle */}
                        <input
                          value={row.pointControle ?? ''}
                          onChange={(e) => updateRow(row.id, 'pointControle', e.target.value || undefined)}
                          placeholder="ex: pH 2.5–3.2, T° ≤ 25°C…"
                          className="flex-1 min-w-0 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        />

                        {/* Supprimer */}
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="flex shrink-0 items-center justify-center size-9 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Supprimer cette étape"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Datalists pour autocomplete opérations */}
                <datalist id="gamme-operations-list">
                  {OPERATIONS_PREDEFINIES.map((op) => <option key={op} value={op} />)}
                </datalist>

                {/* Ajouter une étape */}
                <button
                  onClick={addRow}
                  className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline underline-offset-2"
                >
                  <Plus className="size-3.5" />
                  Ajouter une étape
                </button>

                <p className="mt-3 text-xs text-muted-foreground">
                  <strong>Poste</strong> : poste de charge ou ligne de production.
                  <span className="mx-1.5">·</span>
                  <strong>Lot</strong> : durée standard pour le lot.
                  <span className="mx-1.5">·</span>
                  <strong>Rég.</strong> : temps de réglage machine (Rüstzeit).
                  <span className="mx-1.5">·</span>
                  <strong>T°</strong> : température cible.
                  <span className="mx-1.5">·</span>
                  <strong>Point de contrôle</strong> : critère qualité à vérifier en fin d&apos;étape.
                </p>
              </div>
            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/20 shrink-0">
              <div className="text-xs text-muted-foreground space-x-3">
                <span>{rows.length} étape{rows.length !== 1 ? 's' : ''}</span>
                {totalDuree > 0 && (
                  <span>· <strong className="text-foreground">{totalDuree} min</strong></span>
                )}
                {totalCout > 0 && (
                  <span>· Coût ≈ <strong className="text-foreground">{Math.round(totalCout).toLocaleString('fr-FR')} XOF</strong></span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || hasInvalid}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  Sauvegarder la gamme
                </Button>
              </div>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
