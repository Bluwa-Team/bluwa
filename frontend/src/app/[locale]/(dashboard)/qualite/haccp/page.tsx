'use client'

import { useState, useMemo } from 'react'
import {
  ShieldCheck, AlertOctagon, ThermometerSun, Microscope,
  Magnet, ChevronRight, Info, Calendar, User, CheckCircle2,
  ArrowRight, Plus, X, Loader2,
} from 'lucide-react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  HACCP_PLAN_META,
  HAZARD_TYPE_LABELS, HAZARD_TYPE_COLORS,
  riskScore, riskColor, riskLabel,
  type HazardType, type RiskLevel,
  type ProcessStep, type HazardAnalysis, type CriticalControlPoint,
} from '../_components/haccp-types'
import { HelpPopover } from '@/components/ui/help-popover'

// ── Constants ──────────────────────────────────────────────────────────────────

type Tab = 'pcc' | 'dangers' | 'flux'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'pcc',     label: 'Tableau des PCC'     },
  { id: 'dangers', label: 'Analyse des dangers' },
  { id: 'flux',    label: 'Flux de process'     },
]

const HAZARD_ICONS: Record<HazardType, React.ElementType> = {
  B: Microscope,
  C: ThermometerSun,
  P: Magnet,
}

// ── Composants partagés ────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, bgClass, iconBg, iconColor }: {
  label: string; value: string | number
  icon: React.ElementType; bgClass: string; iconBg: string; iconColor: string
}) {
  return (
    <div className={`rounded-xl p-4 flex items-start gap-3 ${bgClass}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function HazardBadge({ type }: { type: HazardType }) {
  const Icon = HAZARD_ICONS[type]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${HAZARD_TYPE_COLORS[type]}`}>
      <Icon className="size-3" />
      {type} — {HAZARD_TYPE_LABELS[type]}
    </span>
  )
}

function RiskBadge({ score }: { score: number }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums ${riskColor(score)}`}>
      {score} — {riskLabel(score)}
    </span>
  )
}

function DetailField({ label, icon: Icon, iconColor, children, colSpan }: {
  label: string; icon: React.ElementType; iconColor: string
  children: React.ReactNode; colSpan?: boolean
}) {
  return (
    <div className={colSpan ? 'sm:col-span-2' : ''}>
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-1">
        <Icon className={`size-3.5 ${iconColor}`} />
        {label}
      </p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function RiskSelector({ value, onChange }: { value: RiskLevel; onChange: (v: RiskLevel) => void }) {
  return (
    <div className="flex gap-2">
      {([1, 2, 3] as RiskLevel[]).map((lvl) => (
        <button
          key={lvl}
          type="button"
          onClick={() => onChange(lvl)}
          className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
            value === lvl
              ? lvl === 1 ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                : lvl === 2 ? 'bg-amber-100 border-amber-400 text-amber-700'
                : 'bg-red-100 border-red-400 text-red-700'
              : 'bg-background border-input text-muted-foreground hover:border-muted-foreground/40'
          }`}
        >
          {lvl} — {lvl === 1 ? 'Faible' : lvl === 2 ? 'Moyen' : 'Élevé'}
        </button>
      ))}
    </div>
  )
}

