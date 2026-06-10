'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, Loader2, PackagePlus } from 'lucide-react'

export type ArticleOption = { code: string; designation: string; unite: string }

interface Props {
  open:     boolean
  onClose:  () => void
  onSave:   (articleCode: string, lot: string, quantite: number, date: string, motif: string) => Promise<boolean>
  articles: ArticleOption[]
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

const EMPTY = { articleCode: '', lot: '', quantite: '', date: '', motif: '' }

export function MouvementModal({ open, onClose, onSave, articles }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0] })
  }, [open])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const article = articles.find((a) => a.code === form.articleCode)
  const isValid = !!form.articleCode && !!form.quantite && parseFloat(form.quantite) > 0

  async function handleSave() {
    setSaving(true)
    const ok = await onSave(
      form.articleCode,
      form.lot.trim(),
      parseFloat(form.quantite),
      form.date,
      form.motif.trim(),
    )
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
          <div className="w-[520px] rounded-xl border bg-card shadow-lg">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <PackagePlus className="size-[18px] text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold">Entrée stock initiale</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Initialisation du stock au démarrage (go-live)</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">

              {/* Bannière info */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 leading-relaxed">
                Réservé à l'initialisation du stock existant avant démarrage de l'ERP.
                Les entrées liées aux achats se font automatiquement via la <strong>Réception</strong>.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Article" required>
                    <Select value={form.articleCode} onValueChange={(v) => set('articleCode', v ?? '')}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner un article…" /></SelectTrigger>
                      <SelectContent>
                        {articles.map((a) => (
                          <SelectItem key={a.code} value={a.code}>
                            <span className="font-mono text-xs mr-2">{a.code}</span>
                            <span className="text-muted-foreground">{a.designation}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Quantité" required>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={form.quantite}
                      onChange={(e) => set('quantite', e.target.value)}
                      placeholder="0"
                    />
                    {article && (
                      <span className="flex items-center px-3 rounded-md border bg-muted text-muted-foreground text-sm whitespace-nowrap">
                        {article.unite}
                      </span>
                    )}
                  </div>
                </Field>

                <Field label="Date d'entrée">
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                  />
                </Field>

                <Field label="N° lot (optionnel)">
                  <Input
                    value={form.lot}
                    onChange={(e) => set('lot', e.target.value)}
                    placeholder="Ex: INIT-20260610-0001"
                  />
                </Field>

                <Field label="Motif">
                  <Input
                    value={form.motif}
                    onChange={(e) => set('motif', e.target.value)}
                    placeholder="Ex: Stock initial go-live"
                  />
                </Field>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
              <Button onClick={handleSave} disabled={!isValid || saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving
                  ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</>
                  : <><PackagePlus className="size-4 mr-1.5" />Enregistrer le stock initial</>}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
