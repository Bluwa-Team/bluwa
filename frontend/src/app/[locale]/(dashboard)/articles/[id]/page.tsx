'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Archive, Printer, Package,
  TrendingUp, Clock, ShoppingCart, Factory,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArticleModal } from '../_components/article-modal'
import {
  Article, TYPE_COLORS, STATUT_COLORS, APPRO_COLORS,
} from '../_components/types'
import { getArticleById, updateArticle } from '@/lib/actions/articles'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground min-w-[180px]">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? <span className="text-muted-foreground font-normal">N/A</span>}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}

const MOCK_MOUVEMENTS = [
  { date: '2025-05-10', type: 'Entrée', lot: 'LOT-2025-042', qte: 2500, unite: 'KG', origine: 'Réception fournisseur' },
  { date: '2025-05-08', type: 'Sortie', lot: 'LOT-2025-041', qte: -800, unite: 'KG', origine: 'Production lot 041' },
  { date: '2025-04-30', type: 'Sortie', lot: 'LOT-2025-039', qte: -1200, unite: 'KG', origine: 'Production lot 039' },
  { date: '2025-04-20', type: 'Entrée', lot: 'LOT-2025-035', qte: 5000, unite: 'KG', origine: 'Réception fournisseur' },
]

const MOCK_PRIX = [
  { date: '2025-05-10', fournisseur: 'SOGEMA SA', prix: 185, qte: 2500 },
  { date: '2025-04-20', fournisseur: 'SOGEMA SA', prix: 190, qte: 5000 },
  { date: '2025-03-05', fournisseur: 'AGRI-TOGO', prix: 195, qte: 3000 },
  { date: '2025-01-15', fournisseur: 'SOGEMA SA', prix: 200, qte: 4000 },
]

const MOCK_LOTS = [
  { code: 'LOT-2025-042', produit: 'Farine infantile 1kg', statut: 'En cours', qte: 800 },
  { code: 'LOT-2025-040', produit: 'Farine famille 2kg', statut: 'En cours', qte: 1200 },
]

