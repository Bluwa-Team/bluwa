'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SelectWithAdd } from '@/components/ui/select-with-add'
import { MultiStepForm } from '@/components/ui/multi-step-form'
import { useTranslations } from 'next-intl'
import {
  Article, ArticleType, ArticleStatut, ArticleAppro, FAMILLES,
  UNITES_STOCK_DEFAUT, UNITES_MESURE_DEFAUT, UNITES_ACHAT_DEFAUT,
} from './types'
import {
  getReferentielValues, addReferentielValue, type ReferentielValue,
} from '@/lib/actions/referentiel'
import { DEVISES } from '@/config'

interface Props {
  open: boolean
  onClose: () => void
  article?: Article | null
  onSave: (data: Partial<Article>) => Promise<boolean>
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
  designation: '',
  type: '' as ArticleType | '',
  statut: 'EnCreation' as ArticleStatut,
  famille: '',
  sousFamille: '',
  categorie: '',
  uniteStock: '',
  uniteVente: '',
  coeffConversion: 1,
  uniteAchat: '',
  coeffConversionAchat: 1,
  devise: 'XOF',
  dernierPrixAchat: '',
  prixVente: '',
  poidsUnitaire: '',
  poidsUnite: 'kg',
  volumeUnitaire: '',
  volumeUnite: 'L',
  dureeVie: '',
  stockSecurite: '',
  pointCommande: '',
  appro: 'Achete' as ArticleAppro,
  gestionLot: true,
  delaiControle: '',
  seuilAlertePeremption: '',
  protocoleControle: '',
}