function HazardTypeSelector({ value, onChange }: { value: HazardType; onChange: (v: HazardType) => void }) {
  return (
    <div className="flex gap-2">
      {(['B', 'C', 'P'] as HazardType[]).map((t) => {
        const Icon = HAZARD_ICONS[t]
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              value === t
                ? HAZARD_TYPE_COLORS[t]
                : 'bg-background border-input text-muted-foreground hover:border-muted-foreground/40'
            }`}
          >
            <Icon className="size-3.5" />
            {t} — {HAZARD_TYPE_LABELS[t]}
          </button>
        )
      })}
    </div>
  )
}

// ── Tab : Tableau des PCC ──────────────────────────────────────────────────────

function TabPCC({ ccps, onAdd }: { ccps: CriticalControlPoint[]; onAdd: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white" onClick={onAdd}>
          <Plus className="size-4" />
          Ajouter un PCC
        </Button>
      </div>

      {ccps.length === 0 && (
        <div className="rounded-lg border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
          Aucun PCC défini. Cliquez sur «&nbsp;Ajouter un PCC&nbsp;» pour commencer.
        </div>
      )}

      {ccps.map((ccp) => {
        const isOpen = expandedId === ccp.id
        return (
          <div key={ccp.id} className="rounded-xl border bg-card overflow-hidden">
            <button
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setExpandedId(isOpen ? null : ccp.id)}
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertOctagon className="size-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{ccp.pccNumber}</span>
                  <span className="text-muted-foreground text-sm">·</span>
                  <span className="text-sm font-medium truncate">{ccp.stepName}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{ccp.hazardDescription}</p>
              </div>
              <HazardBadge type={ccp.hazardType} />
              <ChevronRight className={`size-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOpen && (
              <div className="border-t px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 bg-muted/10">
                <DetailField label="Limite critique"          icon={AlertOctagon}  iconColor="text-red-500">{ccp.criticalLimit}</DetailField>
                <DetailField label="Méthode de surveillance"  icon={Microscope}    iconColor="text-blue-500">{ccp.monitoringMethod}</DetailField>
                <DetailField label="Fréquence"                icon={Calendar}      iconColor="text-violet-500">{ccp.monitoringFrequency}</DetailField>
                <DetailField label="Responsable"              icon={User}          iconColor="text-slate-500">{ccp.responsible}</DetailField>
                <DetailField label="Action corrective"        icon={ShieldCheck}   iconColor="text-amber-500" colSpan>{ccp.correctiveAction}</DetailField>
                <DetailField label="Méthode de vérification"  icon={CheckCircle2}  iconColor="text-emerald-500" colSpan>{ccp.verificationMethod}</DetailField>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tab : Analyse des dangers ──────────────────────────────────────────────────

function TabDangers({ hazards, onAdd }: { hazards: HazardAnalysis[]; onAdd: () => void }) {
  const [typeFilter, setTypeFilter] = useState<HazardType | 'Tous'>('Tous')

  const filtered = useMemo(
    () => typeFilter === 'Tous' ? hazards : hazards.filter((h) => h.hazardType === typeFilter),
    [hazards, typeFilter],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5">
          {(['Tous', 'B', 'C', 'P'] as Array<HazardType | 'Tous'>).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === t
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'Tous' ? 'Tous' : `${t} — ${HAZARD_TYPE_LABELS[t]}`}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} danger{filtered.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" className="gap-1.5 ml-auto" onClick={onAdd}>
          <Plus className="size-4" />
          Ajouter un danger
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Étape</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide w-[130px]">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Danger identifié</th>
              <th className="text-center px-4 py-3 text-xs font-semibold tracking-wide w-[70px]">G</th>
              <th className="text-center px-4 py-3 text-xs font-semibold tracking-wide w-[70px]">P</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide w-[130px]">Score G×P</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide w-[60px]">PCC?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucun danger ne correspond aux filtres.
                </td>
              </tr>
            ) : filtered.map((h) => {
              const score = riskScore(h)
              return (
                <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20 align-top">
                  <td className="px-4 py-3 font-medium text-sm">{h.stepName}</td>
                  <td className="px-4 py-3"><HazardBadge type={h.hazardType} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
                    <p className="font-medium text-foreground">{h.hazardDescription}</p>
                    <p className="text-xs mt-1">{h.controlMeasure}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-xs font-bold tabular-nums">{h.gravity}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-xs font-bold tabular-nums">{h.probability}</span>
                  </td>
                  <td className="px-4 py-3"><RiskBadge score={score} /></td>
                  <td className="px-4 py-3 text-center">
                    {h.isCcp
                      ? <CheckCircle2 className="size-4 text-red-500 mx-auto" />
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <Info className="size-4 shrink-0 mt-0.5" />
        <span>
          <strong className="text-foreground">G</strong> = Gravité (1 faible → 3 élevée) ·{' '}
          <strong className="text-foreground">P</strong> = Probabilité (1 faible → 3 élevée) ·{' '}
          <strong className="text-foreground">Score G×P</strong> :{' '}
          <span className="text-emerald-600 font-medium">≤ 3 acceptable</span>,{' '}
          <span className="text-amber-600 font-medium">4–6 modéré</span>,{' '}
          <span className="text-red-600 font-medium">≥ 7 critique → PCC</span>
        </span>
      </div>
    </div>
  )
}

// ── Tab : Flux de process ──────────────────────────────────────────────────────

function TabFlux({ steps, onAdd }: { steps: ProcessStep[]; onAdd: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
          <Plus className="size-4" />
          Ajouter une étape
        </Button>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center w-8 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step.hasCcp
                  ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step.order}
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 flex justify-center py-1">
                  <ArrowRight className="size-3 text-muted-foreground rotate-90" />
                </div>
              )}
            </div>
            <div className={`flex-1 mb-2 rounded-lg border px-4 py-3 ${step.hasCcp ? 'border-red-200 bg-red-50/40' : 'bg-card'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{step.name}</span>
                {step.hasCcp && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                    <AlertOctagon className="size-3" />
                    PCC
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Modal : Ajouter une étape ──────────────────────────────────────────────────

function ModalAddStep({
  open, onClose, onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<ProcessStep, 'id' | 'order'>) => void
}) {
  const EMPTY = { name: '', description: '', hasCcp: false }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  function reset() { setForm(EMPTY) }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    onSave({ name: form.name.trim(), description: form.description.trim(), hasCcp: form.hasCcp })
    setSaving(false)
    reset()
    onClose()
  }

  function handleClose() { reset(); onClose() }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) handleClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(480px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <ArrowRight className="size-[18px] text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-base">Ajouter une étape</p>
                  <p className="text-xs text-muted-foreground">Flux de process HACCP</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handleClose} disabled={saving}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <Field label="Nom de l'étape" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="ex : Pasteurisation"
                  autoFocus
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Décrivez le déroulement de cette étape…"
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </Field>
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <input
                  id="hasCcp"
                  type="checkbox"
                  checked={form.hasCcp}
                  onChange={(e) => setForm((p) => ({ ...p, hasCcp: e.target.checked }))}
                  className="size-4 rounded border-input accent-red-600"
                />
                <label htmlFor="hasCcp" className="text-sm font-medium cursor-pointer flex-1">
                  Cette étape contient un Point Critique de Contrôle (PCC)
                </label>
                {form.hasCcp && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                    <AlertOctagon className="size-3" />
                    PCC
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
              <Button variant="outline" onClick={handleClose} disabled={saving}>Annuler</Button>
              <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="gap-1.5">
                {saving
                  ? <><Loader2 className="size-4 animate-spin" />Enregistrement…</>
                  : <><Plus className="size-4" />Ajouter l'étape</>}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}

// ── Modal : Ajouter un danger ──────────────────────────────────────────────────

function ModalAddDanger({
  open, onClose, onSave, steps,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<HazardAnalysis, 'id'>) => void
  steps: ProcessStep[]
}) {
  const EMPTY = {
    stepId: '',
    hazardType: 'B' as HazardType,
    hazardDescription: '',
    gravity: 1 as RiskLevel,
    probability: 1 as RiskLevel,
    controlMeasure: '',
    isCcp: false,
  }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const selectedStep = steps.find((s) => s.id === form.stepId)
  const score = form.gravity * form.probability
  const isValid = form.stepId && form.hazardDescription.trim() && form.controlMeasure.trim()

  function reset() { setForm(EMPTY) }

  async function handleSave() {
    if (!isValid || !selectedStep) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    onSave({
      stepId:            form.stepId,
      stepName:          selectedStep.name,
      hazardType:        form.hazardType,
      hazardDescription: form.hazardDescription.trim(),
      gravity:           form.gravity,
      probability:       form.probability,
      controlMeasure:    form.controlMeasure.trim(),
      isCcp:             form.isCcp,
    })
    setSaving(false)
    reset()
    onClose()
  }

  function handleClose() { reset(); onClose() }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) handleClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(560px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Microscope className="size-[18px] text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-base">Ajouter un danger</p>
                  <p className="text-xs text-muted-foreground">Analyse des dangers HACCP</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handleClose} disabled={saving}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <Field label="Étape concernée" required>
                <select
                  value={form.stepId}
                  onChange={(e) => setForm((p) => ({ ...p, stepId: e.target.value }))}
                  className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Sélectionner une étape —</option>
                  {steps.map((s) => (
                    <option key={s.id} value={s.id}>{s.order}. {s.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Type de danger" required>
                <HazardTypeSelector
                  value={form.hazardType}
                  onChange={(v) => setForm((p) => ({ ...p, hazardType: v }))}
                />
              </Field>

              <Field label="Description du danger" required>
                <textarea
                  value={form.hazardDescription}
                  onChange={(e) => setForm((p) => ({ ...p, hazardDescription: e.target.value }))}
                  placeholder="ex : Contamination microbienne par Salmonella…"
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Gravité (G)">
                  <RiskSelector value={form.gravity} onChange={(v) => setForm((p) => ({ ...p, gravity: v }))} />
                </Field>
                <Field label="Probabilité (P)">
                  <RiskSelector value={form.probability} onChange={(v) => setForm((p) => ({ ...p, probability: v }))} />
                </Field>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-2.5">
                <span className="text-xs text-muted-foreground font-medium">Score G×P :</span>
                <RiskBadge score={score} />
                {score >= 7 && (
                  <span className="text-xs text-red-600 font-medium">→ Classification en PCC recommandée</span>
                )}
              </div>

              <Field label="Mesure de maîtrise" required>
                <textarea
                  value={form.controlMeasure}
                  onChange={(e) => setForm((p) => ({ ...p, controlMeasure: e.target.value }))}
                  placeholder="Décrire les mesures de contrôle mises en place…"
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </Field>

              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <input
                  id="isCcp"
                  type="checkbox"
                  checked={form.isCcp}
                  onChange={(e) => setForm((p) => ({ ...p, isCcp: e.target.checked }))}
                  className="size-4 rounded border-input accent-red-600"
                />
                <label htmlFor="isCcp" className="text-sm font-medium cursor-pointer flex-1">
                  Classer comme Point Critique de Contrôle (PCC)
                </label>
                {form.isCcp && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                    <AlertOctagon className="size-3" />
                    PCC
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
              <Button variant="outline" onClick={handleClose} disabled={saving}>Annuler</Button>
              <Button onClick={handleSave} disabled={!isValid || saving} className="gap-1.5">
                {saving
                  ? <><Loader2 className="size-4 animate-spin" />Enregistrement…</>
                  : <><Plus className="size-4" />Ajouter le danger</>}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}

// ── Modal : Ajouter un PCC ────────────────────────────────────────────────────

function ModalAddPCC({
  open, onClose, onSave, steps, nextPccNumber,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<CriticalControlPoint, 'id' | 'pccNumber'>) => void
  steps: ProcessStep[]
  nextPccNumber: string
}) {
  const EMPTY = {
    stepId:            '',
    hazardType:        'B' as HazardType,
    hazardDescription: '',
    criticalLimit:     '',
    monitoringMethod:  '',
    monitoringFrequency: '',
    responsible:       '',
    correctiveAction:  '',
    verificationMethod: '',
  }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const selectedStep = steps.find((s) => s.id === form.stepId)
  const isValid = form.stepId && form.hazardDescription.trim() && form.criticalLimit.trim()
    && form.monitoringMethod.trim() && form.responsible.trim()

  function reset() { setForm(EMPTY) }

  async function handleSave() {
    if (!isValid || !selectedStep) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    onSave({
      stepId:              form.stepId,
      stepName:            selectedStep.name,
      hazardType:          form.hazardType,
      hazardDescription:   form.hazardDescription.trim(),
      criticalLimit:       form.criticalLimit.trim(),
      monitoringMethod:    form.monitoringMethod.trim(),
      monitoringFrequency: form.monitoringFrequency.trim(),
      responsible:         form.responsible.trim(),
      correctiveAction:    form.correctiveAction.trim(),
      verificationMethod:  form.verificationMethod.trim(),
    })
    setSaving(false)
    reset()
    onClose()
  }

  function handleClose() { reset(); onClose() }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) handleClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(600px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertOctagon className="size-[18px] text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-base">
                    Ajouter un PCC — <span className="font-mono text-red-600">{nextPccNumber}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Point Critique de Contrôle</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handleClose} disabled={saving}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Étape concernée" required>
                  <select
                    value={form.stepId}
                    onChange={(e) => setForm((p) => ({ ...p, stepId: e.target.value }))}
                    className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">— Sélectionner —</option>
                    {steps.map((s) => (
                      <option key={s.id} value={s.id}>{s.order}. {s.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Type de danger" required>
                  <div className="flex gap-1.5">
                    {(['B', 'C', 'P'] as HazardType[]).map((t) => {
                      const Icon = HAZARD_ICONS[t]
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, hazardType: t }))}
                          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                            form.hazardType === t
                              ? HAZARD_TYPE_COLORS[t]
                              : 'bg-background border-input text-muted-foreground hover:border-muted-foreground/40'
                          }`}
                        >
                          <Icon className="size-3.5" />
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </Field>
              </div>

              <Field label="Description du danger" required>
                <Input
                  value={form.hazardDescription}
                  onChange={(e) => setForm((p) => ({ ...p, hazardDescription: e.target.value }))}
                  placeholder="ex : Survie de pathogènes en cas de sous-traitement"
                />
              </Field>

              <Field label="Limite critique" required>
                <textarea
                  value={form.criticalLimit}
                  onChange={(e) => setForm((p) => ({ ...p, criticalLimit: e.target.value }))}
                  placeholder="ex : Température ≥ 85 °C pendant ≥ 15 secondes en continu"
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Méthode de surveillance" required>
                  <textarea
                    value={form.monitoringMethod}
                    onChange={(e) => setForm((p) => ({ ...p, monitoringMethod: e.target.value }))}
                    placeholder="ex : Enregistreur de température continu"
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </Field>
                <div className="space-y-4">
                  <Field label="Fréquence">
                    <Input
                      value={form.monitoringFrequency}
                      onChange={(e) => setForm((p) => ({ ...p, monitoringFrequency: e.target.value }))}
                      placeholder="ex : En continu / 3× par poste"
                    />
                  </Field>
                  <Field label="Responsable" required>
                    <Input
                      value={form.responsible}
                      onChange={(e) => setForm((p) => ({ ...p, responsible: e.target.value }))}
                      placeholder="ex : Opérateur Pasteurisation"
                    />
                  </Field>
                </div>
              </div>

              <Field label="Action corrective">
                <textarea
                  value={form.correctiveAction}
                  onChange={(e) => setForm((p) => ({ ...p, correctiveAction: e.target.value }))}
                  placeholder="Mesures à prendre en cas de dépassement de la limite critique…"
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </Field>

              <Field label="Méthode de vérification">
                <textarea
                  value={form.verificationMethod}
                  onChange={(e) => setForm((p) => ({ ...p, verificationMethod: e.target.value }))}
                  placeholder="ex : Calibration mensuelle, audit trimestriel par labo externe…"
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
              <Button variant="outline" onClick={handleClose} disabled={saving}>Annuler</Button>
              <Button
                onClick={handleSave}
                disabled={!isValid || saving}
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
              >
                {saving
                  ? <><Loader2 className="size-4 animate-spin" />Enregistrement…</>
                  : <><AlertOctagon className="size-4" />Créer le PCC</>}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HaccpPlanPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pcc')

  const [steps,   setSteps]   = useState<ProcessStep[]>([])
  const [hazards, setHazards] = useState<HazardAnalysis[]>([])
  const [ccps,    setCcps]    = useState<CriticalControlPoint[]>([])

  const [modalStep,   setModalStep]   = useState(false)
  const [modalDanger, setModalDanger] = useState(false)
  const [modalPcc,    setModalPcc]    = useState(false)

  const nextPccNumber = `PCC ${ccps.length + 1}`

  const stats = {
    etapes:    steps.length,
    pcc:       ccps.length,
    dangers:   hazards.length,
    critiques: hazards.filter((h) => riskScore(h) >= 7).length,
  }

  function handleAddStep(data: Omit<ProcessStep, 'id' | 'order'>) {
    setSteps((prev) => [
      ...prev,
      { id: `ps${Date.now()}`, order: prev.length + 1, ...data },
    ])
  }

  function handleAddHazard(data: Omit<HazardAnalysis, 'id'>) {
    setHazards((prev) => [...prev, { id: `h${Date.now()}`, ...data }])
  }

  function handleAddCcp(data: Omit<CriticalControlPoint, 'id' | 'pccNumber'>) {
    setCcps((prev) => [
      ...prev,
      { id: `ccp${Date.now()}`, pccNumber: nextPccNumber, ...data },
    ])
    setSteps((prev) =>
      prev.map((s) => s.id === data.stepId ? { ...s, hasCcp: true } : s),
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5 text-red-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Plan HACCP</h1>
              <HelpPopover section="qualite" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Hazard Analysis and Critical Control Points — référentiel qualité
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          <span>
            Version <strong className="text-foreground">{HACCP_PLAN_META.version}</strong>
            {' '}· Révisé le <strong className="text-foreground">{HACCP_PLAN_META.revisedAt}</strong>
            {' '}par <strong className="text-foreground">{HACCP_PLAN_META.revisedBy}</strong>
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Étapes process"         value={stats.etapes}    icon={ArrowRight}   bgClass="bg-slate-50"  iconBg="bg-slate-100"  iconColor="text-slate-600" />
        <StatCard label="Points Critiques (PCC)"  value={stats.pcc}       icon={AlertOctagon} bgClass="bg-red-50"    iconBg="bg-red-100"    iconColor="text-red-600" />
        <StatCard label="Dangers identifiés"     value={stats.dangers}   icon={Microscope}   bgClass="bg-amber-50"  iconBg="bg-amber-100"  iconColor="text-amber-600" />
        <StatCard label="Dangers critiques"      value={stats.critiques} icon={ShieldCheck}  bgClass="bg-blue-50"   iconBg="bg-blue-100"   iconColor="text-blue-600" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'pcc'     && <TabPCC     ccps={ccps}       onAdd={() => setModalPcc(true)} />}
      {activeTab === 'dangers' && <TabDangers hazards={hazards} onAdd={() => setModalDanger(true)} />}
      {activeTab === 'flux'    && <TabFlux    steps={steps}     onAdd={() => setModalStep(true)} />}

      {/* Modaux */}
      <ModalAddStep
        open={modalStep}
        onClose={() => setModalStep(false)}
        onSave={handleAddStep}
      />
      <ModalAddDanger
        open={modalDanger}
        onClose={() => setModalDanger(false)}
        onSave={handleAddHazard}
        steps={steps}
      />
      <ModalAddPCC
        open={modalPcc}
        onClose={() => setModalPcc(false)}
        onSave={handleAddCcp}
        steps={steps}
        nextPccNumber={nextPccNumber}
      />
    </div>
  )
}
