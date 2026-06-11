'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Download, Upload, Pencil, Loader2, RotateCcw } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import { ClientModal } from './_components/client-modal'
import {
  Client, ClientStatut, ClientType,
  CLIENT_TYPE_COLORS, STATUT_COLORS, SECTEURS,
} from './_components/types'
import { getClients, createClient, updateClient } from '@/lib/actions/clients'
import { downloadCsv } from '@/lib/csv-utils'
import { CsvImportMapper, type CsvField } from '@/components/ui/csv-import-mapper'

const CLIENT_CSV_FIELDS: CsvField[] = [
  { key: 'code',             label: 'Code client' },
  { key: 'raisonSociale',    label: 'Raison sociale', required: true },
  { key: 'type',             label: 'Type (Grossiste, Detaillant, ...)' },
  { key: 'statut',           label: 'Statut (Actif/Inactif)' },
  { key: 'secteur',          label: 'Secteur' },
  { key: 'langue',           label: 'Langue' },
  { key: 'contactPrincipal', label: 'Contact principal' },
  { key: 'telephone',        label: 'Téléphone' },
  { key: 'email',            label: 'Email' },
  { key: 'ville',            label: 'Ville' },
  { key: 'pays',             label: 'Pays' },
  { key: 'conditionPaiement', label: 'Condition de paiement' },
  { key: 'limiteCredit',     label: 'Limite de crédit' },
  { key: 'devise',           label: 'Devise' },
  { key: 'incoterm',         label: 'Incoterm' },
  { key: 'transport',        label: 'Transport' },
  { key: 'paiementMobile',   label: 'Paiement mobile (true/false)' },
]

const TYPES: Array<'Tous' | ClientType> = ['Tous', 'Grossiste', 'Detaillant', 'Institutionnel', 'ONG', 'Export', 'Autre']

// `name` flexes pour remplir l'espace ; les autres colonnes sont redimensionnables.
const CLIENT_COLUMNS: ResizableColumn[] = [
  { id: 'code', defaultWidth: 140, minWidth: 96 },
  { id: 'name', defaultWidth: null },
  { id: 'type', defaultWidth: 130, minWidth: 90 },
  { id: 'country', defaultWidth: 120, minWidth: 80 },
  { id: 'paymentTerm', defaultWidth: 160, minWidth: 100 },
  { id: 'creditLimit', defaultWidth: 150, minWidth: 110 },
  { id: 'status', defaultWidth: 96, minWidth: 70 },
  { id: 'actions', defaultWidth: 80 },
]
const NAME_MIN = 220

function generateCode(pays: string, seq: number): string {
  const paysCode = pays
    ? pays.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase()
    : 'XXX'
  return `CLT-${paysCode}-${String(seq).padStart(3, '0')}`
}

function fmt(n: number | null, locale: string, devise = 'XOF') {
  if (n === null) return <span className="text-muted-foreground">N/A</span>
  return `${formatNumber(n, locale)} ${devise}`
}