export function ArticleModal({ open, onClose, article, onSave }: Props) {
  const t = useTranslations('articles')
  const tCommon = useTranslations('common')

  const isEdit = !!article
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [referentiel, setReferentiel] = useState<ReferentielValue[]>([])

  // Charge les valeurs de référentiel personnalisées de l'organisation
  useEffect(() => {
    if (!open) return
    getReferentielValues().then(setReferentiel)
  }, [open])

  function refValues(kind: ReferentielValue['kind'], parent?: string | null): string[] {
    return referentiel
      .filter((r) => r.kind === kind && (parent === undefined || (r.parent ?? null) === (parent ?? null)))
      .map((r) => r.value)
  }

  async function addRef(
    kind: ReferentielValue['kind'],
    value: string,
    parent?: string | null,
  ): Promise<boolean> {
    const created = await addReferentielValue({ kind, value, parent: parent ?? null })
    if (!created) return false
    setReferentiel((prev) =>
      prev.some((r) => r.id === created.id) ? prev : [...prev, created],
    )
    return true
  }

  // Listes fusionnées : valeurs par défaut (codées) + référentiel personnalisé
  const familleOptions = useMemo(() => {
    const merged = new Set([...Object.keys(FAMILLES), ...refValues('article_famille')])
    return Array.from(merged)
  }, [referentiel])

  const uniteStockOptions = useMemo(() => {
    const merged = new Set([...UNITES_STOCK_DEFAUT, ...refValues('unite_stock')])
    return Array.from(merged)
  }, [referentiel])

  const uniteMesureOptions = useMemo(() => {
    const merged = new Set([...UNITES_MESURE_DEFAUT, ...refValues('unite_mesure')])
    return Array.from(merged)
  }, [referentiel])

  const uniteAchatOptions = useMemo(() => {
    const merged = new Set([...UNITES_ACHAT_DEFAUT, ...refValues('unite_stock')])
    return Array.from(merged)
  }, [referentiel])

  const STEPS = [
    { title: t('modal.steps.identification'), description: t('modal.steps.identificationDesc') },
    { title: t('modal.steps.units'), description: t('modal.steps.unitsDesc') },
    { title: t('modal.steps.physical'), description: t('modal.steps.physicalDesc') },
  ]

  useEffect(() => {
    if (!open) return
    setStep(1)
    setError(null)
    if (article) {
      setForm({
        designation: article.designation,
        type: article.type,
        statut: article.statut,
        famille: article.famille,
        sousFamille: article.sousFamille,
        categorie: article.categorie,
        uniteStock: article.uniteStock,
        uniteVente: article.uniteVente,
        coeffConversion: article.coeffConversion,
        uniteAchat: article.uniteAchat ?? '',
        coeffConversionAchat: article.coeffConversionAchat ?? 1,
        devise: article.devise ?? 'XOF',
        dernierPrixAchat: article.dernierPrixAchat?.toString() ?? '',
        prixVente: article.prixVente?.toString() ?? '',
        poidsUnitaire: article.poidsUnitaire?.toString() ?? '',
        poidsUnite: article.poidsUnite ?? 'kg',
        volumeUnitaire: article.volumeUnitaire?.toString() ?? '',
        volumeUnite: article.volumeUnite ?? 'L',
        dureeVie: article.dureeVie?.toString() ?? '',
        stockSecurite: article.stockSecurite?.toString() ?? '',
        pointCommande: article.pointCommande?.toString() ?? '',
        appro: article.appro,
        gestionLot: article.gestionLot,
        delaiControle: article.delaiControle?.toString() ?? '',
        seuilAlertePeremption: article.seuilAlertePeremption?.toString() ?? '',
        protocoleControle: article.protocoleControle ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [article, open])

  function set(key: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setFamille(value: string) {
    setForm((prev) => ({ ...prev, famille: value, sousFamille: '', categorie: '' }))
  }

  function setSousFamille(value: string) {
    setForm((prev) => ({ ...prev, sousFamille: value, categorie: '' }))
  }

  const sousFamilleOptions = useMemo(() => {
    if (!form.famille) return []
    const base = FAMILLES[form.famille] ? Object.keys(FAMILLES[form.famille].sousFamilles) : []
    return Array.from(new Set([...base, ...refValues('article_sous_famille', form.famille)]))
  }, [form.famille, referentiel])

  const categorieOptions = useMemo(() => {
    if (!form.famille || !form.sousFamille) return []
    const base = FAMILLES[form.famille]?.sousFamilles[form.sousFamille] ?? []
    return Array.from(new Set([...base, ...refValues('article_categorie', form.sousFamille)]))
  }, [form.famille, form.sousFamille, referentiel])

  function isStepValid() {
    if (step === 1) return !!form.designation && !!form.type
    if (step === 2) return !!form.uniteStock
    return true
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
    } else {
      setSaving(true)
      setError(null)
      try {
        const ok = await onSave({
          ...form,
          type: form.type as ArticleType,
          coeffConversionAchat: form.coeffConversionAchat || 1,
          dernierPrixAchat: form.dernierPrixAchat ? parseFloat(form.dernierPrixAchat) : null,
          prixVente: form.prixVente ? parseFloat(form.prixVente) : null,
          poidsUnitaire: form.poidsUnitaire ? parseFloat(form.poidsUnitaire) : null,
          volumeUnitaire: form.volumeUnitaire ? parseFloat(form.volumeUnitaire) : null,
          dureeVie: form.dureeVie ? parseInt(form.dureeVie) : null,
          stockSecurite: form.stockSecurite ? parseFloat(form.stockSecurite) : null,
          pointCommande: form.pointCommande ? parseFloat(form.pointCommande) : null,
          delaiControle: form.delaiControle ? parseInt(form.delaiControle) : null,
          seuilAlertePeremption: form.seuilAlertePeremption ? parseInt(form.seuilAlertePeremption) : null,
        })
        if (ok) {
          onClose()
        } else {
          setError("L'enregistrement a échoué. Vérifiez la connexion ou les logs du serveur.")
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Une erreur inconnue s'est produite.")
      } finally {
        setSaving(false)
      }
    }
  }

  const stepMeta = STEPS[step - 1]

  const TYPE_LABELS_T: Record<ArticleType, string> = {
    MP: t('types.MP'),
    PSF: t('types.PSF'),
    PF: t('types.PF'),
    AC: t('types.AC'),
    CS: t('types.CS'),
  }

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
            title={isEdit ? t('modal.edit', { code: article?.code }) : stepMeta.title}
            description={stepMeta.description}
            onBack={() => setStep((s) => Math.max(1, s - 1))}
            onNext={handleNext}
            onClose={onClose}
            isNextDisabled={!isStepValid()}
            isLoading={saving}
            finishButtonText={isEdit ? tCommon('save') : t('modal.new')}
            footerContent={error ? <span className="text-destructive text-xs">{error}</span> : null}
          >
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label={t('columns.code')}>
                    <Input
                      value={isEdit ? article?.code : ''}
                      placeholder={isEdit ? '' : 'Généré automatiquement'}
                      disabled
                      className="bg-muted text-muted-foreground font-mono"
                    />
                  </Field>
                  <Field label={t('modal.fields.designation')} required>
                    <Input
                      value={form.designation}
                      onChange={(e) => set('designation', e.target.value)}
                      placeholder="Nom de l'article"
                    />
                  </Field>
                  <Field label={t('modal.fields.type')} required>
                    <Select value={form.type} onValueChange={(v) => set('type', v ?? '')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir un type">
                          {(value: string) => value
                            ? `${value} · ${TYPE_LABELS_T[value as ArticleType]}`
                            : 'Choisir un type'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TYPE_LABELS_T) as ArticleType[]).map((tp) => (
                          <SelectItem key={tp} value={tp}>
                            <span className="font-mono font-semibold mr-2">{tp}</span>
                            <span className="text-muted-foreground">{TYPE_LABELS_T[tp]}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t('modal.fields.status')}>
                    <Select value={form.statut} onValueChange={(v) => set('statut', v ?? '')}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: string) => value ? t(`statuts.${value}` as any) : ''}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EnCreation">{t('statuts.EnCreation')}</SelectItem>
                        <SelectItem value="Actif">{t('statuts.Actif')}</SelectItem>
                        <SelectItem value="Bloque">{t('statuts.Bloque')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t('modal.fields.family')}>
                    <SelectWithAdd
                      value={form.famille}
                      onValueChange={(v) => setFamille(v)}
                      options={familleOptions}
                      placeholder="Sélectionner une famille"
                      addPlaceholder="Nouvelle famille"
                      onAdd={(v) => addRef('article_famille', v)}
                    />
                  </Field>
                  <Field label="Sous-famille">
                    <SelectWithAdd
                      value={form.sousFamille}
                      onValueChange={(v) => setSousFamille(v)}
                      options={sousFamilleOptions}
                      placeholder={form.famille ? 'Sélectionner…' : 'Choisir une famille d\'abord'}
                      addPlaceholder="Nouvelle sous-famille"
                      disabled={!form.famille}
                      onAdd={(v) => addRef('article_sous_famille', v, form.famille)}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Catégorie">
                      <SelectWithAdd
                        value={form.categorie}
                        onValueChange={(v) => set('categorie', v)}
                        options={categorieOptions}
                        placeholder={form.sousFamille ? 'Sélectionner…' : 'Choisir une sous-famille d\'abord'}
                        addPlaceholder="Nouvelle catégorie"
                        disabled={!form.sousFamille}
                        onAdd={(v) => addRef('article_categorie', v, form.sousFamille)}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Unités</h3>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <Field label={t('modal.fields.stockUnit')} required>
                      <SelectWithAdd
                        value={form.uniteStock}
                        onValueChange={(v) => set('uniteStock', v)}
                        options={uniteStockOptions}
                        placeholder="kg, sachet…"
                        addPlaceholder="Nouvelle unité"
                        onAdd={(v) => addRef('unite_stock', v)}
                      />
                    </Field>
                    <Field label={t('modal.fields.saleUnit')}>
                      <SelectWithAdd
                        value={form.uniteVente}
                        onValueChange={(v) => set('uniteVente', v)}
                        options={uniteStockOptions}
                        placeholder="t, carton…"
                        addPlaceholder="Nouvelle unité"
                        onAdd={(v) => addRef('unite_stock', v)}
                      />
                    </Field>
                    <Field label={t('modal.fields.convCoeff')}>
                      <Input
                        type="number"
                        value={form.coeffConversion}
                        onChange={(e) => set('coeffConversion', parseFloat(e.target.value) || 1)}
                        placeholder="1"
                      />
                    </Field>
                  </div>
                </div>

                {form.appro === 'Achete' && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Unité d&apos;achat</h3>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                      <Field label="Unité d'achat">
                        <SelectWithAdd
                          value={form.uniteAchat}
                          onValueChange={(v) => set('uniteAchat', v)}
                          options={uniteAchatOptions}
                          placeholder="boite, kg, sac…"
                          addPlaceholder="Nouvelle unité"
                          onAdd={(v) => addRef('unite_stock', v)}
                        />
                      </Field>
                      <Field label="Coefficient de conversion">
                        <Input
                          type="number"
                          min="0.0001"
                          step="any"
                          value={form.coeffConversionAchat}
                          onChange={(e) => set('coeffConversionAchat', parseFloat(e.target.value) || 1)}
                          placeholder="3552"
                        />
                      </Field>
                      <div className="flex items-end pb-1">
                        {form.uniteAchat && form.uniteStock ? (
                          <p className="text-xs text-muted-foreground leading-tight">
                            1 <span className="font-semibold text-foreground">{form.uniteAchat}</span>
                            {' = '}
                            <span className="font-semibold text-foreground">{form.coeffConversionAchat}</span>
                            {' '}
                            <span className="font-semibold text-foreground">{form.uniteStock}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground leading-tight">
                            Ex : 1 boite = 3 552 g
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valorisation</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <Field label="Devise">
                      <Select value={form.devise} onValueChange={(v) => set('devise', v ?? 'XOF')}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEVISES.map((d) => (
                            <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={t('modal.fields.lastPurchasePrice')}>
                      <Input
                        type="number"
                        value={form.dernierPrixAchat}
                        onChange={(e) => set('dernierPrixAchat', e.target.value)}
                        placeholder="0"
                        disabled={form.appro === 'Fabrique'}
                      />
                    </Field>
                    <Field label={t('modal.fields.salePrice')}>
                      <Input
                        type="number"
                        value={form.prixVente}
                        onChange={(e) => set('prixVente', e.target.value)}
                        placeholder={form.type !== 'PF' ? 'Réservé aux PF' : '0'}
                        disabled={form.type !== 'PF'}
                      />
                    </Field>
                    <Field label={t('modal.fields.pmp')}>
                      <Input value="Calculé auto." disabled className="bg-muted text-muted-foreground text-xs" />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Caractéristiques physiques</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Poids unitaire">
                      <div className="flex items-start gap-2">
                        <Input
                          type="number"
                          value={form.poidsUnitaire}
                          onChange={(e) => set('poidsUnitaire', e.target.value)}
                          placeholder="0.00"
                          className="flex-1"
                        />
                        <div className="w-32 shrink-0">
                          <SelectWithAdd
                            value={form.poidsUnite}
                            onValueChange={(v) => set('poidsUnite', v)}
                            options={uniteMesureOptions}
                            placeholder="kg"
                            addPlaceholder="Unité"
                            onAdd={(v) => addRef('unite_mesure', v)}
                          />
                        </div>
                      </div>
                    </Field>
                    <Field label="Volume unitaire">
                      <div className="flex items-start gap-2">
                        <Input
                          type="number"
                          value={form.volumeUnitaire}
                          onChange={(e) => set('volumeUnitaire', e.target.value)}
                          placeholder="0.00"
                          className="flex-1"
                        />
                        <div className="w-32 shrink-0">
                          <SelectWithAdd
                            value={form.volumeUnite}
                            onValueChange={(v) => set('volumeUnite', v)}
                            options={uniteMesureOptions}
                            placeholder="L"
                            addPlaceholder="Unité"
                            onAdd={(v) => addRef('unite_mesure', v)}
                          />
                        </div>
                      </div>
                    </Field>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Gestion des stocks</h3>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <Field label={t('modal.fields.safetyStock')}>
                      <Input type="number" value={form.stockSecurite} onChange={(e) => set('stockSecurite', e.target.value)} placeholder="0" />
                    </Field>
                    <Field label={t('modal.fields.reorderPoint')}>
                      <Input type="number" value={form.pointCommande} onChange={(e) => set('pointCommande', e.target.value)} placeholder="0" />
                    </Field>
                    <Field label={t('modal.fields.appro')}>
                      <Select value={form.appro} onValueChange={(v) => set('appro', v ?? '')}>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(value: string) => value ? t(`appro.${value}` as any) : ''}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Achete">{t('appro.Achete')}</SelectItem>
                          <SelectItem value="Fabrique">{t('appro.Fabrique')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Qualité & traçabilité</h3>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        id="gestionLot"
                        type="checkbox"
                        checked={form.gestionLot}
                        onChange={(e) => set('gestionLot', e.target.checked)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <Label htmlFor="gestionLot" className="text-sm cursor-pointer">
                        Gestion par lot
                      </Label>
                    </div>
                    <Field label="Protocole de contrôle">
                      <Input
                        value={form.protocoleControle}
                        onChange={(e) => set('protocoleControle', e.target.value)}
                        placeholder="Ex: PC-MP-001"
                        disabled={!form.gestionLot}
                      />
                    </Field>
                    <div /> {/* spacer */}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Paramètres industriels & qualité</h3>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <Field label="Délai de libération qualité (j)">
                      <Input
                        type="number"
                        min="0"
                        value={form.delaiControle}
                        onChange={(e) => set('delaiControle', e.target.value)}
                        placeholder="Ex : 3"
                        disabled={!form.gestionLot}
                      />
                    </Field>
                    <Field label="Durée de vie théorique (j)">
                      <Input
                        type="number"
                        min="0"
                        value={form.dureeVie}
                        onChange={(e) => set('dureeVie', e.target.value)}
                        placeholder="Ex : 365"
                      />
                    </Field>
                    <Field label="Seuil d'alerte péremption (j)">
                      <Input
                        type="number"
                        min="0"
                        value={form.seuilAlertePeremption}
                        onChange={(e) => set('seuilAlertePeremption', e.target.value)}
                        placeholder="Ex : 30"
                      />
                    </Field>
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
