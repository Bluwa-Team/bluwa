'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Smartphone, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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
      <span className="text-sm font-medium text-right">{value ?? <span className="text-muted-foreground font-normal">-</span>}</span>
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

const MOCK_COMMANDES = [
  { ref: 'CMD-2025-0042', date: '2025-04-10', montant: 1850000, statut: 'Livrée', delaiPrevu: 7, delaiReel: 6 },
  { ref: 'CMD-2025-0031', date: '2025-03-02', montant: 920000, statut: 'Livrée', delaiPrevu: 7, delaiReel: 9 },
  { ref: 'CMD-2025-0018', date: '2025-02-14', montant: 2340000, statut: 'Livrée', delaiPrevu: 10, delaiReel: 10 },
  { ref: 'CMD-2024-0095', date: '2024-12-01', montant: 1100000, statut: 'Livrée', delaiPrevu: 7, delaiReel: 7 },
]

const MOCK_LIVRAISONS = [
  { ref: 'BL-2025-0042', date: '2025-04-16', articles: 'Maïs grain sec - 5 000 kg', statut: 'Conforme', conformite: true },
  { ref: 'BL-2025-0031', date: '2025-03-11', articles: 'Maïs grain sec - 2 500 kg', statut: 'Non conforme (humidité)', conformite: false },
  { ref: 'BL-2025-0018', date: '2025-02-24', articles: 'Mil décortiqué - 6 000 kg', statut: 'Conforme', conformite: true },
  { ref: 'BL-2024-0095', date: '2024-12-08', articles: 'Maïs grain sec - 3 000 kg', statut: 'Conforme', conformite: true },
]

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

  const modeLabel = (MODES_LOGISTIQUE.find((m) => m.code === f.modeLogistique)?.label) ?? (f.modeLogistique || '-')

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
              <InfoRow label={t('detail.fields.status')} value={
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
              <InfoRow label={t('detail.fields.mainContact')} value={fournisseur.contactPrincipal || '-'} />
              <InfoRow label={t('detail.fields.phone')} value={fournisseur.telephone || '-'} />
              <InfoRow label={t('detail.fields.email')} value={
                fournisseur.email
                  ? <a href={`mailto:${fournisseur.email}`} className="text-primary hover:underline">{fournisseur.email}</a>
                  : '-'
              } />
              <InfoRow label={t('detail.fields.city')} value={fournisseur.ville || '-'} />
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
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.orders.columns.ref')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.orders.columns.date')}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.orders.columns.amount')}</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.orders.columns.plannedDelay')}</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.orders.columns.actualDelay')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.orders.columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_COMMANDES.map((c) => {
                  const diff = c.delaiReel - c.delaiPrevu
                  return (
                    <tr key={c.ref} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{c.ref}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.date}</td>
                      <td className="px-4 py-3 text-right font-mono">{c.montant.toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{c.delaiPrevu}j</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 font-medium ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {diff > 0 ? <TrendingUp className="size-3" /> : diff < 0 ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
                          {c.delaiReel}j
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">{c.statut}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Livraisons */}
        <TabsContent value="livraisons" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.deliveries.columns.deliveryNote')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.deliveries.columns.date')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.deliveries.columns.articles')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.deliveries.columns.conformity')}</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LIVRAISONS.map((l) => (
                  <tr key={l.ref} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{l.ref}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.date}</td>
                    <td className="px-4 py-3">{l.articles}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${l.conformite ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {l.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
