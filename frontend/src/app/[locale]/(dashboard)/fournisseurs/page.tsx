'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Download, Upload, Pencil, Loader2, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import { FournisseurModal } from './_components/fournisseur-modal'
import {
  Fournisseur, FournisseurQualification, FournisseurStatut,
  QUALIFICATION_COLORS, STATUT_COLORS,
  CATEGORIES_FOURNISSEUR, scoreColor,
} from './_components/types'
import { getFournisseurs, createFournisseur, updateFournisseur } from '@/lib/actions/fournisseurs'
import { downloadCsv } from '@/lib/csv-utils'
import { CsvImportMapper, type CsvField } from '@/components/ui/csv-import-mapper'
import Link from 'next/link'

const FOURNISSEUR_CSV_FIELDS: CsvField[] = [
  { key: 'code',             label: 'Code fournisseur' },
  { key: 'raisonSociale',    label: 'Raison sociale', required: true },
  { key: 'statut',           label: 'Statut (Formel/Informel)' },
  { key: 'qualification',    label: 'Qualification (Agree, AQualifier, Suspendu)' },
  { key: 'categorie',        label: 'Catégorie' },
  { key: 'devise',           label: 'Devise' },
  { key: 'contactPrincipal', label: 'Contact principal' },
  { key: 'telephone',        label: 'Téléphone' },
  { key: 'email',            label: 'Email' },
  { key: 'ville',            label: 'Ville' },
  { key: 'pays',             label: 'Pays' },
  { key: 'modeLogistique',   label: 'Mode logistique' },
  { key: 'paiementMobile',   label: 'Paiement mobile (true/false)' },
  { key: 'scoreFilabilite',  label: 'Score de fiabilité (0–100)' },
]

const QUALIFICATIONS: Array<'Tous' | FournisseurQualification> = ['Tous', 'Agree', 'AQualifier', 'Suspendu']
const STATUTS: Array<'Tous' | FournisseurStatut> = ['Tous', 'Formel', 'Informel']

// `name` flexes pour remplir l'espace ; les autres colonnes sont redimensionnables.
const FOURNISSEUR_COLUMNS: ResizableColumn[] = [
  { id: 'code', defaultWidth: 140, minWidth: 96 },
  { id: 'name', defaultWidth: null },
  { id: 'structureType', defaultWidth: 110, minWidth: 80 },
  { id: 'qualification', defaultWidth: 120, minWidth: 90 },
  { id: 'category', defaultWidth: 200, minWidth: 120 },
  { id: 'country', defaultWidth: 120, minWidth: 80 },
  { id: 'currency', defaultWidth: 80, minWidth: 60 },
  { id: 'score', defaultWidth: 100, minWidth: 80 },
  { id: 'actions', defaultWidth: 80 },
]
const NAME_MIN = 200

function generateCode(pays: string, seq: number): string {
  const paysCode = pays
    ? pays.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase()
    : 'XXX'
  return `FRN-${paysCode}-${String(seq).padStart(3, '0')}`
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-sm">N/A</span>
  const color = score >= 70 ? 'bg-emerald-100 text-emerald-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {score}/100
    </span>
  )
}

