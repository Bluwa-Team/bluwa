'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, Package, Search, SlidersHorizontal, Loader2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MouvementModal } from './_components/mouvement-modal'
import {
  StockLigne, Mouvement, Lot,
  STATUT_STOCK_COLORS, STATUT_STOCK_LABELS,
  MOUVEMENT_COLORS,
  STATUT_LOT_COLORS, STATUT_LOT_LABELS,
  ENTREPOTS, StatutStock, TypeMouvement, StatutLot,
} from './_components/types'
import { getStocks, getMouvements, getLots, createMouvement } from '@/lib/actions/stocks'

const TYPES_ARTICLE = ['Tous', 'MP', 'PSF', 'PF', 'AC', 'CS']

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function MouvIcon({ type }: { type: TypeMouvement }) {
  if (type === 'Entree') return <ArrowDownToLine className="size-3.5 text-emerald-600" />
  if (type === 'Sortie') return <ArrowUpFromLine className="size-3.5 text-red-600" />
  if (type === 'Transfert') return <ArrowLeftRight className="size-3.5 text-blue-600" />
  return <SlidersHorizontal className="size-3.5 text-purple-600" />
}

function fmt(n: number | null) {
  if (n === null) return <span className="text-muted-foreground">-</span>
  return n.toLocaleString('fr-FR')
}

function fmtVal(n: number | null) {
  if (n === null) return <span className="text-muted-foreground">-</span>
  return <span>{n.toLocaleString('fr-FR')} <span className="text-muted-foreground text-xs">F</span></span>
}

