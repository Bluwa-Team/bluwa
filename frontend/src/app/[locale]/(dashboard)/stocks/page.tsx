'use client'

import { useState, useMemo } from 'react'
import {
  Search, X, RotateCcw, MoreHorizontal,
  Check, Moon, AlertTriangle, Clock, Lock,
  FileText, Leaf, Wallet, TrendingUp,
  ShoppingBasket, ShieldAlert, Layers,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  LotStock, EtatLot, TypeArticle, StatutQC,
  ETAT_COLORS, ETAT_LABELS, TYPE_COLORS, TYPE_LABELS,
  STATUT_QC_COLORS, STATUT_QC_LABELS, MOCK_LOTS,
} from './_components/types'

type QuickFilter = 'all' | 'Dormant' | 'Obsolete'

const ETAT_ICONS: Record<EtatLot, React.ReactNode> = {
  Disponible: <Check className="size-3 shrink-0" />,
  Dormant:    <Moon className="size-3 shrink-0" />,
  Obsolete:   <AlertTriangle className="size-3 shrink-0" />,
}

const QC_ICONS: Record<StatutQC, React.ReactNode> = {
  EnControle: <Clock className="size-3 shrink-0" />,
  Libere:     <Check className="size-3 shrink-0" />,
  Bloque:     <Lock className="size-3 shrink-0" />,
}

const LOT_COLUMNS: ResizableColumn[] = [
  { id: 'numero',     defaultWidth: 130, minWidth: 100 },
  { id: 'sku',        defaultWidth: 130, minWidth: 100 },
  { id: 'designation',defaultWidth: null               },
  { id: 'type',       defaultWidth: 80,  minWidth: 64  },
  { id: 'quantite',   defaultWidth: 110, minWidth: 85  },
  { id: 'pmp',        defaultWidth: 90,  minWidth: 70  },
  { id: 'valeur',     defaultWidth: 130, minWidth: 100 },
  { id: 'bcBa',       defaultWidth: 130, minWidth: 100 },
  { id: 'reception',  defaultWidth: 130, minWidth: 100 },
  { id: 'dateEntree', defaultWidth: 110, minWidth: 90  },
  { id: 'dlc',        defaultWidth: 110, minWidth: 90  },
  { id: 'origine',    defaultWidth: 110, minWidth: 85  },
  { id: 'statutQC',   defaultWidth: 120, minWidth: 90  },
  { id: 'etat',       defaultWidth: 140, minWidth: 110 },
]
const DESIGNATION_MIN = 180

