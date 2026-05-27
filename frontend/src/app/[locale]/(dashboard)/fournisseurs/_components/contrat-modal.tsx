'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, FileSignature } from 'lucide-react'
import {
  ContratAchat, ContratStatut,
  CONTRAT_STATUT_LABELS,
} from './types'
import { createContrat } from '@/lib/actions/contrats'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  fournisseurId: string
  onSave: (contrat: ContratAchat) => void  // reçoit le contrat persisté (avec son vrai UUID)
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

const DEVISES = ['XOF', 'USD', 'EUR', 'GHS', 'GNF', 'MAD']
const UNITES  = ['kg', 'L', 'u', 'carton', 'sac', 'tonne']
const STATUTS: ContratStatut[] = ['EnNegociation', 'Actif', 'Expire']

const EMPTY: Omit<ContratAchat, 'id' | 'fournisseurId'> = {
  reference:    '',
  article:      '',
  dateDebut:    '',
  dateFin:      '',
  prixUnitaire: 0,
  devise:       'XOF',
  quantiteMin:  0,
  unite:        'kg',
  statut:       'EnNegociation',
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function ContratModal({ open, onClose, fournisseurId, onSave }: Props) {
  const [form, setForm]     = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({})

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY })
      setErrors({})
    }
  }, [open])

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.reference.trim())            e.reference    = 'Obligatoire'
    if (!form.article.trim())              e.article      = 'Obligatoire'
    if (!form.dateDebut)                   e.dateDebut    = 'Obligatoire'
    if (!form.dateFin)                     e.dateFin      = 'Obligatoire'
    if (form.dateFin && form.dateDebut && form.dateFin < form.dateDebut)
                                           e.dateFin      = 'Doit être après la date de début'
    if (form.prixUnitaire <= 0)            e.prixUnitaire = 'Doit être > 0'
    if (form.quantiteMin <= 0)             e.quantiteMin  = 'Doit être > 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const saved = await createContrat({ ...form, fournisseurId })
    setSaving(false)
    if (!saved) return   // erreur serveur : on reste sur la modal
    onSave(saved)
    onClose()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(600px,92vw)] max-h-[88vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <FileSignature className="size-[18px] text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-base">Nouveau contrat cadre</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Définissez les conditions contractuelles avec ce fournisseur
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* ── Body ────────────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Identification */}
              <div className="rounded-lg border bg-muted/20 px-4 py-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Identification
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Référence contrat" required>
                    <Input
                      value={form.reference}
                      onChange={(e) => set('reference', e.target.value)}
                      placeholder="CT-2026-0001"
                      className={errors.reference ? 'border-red-400' : ''}
                    />
                    {errors.reference && <p className="text-xs text-red-500 mt-1">{errors.reference}</p>}
                  </Field>
                  <Field label="Statut" required>
                    <select
                      value={form.statut}
                      onChange={(e) => set('statut', e.target.value as ContratStatut)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {STATUTS.map((s) => (
                        <option key={s} value={s}>{CONTRAT_STATUT_LABELS[s]}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Article / Matière première" required>
                  <Input
                    value={form.article}
                    onChange={(e) => set('article', e.target.value)}
                    placeholder="Ex : Fleurs d'hibiscus séchées"
                    className={errors.article ? 'border-red-400' : ''}
                  />
                  {errors.article && <p className="text-xs text-red-500 mt-1">{errors.article}</p>}
                </Field>
              </div>

              {/* Période de validité */}
              <div className="rounded-lg border bg-muted/20 px-4 py-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Période de validité
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date de début" required>
                    <Input
                      type="date"
                      value={form.dateDebut}
                      onChange={(e) => set('dateDebut', e.target.value)}
                      className={errors.dateDebut ? 'border-red-400' : ''}
                    />
                    {errors.dateDebut && <p className="text-xs text-red-500 mt-1">{errors.dateDebut}</p>}
                  </Field>
                  <Field label="Date de fin" required>
                    <Input
                      type="date"
                      value={form.dateFin}
                      onChange={(e) => set('dateFin', e.target.value)}
                      className={errors.dateFin ? 'border-red-400' : ''}
                    />
                    {errors.dateFin && <p className="text-xs text-red-500 mt-1">{errors.dateFin}</p>}
                  </Field>
                </div>
              </div>

              {/* Conditions tarifaires */}
              <div className="rounded-lg border bg-muted/20 px-4 py-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Conditions tarifaires
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Prix unitaire" required>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.prixUnitaire === 0 ? '' : form.prixUnitaire}
                      onChange={(e) => set('prixUnitaire', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`text-right font-mono ${errors.prixUnitaire ? 'border-red-400' : ''}`}
                    />
                    {errors.prixUnitaire && <p className="text-xs text-red-500 mt-1">{errors.prixUnitaire}</p>}
                  </Field>
                  <Field label="Devise">
                    <select
                      value={form.devise}
                      onChange={(e) => set('devise', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {DEVISES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Qté minimum" required>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.quantiteMin === 0 ? '' : form.quantiteMin}
                      onChange={(e) => set('quantiteMin', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`text-right font-mono ${errors.quantiteMin ? 'border-red-400' : ''}`}
                    />
                    {errors.quantiteMin && <p className="text-xs text-red-500 mt-1">{errors.quantiteMin}</p>}
                  </Field>
                </div>
                <div className="max-w-[160px]">
                  <Field label="Unité">
                    <select
                      value={form.unite}
                      onChange={(e) => set('unite', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {UNITES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20 shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Créer le contrat
              </Button>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
