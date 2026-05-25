'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Loader2, Building2, Leaf, Printer, Check } from 'lucide-react'
import { CommandeFournisseur, TypeCommande } from './types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (c: Omit<CommandeFournisseur, 'id' | 'itemId' | 'numero' | 'quantiteRecue' | 'reception' | 'statut'>) => Promise<boolean>
}

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

const TYPE_OPTIONS = [
  {
    value: 'BC' as TypeCommande,
    icon: Building2,
    label: 'Formel → BC',
    sub: 'Bon de Commande',
    iconClass: 'text-blue-600',
  },
  {
    value: 'BA' as TypeCommande,
    icon: Leaf,
    label: "Informel → BA",
    sub: "Bon d'Achat",
    iconClass: 'text-emerald-600',
  },
]

const EMPTY = {
  type: 'BC' as TypeCommande,
  fournisseur: '',
  contrat: '',
  article: '',
  quantite: '',
  unite: 'kg',
  puHT: '0',
  livraisonPrevue: '',
}

export function CommandeModal({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(EMPTY)
  }, [open])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isBC = form.type === 'BC'

  function isValid() {
    return !!form.fournisseur.trim() && !!form.article.trim() && !!form.quantite && !!form.livraisonPrevue
  }

  async function handleSave() {
    setSaving(true)
    const ok = await onSave({
      type:             form.type,
      date:             new Date().toISOString().split('T')[0],
      fournisseur:      form.fournisseur.trim(),
      article:          form.article.trim(),
      quantite:         parseFloat(form.quantite),
      unite:            form.unite.trim() || 'kg',
      puHT:             form.puHT !== '' ? parseFloat(form.puHT) : null,
      livraisonPrevue:  form.livraisonPrevue,
      contrat:          isBC && form.contrat.trim() ? form.contrat.trim() : null,
      dureeVie:         null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(640px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {isBC
                    ? <Building2 className="size-[18px] text-foreground" />
                    : <Leaf className="size-[18px] text-emerald-600" />
                  }
                </div>
                <p className="font-semibold text-base">Nouvelle Commande Fournisseur</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Type fournisseur */}
              <Field label="Type fournisseur" required>
                <div className="grid grid-cols-2 gap-3">
                  {TYPE_OPTIONS.map((opt) => {
                    const selected = form.type === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => set('type', opt.value)}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-semibold transition-colors ${
                          selected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-input bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                        }`}
                      >
                        <opt.icon className={`size-5 ${selected ? 'text-blue-600' : opt.iconClass}`} />
                        <span>
                          {opt.label}{' '}
                          <span className="font-normal">({opt.sub})</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Field>

              {/* Fournisseur + Contrat */}
              <div className="grid grid-cols-2 gap-x-5">
                <Field label="Fournisseur" required>
                  <Input
                    value={form.fournisseur}
                    onChange={(e) => set('fournisseur', e.target.value)}
                    placeholder="Nom du fournisseur"
                  />
                </Field>
                <Field label="N° Contrat cadre">
                  <Input
                    value={form.contrat}
                    onChange={(e) => set('contrat', e.target.value)}
                    placeholder="CT-2026-XXX"
                    disabled={!isBC}
                  />
                </Field>
              </div>

              {/* Article */}
              <Field label="Article" required>
                <Input
                  value={form.article}
                  onChange={(e) => set('article', e.target.value)}
                  placeholder="Désignation de l'article commandé"
                />
              </Field>

              {/* Qté · Unité · PU HT · Livraison */}
              <div className="grid grid-cols-4 gap-x-4">
                <Field label="Quantité" required>
                  <Input
                    type="number"
                    min="0"
                    value={form.quantite}
                    onChange={(e) => set('quantite', e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Unité">
                  <Input
                    value={form.unite}
                    onChange={(e) => set('unite', e.target.value)}
                    placeholder="kg"
                  />
                </Field>
                <Field label="PU HT (XOF)">
                  <Input
                    type="number"
                    min="0"
                    value={form.puHT}
                    onChange={(e) => set('puHT', e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Livraison prévue" required>
                  <Input
                    type="date"
                    value={form.livraisonPrevue}
                    onChange={(e) => set('livraisonPrevue', e.target.value)}
                  />
                </Field>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2.5 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50/60 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                <Printer className="size-4 shrink-0 mt-0.5 text-orange-500" />
                <span>
                  À la création, un{' '}
                  <strong className="text-foreground">
                    {isBC ? 'Bon de Commande (BC)' : "Bon d'Achat (BA)"}
                  </strong>{' '}
                  est imprimé et numéroté automatiquement (préfixe{' '}
                  <strong className="text-foreground">{isBC ? 'BC-' : 'BA-'}</strong>
                  ). Il sera référencé par la prochaine réception (REC-).
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={!isValid() || saving}>
                {saving
                  ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</>
                  : <><Check className="size-4 mr-1.5" />Créer &amp; imprimer {form.type}</>
                }
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
