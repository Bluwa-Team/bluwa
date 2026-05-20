'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Download, Upload, Pencil, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClientModal } from './_components/client-modal'
import {
  Client, ClientStatut, ClientType,
  CLIENT_TYPE_COLORS, STATUT_COLORS, SECTEURS,
} from './_components/types'
import { getClients, createClient, updateClient } from '@/lib/actions/clients'

const TYPES: Array<'Tous' | ClientType> = ['Tous', 'Grossiste', 'Detaillant', 'Institutionnel', 'ONG', 'Export', 'Autre']

function generateCode(pays: string, seq: number): string {
  const paysCode = pays
    ? pays.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase()
    : 'XXX'
  return `CLT-${paysCode}-${String(seq).padStart(3, '0')}`
}

function fmt(n: number | null) {
  if (n === null) return <span className="text-muted-foreground">N/A</span>
  return `${n.toLocaleString('fr-FR')} XOF`
}

export default function ClientsPage() {
  const t = useTranslations('clients')
  const tCommon = useTranslations('common')

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'Tous' | ClientType>('Tous')
  const [filterStatut, setFilterStatut] = useState<'Tous' | ClientStatut>('Tous')
  const [filterSecteur, setFilterSecteur] = useState('Tous')
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)

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
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="size-3.5" />
            {tCommon('import')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-3.5" />
            {tCommon('export')}
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
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">{t('allStatuses')}</SelectItem>
            <SelectItem value="Actif">{t('statuts.Actif')}</SelectItem>
            <SelectItem value="Inactif">{t('statuts.Inactif')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSecteur} onValueChange={(v) => setFilterSecteur(v ?? 'Tous')}>
          <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">{t('allSectors')}</SelectItem>
            {SECTEURS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">{countLabel}</span>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border overflow-x-auto">
        <div className="min-w-[1050px]">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[140px] font-semibold text-xs tracking-wide">{t('columns.code')}</TableHead>
                <TableHead className="font-semibold text-xs tracking-wide">{t('columns.name')}</TableHead>
                <TableHead className="w-[130px] font-semibold text-xs tracking-wide">{t('columns.type')}</TableHead>
                <TableHead className="w-[120px] font-semibold text-xs tracking-wide">{t('columns.country')}</TableHead>
                <TableHead className="w-[160px] font-semibold text-xs tracking-wide">{t('columns.paymentTerm')}</TableHead>
                <TableHead className="w-[150px] font-semibold text-xs tracking-wide text-right">{t('columns.creditLimit')}</TableHead>
                <TableHead className="w-[90px] font-semibold text-xs tracking-wide">{t('columns.status')}</TableHead>
                <TableHead className="w-[80px] font-semibold text-xs tracking-wide text-right pr-4">{t('columns.actions')}</TableHead>
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
                    <TableCell className="text-right text-sm font-mono">{fmt(c.limiteCredit)}</TableCell>
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
      </div>

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        client={editClient}
        onSave={handleSave}
      />
    </div>
  )
}