export default function StocksPage() {
  const t = useTranslations('stocks')
  const tCommon = useTranslations('common')

  const [stocks, setStocks] = useState<StockLigne[]>([])
  const [mouvements, setMouvements] = useState<Mouvement[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    Promise.all([getStocks(), getMouvements(), getLots()]).then(([s, m, l]) => {
      setStocks(s)
      setMouvements(m)
      setLots(l)
      setLoading(false)
    })
  }, [])

  const [searchStock, setSearchStock] = useState('')
  const [filterType, setFilterType] = useState('Tous')
  const [filterEntrepot, setFilterEntrepot] = useState('Tous')
  const [filterStatut, setFilterStatut] = useState<'Tous' | StatutStock>('Tous')

  const [searchMouv, setSearchMouv] = useState('')
  const [filterMouvType, setFilterMouvType] = useState<'Tous' | TypeMouvement>('Tous')

  const [filterLotStatut, setFilterLotStatut] = useState<'Tous' | StatutLot>('Tous')

  // KPIs
  const ruptures = stocks.filter((s) => s.statut === 'Rupture').length
  const alertes = stocks.filter((s) => s.statut === 'Alerte').length
  const valeurTotale = stocks.reduce((sum, s) => sum + (s.valeurStock ?? 0), 0)
  const lotsExpiration = lots.filter((l) => l.statut === 'ProcheExpiration' || l.statut === 'Expire').length

  const filteredStocks = useMemo(() => stocks.filter((s) => {
    if (searchStock) {
      const q = searchStock.toLowerCase()
      if (!s.articleCode.toLowerCase().includes(q) && !s.articleDesignation.toLowerCase().includes(q)) return false
    }
    if (filterType !== 'Tous' && s.articleType !== filterType) return false
    if (filterEntrepot !== 'Tous' && s.entrepot !== filterEntrepot) return false
    if (filterStatut !== 'Tous' && s.statut !== filterStatut) return false
    return true
  }), [stocks, searchStock, filterType, filterEntrepot, filterStatut])

  const filteredMouvements = useMemo(() => mouvements.filter((m) => {
    if (searchMouv) {
      const q = searchMouv.toLowerCase()
      if (!m.articleCode.toLowerCase().includes(q) && !m.articleDesignation.toLowerCase().includes(q) && !m.lot.toLowerCase().includes(q)) return false
    }
    if (filterMouvType !== 'Tous' && m.type !== filterMouvType) return false
    return true
  }), [mouvements, searchMouv, filterMouvType])

  const filteredLots = useMemo(() => lots.filter((l) => {
    if (filterLotStatut !== 'Tous' && l.statut !== filterLotStatut) return false
    return true
  }), [lots, filterLotStatut])

  const alertsAll = stocks.filter((s) => s.statut === 'Rupture' || s.statut === 'Alerte')

  const MOUVEMENT_TYPE_LABELS: Record<TypeMouvement, string> = {
    Entree: t('movements.types.Entree'),
    Sortie: t('movements.types.Sortie'),
    Transfert: t('movements.types.Transfert'),
    Ajustement: t('movements.types.Ajustement'),
  }

  async function handleMouvement(data: Partial<Mouvement>): Promise<boolean> {
    const created = await createMouvement(data)
    if (created) setMouvements((prev) => [created, ...prev])
    return !!created
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Package className="size-4" />
          {t('newMovement')}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Valeur totale du stock"
          value={`${valeurTotale.toLocaleString('fr-FR')} F`}
          sub="Valorisation au PMP"
        />
        <KpiCard
          label="Articles en rupture"
          value={ruptures}
          sub="Quantité = 0"
          color={ruptures > 0 ? 'text-red-600' : undefined}
        />
        <KpiCard
          label="Articles en alerte"
          value={alertes}
          sub="Sous le stock de sécurité"
          color={alertes > 0 ? 'text-amber-600' : undefined}
        />
        <KpiCard
          label="Lots à surveiller"
          value={lotsExpiration}
          sub="Expirés ou proche expiration"
          color={lotsExpiration > 0 ? 'text-orange-600' : undefined}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stocks">
        <TabsList className="w-full">
          <TabsTrigger value="stocks" className="flex-1">Stocks par article</TabsTrigger>
          <TabsTrigger value="mouvements" className="flex-1">{t('tabs.movements')}</TabsTrigger>
          <TabsTrigger value="lots" className="flex-1">Lots & péremptions</TabsTrigger>
          <TabsTrigger value="alertes" className="flex-1 relative">
            Alertes
            {(ruptures + alertes) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold w-4 h-4">
                {ruptures + alertes}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── STOCKS PAR ARTICLE ── */}
        <TabsContent value="stocks" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher un article…" value={searchStock} onChange={(e) => setSearchStock(e.target.value)} />
            </div>
            <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
              {TYPES_ARTICLE.map((tp) => (
                <button key={tp} onClick={() => setFilterType(tp)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${filterType === tp ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tp}
                </button>
              ))}
            </div>
            <Select value={filterEntrepot} onValueChange={(v) => setFilterEntrepot(v ?? 'Tous')}>
              <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous entrepôts</SelectItem>
                {Object.entries(ENTREPOTS).map(([code, e]) => (
                  <SelectItem key={code} value={code}>{e.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v as typeof filterStatut)}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">{tCommon('all')}</SelectItem>
                {(['OK', 'Alerte', 'Rupture', 'Exces'] as StatutStock[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUT_STOCK_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">{filteredStocks.length} ligne{filteredStocks.length > 1 ? 's' : ''}</span>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <div className="min-w-[1100px]">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[130px] font-semibold text-xs uppercase tracking-wide">Code</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">Désignation</TableHead>
                    <TableHead className="w-[60px] font-semibold text-xs uppercase tracking-wide">Type</TableHead>
                    <TableHead className="w-[160px] font-semibold text-xs uppercase tracking-wide">{t('stockColumns.warehouse')}</TableHead>
                    <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide">Lot</TableHead>
                    <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-right">{t('stockColumns.quantity')}</TableHead>
                    <TableHead className="w-[80px] font-semibold text-xs uppercase tracking-wide text-right">{t('stockColumns.pmp')}</TableHead>
                    <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wide text-right">{t('stockColumns.value')}</TableHead>
                    <TableHead className="w-[90px] font-semibold text-xs uppercase tracking-wide text-center">{t('stockColumns.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />{t('loading')}</div>
                    </TableCell></TableRow>
                  ) : filteredStocks.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Aucun résultat.</TableCell></TableRow>
                  ) : filteredStocks.map((s) => (
                    <TableRow key={s.id} className={s.statut === 'Rupture' ? 'bg-red-50/50' : s.statut === 'Alerte' ? 'bg-amber-50/50' : ''}>
                      <TableCell><span className="font-mono text-xs font-medium">{s.articleCode}</span></TableCell>
                      <TableCell><span className="text-sm truncate block" title={s.articleDesignation}>{s.articleDesignation}</span></TableCell>
                      <TableCell>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-bold bg-muted">{s.articleType}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ENTREPOTS[s.entrepot]?.nom ?? s.entrepot}</TableCell>
                      <TableCell><span className="font-mono text-xs">{s.lot}</span></TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {s.quantite.toLocaleString('fr-FR')} <span className="text-muted-foreground font-normal text-xs">{s.unite}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(s.pmp)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtVal(s.valeurStock)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_STOCK_COLORS[s.statut]}`}>
                          {STATUT_STOCK_LABELS[s.statut]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ── MOUVEMENTS ── */}
        <TabsContent value="mouvements" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Article, lot…" value={searchMouv} onChange={(e) => setSearchMouv(e.target.value)} />
            </div>
            <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
              {(['Tous', 'Entree', 'Sortie', 'Transfert', 'Ajustement'] as const).map((tp) => (
                <button key={tp} onClick={() => setFilterMouvType(tp as typeof filterMouvType)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${filterMouvType === tp ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tp === 'Tous' ? tCommon('all') : MOUVEMENT_TYPE_LABELS[tp as TypeMouvement]}
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-auto">{filteredMouvements.length} mouvement{filteredMouvements.length > 1 ? 's' : ''}</span>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide w-[110px]">{t('movements.columns.date')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide w-[120px]">{t('movements.columns.type')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('movements.columns.article')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide w-[130px]">{t('movements.columns.lot')}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-xs uppercase tracking-wide w-[100px]">{t('movements.columns.quantity')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide w-[130px]">{t('movements.columns.reference')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('movements.columns.reason')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide w-[110px]">{t('movements.columns.operator')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />{t('loading')}</div>
                  </td></tr>
                ) : filteredMouvements.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">{t('movements.empty')}</td></tr>
                ) : filteredMouvements.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{m.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MouvIcon type={m.type} />
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${MOUVEMENT_COLORS[m.type]}`}>
                          {MOUVEMENT_TYPE_LABELS[m.type]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground mr-1">{m.articleCode}</span>
                      <span className="text-sm">{m.articleDesignation}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{m.lot}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {m.type === 'Ajustement' && m.quantite > 0 ? '+' : ''}{m.quantite.toLocaleString('fr-FR')} <span className="text-muted-foreground font-normal text-xs">{m.unite}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{m.reference || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{m.motif || '-'}</td>
                    <td className="px-4 py-3 text-sm">{m.operateur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── LOTS & PÉREMPTIONS ── */}
        <TabsContent value="lots" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
              {(['Tous', 'OK', 'Quarantaine', 'ProcheExpiration', 'Expire'] as const).map((s) => (
                <button key={s} onClick={() => setFilterLotStatut(s as typeof filterLotStatut)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${filterLotStatut === s ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {s === 'Tous' ? tCommon('all') : STATUT_LOT_LABELS[s as StatutLot]}
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-auto">{filteredLots.length} lot{filteredLots.length > 1 ? 's' : ''}</span>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.lot')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.article')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.location')}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.quantity')}</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.reception')}</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.expiry')}</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.daysLeft')}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{tCommon('status')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />{t('loading')}</div>
                  </td></tr>
                ) : filteredLots.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Aucun lot.</td></tr>
                ) : filteredLots.map((l) => (
                  <tr key={l.id} className={`border-t ${l.statut === 'Expire' ? 'bg-red-50/50' : l.statut === 'ProcheExpiration' ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs font-medium">{l.lotCode}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">{l.articleCode}</span>
                        <p className="text-sm">{l.articleDesignation}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{ENTREPOTS[l.entrepot]?.nom ?? l.entrepot} - {l.emplacement}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {l.quantite.toLocaleString('fr-FR')} <span className="text-muted-foreground font-normal text-xs">{l.unite}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs">{l.dateReception}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium">{l.datePeremption ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {l.joursRestants === null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span className={`font-semibold ${l.joursRestants < 0 ? 'text-red-600' : l.joursRestants < 90 ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {l.joursRestants < 0 ? `${Math.abs(l.joursRestants)}j dépassé` : `${l.joursRestants}j`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_LOT_COLORS[l.statut]}`}>
                        {STATUT_LOT_LABELS[l.statut]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── ALERTES ── */}
        <TabsContent value="alertes" className="mt-4 space-y-4">
          {alertsAll.length === 0 && lotsExpiration === 0 ? (
            <div className="rounded-lg border p-12 text-center text-muted-foreground">
              Aucune alerte active.
            </div>
          ) : (
            <>
              {alertsAll.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <h3 className="font-semibold text-sm">Alertes de stock ({alertsAll.length})</h3>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('stockColumns.article')}</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('stockColumns.warehouse')}</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('stockColumns.quantity')}</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('stockColumns.safetyStock')}</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">Pt. commande</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{tCommon('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alertsAll.map((s) => (
                          <tr key={s.id} className={`border-t ${s.statut === 'Rupture' ? 'bg-red-50/60' : 'bg-amber-50/40'}`}>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-muted-foreground mr-1">{s.articleCode}</span>
                              <span>{s.articleDesignation}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{ENTREPOTS[s.entrepot]?.nom ?? s.entrepot}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                              {s.quantite.toLocaleString('fr-FR')} <span className="text-xs font-normal">{s.unite}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(s.stockSecurite)}</td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(s.pointCommande)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_STOCK_COLORS[s.statut]}`}>
                                {STATUT_STOCK_LABELS[s.statut]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {lotsExpiration > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="size-4 text-orange-500" />
                    <h3 className="font-semibold text-sm">Lots à surveiller ({lotsExpiration})</h3>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.lot')}</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.article')}</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.quantity')}</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.expiry')}</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{t('lotsColumns.daysLeft')}</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{tCommon('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lots.filter((l) => l.statut === 'ProcheExpiration' || l.statut === 'Expire').map((l) => (
                          <tr key={l.id} className={`border-t ${l.statut === 'Expire' ? 'bg-red-50/60' : 'bg-orange-50/40'}`}>
                            <td className="px-4 py-3 font-mono text-xs">{l.lotCode}</td>
                            <td className="px-4 py-3">{l.articleDesignation}</td>
                            <td className="px-4 py-3 text-right font-mono">{l.quantite.toLocaleString('fr-FR')} {l.unite}</td>
                            <td className="px-4 py-3 text-center text-xs font-medium">{l.datePeremption}</td>
                            <td className="px-4 py-3 text-center font-semibold text-red-600">
                              {l.joursRestants !== null && l.joursRestants < 0
                                ? `${Math.abs(l.joursRestants)}j dépassé`
                                : `${l.joursRestants}j`}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUT_LOT_COLORS[l.statut]}`}>
                                {STATUT_LOT_LABELS[l.statut]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <MouvementModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleMouvement} />
    </div>
  )
}