function StatCard({
  label, value, sub, bgClass, iconBgClass, iconColorClass, icon: Icon,
}: {
  label: string; value: string; sub: string
  bgClass: string; iconBgClass: string; iconColorClass: string; icon: React.ElementType
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

export default function StocksPage() {
  const locale = useLocale()
  const [lots] = useState<LotStock[]>(MOCK_LOTS)
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeArticle | 'all'>('all')
  const [qcFilter, setQcFilter] = useState<StatutQC | 'all'>('all')

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:stocks',
    LOT_COLUMNS,
  )
  const tableMinWidth = LOT_COLUMNS.reduce(
    (sum, c) => sum + (c.defaultWidth == null ? DESIGNATION_MIN : (widths[c.id] ?? c.defaultWidth)),
    0,
  )

  const stats = useMemo(() => {
    const valeurTotale = lots.reduce((s, l) => s + l.valeur, 0)
    const dormants = lots.filter((l) => l.etat === 'Dormant').reduce((s, l) => s + l.valeur, 0)
    const obsoletes = lots.filter((l) => l.etat === 'Obsolete').reduce((s, l) => s + l.valeur, 0)
    const actifs = lots.filter((l) => l.etat === 'Disponible').length
    const rotation = Math.round((actifs / lots.length) * 100)
    return { valeurTotale, dormants, obsoletes, rotation }
  }, [lots])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return lots.filter((l) => {
      if (quickFilter !== 'all' && l.etat !== quickFilter) return false
      if (typeFilter !== 'all' && l.type !== typeFilter) return false
      if (qcFilter !== 'all' && l.statutQC !== qcFilter) return false
      if (q) {
        return (
          l.numero.toLowerCase().includes(q)
          || l.sku.toLowerCase().includes(q)
          || l.designation.toLowerCase().includes(q)
          || l.bcBa.toLowerCase().includes(q)
          || l.reception.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [lots, search, quickFilter, typeFilter])

  const hasActiveFilters = search !== '' || quickFilter !== 'all' || typeFilter !== 'all' || qcFilter !== 'all'

  function fmtK(n: number) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${Math.round(n / 1000)}k`
    return String(n)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stocks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestion par Code/SKU ou Désignation · Liaison Commande → Réception → Lot · PMP · FIFO/FEFO
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Valeur totale"
          value={`${fmtK(stats.valeurTotale)} FCFA`}
          sub={`${lots.length} lot${lots.length > 1 ? 's' : ''} · Valorisation PMP`}
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900/50"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={Wallet}
        />
        <StatCard
          label="Stocks dormants"
          value={`${fmtK(stats.dormants)} FCFA`}
          sub="Sans sortie ≥ 60j"
          bgClass="bg-orange-50 dark:bg-orange-950/30"
          iconBgClass="bg-orange-100 dark:bg-orange-900/50"
          iconColorClass="text-orange-600 dark:text-orange-400"
          icon={Moon}
        />
        <StatCard
          label="Obsolètes"
          value={`${fmtK(stats.obsoletes)} FCFA`}
          sub="À détruire / destocker"
          bgClass="bg-red-50 dark:bg-red-950/30"
          iconBgClass="bg-red-100 dark:bg-red-900/50"
          iconColorClass="text-red-600 dark:text-red-400"
          icon={AlertTriangle}
        />
        <StatCard
          label="Taux de rotation"
          value={`${stats.rotation}%`}
          sub="Stocks actifs"
          bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/50"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          icon={TrendingUp}
        />
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { key: 'all',      label: 'Tous',      icon: Layers      },
          { key: 'Dormant',  label: 'Dormants',  icon: Moon        },
          { key: 'Obsolete', label: 'Obsolètes', icon: ShieldAlert },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setQuickFilter(key)}
            className={`h-8 px-3.5 text-sm rounded-full font-medium border transition-colors inline-flex items-center gap-1.5 ${
              quickFilter === key
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground shrink-0 flex items-center gap-1.5">
          <Search className="size-3.5" /> Filtrer par Code/SKU ou Désignation
        </span>
        <div className="flex-1 min-w-52">
          <input
            type="text"
            placeholder="ex : MP-FAR-001 ou Farine…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeArticle | 'all')}
          className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
        >
          <option value="all">Tous types</option>
          <option value="MP">MP · Matière première</option>
          <option value="AC">AC · Art. conditionnement</option>
          <option value="PF">PF · Produit fini</option>
          <option value="PE">PE · En-cours</option>
        </select>
        <select
          value={qcFilter}
          onChange={(e) => setQcFilter(e.target.value as StatutQC | 'all')}
          className="h-8 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
        >
          <option value="all">Tous statuts QC</option>
          <option value="Libere">Libéré</option>
          <option value="EnControle">En contrôle</option>
          <option value="Bloque">Bloqué</option>
        </select>
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setQuickFilter('all'); setTypeFilter('all'); setQcFilter('all') }}
              className="h-7 px-2.5 text-xs rounded-md flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="size-3" />
              Réinitialiser
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {filtered.length} lot{filtered.length !== 1 ? 's' : ''}
          </span>
          {isCustomized && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={reset}>
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
            {LOT_COLUMNS.map((c) => (
              <col key={c.id} style={c.defaultWidth == null ? undefined : { width: widths[c.id] }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                N° Lot<ColumnResizer columnId="numero" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                Code/SKU<ColumnResizer columnId="sku" onStart={startResize} />
              </th>
              <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Désignation</th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                Type<ColumnResizer columnId="type" onStart={startResize} />
              </th>
              <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                Qté<ColumnResizer columnId="quantite" onStart={startResize} />
              </th>
              <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                PMP<ColumnResizer columnId="pmp" onStart={startResize} />
              </th>
              <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                Valeur<ColumnResizer columnId="valeur" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                BC / BA<ColumnResizer columnId="bcBa" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                Réc.<ColumnResizer columnId="reception" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                Entrée<ColumnResizer columnId="dateEntree" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                DLC<ColumnResizer columnId="dlc" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                Origine<ColumnResizer columnId="origine" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">
                Statut QC<ColumnResizer columnId="statutQC" onStart={startResize} />
              </th>
              <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">État</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucun lot ne correspond aux filtres.
                </td>
              </tr>
            ) : filtered.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">

                <td className="px-4 py-3 font-mono text-xs font-semibold truncate">{l.numero}</td>

                <td className="px-4 py-3 truncate">
                  <span className="font-mono text-xs text-blue-600 hover:underline cursor-pointer">{l.sku}</span>
                </td>

                <td className="px-4 py-3 text-sm truncate" title={l.designation}>{l.designation}</td>

                <td className="px-4 py-3 truncate">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[l.type]}`}
                    title={TYPE_LABELS[l.type]}
                  >
                    {l.type}
                  </span>
                </td>

                <td className="px-4 py-3 text-right font-mono text-sm truncate">
                  {formatNumber(l.quantite, locale)}{' '}
                  <span className="text-muted-foreground text-xs">{l.unite}</span>
                </td>

                <td className="px-4 py-3 text-right font-mono text-sm truncate">
                  {formatNumber(l.pmp, locale)}
                </td>

                <td className="px-4 py-3 text-right font-mono text-sm truncate">
                  {formatNumber(l.valeur, locale)}
                </td>

                <td className="px-4 py-3 font-mono text-xs truncate">{l.bcBa}</td>

                <td className="px-4 py-3 font-mono text-xs truncate">{l.reception}</td>

                <td className="px-4 py-3 font-mono text-xs truncate">{l.dateEntree}</td>

                <td className="px-4 py-3 font-mono text-xs truncate">{l.dlc}</td>

                <td className="px-4 py-3 truncate">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    {l.origine === 'Formel'
                      ? <FileText className="size-3.5 shrink-0 text-slate-500" />
                      : <Leaf className="size-3.5 shrink-0 text-emerald-500" />}
                    {l.origine.toLowerCase()}
                  </span>
                </td>

                <td className="px-4 py-3 overflow-hidden">
                  {l.statutQC ? (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUT_QC_COLORS[l.statutQC]}`}>
                      {QC_ICONS[l.statutQC]}
                      {STATUT_QC_LABELS[l.statutQC]}
                    </span>
                  ) : null}
                </td>

                <td className="px-4 py-3 overflow-hidden">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${ETAT_COLORS[l.etat]}`}>
                    {ETAT_ICONS[l.etat]}
                    {ETAT_LABELS[l.etat]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