const MOCK_NOMENCLATURES = [
  { code: 'NOM-FAR-001', produit: 'Farine infantile 1kg', qteParUnite: 1.1, unite: 'KG' },
  { code: 'NOM-FAR-002', produit: 'Farine famille 2kg', qteParUnite: 2.15, unite: 'KG' },
]

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslations('articles')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const [article, setArticle] = useState<Article | null | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    getArticleById(id).then(setArticle)
  }, [id])

  if (article === undefined) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{tCommon('loading')}</div>
  }

  if (article === null) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Article introuvable.</p>
        <Button variant="outline" onClick={() => router.back()}>{tCommon('back')}</Button>
      </div>
    )
  }

  const TYPE_LABELS_T: Record<string, string> = {
    MP: t('types.MP'),
    PSF: t('types.PSF'),
    PF: t('types.PF'),
    AC: t('types.AC'),
    CS: t('types.CS'),
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="../articles">
            <Button variant="ghost" size="icon" className="mt-0.5">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold font-mono">{article.code}</h1>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[article.type]}`}>
                {article.type}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[article.statut]}`}>
                {t(`statuts.${article.statut}` as any)}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{article.designation}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Printer className="size-3.5" />
            Imprimer étiquette
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
            <Archive className="size-3.5" />
            {tCommon('archive')}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
            <Pencil className="size-3.5" />
            {tCommon('edit')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="fiche">
        <TabsList className="w-full">
          <TabsTrigger value="fiche" className="flex-1">Fiche article</TabsTrigger>
          <TabsTrigger value="mouvements" className="flex-1">Mouvements de stock</TabsTrigger>
          <TabsTrigger value="prix" className="flex-1">Historique des prix</TabsTrigger>
          <TabsTrigger value="lots" className="flex-1">Lots en cours</TabsTrigger>
          <TabsTrigger value="nomenclatures" className="flex-1">Nomenclatures</TabsTrigger>
        </TabsList>

        {/* Fiche article */}
        <TabsContent value="fiche" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Section title="Identification" icon={Package}>
              <InfoRow label={t('columns.code')} value={<span className="font-mono">{article.code}</span>} />
              <InfoRow label={t('modal.fields.designation')} value={article.designation} />
              <InfoRow label={t('columns.type')} value={
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[article.type]}`}>
                  {article.type} : {TYPE_LABELS_T[article.type]}
                </span>
              } />
              <InfoRow label={t('modal.fields.appro')} value={
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${APPRO_COLORS[article.appro]}`}>
                  {t(`appro.${article.appro}` as any)}
                </span>
              } />
              <InfoRow label={t('modal.fields.barcode')} value={<span className="font-mono text-xs">{article.codeBarres || 'N/A'}</span>} />
              <InfoRow label={t('modal.fields.qrCode')} value={<span className="font-mono text-xs">{article.qrCode || 'N/A'}</span>} />
              <InfoRow label="Créé le" value={article.createdAt} />
              <InfoRow label="Mis à jour le" value={article.updatedAt} />
            </Section>

            <Section title="Classification" icon={Package}>
              <InfoRow label={t('columns.family')} value={article.famille} />
            </Section>

            <Section title="Unités et conversion" icon={Package}>
              <InfoRow label={t('modal.fields.stockUnit')} value={<span className="font-mono font-semibold">{article.uniteStock}</span>} />
              <InfoRow label={t('modal.fields.saleUnit')} value={<span className="font-mono">{article.uniteVente}</span>} />
              <InfoRow label={t('modal.fields.convCoeff')} value={
                `1 ${article.uniteVente} = ${article.coeffConversion} ${article.uniteStock}`
              } />
            </Section>

            <Section title="Valorisation" icon={TrendingUp}>
              <InfoRow label={t('modal.fields.lastPurchasePrice')} value={article.dernierPrixAchat ? `${formatNumber(article.dernierPrixAchat, locale)} FCFA` : null} />
              <InfoRow label={t('modal.fields.salePrice')} value={
                article.type === 'PF' && article.prixVente
                  ? <span className="text-emerald-700 font-semibold">{formatNumber(article.prixVente, locale)} FCFA</span>
                  : null
              } />
              <InfoRow label={t('modal.fields.pmp')} value={article.pmp ? `${formatNumber(article.pmp, locale)} FCFA` : null} />
            </Section>

            <Section title="Caractéristiques physiques" icon={Package}>
              <InfoRow label={t('modal.fields.weight')} value={article.poidsUnitaire ? `${article.poidsUnitaire} kg` : null} />
              <InfoRow label={t('modal.fields.volume')} value={article.volumeUnitaire ? `${article.volumeUnitaire} L` : null} />
              <InfoRow label={t('modal.fields.shelfLife')} value={article.dureeVie ? `${article.dureeVie} jours` : null} />
            </Section>

            <Section title="Gestion des stocks" icon={Clock}>
              <InfoRow label={t('modal.fields.safetyStock')} value={article.stockSecurite !== null ? `${formatNumber(article.stockSecurite, locale)} ${article.uniteStock}` : null} />
              <InfoRow label={t('modal.fields.reorderPoint')} value={article.pointCommande !== null ? `${formatNumber(article.pointCommande, locale)} ${article.uniteStock}` : null} />
            </Section>
          </div>
        </TabsContent>

        {/* Mouvements */}
        <TabsContent value="mouvements" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Lot</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Quantité</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Origine</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_MOUVEMENTS.map((m, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{m.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${m.type === 'Entrée' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{m.lot}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${m.qte > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {m.qte > 0 ? '+' : ''}{formatNumber(m.qte, locale)} {m.unite}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{m.origine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Historique prix */}
        <TabsContent value="prix" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Fournisseur</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Prix unitaire</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Quantité</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Montant total</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PRIX.map((p, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{p.date}</td>
                    <td className="px-4 py-3">{p.fournisseur}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatNumber(p.prix, locale)} F</td>
                    <td className="px-4 py-3 text-right font-mono">{formatNumber(p.qte, locale)} KG</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatNumber(p.prix * p.qte, locale)} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Lots en cours */}
        <TabsContent value="lots" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Lot</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Produit fini</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Qté consommée</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LOTS.map((l, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{l.code}</td>
                    <td className="px-4 py-3">{l.produit}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{l.statut}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatNumber(l.qte, locale)} KG</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Nomenclatures */}
        <TabsContent value="nomenclatures" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Réf. nomenclature</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Produit fini</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Qté par unité</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_NOMENCLATURES.map((n, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{n.code}</td>
                    <td className="px-4 py-3">{n.produit}</td>
                    <td className="px-4 py-3 text-right font-mono">{n.qteParUnite} {n.unite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <ArticleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        article={article}
        onSave={async (data) => { const updated = await updateArticle(id, data); if (updated) setArticle(updated); return !!updated }}
      />
    </div>
  )
}
