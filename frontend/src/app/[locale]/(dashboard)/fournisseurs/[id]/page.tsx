'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Smartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FournisseurModal } from '../_components/fournisseur-modal'
import {
  Fournisseur, QUALIFICATION_COLORS,
  STATUT_COLORS, MODES_LOGISTIQUE, scoreColor,
} from '../_components/types'
import { getFournisseurById, updateFournisseur } from '@/lib/actions/fournisseurs'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground min-w-[200px]">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? <span className="text-muted-foreground font-normal">N/A</span>}</span>
    </div>
  )
}

function ScoreBar({ score, notCalcLabel }: { score: number | null; notCalcLabel: string }) {
  if (score === null) return <span className="text-muted-foreground text-sm">{notCalcLabel}</span>
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-semibold ${scoreColor(score)}`}>{score}/100</span>
    </div>
  )
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed flex items-center justify-center py-16 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export default function FournisseurDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const t = useTranslations('fournisseurs')
  const tCommon = useTranslations('common')
  const [fournisseur, setFournisseur] = useState<Fournisseur | null | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    getFournisseurById(id as string).then(setFournisseur)
  }, [id])

  if (fournisseur === undefined) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{tCommon('loading')}</div>
  }

  if (fournisseur === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-muted-foreground">{t('notFound')}</p>
        <Button variant="outline" onClick={() => router.back()}>{t('backToList')}</Button>
      </div>
    )
  }

  const f = fournisseur

  async function handleSave(data: Partial<Fournisseur>): Promise<boolean> {
    const updated = await updateFournisseur(f.id, data)
    if (updated) setFournisseur(updated)
    return !!updated
  }

  const modeLabel = (MODES_LOGISTIQUE.find((m) => m.code === f.modeLogistique)?.label) ?? (f.modeLogistique || 'N/A')

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="../fournisseurs">
            <Button variant="ghost" size="icon" className="size-8 mt-0.5">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold font-mono">{fournisseur.code}</h1>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[fournisseur.statut]}`}>
                {t(`statuts.${fournisseur.statut}` as any)}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${QUALIFICATION_COLORS[fournisseur.qualification]}`}>
                {t(`qualifications.${fournisseur.qualification}` as any)}
              </span>
              {fournisseur.paiementMobile && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                  <Smartphone className="size-3" /> Mobile
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{fournisseur.raisonSociale}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Pencil className="size-3.5" />
          {tCommon('edit')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fiche">
        <TabsList className="w-full">
          <TabsTrigger value="fiche" className="flex-1">{t('detail.tabs.profile')}</TabsTrigger>
          <TabsTrigger value="commandes" className="flex-1">{t('detail.tabs.orders')}</TabsTrigger>
          <TabsTrigger value="livraisons" className="flex-1">{t('detail.tabs.deliveries')}</TabsTrigger>
        </TabsList>

        {/* Fiche */}
        <TabsContent value="fiche" className="mt-4">
          <div className="grid grid-cols-3 gap-5">

            {/* Score */}
            <div className="col-span-3 rounded-lg border p-4 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('detail.sections.score')}</p>
              <ScoreBar score={fournisseur.scoreFilabilite} notCalcLabel={t('detail.notCalculated')} />
              <p className="text-xs text-muted-foreground mt-2">{t('detail.scoreDescription')}</p>
            </div>

            {/* Identité */}
            <div className="col-span-2 rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('detail.sections.identity')}</p>
              <InfoRow label={t('detail.fields.name')} value={fournisseur.raisonSociale} />
              <InfoRow label={t('detail.fields.category')} value={fournisseur.categorie} />
              <InfoRow label={t('detail.fields.currency')} value={<span className="font-mono">{fournisseur.devise}</span>} />
              <InfoRow label={t('detail.fields.logistics')} value={modeLabel} />
              <InfoRow label={t('detail.fields.structureType')} value={
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[fournisseur.statut]}`}>
                  {t(`statuts.${fournisseur.statut}` as any)}
                </span>
              } />
              <InfoRow label={t('detail.fields.qualification')} value={
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${QUALIFICATION_COLORS[fournisseur.qualification]}`}>
                  {t(`qualifications.${fournisseur.qualification}` as any)}
                </span>
              } />
              <InfoRow label={t('detail.fields.mobilePayment')} value={fournisseur.paiementMobile ? t('detail.fields.mobilePaymentAccepted') : tCommon('no')} />
            </div>

            {/* Contact & localisation */}
            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('detail.sections.contact')}</p>
              <InfoRow label={t('detail.fields.mainContact')} value={fournisseur.contactPrincipal || 'N/A'} />
              <InfoRow label={t('detail.fields.phone')} value={fournisseur.telephone || 'N/A'} />
              <InfoRow label={t('detail.fields.email')} value={
                fournisseur.email
                  ? <a href={`mailto:${fournisseur.email}`} className="text-primary hover:underline">{fournisseur.email}</a>
                  : 'N/A'
              } />
              <InfoRow label={t('detail.fields.city')} value={fournisseur.ville || 'N/A'} />
              <InfoRow label={t('detail.fields.country')} value={fournisseur.pays} />
            </div>

            {/* Dates */}
            <div className="col-span-3 rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('detail.sections.history')}</p>
              <div className="flex gap-10">
                <InfoRow label={t('detail.fields.createdAt')} value={fournisseur.createdAt} />
                <InfoRow label={t('detail.fields.updatedAt')} value={fournisseur.updatedAt} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Commandes */}
        <TabsContent value="commandes" className="mt-4">
          <EmptyTab label={tCommon('noData')} />
        </TabsContent>

        {/* Livraisons */}
        <TabsContent value="livraisons" className="mt-4">
          <EmptyTab label={tCommon('noData')} />
        </TabsContent>
      </Tabs>

      <FournisseurModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fournisseur={fournisseur}
        onSave={handleSave}
      />
    </div>
  )
}