export default function FournisseursPage() {
  const t = useTranslations('fournisseurs')
  const tCommon = useTranslations('common')

  const [fournisseurs,  setFournisseurs]  = useState<Fournisseur[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [filterQualif,  setFilterQualif]  = useState<'Tous' | FournisseurQualification>('Tous')
  const [filterStatut,  setFilterStatut]  = useState<'Tous' | FournisseurStatut>('Tous')
  const [filterCategorie, setFilterCategorie] = useState('Toutes')
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editFournisseur, setEditFournisseur] = useState<Fournisseur | null>(null)
  const [mapperOpen,    setMapperOpen]    = useState(false)

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:fournisseurs',
    FOURNISSEUR_COLUMNS,
  )
  const tableMinWidth = FOURNISSEUR_COLUMNS.reduce(
    (sum, c) => sum + (c.defaultWidth == null ? NAME_MIN : (widths[c.id] ?? c.defaultWidth)),
    0,
  )

  useEffect(() => {
    getFournisseurs().then((data) => { setFournisseurs(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    return fournisseurs.filter((f) => {
      if (search) {
        const q = search.toLowerCase()
        if (!f.code.toLowerCase().includes(q) && !f.raisonSociale.toLowerCase().includes(q)) return false
      }
      if (filterQualif !== 'Tous' && f.qualification !== filterQualif) return false
      if (filterStatut !== 'Tous' && f.statut !== filterStatut) return false
      if (filterCategorie !== 'Toutes' && f.categorie !== filterCategorie) return false
      return true
    })
  }, [fournisseurs, search, filterQualif, filterStatut, filterCategorie])

  async function handleSave(data: Partial<Fournisseur>): Promise<boolean> {
    if (editFournisseur) {
      const updated = await updateFournisseur(editFournisseur.id, data)
      if (!updated) return false
      setFournisseurs((prev) => prev.map((f) => f.id === editFournisseur.id ? updated : f))
      return true
    }
    const seq = fournisseurs.length + 1
    const code = generateCode(data.pays || '', seq)
    const created = await createFournisseur({ ...data, code } as Fournisseur & { code: string })
    if (!created) return false
    setFournisseurs((prev) => [created, ...prev])
    return true
  }

  function handleExport() {
    downloadCsv('fournisseurs_bluwa.csv', fournisseurs.map((f) => ({
      code:             f.code,
      raisonSociale:    f.raisonSociale,
      statut:           f.statut,
      qualification:    f.qualification,
      categorie:        f.categorie,
      devise:           f.devise,
      contactPrincipal: f.contactPrincipal,
      telephone:        f.telephone,
      email:            f.email,
      ville:            f.ville,
      pays:             f.pays,
      modeLogistique:   f.modeLogistique,
      scoreFilabilite:  f.scoreFilabilite ?? '',
      paiementMobile:   f.paiementMobile ? 'true' : 'false',
    })))
  }

  async function importFournisseurRows(rows: Record<string, string>[]) {
    let created = 0; let errors = 0
    for (const row of rows) {
      if (!row.raisonSociale) { errors++; continue }
      const seq  = fournisseurs.length + created + 1
      const code = row.code || generateCode(row.pays || '', seq)
      const result = await createFournisseur({
        code,
        raisonSociale:    row.raisonSociale,
        statut:           row.statut === 'Informel' ? 'Informel' : 'Formel',
        qualification:    (['Agree','AQualifier','Suspendu'].includes(row.qualification) ? row.qualification : 'AQualifier') as FournisseurQualification,
        categorie:        row.categorie        || '',
        devise:           row.devise           || 'XOF',
        contactPrincipal: row.contactPrincipal || '',
        telephone:        row.telephone        || '',
        email:            row.email            || '',
        ville:            row.ville            || '',
        pays:             row.pays             || 'Sénégal',
        modeLogistique:   row.modeLogistique   || '',
        scoreFilabilite:  row.scoreFilabilite  ? parseFloat(row.scoreFilabilite) : null,
        paiementMobile:   row.paiementMobile === 'true' || row.paiementMobile?.toLowerCase() === 'oui',
      } as Fournisseur & { code: string })
      if (result) created++; else errors++
    }

    if (created > 0) { const data = await getFournisseurs(); setFournisseurs(data) }
    return { created, errors }
  }

  function openEdit(f: Fournisseur) {
    setEditFournisseur(f)
    setModalOpen(true)
  }

  const count = filtered.length
  const countLabel = count > 1 ? t('countPlural', { count }) : t('count', { count })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={handleExport} disabled={fournisseurs.length === 0}>
            <Upload className="size-3.5" />
            {tCommon('export')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => setMapperOpen(true)}>
            <Download className="size-3.5" />
            {tCommon('import')}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditFournisseur(null); setModalOpen(true) }}>
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

        <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
          {QUALIFICATIONS.map((q) => (
            <button
              key={q}
              onClick={() => setFilterQualif(q)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                filterQualif === q
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {q === 'Tous' ? tCommon('all') : t(`qualifications.${q}` as any)}
            </button>
          ))}
        </div>

        <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v as typeof filterStatut)}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Type</SelectItem>
            <SelectItem value="Formel">{t('statuts.Formel')}</SelectItem>
            <SelectItem value="Informel">{t('statuts.Informel')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategorie} onValueChange={(v) => setFilterCategorie(v ?? 'Toutes')}>
          <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Catégories</SelectItem>
            {CATEGORIES_FOURNISSEUR.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
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
      <div className="rounded-lg border overflow-x-auto">
        <Table className="table-fixed" style={{ minWidth: tableMinWidth }}>
          <colgroup>
            {FOURNISSEUR_COLUMNS.map((c) => (
              <col
                key={c.id}
                style={c.defaultWidth == null ? undefined : { width: widths[c.id] }}
              />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.code')}
                <ColumnResizer columnId="code" onStart={startResize} />
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wide">{t('columns.name')}</TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.structureType')}
                <ColumnResizer columnId="structureType" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.qualification')}
                <ColumnResizer columnId="qualification" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.category')}
                <ColumnResizer columnId="category" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.country')}
                <ColumnResizer columnId="country" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.currency')}
                <ColumnResizer columnId="currency" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide text-center">
                {t('columns.score')}
                <ColumnResizer columnId="score" onStart={startResize} />
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wide text-right pr-4">{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {t('loading')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Link href={`fournisseurs/${f.id}`} className="font-mono text-sm font-medium hover:text-primary hover:underline underline-offset-4">
                        {f.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`fournisseurs/${f.id}`} className="text-sm hover:text-primary hover:underline underline-offset-4 truncate block" title={f.raisonSociale}>
                        {f.raisonSociale}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[f.statut]}`}>
                        {t(`statuts.${f.statut}` as any)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${QUALIFICATION_COLORS[f.qualification]}`}>
                        {t(`qualifications.${f.qualification}` as any)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm truncate">{f.categorie}</TableCell>
                    <TableCell className="text-sm">{f.pays}</TableCell>
                    <TableCell className="text-sm font-mono">{f.devise}</TableCell>
                    <TableCell className="text-center">
                      <ScoreBadge score={f.scoreFilabilite} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" size="icon" className="size-7" title={tCommon('edit')} onClick={() => openEdit(f)}>
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
          </TableBody>
        </Table>
      </div>

      <FournisseurModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fournisseur={editFournisseur}
        onSave={handleSave}
      />

      <CsvImportMapper
        open={mapperOpen}
        onClose={() => setMapperOpen(false)}
        fields={FOURNISSEUR_CSV_FIELDS}
        entityLabel="fournisseurs"
        onImport={importFournisseurRows}
      />
    </div>
  )
}
