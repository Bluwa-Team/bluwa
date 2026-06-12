'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Download, Upload, Printer,
  Pencil, Archive, Loader2, RotateCcw,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import { ArticleModal } from './_components/article-modal'
import {
  Article, ArticleType, ArticleStatut,
  TYPE_COLORS, STATUT_COLORS, APPRO_COLORS,
} from './_components/types'
import { getArticles, getArticlesPage, createArticle, updateArticle } from '@/lib/actions/articles'
import { Paginator } from '@/components/ui/paginator'

const PAGE_SIZE = 5
import { downloadCsv } from '@/lib/csv-utils'
import { CsvImportMapper, type CsvField } from '@/components/ui/csv-import-mapper'
import type { ArticleAppro } from './_components/types'

const ARTICLE_CSV_FIELDS: CsvField[] = [
  { key: 'code',                 label: 'Code / SKU' },
  { key: 'designation',          label: 'Désignation', required: true },
  { key: 'type',                 label: 'Type (MP, PSF, PF, AC, CS)' },
  { key: 'statut',               label: 'Statut' },
  { key: 'famille',              label: 'Famille' },
  { key: 'sousFamille',          label: 'Sous-famille' },
  { key: 'categorie',            label: 'Catégorie' },
  { key: 'uniteStock',           label: 'Unité de stock' },
  { key: 'uniteVente',           label: 'Unité de vente' },
  { key: 'coeffConversion',      label: 'Coeff. conversion vente' },
  { key: 'uniteAchat',           label: "Unité d'achat" },
  { key: 'coeffConversionAchat', label: 'Coeff. conversion achat' },
  { key: 'poidsUnitaire',        label: 'Poids unitaire' },
  { key: 'volumeUnitaire',       label: 'Volume unitaire' },
  { key: 'dureeVie',             label: 'Durée de vie (jours)' },
  { key: 'stockSecurite',        label: 'Stock de sécurité' },
  { key: 'pointCommande',        label: 'Point de commande' },
  { key: 'appro',                label: 'Approvisionnement (Achete, Fabrique)' },
  { key: 'gestionLot',           label: 'Gestion par lot (true/false)' },
  { key: 'codeBarres',           label: 'Code-barres' },
  { key: 'prixVente',            label: 'Prix de vente' },
]

const TYPES: Array<'TOUS' | ArticleType> = ['TOUS', 'MP', 'PSF', 'PF', 'AC', 'CS']
const STATUTS: Array<'Tous' | ArticleStatut> = ['Tous', 'Actif', 'Bloque', 'EnCreation']

// `designation` flexes to fill remaining space; every other column has a
// fixed width and can be resized by dragging its right edge.
const ARTICLE_COLUMNS: ResizableColumn[] = [
  { id: 'select', defaultWidth: 44 },
  { id: 'code', defaultWidth: 120, minWidth: 84 },
  { id: 'designation', defaultWidth: null },
  { id: 'type', defaultWidth: 66, minWidth: 52 },
  { id: 'family', defaultWidth: 130, minWidth: 84 },
  { id: 'stockUnit', defaultWidth: 78, minWidth: 58 },
  { id: 'pmp', defaultWidth: 98, minWidth: 72 },
  { id: 'salePrice', defaultWidth: 108, minWidth: 82 },
  { id: 'safetyStock', defaultWidth: 96, minWidth: 72 },
  { id: 'appro', defaultWidth: 90, minWidth: 66 },
  { id: 'status', defaultWidth: 96, minWidth: 66 },
  { id: 'actions', defaultWidth: 96 },
]
const DESIGNATION_MIN = 240

function generateCode(type: string): string {
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `${type}-${seq}`
}

function fmt(n: number | null, locale: string, suffix = '') {
  if (n === null || n === undefined) return <span className="text-muted-foreground">N/A</span>
  return `${formatNumber(n, locale)}${suffix}`
}