export default function ClientsPage() {
  const t = useTranslations('clients')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  const [clients,      setClients]      = useState<Client[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterType,   setFilterType]   = useState<'Tous' | ClientType>('Tous')
  const [filterStatut, setFilterStatut] = useState<'Tous' | ClientStatut>('Tous')
  const [filterSecteur,setFilterSecteur]= useState('Tous')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editClient,   setEditClient]   = useState<Client | null>(null)
  const [mapperOpen,   setMapperOpen]   = useState(false)

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:clients',
    CLIENT_COLUMNS,
  )
  const tableMinWidth = CLIENT_COLUMNS.reduce(
    (sum, c) => sum + (c.defaultWidth == null ? NAME_MIN : (widths[c.id] ?? c.defaultWidth)),
    0,
  )

  useEffect(() => {
    getClients().then((data) => { setClients(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (search) {
        const q = search.toLowerCase()
        if (!c.code.toLowerCase().includes(q) && !c.raisonSociale.toLowerCase().includes(q)) return false
      }
      if (filterType !== 'Tous' && c.type !== filterType) return false
      if (filterStatut !== 'Tous' && c.statut !== filterStatut) return false
      if (filterSecteur !== 'Tous' && c.secteur !== filterSecteur) return false
      return true
    })
  }, [clients, search, filterType, filterStatut, filterSecteur])

  async function handleSave(data: Partial<Client>): Promise<boolean> {
    if (editClient) {
      const updated = await updateClient(editClient.id, data)
      if (!updated) return false
      setClients((prev) => prev.map((c) => c.id === editClient.id ? updated : c))
      return true
    }
    const seq = clients.length + 1
    const code = generateCode(data.pays || '', seq)
    const created = await createClient({ ...data, code } as Client & { code: string })
    if (!created) return false
    setClients((prev) => [created, ...prev])
    return true
  }

  function openEdit(c: Client) {
    setEditClient(c)
    setModalOpen(true)
  }

  function handleExport() {
    downloadCsv('clients_bluwa.csv', clients.map((c) => ({
      code:              c.code,
      raisonSociale:     c.raisonSociale,
      type:              c.type,
      statut:            c.statut,
      secteur:           c.secteur,
      langue:            c.langue,
      ville:             c.ville,
      pays:              c.pays,
      incoterm:          c.incoterm,
      transport:         c.transport,
      conditionPaiement: c.conditionPaiement,
      limiteCredit:      c.limiteCredit ?? '',
      devise:            c.devise,
      contactPrincipal:  c.contactPrincipal,
      telephone:         c.telephone,
      email:             c.email,
      paiementMobile:    c.paiementMobile ? 'true' : 'false',
    })))
  }

  async function importClientRows(rows: Record<string, string>[]) {
    let created = 0; let errors = 0
    for (const row of rows) {
      if (!row.raisonSociale) { errors++; continue }
      const seq  = clients.length + created + 1
      const code = row.code || generateCode(row.pays || '', seq)
      const result = await createClient({
        code,
        raisonSociale:     row.raisonSociale,
        type:              (['Grossiste','Detaillant','Institutionnel','ONG','Export','Autre'].includes(row.type) ? row.type : 'Autre') as ClientType,
        statut:            row.statut === 'Inactif' ? 'Inactif' : 'Actif',
        secteur:           row.secteur           || '',
        langue:            row.langue            || 'Français',
        ville:             row.ville             || '',
        pays:              row.pays              || 'Sénégal',
        incoterm:          row.incoterm          || '',
        transport:         row.transport         || '',
        conditionPaiement: row.conditionPaiement || '',
        limiteCredit:      row.limiteCredit      ? parseFloat(row.limiteCredit) : null,
        devise:            row.devise            || 'XOF',
        contactPrincipal:  row.contactPrincipal  || '',
        telephone:         row.telephone         || '',
        email:             row.email             || '',
        paiementMobile:    row.paiementMobile === 'true' || row.paiementMobile?.toLowerCase() === 'oui',
        grilleTarifaire:   [],
      } as Partial<Client> & { code: string })
      if (result) created++; else errors++
    }

    if (created > 0) { const data = await getClients(); setClients(data) }
    return { created, errors }
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
            onClick={handleExport} disabled={clients.length === 0}>
            <Upload className="size-3.5" />
            {tCommon('export')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => setMapperOpen(true)}>
            <Download className="size-3.5" />
            {tCommon('import')}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditClient(null); setModalOpen(true) }}>
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
              {tp === 'Tous' ? tCommon('all') : t(`types.${tp}` as any)}
            </button>
          ))}
        </div>

        <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v as typeof filterStatut)}>
          <SelectTrigger className="w-36 h-9">
            <span className="text-sm">{filterStatut === 'Tous' ? 'Statut' : filterStatut}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous</SelectItem>
            <SelectItem value="Actif">{t('statuts.Actif')}</SelectItem>
            <SelectItem value="Inactif">{t('statuts.Inactif')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSecteur} onValueChange={(v) => setFilterSecteur(v ?? 'Tous')}>
          <SelectTrigger className="w-52 h-9">
            <span className="text-sm">{filterSecteur === 'Tous' ? 'Secteurs' : filterSecteur}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous</SelectItem>
            {SECTEURS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
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
            {CLIENT_COLUMNS.map((c) => (
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
                {t('columns.type')}
                <ColumnResizer columnId="type" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.country')}
                <ColumnResizer columnId="country" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide">
                {t('columns.paymentTerm')}
                <ColumnResizer columnId="paymentTerm" onStart={startResize} />
              </TableHead>
              <TableHead className="relative font-semibold text-xs tracking-wide text-right">
                {t('columns.creditLimit')}
                <ColumnResizer columnId="creditLimit" onStart={startResize} />
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
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {t('loading')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`clients/${c.id}`} className="font-mono text-sm font-medium hover:text-primary hover:underline underline-offset-4">
                        {c.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`clients/${c.id}`} className="text-sm hover:text-primary hover:underline underline-offset-4 truncate block" title={c.raisonSociale}>
                        {c.raisonSociale}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CLIENT_TYPE_COLORS[c.type]}`}>
                        {t(`types.${c.type}` as any)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{c.pays}</TableCell>
                    <TableCell className="text-sm">{c.conditionPaiement || <span className="text-muted-foreground">N/A</span>}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{fmt(c.limiteCredit, locale, c.devise)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[c.statut]}`}>
                        {t(`statuts.${c.statut}` as any)}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" size="icon" className="size-7" title={tCommon('edit')} onClick={() => openEdit(c)}>
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

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        client={editClient}
        onSave={handleSave}
      />

      <CsvImportMapper
        open={mapperOpen}
        onClose={() => setMapperOpen(false)}
        fields={CLIENT_CSV_FIELDS}
        entityLabel="clients"
        onImport={importClientRows}
      />
    </div>
  )
}
