'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Factory } from 'lucide-react'
import type { WorkCenter } from '@/types/erp'
import type { WorkCenterInput } from '@/lib/actions/work-centers'

interface Props {
  open: boolean
  onClose: () => void
  workCenter: WorkCenter | null
  onSave: (data: WorkCenterInput) => Promise<void>
}

const EMPTY: WorkCenterInput = {
  name:                 '',
  code:                 '',
  ratePerHour:          0,
  currency:             'XOF',
  dailyCapacityHours:   8,
  efficiencyPercentage: 100,
}

/** Code auto : 3 premières lettres du nom + 4 chiffres aléatoires (ex : CUV-1234) */
function generateWorkCenterCode(name: string): string {
  const prefix = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'PDC'
  const digits = String(Math.floor(1000 + Math.random() * 9000))
  return `${prefix}-${digits}`
}

function Field({ label, required, helper, children }: {
  label: string; required?: boolean; helper?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

export function WorkCenterModal({ open, onClose, workCenter, onSave }: Props) {
  const [form, setForm] = useState<WorkCenterInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (workCenter) {
      setForm({
        name:                 workCenter.name,
        code:                 workCenter.code ?? '',
        ratePerHour:          workCenter.ratePerHour,
        currency:             workCenter.currency,
        dailyCapacityHours:   workCenter.dailyCapacityHours,
        efficiencyPercentage: workCenter.efficiencyPercentage,
      })
    } else {
      setForm(EMPTY)
    }
    setError('')
  }, [open, workCenter])

  function set(field: keyof WorkCenterInput, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Le nom est requis.'); return }
    if (form.ratePerHour < 0) { setError('Le taux horaire doit être ≥ 0.'); return }
    if (form.dailyCapacityHours <= 0) { setError('La capacité journalière doit être > 0.'); return }
    if (form.efficiencyPercentage < 1 || form.efficiencyPercentage > 100) {
      setError("L'efficacité doit être entre 1 et 100 %.")
      return
    }
    setSaving(true)
    setError('')
    try {
      // Code auto-généré à la création ; conservé tel quel en édition
      const code = workCenter
        ? form.code
        : (form.code?.trim() || generateWorkCenterCode(form.name))
      await onSave({ ...form, code })
      onClose()
    } catch (e) {
      setError('Une erreur est survenue. Vérifiez que le nom est unique.')
    } finally {
      setSaving(false)
    }
  }

  // Capacité effective = h/j × efficacité%
  const capaciteEffective = (form.dailyCapacityHours * form.efficiencyPercentage / 100).toFixed(1)
  // Coût journalier = capaciteEffective × ratePerHour
  const coutJournalier    = Math.round(parseFloat(capaciteEffective) * form.ratePerHour)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(560px,94vw)] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Factory className="size-[18px] text-foreground" />
                </div>
                <p className="font-semibold text-base">
                  {workCenter ? 'Modifier le poste de charge' : 'Nouveau poste de charge'}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* ── Body ───────────────────────────────────────────── */}
            <div className="px-6 py-5 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nom" required>
                  <Input
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="ex : Cuve inox 500L"
                  />
                </Field>
                <Field label="Code court" helper="Généré automatiquement depuis le nom">
                  <Input
                    value={workCenter ? (form.code ?? '') : ''}
                    placeholder={workCenter ? '' : 'Généré automatiquement'}
                    disabled
                    className="font-mono uppercase bg-muted text-muted-foreground"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Taux horaire (XOF/h)" helper="Coût inclus MOD + amortissement">
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={form.ratePerHour === 0 ? '' : form.ratePerHour}
                    onChange={(e) => set('ratePerHour', parseFloat(e.target.value) || 0)}
                    placeholder="ex : 9 000"
                    className="font-mono"
                  />
                </Field>
                <Field label="Capacité journalière (h/j)">
                  <Input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={form.dailyCapacityHours}
                    onChange={(e) => set('dailyCapacityHours', parseFloat(e.target.value) || 8)}
                    className="font-mono"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Efficacité TRS (%)" helper="Taux de rendement synthétique (OEE)">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={form.efficiencyPercentage}
                    onChange={(e) => set('efficiencyPercentage', parseFloat(e.target.value) || 100)}
                    className="font-mono"
                  />
                </Field>
                <div />
              </div>

              {/* Recap */}
              <div className="rounded-lg bg-muted/40 border px-4 py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Capacité effective / jour</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{capaciteEffective} h</p>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <p className="text-muted-foreground">Coût journalier ≈</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {coutJournalier > 0 ? `${coutJournalier.toLocaleString('fr-FR')} XOF` : '—'}
                  </p>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <p className="text-muted-foreground">Coût horaire facturé</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {form.ratePerHour > 0 ? `${form.ratePerHour.toLocaleString('fr-FR')} XOF/h` : '—'}
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'Enregistrement…' : workCenter ? 'Enregistrer' : 'Créer le poste'}
              </Button>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