export default function ArticlesPage() {
  const t = useTranslations('articles')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  const [articles,      setArticles]      = useState<Article[]>([])
  const [loading,       setLoading]       = useState(true)
  const [page,          setPage]          = useState(0)
  const [total,         setTotal]         = useState(0)
  const [searchInput,   setSearchInput]   = useState('')
  const [search,        setSearch]        = useState('')
  const [filterType,    setFilterType]    = useState<'TOUS' | ArticleType>('TOUS')
  const [filterStatut,  setFilterStatut]  = useState<'Tous' | ArticleStatut>('Tous')
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editArticle,   setEditArticle]   = useState<Article | null>(null)
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [mapperOpen,    setMapperOpen]    = useState(false)

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:articles',
    ARTICLE_COLUMNS,
  )
  const tableMinWidth = ARTICLE_COLUMNS.reduce(
    (sum, c) => sum + (c.defaultWidth == null ? DESIGNATION_MIN : (widths[c.id] ?? c.defaultWidth)),
    0,
  )

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setLoading(true)
    getArticlesPage({
      page, pageSize: PAGE_SIZE,
      search:  search      || undefined,
      type:    filterType  !== 'TOUS' ? filterType  : undefined,
      statut:  filterStatut !== 'Tous' ? filterStatut : undefined,
    }).then(({ data, total: t }) => { setArticles(data); setTotal(t); setLoading(false) })
  }, [page, search, filterType, filterStatut])

  function resetAndRefresh() {
    setPage(0)
    getArticlesPage({ page: 0, pageSize: PAGE_SIZE,
      search: search || undefined,
      type: filterType !== 'TOUS' ? filterType : undefined,
      statut: filterStatut !== 'Tous' ? filterStatut : undefined,
    }).then(({ data, total: t }) => { setArticles(data); setTotal(t) })
  }

  async function handleSave(data: Partial<Article>): Promise<boolean> {
    if (editArticle) {
      const updated = await updateArticle(editArticle.id, data)
      if (!updated) return false
      setArticles((prev) => prev.map((a) => a.id === editArticle.id ? updated : a))
      return true
    }
    const type = (data.type as ArticleType) || 'MP'
    const famille = data.famille || ''
    const code = generateCode(type)
    const created = await createArticle({ ...data, code, type, famille } as Article & { code: string })
    if (!created) return false
    resetAndRefresh()
    return true
  }

  function openEdit(article: Article) {
    setEditArticle(article)
    setModalOpen(true)
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────

  function handleExport() {
    downloadCsv('articles_bluwa.csv', articles.map((a) => ({
      code:           a.code,
      designation:    a.designation,
      type:           a.type,
      famille:        a.famille,
      sousFamille:    a.sousFamille,
      categorie:      a.categorie,
      uniteStock:     a.uniteStock,
      uniteVente:     a.uniteVente,
      prixVente:      a.prixVente ?? '',
      pmp:            a.pmp ?? '',
      dureeVie:       a.dureeVie ?? '',
      poidsUnitaire:  a.poidsUnitaire ?? '',
      stockSecurite:  a.stockSecurite ?? '',
      pointCommande:  a.pointCommande ?? '',
      appro:          a.appro,
      statut:         a.statut,
      gestionLot:     a.gestionLot ? 'true' : 'false',
      codeBarres:     a.codeBarres,
    })))
  }

  // ── Import CSV (mapper de colonnes) ───────────────────────────────────────────

  async function importArticleRows(rows: Record<string, string>[]) {
    let created = 0
    let errors  = 0

    for (const row of rows) {
      if (!row.designation) { errors++; continue }
      const type = (['MP','AC','CS','PSF','PF'].includes(row.type) ? row.type : 'MP') as ArticleType
      const code = row.code || generateCode(type)
      const result = await createArticle({
        code,
        designation:          row.designation,
        type,
        famille:              row.famille              || '',
        sousFamille:          row.sousFamille          || '',
        categorie:            row.categorie            || '',
        uniteStock:           row.uniteStock           || 'kg',
        uniteVente:           row.uniteVente           || row.uniteStock || 'kg',
        coeffConversion:      row.coeffConversion      ? parseFloat(row.coeffConversion)      : 1,
        uniteAchat:           row.uniteAchat           || '',
        coeffConversionAchat: row.coeffConversionAchat ? parseFloat(row.coeffConversionAchat) : 1,
        poidsUnitaire:        row.poidsUnitaire        ? parseFloat(row.poidsUnitaire)        : null,
        volumeUnitaire:       row.volumeUnitaire       ? parseFloat(row.volumeUnitaire)       : null,
        dureeVie:             row.dureeVie             ? parseInt(row.dureeVie, 10)            : null,
        stockSecurite:        row.stockSecurite        ? parseFloat(row.stockSecurite)        : null,
        pointCommande:        row.pointCommande        ? parseFloat(row.pointCommande)        : null,
        prixVente:            row.prixVente            ? parseFloat(row.prixVente)            : null,
        codeBarres:           row.codeBarres           || '',
        appro:                (['Achete','Fabrique','Interne'].includes(row.appro) ? row.appro : 'Achete') as ArticleAppro,
        statut:               (['Actif','Bloque','EnCreation'].includes(row.statut) ? row.statut : 'Actif') as ArticleStatut,
        gestionLot:           row.gestionLot === 'true' || row.gestionLot?.toLowerCase() === 'oui',
      })
      if (result) created++; else errors++
    }

    if (created > 0) resetAndRefresh()
    return { created, errors }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === articles.length) setSelected(new Set())
    else setSelected(new Set(articles.map((a) => a.id)))
  }

  const countLabel = total > 1 ? t('countPlural', { count: total }) : t('count', { count: total })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{t('title')}</h1>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs font-medium">
              {t('badge')}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {t('subtitle', { pattern: 'TYPE-XXXX' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => setMapperOpen(true)}
          >
            <Download className="size-3.5" />
            {tCommon('import')}
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={handleExport}
            disabled={articles.length === 0}
          >
            <Upload className="size-3.5" />
            {tCommon('export')}
          </Button>
          {selected.size > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="size-3.5" />
              {t('print', { count: selected.size })}
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => { setEditArticle(null); setModalOpen(true) }}>
            <Plus className="size-4" />
            {t('new')}
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Type tabs */}
        <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
          {TYPES.map((tp) => (
            <button
              key={tp}
              onClick={() => { setFilterType(tp); setPage(0) }}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                filterType === tp
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tp}
            </button>
          ))}
        </div>

        <Select value={filterStatut} onValueChange={(v) => { setFilterStatut(v as typeof filterStatut); setPage(0) }}>
          <SelectTrigger className="w-auto min-w-[9rem] h-9">
            <span className="text-sm">
              {filterStatut === 'Tous' ? t('columns.status') : t(`statuts.${filterStatut}` as any)}
            </span>
          </SelectTrigger>
          <SelectContent className="min-w-[10rem]">
            <SelectItem value="Tous">{t('allStatuses')}</SelectItem>
            {STATUTS.filter(s => s !== 'Tous').map((s) => (
              <SelectItem key={s} value={s}>
                {t(`statuts.${s}` as any)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1.5">
          {isCustomized && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={reset}
            >
              <RotateCcw className="size-3.5" />
              {t('resetColumns')}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">{countLabel}</span>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border">
        <Table className="table-fixed" style={{ minWidth: tableMinWidth }}>
          <colgroup>
            {ARTICLE_COLUMNS.map((c) => (
              <col
                key={c.id}
                style={c.defaultWidth == null ? undefined : { width: widths[c.id] }}
              />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">
                <input
                  type="checkbox"
                  checked={selected.size === articles.length && articles.length > 0}
                  onChange={toggleAll}
                  className="rounded border-input"
                />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.code')}
                <ColumnResizer columnId="code" onStart={startResize} />
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wide">{t('columns.designation')}</TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.type')}
                <ColumnResizer columnId="type" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.family')}
                <ColumnResizer columnId="family" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide text-right">
                {t('columns.stockUnit')}
                <ColumnResizer columnId="stockUnit" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide text-right">
                {t('columns.pmp')}
                <ColumnResizer columnId="pmp" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide text-right">
                {t('columns.salePrice')}
                <ColumnResizer columnId="salePrice" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide text-right">
                {t('columns.safetyStock')}
                <ColumnResizer columnId="safetyStock" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.appro')}
                <ColumnResizer columnId="appro" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.status')}
                <ColumnResizer columnId="status" onStart={startResize} />
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wide text-right pr-4">{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {t('loading')}
                  </div>
                </TableCell>
              </TableRow>
            ) : articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article) => (
                <TableRow key={article.id} className={selected.has(article.id) ? 'bg-primary/5' : ''}>
                  <TableCell className="pl-4">
                    <input
                      type="checkbox"
                      checked={selected.has(article.id)}
                      onChange={() => toggleSelect(article.id)}
                      className="rounded border-input"
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`articles/${article.id}`} className="font-mono text-sm font-medium hover:text-primary hover:underline underline-offset-4">
                      {article.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`articles/${article.id}`} className="truncate block text-sm hover:text-primary hover:underline underline-offset-4" title={article.designation}>
                      {article.designation}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[article.type]}`}>
                      {article.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm truncate" title={article.famille || undefined}>
                    {article.famille || <span className="text-muted-foreground">N/A</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">{article.uniteStock}</TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {article.pmp ? formatNumber(article.pmp, locale) : fmt(null, locale)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {article.type === 'PF' && article.prixVente ? (
                      <span className="text-emerald-700 font-medium">{formatNumber(article.prixVente, locale)}</span>
                    ) : fmt(null, locale)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">{fmt(article.stockSecurite, locale)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${APPRO_COLORS[article.appro]}`}>
                      {t(`appro.${article.appro}` as any)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[article.statut]}`}>
                      {t(`statuts.${article.statut}` as any)}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-7" title={tCommon('edit')} onClick={() => openEdit(article)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" title={tCommon('archive')}>
                        <Archive className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Paginator page={page} total={total} pageSize={PAGE_SIZE} loading={loading} onPage={setPage} />

      <ArticleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        article={editArticle}
        onSave={handleSave}
      />

      <CsvImportMapper
        open={mapperOpen}
        onClose={() => setMapperOpen(false)}
        fields={ARTICLE_CSV_FIELDS}
        entityLabel="articles"
        onImport={importArticleRows}
      />
    </div>
  )
}
