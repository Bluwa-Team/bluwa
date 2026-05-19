'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Smartphone, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientModal } from '../_components/client-modal'
import {
  Client, CLIENT_TYPE_COLORS,
  STATUT_COLORS, INCOTERMS_CLIENT,
} from '../_components/types'
import { getClientById, updateClient } from '@/lib/actions/clients'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground min-w-[200px]">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? <span className="text-muted-foreground font-normal">-</span>}</span>
    </div>
  )
}

const MOCK_COMMANDES = [
  { ref: 'VTE-2025-0088', date: '2025-05-02', montant: 3120000, statut: 'Livrée', delaiPrevu: 5, delaiReel: 5 },
  { ref: 'VTE-2025-0071', date: '2025-04-10', montant: 1850000, statut: 'Livrée', delaiPrevu: 5, delaiReel: 7 },
  { ref: 'VTE-2025-0055', date: '2025-03-18', montant: 2640000, statut: 'Livrée', delaiPrevu: 5, delaiReel: 4 },
  { ref: 'VTE-2025-0032', date: '2025-02-05', montant: 980000, statut: 'Livrée', delaiPrevu: 5, delaiReel: 5 },
]

const MOCK_LIVRAISONS = [
  { ref: 'BLC-2025-0088', date: '2025-05-07', articles: 'Farine infantile 1kg × 500 sachets', statut: 'Conforme', conformite: true },
  { ref: 'BLC-2025-0071', date: '2025-04-17', articles: 'Spaghetti 500g × 800 sachets', statut: 'Conforme', conformite: true },
  { ref: 'BLC-2025-0055', date: '2025-03-22', articles: 'Farine infantile 1kg × 1 000 sachets', statut: 'Litige (quantité)', conformite: false },
  { ref: 'BLC-2025-0032', date: '2025-02-10', articles: 'Farine infantile 1kg × 400 sachets', statut: 'Conforme', conformite: true },
]

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const t = useTranslations('clients')
  const tCommon = useTranslations('common')
  const [client, setClient] = useState<Client | null | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    getClientById(id as string).then(setClient)
  }, [id])

  if (client === undefined) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{tCommon('loading')}</div>
  }

  if (client === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-muted-foreground">{t('notFound')}</p>
        <Button variant="outline" onClick={() => router.back()}>{t('backToList')}</Button>
      </div>
    )
  }

  const c = client

  async function handleSave(data: Partial<Client>): Promise<boolean> {
    const updated = await updateClient(c.id, data)
    if (updated) setClient(updated)
    return !!updated
  }

  const incotermLabel = (INCOTERMS_CLIENT.find((i) => i.code === c.incoterm)?.label) ?? (c.incoterm || '-')

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="../clients">
            <Button variant="ghost" size="icon" className="size-8 mt-0.5">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold font-mono">{c.code}</h1>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CLIENT_TYPE_COLORS[c.type]}`}>
                {t(`types.${c.type}` as any)}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[c.statut]}`}>
                {t(`statuts.${c.statut}` as any)}
              </span>
              {c.paiementMobile && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                  <Smartphone className="size-3" /> Mobile
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{c.raisonSociale}</p>
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
          <TabsTrigger value="tarifs" className="flex-1">{t('detail.tabs.tariffs')}</TabsTrigger>
          <TabsTrigger value="commandes" className="flex-1">{t('detail.tabs.orders')}</TabsTrigger>
          <TabsTrigger value="livraisons" className="flex-1">{t('detail.tabs.deliveries')}</TabsTrigger>
        </TabsList>

        {/* Fiche */}
        <TabsContent value="fiche" className="mt-4">
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('detail.sections.identity')}</p>
              <InfoRow label={t('detail.fields.name')} value={c.raisonSociale} />
              <InfoRow label={t('detail.fields.type')} value={
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CLIENT_TYPE_COLORS[c.type]}`}>
                  {t(`types.${c.type}` as any)}
                </span>
              } />
              <InfoRow label={t('detail.fields.sector')} value={c.secteur || '-'} />
              <InfoRow label={t('detail.fields.language')} value={c.langue} />
              <InfoRow label={t('detail.fields.status')} value={
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[c.statut]}`}>
                  {t(`statuts.${c.statut}` as any)}
                </span>
              } />
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('detail.sections.contact')}</p>
              <InfoRow label={t('detail.fields.mainContact')} value={c.contactPrincipal || '-'} />
              <InfoRow label={t('detail.fields.phone')} value={c.telephone || '-'} />
              <InfoRow label={t('detail.fields.email')} value={
                c.email
                  ? <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
                  : '-'
              } />
              <InfoRow label={t('detail.fields.city')} value={c.ville || '-'} />
              <InfoRow label={t('detail.fields.country')} value={c.pays} />
            </div>

            <div className="col-span-3 rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('detail.sections.commercial')}</p>
              <div className="grid grid-cols-3 gap-x-10">
                <div>
                  <InfoRow label={t('detail.fields.incoterm')} value={incotermLabel} />
                  <InfoRow label={t('detail.fields.transport')} value={c.transport || '-'} />
                </div>
                <div>
                  <InfoRow label={t('detail.fields.creditLimit')} value={
                    c.limiteCredit !== null
                      ? <span className="font-mono">{c.limiteCredit.toLocaleString('fr-FR')} XOF</span>
                      : '-'
                  } />
                  <InfoRow label={t('detail.fields.paymentTerm')} value={c.conditionPaiement || '-'} />
                </div>
                <div>
                  <InfoRow label={t('detail.fields.mobilePayment')} value={c.paiementMobile ? t('detail.fields.mobilePaymentAccepted') : tCommon('no')} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Grille tarifaire */}
        <TabsContent value="tarifs" className="mt-4">
          {c.grilleTarifaire.length === 0 ? (
            <div className="rounded-lg border p-10 text-center text-muted-foreground text-sm">
              {t('detail.tariffs.empty')}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.tariffs.columns.articleCode')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.tariffs.columns.designation')}</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.tariffs.columns.negotiatedPrice')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('detail.tariffs.columns.currency')}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.grilleTarifaire.map((g) => (
                    <tr key={g.articleCode} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{g.articleCode}</td>
                      <td className="px-4 py-3">{g.designation}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                        {g.prixNegecie.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{g.devise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                {MOCK_COMMANDES.map((cmd) => {
                  const diff = cmd.delaiReel - cmd.delaiPrevu
                  return (
                    <tr key={cmd.ref} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{cmd.ref}</td>
                      <td className="px-4 py-3 text-muted-foreground">{cmd.date}</td>
                      <td className="px-4 py-3 text-right font-mono">{cmd.montant.toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{cmd.delaiPrevu}j</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 font-medium ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {diff > 0 ? <TrendingUp className="size-3" /> : diff < 0 ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
                          {cmd.delaiReel}j
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">{cmd.statut}</span>
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

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        client={client}
        onSave={handleSave}
      />
    </div>
  )
}
