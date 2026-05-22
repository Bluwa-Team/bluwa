'use client'

import { useState, useMemo } from 'react'
import {
  Plus, FileDown, FileText, Leaf,
  Clock, CheckCheck, RotateCcw, Search, X,
  ShoppingBag, PackageCheck, MoreHorizontal, Info, ShoppingCart,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  CommandeFournisseur, STATUT_COMMANDE_COLORS, STATUT_COMMANDE_LABELS,
  StatutCommande, MOCK_COMMANDES,
  ArticleStrategie, NiveauService, Z_VALUES, calcSS, calcPointCmd, MOCK_STRATEGIE,
} from './_components/types'

type Tab = 'commandes' | 'strategie'


const STRATEGIE_COLUMNS: ResizableColumn[] = [
  { id: 'sku',          defaultWidth: 130, minWidth: 100 },
  { id: 'article',      defaultWidth: null               },
  { id: 'consoMoy',     defaultWidth: 150, minWidth: 120 },
  { id: 'sigma',        defaultWidth: 90,  minWidth: 70  },
  { id: 'delaiMoy',     defaultWidth: 140, minWidth: 110 },
  { id: 'delaiMax',     defaultWidth: 100, minWidth: 80  },
  { id: 'service',      defaultWidth: 100, minWidth: 80  },
  { id: 'stockActuel',  defaultWidth: 150, minWidth: 110 },
  { id: 'ssCalcule',    defaultWidth: 110, minWidth: 85  },
  { id: 'pointCmd',     defaultWidth: 110, minWidth: 85  },
  { id: 'statut',       defaultWidth: 160, minWidth: 130 },
]
const STRATEGIE_ARTICLE_MIN = 180

const COMMANDE_COLUMNS: ResizableColumn[] = [
  { id: 'numero',          defaultWidth: 130, minWidth: 100 },
  { id: 'type',            defaultWidth: 90,  minWidth: 70  },
  { id: 'date',            defaultWidth: 120, minWidth: 95  },
  { id: 'fournisseur',     defaultWidth: 170, minWidth: 120 },
  { id: 'article',         defaultWidth: null               },
  { id: 'quantite',        defaultWidth: 110, minWidth: 90  },
  { id: 'recue',           defaultWidth: 100, minWidth: 80  },
  { id: 'livraisonPrevue', defaultWidth: 160, minWidth: 120 },
  { id: 'contrat',         defaultWidth: 120, minWidth: 90  },
  { id: 'reception',       defaultWidth: 130, minWidth: 100 },
  { id: 'statut',          defaultWidth: 140, minWidth: 110 },
  { id: 'doc',             defaultWidth: 72,  minWidth: 60  },
]
const ARTICLE_MIN = 180

