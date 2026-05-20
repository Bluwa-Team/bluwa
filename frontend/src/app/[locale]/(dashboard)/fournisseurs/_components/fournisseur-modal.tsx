'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiStepForm } from '@/components/ui/multi-step-form'
import { useTranslations } from 'next-intl'
import {
  Fournisseur, FournisseurStatut, FournisseurQualification,
  CATEGORIES_FOURNISSEUR, DEVISES, PAYS_AFRIQUE_OUEST, MODES_LOGISTIQUE,
} from './types'

interface Props {
  open: boolean
  onClose: () => void
  fournisseur?: Fournisseur | null
  onSave: (data: Partial<Fournisseur>) => Promise<boolean>
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

const TOTAL_STEPS = 2

const EMPTY_FORM = {
  raisonSociale: '',
  statut: 'Formel' as FournisseurStatut,
  qualification: 'AQualifier' as FournisseurQualification,
  categorie: '',
  devise: 'XOF',
  contactPrincipal: '',
  telephone: '',
  email: '',
  ville: '',
  pays: 'Sénégal',
  modeLogistique: '',
  paiementMobile: false,
}

export function FournisseurModal({ open, onClose, fournisseur, onSave }: Props) {
  const t = useTranslations('fournisseurs')
  const tCommon = useTranslations('common')

  const isEdit = !!fournisseur
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const STEPS = [
    { title: t('modal.steps.identity'), description: t('modal.steps.identityDesc') },
    { title: t('modal.steps.contact'), description: t('modal.steps.contactDesc') },
  ]

  useEffect(() => {
    if (!open) return
    setStep(1)
    if (fournisseur) {
      setForm({
        raisonSociale: fournisseur.raisonSociale,
        statut: fournisseur.statut,
        qualification: fournisseur.qualification,
        categorie: fournisseur.categorie,
        devise: fournisseur.devise,
        contactPrincipal: fournisseur.contactPrincipal,
        telephone: fournisseur.telephone,
        email: fournisseur.email,
        ville: fournisseur.ville,
        pays: fournisseur.pays,
        modeLogistique: fournisseur.modeLogistique,
        paiementMobile: fournisseur.paiementMobile,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [fournisseur, open])

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function isStepValid() {
    if (step === 1) return !!form.raisonSociale && !!form.categorie
    return true
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
    } else {
      setSaving(true)
      const ok = await onSave(form)
      setSaving(false)
      if (ok) onClose()
    }
  }

  const stepMeta = STEPS[step - 1]

  const QUALIFICATION_OPTIONS: { value: FournisseurQualification; label: string }[] = [
    { value: 'Agree', label: t('qualifications.Agree') },
    { value: 'AQualifier', label: t('qualifications.AQualifier') },
    { value: 'Suspendu', label: t('qualifications.Suspendu') },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <MultiStepForm
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            title={isEdit ? t('modal.edit', { code: fournisseur?.code }) : stepMeta.title}
            description={stepMeta.description}
            onBack={() => setStep((s) => Math.max(1, s - 1))}
            onNext={handleNext}
            onClose={onClose}
            isNextDisabled={!isStepValid()}
            isLoading={saving}
            finishButtonText={isEdit ? tCommon('save') : t('modal.new')}
          >
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Code fournisseur">
                    <Input
                      value={isEdit ? fournisseur?.code : ''}
                      placeholder="Généré automatiquement"
                      disabled
                      className="bg-muted text-muted-foreground font-mono"
                    />
                  </Field>
                  <Field label={t('detail.fields.name')} required>
                    <Input
                      value={form.raisonSociale}
                      onChange={(e) => set('raisonSociale', e.target.value)}
                      placeholder="Ex: SATREC Sénégal"
                    />
                  </Field>
                  <Field label={t('detail.fields.structureType')}>
                    <Select value={form.statut} onValueChange={(v) => set('statut', v ?? 'Formel')}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Formel">{t('statuts.Formel')}</SelectItem>
                        <SelectItem value="Informel">{t('statuts.Informel')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t('detail.fields.qualification')}>
                    <Select value={form.qualification} onValueChange={(v) => set('qualification', v ?? 'AQualifier')}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {QUALIFICATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t('detail.fields.category')} required>
                    <Select value={form.categorie} onValueChange={(v) => set('categorie', v ?? '')}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES_FOURNISSEUR.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t('detail.fields.currency')}>
                    <Select value={form.devise} onValueChange={(v) => set('devise', v ?? 'XOF')}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEVISES.map((d) => (
                          <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contacts</h3>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <Field label={t('detail.fields.mainContact')}>
                      <Input value={form.contactPrincipal} onChange={(e) => set('contactPrincipal', e.target.value)} placeholder="Prénom Nom" />
                    </Field>
                    <Field label={t('detail.fields.phone')}>
                      <Input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="+221 77 000 00 00" />
                    </Field>
                    <Field label={t('detail.fields.email')}>
                      <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@fournisseur.com" />
                    </Field>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Localisation</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label={t('detail.fields.city')}>
                      <Input value={form.ville} onChange={(e) => set('ville', e.target.value)} placeholder="Ex: Dakar" />
                    </Field>
                    <Field label={t('detail.fields.country')}>
                      <Select value={form.pays} onValueChange={(v) => set('pays', v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYS_AFRIQUE_OUEST.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Logistique</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label={t('detail.fields.logistics')}>
                      <Select value={form.modeLogistique} onValueChange={(v) => set('modeLogistique', v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                        <SelectContent>
                          {MODES_LOGISTIQUE.map((m) => (
                            <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-center gap-3 pt-6">
                      <input
                        id="paiementMobile"
                        type="checkbox"
                        checked={form.paiementMobile}
                        onChange={(e) => set('paiementMobile', e.target.checked)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <Label htmlFor="paiementMobile" className="text-sm cursor-pointer">
                        {t('detail.fields.mobilePaymentAccepted')}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </MultiStepForm>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
