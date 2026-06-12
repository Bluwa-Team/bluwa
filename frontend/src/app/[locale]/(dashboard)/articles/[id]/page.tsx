'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Archive, Printer, Package,
  TrendingUp, Clock, BookOpen, Settings2, CheckCircle2, XCircle, ListChecks, ShieldCheck,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArticleModal } from '../_components/article-modal'
import {
  Article, TYPE_COLORS, STATUT_COLORS, APPRO_COLORS,
} from '../_components/types'
import {
  BillOfMaterial, BOMIngredient,
} from '../_components/bom'
import { BomEditModal } from '../_components/bom-edit-modal'
import {
  GammeFabrication, GammeEtape,
} from '../_components/gamme'
import { GammeEditModal } from '../_components/gamme-edit-modal'
import { getArticleById, updateArticle } from '@/lib/actions/articles'
import MouvementsStockTab from './_components/MouvementsStockTab'
import ArticleLotsTab from './_components/ArticleLotsTab'
import {
  getBomByArticleId, upsertBom,
  getGammeByArticleId, upsertGamme,
} from '@/lib/actions/bom'
import { getWorkCenters } from '@/lib/actions/work-centers'
import { WorkCenter } from '@/types/erp'
import ConfigPlanControle from '@/components/quality/ConfigPlanControle'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'

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

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed flex items-center justify-center py-16 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslations('articles')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const [article, setArticle] = useState<Article | null | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [bom, setBom] = useState<BillOfMaterial | null>(null)
  const [bomIngredients, setBomIngredients] = useState<BOMIngredient[]>([])
  const [bomEditOpen, setBomEditOpen] = useState(false)
  const [gamme, setGamme] = useState<GammeFabrication | null>(null)
  const [gammeEtapes, setGammeEtapes] = useState<GammeEtape[]>([])
  const [gammeEditOpen, setGammeEditOpen] = useState(false)
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])

  useEffect(() => {
    getWorkCenters().then(setWorkCenters)
    getArticleById(id).then((art) => {
      setArticle(art)
      if (art) {
        getBomByArticleId(id).then(({ bom: b, ingredients }) => {
          setBom(b)
          setBomIngredients(ingredients)
        })
        getGammeByArticleId(id).then(({ gamme: g, etapes }) => {
          setGamme(g)
          setGammeEtapes(etapes)
        })
      }
    })
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
          <TabsTrigger value="lots" className="flex-1">Lots</TabsTrigger>
          <TabsTrigger value="quality" className="flex-1">Contrôle Qualité</TabsTrigger>
          <TabsTrigger value="nomenclatures" className="flex-1">Nomenclatures</TabsTrigger>
          <TabsTrigger value="gamme" className="flex-1">Gamme de fabrication</TabsTrigger>
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
              {article.appro === 'Achete' && (
                <>
                  <InfoRow label="Unité d'achat" value={
                    article.uniteAchat
                      ? <span className="font-mono">{article.uniteAchat}</span>
                      : null
                  } />
                  <InfoRow label="Conversion achat" value={
                    article.uniteAchat
                      ? <span className="font-mono text-xs">
                          1 <span className="font-semibold">{article.uniteAchat}</span>
                          {' = '}
                          <span className="font-semibold">{article.coeffConversionAchat}</span>
                          {' '}{article.uniteStock}
                        </span>
                      : null
                  } />
                </>
              )}
              {article.uniteVente && (
                <>
                  <InfoRow label={t('modal.fields.saleUnit')} value={<span className="font-mono">{article.uniteVente}</span>} />
                  <InfoRow label={t('modal.fields.convCoeff')} value={
                    `1 ${article.uniteVente} = ${article.coeffConversion} ${article.uniteStock}`
                  } />
                </>
              )}
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
            </Section>

            <Section title="Paramètres Industriels & Qualité" icon={ShieldCheck}>
              <InfoRow
                label="Délai de libération qualité"
                value={article.delaiControle != null
                  ? <span className="font-semibold">{article.delaiControle} jour{article.delaiControle !== 1 ? 's' : ''}</span>
                  : null}
              />
              <InfoRow
                label="Durée de vie théorique"
                value={article.dureeVie != null
                  ? <span className="font-semibold">{article.dureeVie} jour{article.dureeVie !== 1 ? 's' : ''}</span>
                  : null}
              />
              <InfoRow
                label="Seuil d'alerte péremption"
                value={article.seuilAlertePeremption != null
                  ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      {article.seuilAlertePeremption} j avant DLC
                    </span>
                  )
                  : null}
              />
            </Section>

            <Section title="Gestion des stocks" icon={Clock}>
              <InfoRow label={t('modal.fields.safetyStock')} value={article.stockSecurite !== null ? `${formatNumber(article.stockSecurite, locale)} ${article.uniteStock}` : null} />
              <InfoRow label={t('modal.fields.reorderPoint')} value={article.pointCommande !== null ? `${formatNumber(article.pointCommande, locale)} ${article.uniteStock}` : null} />
            </Section>
          </div>
        </TabsContent>

        {/* Mouvements */}
        <TabsContent value="mouvements" className="mt-4">
          <MouvementsStockTab articleId={article.id} />
        </TabsContent>

        {/* Historique prix */}
        <TabsContent value="prix" className="mt-4">
          <EmptyTab label={tCommon('noData')} />
        </TabsContent>

        {/* Lots */}
        <TabsContent value="lots" className="mt-4">
          <ArticleLotsTab articleId={article.id} />
        </TabsContent>

        {/* Contrôle Qualité */}
        <TabsContent value="quality" className="mt-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              <strong>Configuration Laboratoire :</strong> Les spécifications enregistrées ci-dessous s&apos;appliqueront automatiquement à toutes les futures réceptions du lot <strong>{article.code}</strong> pour forcer les validations du laboratoire avant mise en stock.
            </div>
            <ConfigPlanControle articleId={article.id} />
          </div>
        </TabsContent>

        {/* Nomenclatures */}
        <TabsContent value="nomenclatures" className="mt-4">
          {bom === null ? (
            <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-16 gap-3">
              <BookOpen className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucune nomenclature définie pour cet article.
              </p>
              {article.type === 'PF' || article.type === 'PSF' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 mt-1"
                  onClick={() => setBomEditOpen(true)}
                >
                  <Settings2 className="size-3.5" />
                  Créer la nomenclature
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground/60">
                  Les nomenclatures s&apos;appliquent aux articles de type PF et PSF.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">

              {/* BOM summary header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen className="size-[18px] text-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">Nomenclature de référence</p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground font-mono">
                        {bom.version}
                      </span>
                      {bom.isActive ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="size-2.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                          <XCircle className="size-2.5" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lot de référence :&nbsp;
                      <strong className="text-foreground">{bom.batchSize} {bom.batchUnit}</strong>
                      <span className="mx-1.5">·</span>
                      {bomIngredients.length} composant{bomIngredients.length !== 1 ? 's' : ''}
                      <span className="mx-1.5">·</span>
                      Créée le {bom.createdAt}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={() => setBomEditOpen(true)}
                >
                  <Settings2 className="size-3.5" />
                  Configurer la Nomenclature
                </Button>
              </div>

              {/* Ingredients table */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-semibold text-muted-foreground">
                        Composant
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[160px]">
                        Qté standard ({bom.batchSize} {bom.batchUnit})
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground w-[80px]">
                        Unité
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[120px]">
                        Tolérance (%)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomIngredients.map((ing) => {
                      const qtyStd = ing.qtyPerUnit * bom.batchSize
                      const qtyFmt = Number.isInteger(qtyStd)
                        ? String(qtyStd)
                        : parseFloat(qtyStd.toPrecision(4)).toString()
                      return (
                        <TableRow key={ing.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono bg-muted text-muted-foreground shrink-0">
                                {ing.ingredientCode}
                              </span>
                              <span className="text-sm font-medium">{ing.designation}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-sm font-semibold">
                            {qtyFmt}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ing.unite}
                          </TableCell>
                          <TableCell className="text-right">
                            {ing.tolerance > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                ±{ing.tolerance}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">exact</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground/60 italic">
                Ces valeurs alimentent le modal &quot;Nouvel OF&quot; dans le module Production.
                Toute modification ici est immédiatement prise en compte.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Gamme de fabrication */}
        <TabsContent value="gamme" className="mt-4">
          {gamme === null ? (
            <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-16 gap-3">
              <ListChecks className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucune gamme de fabrication définie pour cet article.
              </p>
              {article.type === 'PF' || article.type === 'PSF' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 mt-1"
                  onClick={() => setGammeEditOpen(true)}
                >
                  <ListChecks className="size-3.5" />
                  Créer la gamme
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground/60">
                  Les gammes s&apos;appliquent aux articles de type PF et PSF.
                </p>
              )}
            </div>
          ) : (() => {
            const totalDuree   = gammeEtapes.reduce((s, e) => s + e.duree, 0)
            const totalSetup   = gammeEtapes.reduce((s, e) => s + (e.setupTimeMinutes ?? 0), 0)
            const totalCout    = gammeEtapes.reduce((s, e) => {
              const rate = e.workCenterRatePerHour ?? 0
              return s + (e.duree + (e.setupTimeMinutes ?? 0)) / 60 * rate
            }, 0)
            return (
            <div className="space-y-4">

              {/* Gamme summary header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <ListChecks className="size-[18px] text-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">Gamme de fabrication</p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground font-mono">
                        {gamme.version}
                      </span>
                      {gamme.isActive ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="size-2.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                          <XCircle className="size-2.5" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {gammeEtapes.length} étape{gammeEtapes.length !== 1 ? 's' : ''}
                      <span className="mx-1.5">·</span>
                      Durée lot : <strong className="text-foreground">{totalDuree} min</strong>
                      {totalSetup > 0 && (
                        <><span className="mx-1.5">·</span>Réglages : <strong className="text-foreground">{totalSetup} min</strong></>
                      )}
                      {totalCout > 0 && (
                        <><span className="mx-1.5">·</span>Coût gamme ≈ <strong className="text-foreground">{Math.round(totalCout).toLocaleString('fr-FR')} XOF</strong></>
                      )}
                      <span className="mx-1.5">·</span>
                      Créée le {gamme.createdAt}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={() => setGammeEditOpen(true)}
                >
                  <Settings2 className="size-3.5" />
                  Configurer la Gamme
                </Button>
              </div>

              {/* Étapes table */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-semibold text-muted-foreground w-10 text-center">#</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Opération</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground w-[180px]">Poste de charge</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[80px]">Lot (min)</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[80px]">Rég. (min)</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[70px]">T° (°C)</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Point de contrôle</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[110px]">Coût ≈</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gammeEtapes.map((etape) => {
                      const rate      = etape.workCenterRatePerHour ?? 0
                      const coutEtape = rate > 0 ? (etape.duree + (etape.setupTimeMinutes ?? 0)) / 60 * rate : null
                      return (
                        <TableRow key={etape.id}>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
                              {etape.ordre}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{etape.operation}</TableCell>
                          <TableCell>
                            {etape.workCenterName ? (
                              <span className="inline-flex items-center gap-1.5">
                                {etape.workCenterCode && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono bg-slate-100 text-slate-600 shrink-0">
                                    {etape.workCenterCode}
                                  </span>
                                )}
                                <span className="text-xs truncate">{etape.workCenterName}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-sm">
                            {etape.duree}
                          </TableCell>
                          <TableCell className="text-right">
                            {etape.setupTimeMinutes > 0 ? (
                              <span className="font-mono tabular-nums text-xs text-muted-foreground">
                                {etape.setupTimeMinutes}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {etape.temperature != null ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                {etape.temperature}°C
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {etape.pointControle ?? <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {coutEtape != null ? (
                              <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                                {Math.round(coutEtape).toLocaleString('fr-FR')}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totaux */}
              {totalCout > 0 && (
                <div className="flex items-center justify-end gap-4 px-1 text-xs text-muted-foreground">
                  <span>Durée totale lot : <strong className="text-foreground tabular-nums">{totalDuree} min</strong></span>
                  <span>Réglages : <strong className="text-foreground tabular-nums">{totalSetup} min</strong></span>
                  <span className="text-sm font-semibold text-foreground">
                    Coût gamme total ≈ {Math.round(totalCout).toLocaleString('fr-FR')} XOF
                  </span>
                </div>
              )}

              <p className="text-xs text-muted-foreground/60 italic">
                La gamme définit la séquence d&apos;opérations pour produire cet article.
                Le coût gamme est calculé depuis le taux horaire de chaque poste de charge.
              </p>
            </div>
            )
          })()}
        </TabsContent>
      </Tabs>

      <ArticleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        article={article}
        onSave={async (data) => { const updated = await updateArticle(id, data); if (updated) setArticle(updated); return !!updated }}
      />

      <BomEditModal
        open={bomEditOpen}
        onClose={() => setBomEditOpen(false)}
        bom={bom}
        ingredients={bomIngredients}
        onSave={(header, ingredients) => {
          // Optimistic update
          if (bom) setBom({ ...bom, ...header })
          setBomIngredients(ingredients)
          // Persist to Supabase then refresh with DB-assigned IDs
          upsertBom(id, header, ingredients, bom?.id).then(({ bom: b, ingredients: ing }) => {
            setBom(b)
            setBomIngredients(ing)
          })
        }}
      />

      <GammeEditModal
        open={gammeEditOpen}
        onClose={() => setGammeEditOpen(false)}
        gamme={gamme}
        etapes={gammeEtapes}
        workCenters={workCenters}
        onSave={(header, etapes) => {
          // Optimistic update
          if (gamme) setGamme({ ...gamme, ...header })
          setGammeEtapes(etapes)
          // Persist to Supabase then refresh with DB-assigned IDs
          upsertGamme(id, header, etapes, gamme?.id).then(({ gamme: g, etapes: steps }) => {
            setGamme(g)
            setGammeEtapes(steps)
          })
        }}
      />
    </div>
  )
}