function StatCard({
  label, value, sub, trendVariant = 'neutral', bgClass, iconBgClass, iconColorClass, icon: Icon,
}: {
  label: string
  value: number
  sub: string
  trendVariant?: 'up' | 'down' | 'neutral'
  bgClass: string
  iconBgClass: string
  iconColorClass: string
  icon: React.ElementType
}) {
  return (
    <div className={`rounded-2xl p-4 transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-lg cursor-default ${bgClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBgClass}`}>
            <Icon className={`size-[18px] ${iconColorClass}`} />
          </div>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <button className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
      <div className="bg-white dark:bg-background rounded-xl px-4 py-3 shadow-sm">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-tight">{sub}</p>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: 'BC' | 'BA' }) {
  const isBC = type === 'BC'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      isBC ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
    }`}>
      {isBC
        ? <FileText className="size-3.5 shrink-0" />
        : <Leaf className="size-3.5 shrink-0" />}
      {type}
    </span>
  )
}

export default function ApprovisionnementPage() {
  const locale = useLocale()
  const [tab, setTab] = useState<Tab>('commandes')
  const [commandes] = useState<CommandeFournisseur[]>(MOCK_COMMANDES)
  const [strategie, setStrategie] = useState<ArticleStrategie[]>(MOCK_STRATEGIE)
  const [sSearch, setSSearch] = useState('')
  const [sStatutFilter, setSStatutFilter] = useState<'all' | 'aCommander' | 'ok'>('all')
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutCommande | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'BC' | 'BA'>('all')

  const { widths: sWidths, startResize: sSR, reset: sReset, isCustomized: sCust } = useResizableColumns(
    'bluwa:cols:approvisionnement:strategie',
    STRATEGIE_COLUMNS,
  )
  const strategieMinWidth = STRATEGIE_COLUMNS.reduce(
    (sum, c) => sum + (c.defaultWidth == null ? STRATEGIE_ARTICLE_MIN : (sWidths[c.id] ?? c.defaultWidth)),
    0,
  )

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:approvisionnement',
    COMMANDE_COLUMNS,
  )
  const tableMinWidth = COMMANDE_COLUMNS.reduce(
    (sum, c) => sum + (c.defaultWidth == null ? ARTICLE_MIN : (widths[c.id] ?? c.defaultWidth)),
    0,
  )

  const strategieFiltree = useMemo(() => {
    const q = sSearch.toLowerCase().trim()
    return strategie.filter((a) => {
      const ss = calcSS(a)
      const pointCmd = calcPointCmd(a, ss)
      const aCommander = a.stockActuel <= pointCmd
      if (sStatutFilter === 'aCommander' && !aCommander) return false
      if (sStatutFilter === 'ok' && aCommander) return false
      if (q) return a.sku.toLowerCase().includes(q) || a.article.toLowerCase().includes(q)
      return true
    })
  }, [strategie, sSearch, sStatutFilter])

  const stats = useMemo(() => ({
    enCours:   commandes.filter((c) => c.statut === 'EnCours').length,
    recues:    commandes.filter((c) => c.statut === 'Recue').length,
    partielles:commandes.filter((c) => c.statut === 'Partielle').length,
    total:     commandes.length,
  }), [commandes])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return commandes.filter((c) => {
      if (statutFilter !== 'all' && c.statut !== statutFilter) return false
      if (typeFilter !== 'all' && c.type !== typeFilter) return false
      if (q) {
        return (
          c.numero.toLowerCase().includes(q)
          || c.fournisseur.toLowerCase().includes(q)
          || c.article.toLowerCase().includes(q)
          || (c.contrat?.toLowerCase().includes(q) ?? false)
          || (c.reception?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [commandes, search, statutFilter, typeFilter])

  const hasActiveFilters = search !== '' || statutFilter !== 'all' || typeFilter !== 'all'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Approvisionnement</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stratégie de stock dynamique · Suivi des commandes fournisseurs
          </p>
        </div>
        {tab === 'commandes' && (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Nouvelle commande
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: 'commandes',  label: 'Commandes fournisseurs' },
          { key: 'strategie',  label: 'Stratégie de stock' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'strategie' && (
        <div className="space-y-4">

          {/* Méthode de calcul */}
          <div className="rounded-lg border bg-muted/30 px-5 py-4 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <span>📐</span> Méthode de calcul
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Conso moyenne</strong> = moyenne des sorties stock sur 30 j &nbsp;·&nbsp;
              <strong className="text-foreground">Délai moyen</strong> = moyenne des délais des dernières livraisons
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Stock de sécurité = Z × √délai_moy × σ(conso) + (délai_max – délai_moy) × conso
            </p>
            <p className="text-xs text-muted-foreground flex flex-wrap gap-4 pt-0.5">
              {Object.entries(Z_VALUES).map(([pct, z]) => (
                <span key={pct}>Niveau {pct}% → Z={z}</span>
              ))}
            </p>
          </div>

          {/* Filtres stratégie */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-64 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par SKU ou article…"
                value={sSearch}
                onChange={(e) => setSSearch(e.target.value)}
                className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
              />
            </div>
            <select
              value={sStatutFilter}
              onChange={(e) => setSStatutFilter(e.target.value as 'all' | 'aCommander' | 'ok')}
              className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
            >
              <option value="all">Tous statuts</option>
              <option value="aCommander">À commander</option>
              <option value="ok">OK</option>
            </select>
            <div className="flex items-center gap-2 ml-auto">
              {(sSearch !== '' || sStatutFilter !== 'all') && (
                <button
                  onClick={() => { setSSearch(''); setSStatutFilter('all') }}
                  className="h-7 px-2.5 text-xs rounded-md flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="size-3" />
                  Réinitialiser
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {strategieFiltree.length} résultat{strategieFiltree.length !== 1 ? 's' : ''}
              </span>
              {sCust && (
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={sReset}>
                  <RotateCcw className="size-3.5" />
                  Réinitialiser les colonnes
                </Button>
              )}
            </div>
          </div>

          {/* Table stratégie */}
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: strategieMinWidth }}>
              <colgroup>
                {STRATEGIE_COLUMNS.map((c) => (
                  <col key={c.id} style={c.defaultWidth == null ? undefined : { width: sWidths[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    SKU<ColumnResizer columnId="sku" onStart={sSR} />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Désignation</th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Conso moy. (30j)<ColumnResizer columnId="consoMoy" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    σ Conso<ColumnResizer columnId="sigma" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Délai moy.<ColumnResizer columnId="delaiMoy" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Délai max<ColumnResizer columnId="delaiMax" onStart={sSR} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Service<ColumnResizer columnId="service" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Stock actuel<ColumnResizer columnId="stockActuel" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    SS calculé<ColumnResizer columnId="ssCalcule" onStart={sSR} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Point cmd.<ColumnResizer columnId="pointCmd" onStart={sSR} />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {strategieFiltree.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucun article ne correspond aux filtres.
                    </td>
                  </tr>
                ) : strategieFiltree.map((a) => {
                  const ss = calcSS(a)
                  const pointCmd = calcPointCmd(a, ss)
                  const aCommander = a.stockActuel <= pointCmd
                  const joursRestants = a.consoMoy > 0 ? Math.round(a.stockActuel / a.consoMoy) : null

                  return (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-medium truncate">{a.sku}</td>
                      <td className="px-4 py-3 text-sm font-medium truncate" title={a.article}>{a.article}</td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.consoMoy}</td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.sigmaConso}</td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.delaiMoy}j</td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.delaiMax}j</td>
                      <td className="px-4 py-3 truncate">
                        <select
                          value={a.niveauService}
                          onChange={(e) => setStrategie((prev) =>
                            prev.map((item) => item.id === a.id
                              ? { ...item, niveauService: e.target.value as NiveauService }
                              : item
                            )
                          )}
                          className="h-7 px-2 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="90">90%</option>
                          <option value="95">95%</option>
                          <option value="99">99%</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{a.stockActuel}</td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-right truncate">
                        <span className={aCommander ? 'text-orange-500' : 'text-blue-600'}>{ss}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-right truncate">{pointCmd}</td>
                      <td className="px-4 py-3 overflow-hidden">
                        {aCommander ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200">
                            <ShoppingCart className="size-3 shrink-0" />
                            À commander
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCheck className="size-3 shrink-0" />
                            OK{joursRestants !== null ? ` · ${joursRestants}j` : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Source des données */}
          <div className="rounded-lg border bg-muted/30 px-5 py-4 space-y-1">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Info className="size-4 text-muted-foreground" /> Source des données
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La <strong className="text-foreground">consommation moyenne</strong> est recalculée à partir des sorties de stock (OF + ventes)
              sur les 30 derniers jours. Le <strong className="text-foreground">délai moyen fournisseur</strong> est recalculé à chaque réception
              en comparant la date de commande et la date de livraison effective. Aucune saisie manuelle requise.
            </p>
          </div>
        </div>
      )}

      {tab === 'commandes' && (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <StatCard
              label="En cours"
              value={stats.enCours}
              sub="Commandes non reçues"
              trendVariant="neutral"
              bgClass="bg-orange-50 dark:bg-orange-950/30"
              iconBgClass="bg-orange-100 dark:bg-orange-900/50"
              iconColorClass="text-orange-600 dark:text-orange-400"
              icon={Clock}
            />
            <StatCard
              label="Reçues"
              value={stats.recues}
              sub="Livraisons complètes"
              trendVariant="up"
              bgClass="bg-emerald-50 dark:bg-emerald-950/30"
              iconBgClass="bg-emerald-100 dark:bg-emerald-900/50"
              iconColorClass="text-emerald-600 dark:text-emerald-400"
              icon={PackageCheck}
            />
            <StatCard
              label="Total commandes"
              value={stats.total}
              sub={`dont ${stats.partielles} partielle(s)`}
              trendVariant="neutral"
              bgClass="bg-blue-50 dark:bg-blue-950/30"
              iconBgClass="bg-blue-100 dark:bg-blue-900/50"
              iconColorClass="text-blue-600 dark:text-blue-400"
              icon={ShoppingBag}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-64 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par N°, fournisseur, article, contrat…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
              />
            </div>

            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value as StatutCommande | 'all')}
              className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
            >
              <option value="all">Tous statuts</option>
              <option value="EnCours">En cours</option>
              <option value="Recue">Reçue</option>
              <option value="Partielle">Partielle</option>
              <option value="Annulee">Annulée</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'BC' | 'BA')}
              className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
            >
              <option value="all">Tous types</option>
              <option value="BC">BC · Bon de commande</option>
              <option value="BA">BA · Bon d'achat</option>
            </select>

            <div className="flex items-center gap-2 ml-auto">
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearch(''); setStatutFilter('all'); setTypeFilter('all') }}
                  className="h-7 px-2.5 text-xs rounded-md flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="size-3" />
                  Réinitialiser
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              </span>
              {isCustomized && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={reset}
                >
                  <RotateCcw className="size-3.5" />
                  Réinitialiser les colonnes
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
              <colgroup>
                {COMMANDE_COLUMNS.map((c) => (
                  <col key={c.id} style={c.defaultWidth == null ? undefined : { width: widths[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    N° Doc<ColumnResizer columnId="numero" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Type<ColumnResizer columnId="type" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Date<ColumnResizer columnId="date" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Fournisseur<ColumnResizer columnId="fournisseur" onStart={startResize} />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Article</th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Quantité<ColumnResizer columnId="quantite" onStart={startResize} />
                  </th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Reçue<ColumnResizer columnId="recue" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Livraison prévue<ColumnResizer columnId="livraisonPrevue" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Contrat<ColumnResizer columnId="contrat" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Réception<ColumnResizer columnId="reception" onStart={startResize} />
                  </th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                    Statut<ColumnResizer columnId="statut" onStart={startResize} />
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide uppercase">Doc</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucune commande ne correspond aux filtres.
                    </td>
                  </tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">

                    <td className="px-4 py-3 font-mono text-xs font-semibold truncate">{c.numero}</td>

                    <td className="px-4 py-3 truncate">
                      <TypeBadge type={c.type} />
                    </td>

                    <td className="px-4 py-3 font-mono text-xs truncate">{c.date}</td>

                    <td className="px-4 py-3 text-sm truncate" title={c.fournisseur}>{c.fournisseur}</td>

                    <td className="px-4 py-3 text-sm truncate" title={c.article}>{c.article}</td>

                    <td className="px-4 py-3 text-right font-mono text-sm truncate">
                      {formatNumber(c.quantite, locale)}{' '}
                      <span className="text-muted-foreground text-xs">{c.unite}</span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-sm truncate">
                      {formatNumber(c.quantiteRecue, locale)}{' '}
                      <span className="text-muted-foreground text-xs">{c.unite}</span>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs truncate">{c.livraisonPrevue}</td>

                    <td className="px-4 py-3 font-mono text-xs truncate">{c.contrat}</td>

                    <td className="px-4 py-3 font-mono text-xs truncate">{c.reception}</td>

                    <td className="px-4 py-3 overflow-hidden">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUT_COMMANDE_COLORS[c.statut]}`}>
                        {c.statut === 'Recue'
                          ? <CheckCheck className="size-3 shrink-0" />
                          : <Clock className="size-3 shrink-0" />}
                        {STATUT_COMMANDE_LABELS[c.statut]}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        title={c.type === 'BC' ? 'Télécharger le bon de commande' : "Télécharger le bon d'achat"}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                          c.type === 'BC'
                            ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                            : 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                        }`}
                      >
                        <FileDown className="size-3.5 shrink-0" />
                        {c.type}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
