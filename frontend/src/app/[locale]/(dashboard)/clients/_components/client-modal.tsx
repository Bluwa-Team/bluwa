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
  Client, ClientStatut, ClientType,
  SECTEURS, LANGUES, CONDITIONS_PAIEMENT,
  TRANSPORTS, INCOTERMS_CLIENT, PAYS_CLIENTS,
} from './types'
import { DEVISES } from '@/config'

interface Props {
  open: boolean
  onClose: () => void
  client?: Client | null
  onSave: (data: Partial<Client>) => Promise<boolean>
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

const TOTAL_STEPS = 3

const EMPTY_FORM = {
  raisonSociale: '',
  statut: 'Actif' as ClientStatut,
  type: '' as ClientType | '',
  secteur: '',
  langue: 'Français',
  contactPrincipal: '',
  telephone: '',
  email: '',
  ville: '',
  pays: 'Sénégal',
  incoterm: '',
  transport: '',
  limiteCredit: '',
  devise: 'XOF',
  conditionPaiement: '',
  paiementMobile: false,
}

export function ClientModal({ open, onClose, client, onSave }: Props) {
  const t = useTranslations('clients')
  const tCommon = useTranslations('common')

  const isEdit = !!client
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const STEPS = [
    { title: t('modal.steps.identity'), description: t('modal.steps.identityDesc') },
    { title: t('modal.steps.contact'), description: t('modal.steps.contactDesc') },
    { title: t('modal.steps.commercial'), description: t('modal.steps.commercialDesc') },
  ]

  useEffect(() => {
    if (!open) return
    setStep(1)
    if (client) {
      setForm({
        raisonSociale: client.raisonSociale,
        statut: client.statut,
        type: client.type,
        secteur: client.secteur,
        langue: client.langue,
        contactPrincipal: client.contactPrincipal,
        telephone: client.telephone,
        email: client.email,
        ville: client.ville,
        pays: client.pays,
        incoterm: client.incoterm,
        transport: client.transport,
        limiteCredit: client.limiteCredit?.toString() ?? '',
        devise: client.devise ?? 'XOF',
        conditionPaiement: client.conditionPaiement,
        paiementMobile: client.paiementMobile,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [client, open])

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function isStepValid() {
    if (step === 1) return !!form.raisonSociale && !!form.type
    if (step === 2) return !!form.contactPrincipal && !!form.telephone && !!form.pays
    return true
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
    } else {
      setSaving(true)
      const ok = await onSave({
        ...form,
        type: form.type as ClientType,
        limiteCredit: form.limiteCredit ? parseFloat(form.limiteCredit) : null,
      })
      setSaving(false)
      if (ok) onClose()
    }
  }

  const stepMeta = STEPS[step - 1]

  const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
    { value: 'Grossiste', label: t('types.Grossiste') },
    { value: 'Detaillant', label: t('types.Detaillant') },
    { value: 'Institutionnel', label: t('types.Institutionnel') },
    { value: 'ONG', label: t('types.ONG') },
    { value: 'Export', label: t('types.Export') },
    { value: 'Autre', label: t('types.Autre') },
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
            title={isEdit ? t('modal.edit', { code: client?.code }) : stepMeta.title}
            description={stepMeta.description}
            onBack={() => setStep((s) => Math.max(1, s - 1))}
            onNext={handleNext}
            onClose={onClose}
            isNextDisabled={!isStepValid()}
            isLoading={saving}
            finishButtonText={isEdit ? tCommon('save') : t('modal.new')}
          >
            {step === 1 && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Code client">
                  <Input
                    value={isEdit ? client?.code : ''}
                    placeholder="Généré automatiquement"
                    disabled
                    className="bg-muted text-muted-foreground font-mono"
                  />
                </Field>
                <Field label={t('modal.fields.name')} required>
                  <Input
                    value={form.raisonSociale}
                    onChange={(e) => set('raisonSociale', e.target.value)}
                    placeholder="Ex: CASINO Distribution Dakar"
                  />
                </Field>
                <Field label={t('modal.fields.type')} required>
                  <Select value={form.type} onValueChange={(v) => set('type', v ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un type">
                        {(value: string) => value ? t(`types.${value}` as any) : 'Choisir un type'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('modal.fields.status')}>
                  <Select value={form.statut} onValueChange={(v) => set('statut', v ?? 'Actif')}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">{t('statuts.Actif')}</SelectItem>
                      <SelectItem value="Inactif">{t('statuts.Inactif')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('modal.fields.sector')}>
                  <Select value={form.secteur} onValueChange={(v) => set('secteur', v ?? '')}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {SECTEURS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('modal.fields.language')}>
                  <Select value={form.langue} onValueChange={(v) => set('langue', v ?? 'Français')}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUES.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contacts</h3>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <Field label={t('modal.fields.mainContact')} required>
                      <Input value={form.contactPrincipal} onChange={(e) => set('contactPrincipal', e.target.value)} placeholder="Prénom Nom" />
                    </Field>
                    <Field label={t('modal.fields.phone')} required>
                      <Input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="+221 77 000 00 00" />
                    </Field>
                    <Field label={t('modal.fields.email')}>
                      <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@client.com" />
                    </Field>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Localisation</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label={t('modal.fields.city')}>
                      <Input value={form.ville} onChange={(e) => set('ville', e.target.value)} placeholder="Ex: Dakar" />
                    </Field>
                    <Field label={t('modal.fields.country')} required>
                      <Select value={form.pays} onValueChange={(v) => set('pays', v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                        <SelectContent>
                          {PAYS_CLIENTS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Logistique</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label={t('modal.fields.incoterm')}>
                      <Select value={form.incoterm} onValueChange={(v) => set('incoterm', v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                        <SelectContent>
                          {INCOTERMS_CLIENT.map((i) => (
                            <SelectItem key={i.code} value={i.code}>{i.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={t('modal.fields.transport')}>
                      <Select value={form.transport} onValueChange={(v) => set('transport', v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                        <SelectContent>
                          {TRANSPORTS.map((tp) => (
                            <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Crédit & paiement</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label={t('modal.fields.creditLimit')}>
                      <div className="flex items-start gap-2">
                        <Input
                          type="number"
                          value={form.limiteCredit}
                          onChange={(e) => set('limiteCredit', e.target.value)}
                          placeholder="Ex: 5 000 000"
                          className="flex-1"
                        />
                        <div className="w-28 shrink-0">
                          <Select value={form.devise} onValueChange={(v) => set('devise', v ?? 'XOF')}>
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {(value: string) => value || 'XOF'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {DEVISES.map((d) => (
                                <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Field>
                    <Field label={t('modal.fields.paymentTerm')}>
                      <Select value={form.conditionPaiement} onValueChange={(v) => set('conditionPaiement', v ?? '')}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                        <SelectContent>
                          {CONDITIONS_PAIEMENT.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-center gap-3 col-span-2 pt-1">
                      <input
                        id="paiementMobile"
                        type="checkbox"
                        checked={form.paiementMobile}
                        onChange={(e) => set('paiementMobile', e.target.checked)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <Label htmlFor="paiementMobile" className="text-sm cursor-pointer">
                        {t('modal.fields.mobilePayment')}
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
