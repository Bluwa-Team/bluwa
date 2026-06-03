'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TypeMouvement, ENTREPOTS, Mouvement } from './types'

export type ArticleOption = { code: string; designation: string; unite: string }

interface Props {
  open: boolean
  onClose: () => void
  onSave: (m: Partial<Mouvement>) => Promise<boolean>
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

const EMPTY = {
  type: 'Entree' as TypeMouvement,
  articleCode: '',
  lot: '',
  quantite: '',
  entrepotSource: '',
  entrepotDest: '',
  reference: '',
  motif: '',
}

export function MouvementModal({ open, onClose, onSave, articles }: Props) {
  const t = useTranslations('stocks')
  const tCommon = useTranslations('common')

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(EMPTY)
  }, [open])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isTransfert = form.type === 'Transfert'
  const isEntree = form.type === 'Entree'
  const isSortie = form.type === 'Sortie' || form.type === 'Ajustement'

  const article = articles.find((a) => a.code === form.articleCode)

  function isValid() {
    return !!form.articleCode && !!form.lot && !!form.quantite
  }

  async function handleSave() {
    setSaving(true)
    const ok = await onSave({
      type: form.type,
      articleCode: form.articleCode,
      articleDesignation: article?.designation ?? '',
      lot: form.lot,
      quantite: parseFloat(form.quantite),
      unite: article?.unite ?? '',
      entrepotSource: form.entrepotSource,
      entrepotDest: form.entrepotDest,
      reference: form.reference,
      motif: form.motif,
      operateur: 'Utilisateur',
      date: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    if (ok) onClose()
  }

  const MOUVEMENT_TYPE_LABELS: Record<TypeMouvement, string> = {
    Entree: t('movements.types.Entree'),
    Sortie: t('movements.types.Sortie'),
    Transfert: t('movements.types.Transfert'),
    Ajustement: t('movements.types.Ajustement'),
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[580px] rounded-xl border bg-card shadow-lg">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <p className="font-semibold">{t('movements.title')}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t('movements.subtitle')}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Type tabs */}
              <div>
                <Label className="text-sm mb-2 block">{t('movements.fields.type')}</Label>
                <div className="flex gap-2">
                  {(['Entree', 'Sortie', 'Transfert', 'Ajustement'] as TypeMouvement[]).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => set('type', tp)}
                      className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-colors ${
                        form.type === tp
                          ? tp === 'Entree' ? 'bg-emerald-600 text-white border-emerald-600'
                          : tp === 'Sortie' ? 'bg-red-600 text-white border-red-600'
                          : tp === 'Transfert' ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-purple-600 text-white border-purple-600'
                          : 'bg-background text-muted-foreground border-input hover:text-foreground'
                      }`}
                    >
                      {MOUVEMENT_TYPE_LABELS[tp]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Field label={t('movements.fields.article')} required>
                  <Select value={form.articleCode} onValueChange={(v) => set('articleCode', v ?? '')}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
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

                <Field label={t('movements.fields.lot')} required>
                  <Input value={form.lot} onChange={(e) => set('lot', e.target.value)} placeholder="Ex: MP-20260603-01" />
                </Field>

                <Field label={form.type === 'Ajustement' ? t('movements.fields.quantityAdjust') : t('movements.fields.quantity')} required>
                  <div className="flex gap-2">
                    <Input
                      type="number"
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

                <Field label={t('movements.fields.reference')}>
                  <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="CMD / LOT-PROD / INV…" />
                </Field>

                {isEntree && (
                  <Field label={t('movements.fields.destWarehouse')}>
                    <Select value={form.entrepotDest} onValueChange={(v) => set('entrepotDest', v ?? '')}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ENTREPOTS).map(([code, e]) => (
                          <SelectItem key={code} value={code}>{e.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {isSortie && (
                  <Field label={t('movements.fields.sourceWarehouse')}>
                    <Select value={form.entrepotSource} onValueChange={(v) => set('entrepotSource', v ?? '')}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ENTREPOTS).map(([code, e]) => (
                          <SelectItem key={code} value={code}>{e.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {isTransfert && (
                  <>
                    <Field label={t('movements.fields.sourceWarehouse')}>
                      <Select value={form.entrepotSource} onValueChange={(v) => set('entrepotSource', v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ENTREPOTS).map(([code, e]) => (
                            <SelectItem key={code} value={code}>{e.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={t('movements.fields.destWarehouse')}>
                      <Select value={form.entrepotDest} onValueChange={(v) => set('entrepotDest', v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ENTREPOTS).map(([code, e]) => (
                            <SelectItem key={code} value={code}>{e.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                )}

                <div className="col-span-2">
                  <Field label={t('movements.fields.reason')}>
                    <Input value={form.motif} onChange={(e) => set('motif', e.target.value)} placeholder="Ex: Réception commande fournisseur…" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving}>{tCommon('cancel')}</Button>
              <Button onClick={handleSave} disabled={!isValid() || saving}>
                {saving ? <><Loader2 className="size-4 animate-spin mr-1.5" />{t('movements.saving')}</> : t('movements.save')}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
