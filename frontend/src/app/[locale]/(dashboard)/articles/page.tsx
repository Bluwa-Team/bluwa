'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Download, Upload, Printer,
  Pencil, Archive, Loader2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArticleModal } from './_components/article-modal'
import {
  Article, ArticleType, ArticleStatut, ArticleAppro,
  TYPE_COLORS, STATUT_COLORS, APPRO_COLORS, FAMILLES,
} from './_components/types'
import { getArticles, createArticle, updateArticle } from '@/lib/actions/articles'

const TYPES: Array<'TOUS' | ArticleType> = ['TOUS', 'MP', 'PSF', 'PF', 'AC', 'CS']
const STATUTS: Array<'Tous' | ArticleStatut> = ['Tous', 'Actif', 'Bloque', 'EnCreation']
const APPROS: Array<'Tous' | ArticleAppro> = ['Tous', 'Achete', 'Fabrique']

function generateCode(type: string, famille: string): string {
  const famCode = famille
    ? famille.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase()
    : 'XXX'
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `${type}-${famCode}-${seq}`
}

function fmt(n: number | null, suffix = '') {
  if (n === null || n === undefined) return <span className="text-muted-foreground">-</span>
  return `${n.toLocaleString('fr-FR')}${suffix}`
}

export default function ArticlesPage() {
  const t = useTranslations('articles')
  const tCommon = useTranslations('common')

  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'TOUS' | ArticleType>('TOUS')
  const [filterFamille, setFilterFamille] = useState('Toutes')
  const [filterStatut, setFilterStatut] = useState<'Tous' | ArticleStatut>('Tous')
  const [filterAppro, setFilterAppro] = useState<'Tous' | ArticleAppro>('Tous')
  const [modalOpen, setModalOpen] = useState(false)
  const [editArticle, setEditArticle] = useState<Article | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    getArticles().then((data) => { setArticles(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (search) {
        const q = search.toLowerCase()
        if (!a.code.toLowerCase().includes(q) && !a.designation.toLowerCase().includes(q)) return false
      }
      if (filterType !== 'TOUS' && a.type !== filterType) return false
      if (filterFamille !== 'Toutes' && a.famille !== filterFamille) return false
      if (filterStatut !== 'Tous' && a.statut !== filterStatut) return false
      if (filterAppro !== 'Tous' && a.appro !== filterAppro) return false
      return true
    })
  }, [articles, search, filterType, filterFamille, filterStatut, filterAppro])

  async function handleSave(data: Partial<Article>): Promise<boolean> {
    if (editArticle) {
      const updated = await updateArticle(editArticle.id, data)
      if (!updated) return false
      setArticles((prev) => prev.map((a) => a.id === editArticle.id ? updated : a))
      return true
    }
    const type = (data.type as ArticleType) || 'MP'
    const famille = data.famille || ''
    const code = generateCode(type, famille)
    const created = await createArticle({ ...data, code, type, famille } as Article & { code: string })
    if (!created) return false
    setArticles((prev) => [created, ...prev])
    return true
  }

  function openEdit(article: Article) {
    setEditArticle(article)
    setModalOpen(true)
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
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((a) => a.id)))
  }

  const count = filtered.length
  const countLabel = count > 1 ? t('countPlural', { count }) : t('count', { count })

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
            {t('subtitle', { pattern: 'TYPE-FAM-XXX' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="size-3.5" />
            {tCommon('import')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-3.5" />
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Type tabs */}
        <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
          {TYPES.map((tp) => (
            <button
              key={tp}
              onClick={() => setFilterType(tp)}
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

        <Select value={filterFamille} onValueChange={(v) => setFilterFamille(v ?? 'Toutes')}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">{t('allFamilies')}</SelectItem>
            {Object.keys(FAMILLES).map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v as typeof filterStatut)}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">{t('allStatuses')}</SelectItem>
            {STATUTS.filter(s => s !== 'Tous').map((s) => (
              <SelectItem key={s} value={s}>
                {t(`statuts.${s}` as any)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAppro} onValueChange={(v) => setFilterAppro(v as typeof filterAppro)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">{t('allAppro')}</SelectItem>
            <SelectItem value="Achete">{t('appro.Achete')}</SelectItem>
            <SelectItem value="Fabrique">{t('appro.Fabrique')}</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">{countLabel}</span>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border overflow-x-auto">
        <div className="min-w-[1150px]">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-12 pl-4">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="rounded border-input"
                />
              </TableHead>
              <TableHead className="w-[130px] font-semibold text-xs uppercase tracking-wide">{t('columns.code')}</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('columns.designation')}</TableHead>
              <TableHead className="w-[70px] font-semibold text-xs uppercase tracking-wide">{t('columns.type')}</TableHead>
              <TableHead className="w-[140px] font-semibold text-xs uppercase tracking-wide">{t('columns.family')}</TableHead>
              <TableHead className="w-[90px] font-semibold text-xs uppercase tracking-wide text-right">{t('columns.stockUnit')}</TableHead>
              <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-right">{t('columns.pmp')}</TableHead>
              <TableHead className="w-[110px] font-semibold text-xs uppercase tracking-wide text-right">{t('columns.salePrice')}</TableHead>
              <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-right">{t('columns.safetyStock')}</TableHead>
              <TableHead className="w-[90px] font-semibold text-xs uppercase tracking-wide">{t('columns.appro')}</TableHead>
              <TableHead className="w-[90px] font-semibold text-xs uppercase tracking-wide">{t('columns.status')}</TableHead>
              <TableHead className="w-[110px] font-semibold text-xs uppercase tracking-wide text-right pr-4">{t('columns.actions')}</TableHead>
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
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((article) => (
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
                  <TableCell className="text-sm">{article.famille || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{article.uniteStock}</TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {article.pmp ? (
                      <span>{article.pmp.toLocaleString('fr-FR')} <span className="text-muted-foreground text-xs">F</span></span>
                    ) : fmt(null)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {article.type === 'PF' && article.prixVente ? (
                      <span className="text-emerald-700 font-medium">{article.prixVente.toLocaleString('fr-FR')} <span className="text-xs">F</span></span>
                    ) : fmt(null)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">{fmt(article.stockSecurite)}</TableCell>
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
      </div>

      <ArticleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        article={editArticle}
        onSave={handleSave}
      />
    </div>
  )
}
