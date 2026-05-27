'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Smartphone, Plus, Trash2 } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientModal } from '../_components/client-modal'
import { GrilleTarifaireModal } from '../_components/grille-tarifaire-modal'
import {
  Client, CLIENT_TYPE_COLORS,
  STATUT_COLORS, INCOTERMS_CLIENT,
  GrilleTarifaire,
} from '../_components/types'
import { getClientById, updateClient, deleteGrilleTarifaire } from '@/lib/actions/clients'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground min-w-[200px]">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? <span className="text-muted-foreground font-normal">N/A</span>}</span>
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

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const t = useTranslations('clients')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const [client, setClient]                       = useState<Client | null | undefined>(undefined)
  const [grille, setGrille]                       = useState<GrilleTarifaire[]>([])
  const [modalOpen, setModalOpen]                 = useState(false)
  const [grilleModalOpen, setGrilleModalOpen]     = useState(false)
  const [deletingCode, setDeletingCode]           = useState<string | null>(null)

  useEffect(() => {
    getClientById(id as string).then((data) => {
      if (data) {
        setClient(data)
        setGrille(data.grilleTarifaire)  // initialise le state local grille
      } else {
        setClient(null)
      }
    })
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

  async function handleDeleteTarif(articleCode: string) {
    setDeletingCode(articleCode)
    const ok = await deleteGrilleTarifaire(c.id, articleCode)
    setDeletingCode(null)
    if (ok) setGrille((prev) => prev.filter((g) => g.articleCode !== articleCode))
  }

  const incotermLabel = (INCOTERMS_CLIENT.find((i) => i.code === c.incoterm)?.label) ?? (c.incoterm || 'N/A')

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
              <InfoRow label={t('detail.fields.sector')} value={c.secteur || 'N/A'} />
              <InfoRow label={t('detail.fields.language')} value={c.langue} />
              <InfoRow label={t('detail.fields.status')} value={
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[c.statut]}`}>
                  {t(`statuts.${c.statut}` as any)}
                </span>
              } />
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('detail.sections.contact')}</p>
              <InfoRow label={t('detail.fields.mainContact')} value={c.contactPrincipal || 'N/A'} />
              <InfoRow label={t('detail.fields.phone')} value={c.telephone || 'N/A'} />
              <InfoRow label={t('detail.fields.email')} value={
                c.email
                  ? <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
                  : 'N/A'
              } />
              <InfoRow label={t('detail.fields.city')} value={c.ville || 'N/A'} />
              <InfoRow label={t('detail.fields.country')} value={c.pays} />
            </div>

            <div className="col-span-3 rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('detail.sections.commercial')}</p>
              <div className="grid grid-cols-3 gap-x-10">
                <div>
                  <InfoRow label={t('detail.fields.incoterm')} value={incotermLabel} />
                  <InfoRow label={t('detail.fields.transport')} value={c.transport || 'N/A'} />
                </div>
                <div>
                  <InfoRow label={t('detail.fields.creditLimit')} value={
                    c.limiteCredit !== null
                      ? <span className="font-mono">{formatNumber(c.limiteCredit, locale)} XOF</span>
                      : 'N/A'
                  } />
                  <InfoRow label={t('detail.fields.paymentTerm')} value={c.conditionPaiement || 'N/A'} />
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {grille.length} tarif{grille.length !== 1 ? 's' : ''} négocié{grille.length !== 1 ? 's' : ''}
            </p>
            <Button size="sm" className="gap-1.5" onClick={() => setGrilleModalOpen(true)}>
              <Plus className="size-3.5" />
              Ajouter un tarif
            </Button>
          </div>
          {grille.length === 0 ? (
            <div className="rounded-lg border border-dashed flex items-center justify-center py-16 text-sm text-muted-foreground">
              {t('detail.tariffs.empty')}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs tracking-wide">{t('detail.tariffs.columns.articleCode')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs tracking-wide">{t('detail.tariffs.columns.designation')}</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs tracking-wide">{t('detail.tariffs.columns.negotiatedPrice')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs tracking-wide">{t('detail.tariffs.columns.currency')}</th>
                    <th className="w-10 shrink-0" />
                  </tr>
                </thead>
                <tbody>
                  {grille.map((g) => (
                    <tr key={g.articleCode} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{g.articleCode}</td>
                      <td className="px-4 py-3">{g.designation}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                        {formatNumber(g.prixNegecie, locale)}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{g.devise}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteTarif(g.articleCode)}
                          disabled={deletingCode === g.articleCode}
                          className="flex items-center justify-center size-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          title="Supprimer ce tarif"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        client={client}
        onSave={handleSave}
      />

      <GrilleTarifaireModal
        open={grilleModalOpen}
        onClose={() => setGrilleModalOpen(false)}
        clientId={c.id}
        existing={grille}
        onSave={(entry) => setGrille((prev) => {
          // upsert local : remplace si existe, ajoute sinon
          const idx = prev.findIndex((g) => g.articleCode === entry.articleCode)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = entry
            return next
          }
          return [...prev, entry]
        })}
      />
    </div>
  )
}
