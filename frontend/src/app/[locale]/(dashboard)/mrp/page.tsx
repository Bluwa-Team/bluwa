'use client'

import { useState, useMemo } from 'react'
import {
  MoreHorizontal, ArrowRight, Settings,
  Package, TrendingUp, AlertTriangle, Calculator,
  RotateCcw, CalendarDays, Check, ShoppingCart,
  FlaskConical, BadgeCheck, Clock,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  type ProduitMRP, calcMRP, MOCK_PRODUITS_MRP,
  calcBesoinNetBOM, MOCK_BOM,
  MOIS_LABELS, MOCK_PREVISIONS_6M, MOCK_PREVISIONS_ANNUELLES,
} from './_components/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'atp' | 'horizon' | 'pic'

const TABS: { key: Tab; label: string }[] = [
  { key: 'atp',     label: '① ATP · M+0 & BOM'    },
  { key: 'horizon', label: '② Horizon 6 mois'      },
  { key: 'pic',     label: '③ PIC · 12 mois'       },
]

// ── Colonnes résizables ───────────────────────────────────────────────────────

const ATP_COLS: ResizableColumn[] = [
  { id: 'produit',   defaultWidth: 220, minWidth: 160 },
  { id: 'atp',       defaultWidth: 110, minWidth: 85  },
  { id: 'controle',  defaultWidth: 140, minWidth: 110 },
  { id: 'cmdFerme',  defaultWidth: 130, minWidth: 100 },
  { id: 'prevision', defaultWidth: 130, minWidth: 100 },
  { id: 'source',    defaultWidth: 160, minWidth: 120 },
  { id: 'stockSec',  defaultWidth: 100, minWidth: 80  },
  { id: 'tailleLot', defaultWidth: 110, minWidth: 90  },
  { id: 'besoinNet', defaultWidth: 110, minWidth: 80  },
  { id: 'nbOP',      defaultWidth: 75,  minWidth: 60  },
  { id: 'action',    defaultWidth: 210, minWidth: 170 },
]

const BOM_COLS: ResizableColumn[] = [
  { id: 'composant',  defaultWidth: 220, minWidth: 160 },
  { id: 'besoinBrut', defaultWidth: 120, minWidth: 90  },
  { id: 'stock',      defaultWidth: 110, minWidth: 85  },
  { id: 'enCommande', defaultWidth: 130, minWidth: 100 },
  { id: 'stockSec',   defaultWidth: 110, minWidth: 85  },
  { id: 'besoinNet',  defaultWidth: 120, minWidth: 90  },
  { id: 'lead',       defaultWidth: 80,  minWidth: 60  },
  { id: 'suggestion', defaultWidth: 140, minWidth: 110 },
]

const HCOMP_COLS: ResizableColumn[] = [
  { id: 'composant', defaultWidth: 220, minWidth: 160 },
  { id: 'lead',      defaultWidth: 70,  minWidth: 60  },
  ...MOIS_LABELS.map((m) => ({ id: m, defaultWidth: 110, minWidth: 90 })),
  { id: 'total',     defaultWidth: 130, minWidth: 100 },
]

const HPF_COLS: ResizableColumn[] = [
  { id: 'produitFini', defaultWidth: 240, minWidth: 180 },
  ...MOIS_LABELS.map((m) => ({ id: m, defaultWidth: 115, minWidth: 90 })),
  { id: 'totalOP',     defaultWidth: 140, minWidth: 100 },
]

const PIC_COLS: ResizableColumn[] = [
  { id: 'composant',    defaultWidth: 220, minWidth: 160 },
  { id: 'besoinAnnuel', defaultWidth: 160, minWidth: 120 },
  { id: 'stockActuel',  defaultWidth: 140, minWidth: 110 },
  { id: 'enCommande',   defaultWidth: 140, minWidth: 110 },
  { id: 'campagne',     defaultWidth: 200, minWidth: 160 },
]

// ── Sous-composants ───────────────────────────────────────────────────────────

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

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number" min={0} value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      className="w-full h-7 px-2 text-sm rounded-md border bg-background font-mono text-right focus:outline-none focus:ring-1 focus:ring-ring"
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MrpPage() {
  const locale = useLocale()
  const [tab, setTab]           = useState<Tab>('atp')
  const [produits, setProduits] = useState<ProduitMRP[]>(MOCK_PRODUITS_MRP)

  function updateProduit(id: string, patch: Partial<ProduitMRP>) {
    setProduits((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  // ── Columns ────────────────────────────────────────────────────────────────
  const { widths: wATP, startResize: srATP, reset: rATP, isCustomized: icATP } = useResizableColumns('bluwa:cols:mrp-atp',  ATP_COLS)
  const { widths: wBOM, startResize: srBOM, reset: rBOM, isCustomized: icBOM } = useResizableColumns('bluwa:cols:mrp-bom',  BOM_COLS)
  const { widths: wHC,  startResize: srHC,  reset: rHC,  isCustomized: icHC  } = useResizableColumns('bluwa:cols:mrp-hc',   HCOMP_COLS)
  const { widths: wHP,  startResize: srHP,  reset: rHP,  isCustomized: icHP  } = useResizableColumns('bluwa:cols:mrp-hp',   HPF_COLS)
  const { widths: wPIC, startResize: srPIC, reset: rPIC, isCustomized: icPIC } = useResizableColumns('bluwa:cols:mrp-pic',  PIC_COLS)

  const minWATP = ATP_COLS.reduce((s, c)   => s + (wATP[c.id] ?? c.defaultWidth ?? 0), 0)
  const minWBOM = BOM_COLS.reduce((s, c)   => s + (wBOM[c.id] ?? c.defaultWidth ?? 0), 0)
  const minWHC  = HCOMP_COLS.reduce((s, c) => s + (wHC[c.id]  ?? c.defaultWidth ?? 0), 0)
  const minWHP  = HPF_COLS.reduce((s, c)   => s + (wHP[c.id]  ?? c.defaultWidth ?? 0), 0)
  const minWPIC = PIC_COLS.reduce((s, c)   => s + (wPIC[c.id] ?? c.defaultWidth ?? 0), 0)

  // ── Calculs ────────────────────────────────────────────────────────────────

  const computed = useMemo(
    () => produits.map((p) => ({ ...p, ...calcMRP(p) })),
    [produits],
  )

  const horizonPF = useMemo(
    () => MOCK_PRODUITS_MRP.map((p) => {
      const c    = computed.find((x) => x.sku === p.sku)
      const prev = MOCK_PREVISIONS_6M[p.sku] ?? [0, 0, 0, 0, 0]
      return {
        sku: p.sku, designation: p.designation, unite: p.unite,
        mois: [c?.ofPlanifQte ?? 0, ...prev] as [number, number, number, number, number, number],
      }
    }),
    [computed],
  )

  const horizonComp = useMemo(
    () => MOCK_BOM.map((comp) => ({
      ...comp,
      mois: [0, 1, 2, 3, 4, 5].map((mi) =>
        Math.round(
          horizonPF.reduce((s, pf) => s + pf.mois[mi] * (comp.qtyPerPF[pf.sku] ?? 0), 0) * 1000,
        ) / 1000,
      ) as [number, number, number, number, number, number],
    })),
    [horizonPF],
  )

  const bomComputed = useMemo(
    () => horizonComp.map((hc) => {
      const besoinBrut = Math.round(hc.mois.reduce((s, v) => s + v, 0) * 1000) / 1000
      return { ...hc, besoinBrut, besoinNet: calcBesoinNetBOM(besoinBrut, hc) }
    }),
    [horizonComp],
  )

  const picComputed = useMemo(
    () => MOCK_BOM.map((comp) => ({
      ...comp,
      besoinAnnuel: Math.round(
        MOCK_PREVISIONS_ANNUELLES.reduce(
          (s, pf) => s + pf.previsionAnnuelle * (comp.qtyPerPF[pf.sku] ?? 0), 0,
        ) * 1000,
      ) / 1000,
    })),
    [],
  )

  const stats = useMemo(() => {
    const avecOP   = computed.filter((p) => p.besoinNet > 0)
    const totalBtl = avecOP.reduce((s, p) => s + p.ofPlanifQte, 0)
    const composants = bomComputed.filter((c) => c.besoinNet > 0).length
    const totalAnnuel = MOCK_PREVISIONS_ANNUELLES.reduce((s, p) => s + p.previsionAnnuelle, 0)
    return { pfAnalyses: produits.length, opALancer: avecOP.length, totalBtl, composants, totalAnnuel }
  }, [computed, bomComputed, produits.length])

  const r2 = (n: number) => Math.round(n * 100) / 100

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MRP · Planification</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Stock + Commandes + Prévisions → Ordres Planifiés (OP) → Production &amp; Approvisionnement
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="PF analysés"
          value={String(stats.pfAnalyses)}
          sub="Saveurs Bissap Pourpre"
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900/50"
          iconColorClass="text-blue-600"
          icon={Package}
        />
        <StatCard
          label="OP à lancer (M+0)"
          value={String(stats.opALancer)}
          sub={`${formatNumber(stats.totalBtl, locale)} btl à planifier`}
          bgClass="bg-orange-50 dark:bg-orange-950/30"
          iconBgClass="bg-orange-100 dark:bg-orange-900/50"
          iconColorClass="text-orange-600"
          icon={ArrowRight}
        />
        <StatCard
          label="Composants à commander"
          value={String(stats.composants)}
          sub="Besoin net > 0 sur 6 mois"
          bgClass="bg-red-50 dark:bg-red-950/30"
          iconBgClass="bg-red-100 dark:bg-red-900/50"
          iconColorClass="text-red-600"
          icon={AlertTriangle}
        />
        <StatCard
          label="PIC · Prévision annuelle"
          value={formatNumber(stats.totalAnnuel, locale)}
          sub="btl · toutes saveurs · 12 mois"
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900/50"
          iconColorClass="text-violet-600"
          icon={TrendingUp}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ① ATP · M+0 — calcul + BOM agrégée
      ═════════════════════════════════════════════════════════════════════= */}
      {tab === 'atp' && (
        <div className="space-y-6">

          {/* ATP */}
          <div className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <span className="text-muted-foreground">①</span>
                  Demande PF → Ordres Planifiés · ATP
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ATP = Stock libéré + En contrôle éligible + OF en cours + Cmd fournisseur − Expéditions.
                  Les OP générés sont convertis en OF (Production) et en DA (Approvisionnement).
                </p>
              </div>
              <div className="flex items-center gap-2">
                {icATP && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={rATP}>
                    <RotateCcw className="size-3.5" />Réinitialiser colonnes
                  </Button>
                )}
                <Button size="sm" className="h-8 gap-1.5 text-xs">
                  <ArrowRight className="size-3.5" />Convertir en OF
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed" style={{ minWidth: minWATP }}>
                <colgroup>{ATP_COLS.map((c) => <col key={c.id} style={{ width: wATP[c.id] }} />)}</colgroup>
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Produit fini<ColumnResizer columnId="produit" onStart={srATP} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">ATP<ColumnResizer columnId="atp" onStart={srATP} /></th>
                    <th className="relative text-center px-4 py-3 font-semibold text-xs tracking-wide">En contrôle<ColumnResizer columnId="controle" onStart={srATP} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Cmd ferme<ColumnResizer columnId="cmdFerme" onStart={srATP} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Prévision<ColumnResizer columnId="prevision" onStart={srATP} /></th>
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Source<ColumnResizer columnId="source" onStart={srATP} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Stock séc.<ColumnResizer columnId="stockSec" onStart={srATP} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Taille lot<ColumnResizer columnId="tailleLot" onStart={srATP} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Besoin net<ColumnResizer columnId="besoinNet" onStart={srATP} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Nb OP<ColumnResizer columnId="nbOP" onStart={srATP} /></th>
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Action<ColumnResizer columnId="action" onStart={srATP} /></th>
                  </tr>
                </thead>
                <tbody>
                  {computed.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm truncate" title={p.designation}>{p.designation}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                        <span className={p.atp <= 0 ? 'text-red-600' : ''}>{formatNumber(p.atp, locale)}</span>
                        <span className="text-muted-foreground text-xs ml-1">{p.unite}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.stockEnControle > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            {p.enControleEligible ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                <BadgeCheck className="size-3 shrink-0" />Éligible
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                                <Clock className="size-3 shrink-0" />Non éligible
                              </span>
                            )}
                            <span className="font-mono text-xs text-muted-foreground">lib. {p.dateLiberation}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3"><NumberInput value={p.cmdFerme}  onChange={(v) => updateProduit(p.id, { cmdFerme: v })} /></td>
                      <td className="px-4 py-3"><NumberInput value={p.prevision} onChange={(v) => updateProduit(p.id, { prevision: v })} /></td>
                      <td className="px-4 py-3 overflow-hidden">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          p.source === 'Commandes fermes'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>{p.source}</span>
                      </td>
                      <td className="px-4 py-3"><NumberInput value={p.stockSec}  onChange={(v) => updateProduit(p.id, { stockSec: v })} /></td>
                      <td className="px-4 py-3"><NumberInput value={p.tailleLot} onChange={(v) => updateProduit(p.id, { tailleLot: Math.max(1, v) })} /></td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        <span className={p.besoinNet > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                          {formatNumber(p.besoinNet, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={p.nbOP > 0 ? 'text-blue-600' : 'text-muted-foreground font-normal'}>{p.nbOP}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {p.besoinNet > 0 ? (
                            <button className="flex-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1.5 rounded-full transition-colors whitespace-nowrap text-center">
                              {p.nbOP} OP → {formatNumber(p.ofPlanifQte, locale)} {p.unite}
                            </button>
                          ) : (
                            <span className="flex-1 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-full text-center whitespace-nowrap">
                              Pas de besoin
                            </span>
                          )}
                          <button title="Paramètres du lot" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
                            <Settings className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t bg-muted/10 flex items-center gap-2">
              <Calculator className="size-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                ATP = Stock libéré + Stock en contrôle éligible + OF en cours + Cmd fournisseur − Expéditions ·
                Besoin net = max(0, Demande − ATP + Stock séc.) · OP = ⌈Besoin net / Taille lot⌉ × Taille lot
              </p>
            </div>
          </div>

          {/* BOM agrégée */}
          <div className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <span className="text-muted-foreground">↳</span>
                  Explosion BOM → Composants à approvisionner · 6 mois agrégés
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Besoin brut = somme des besoins sur 6 mois. Les DA sont générées automatiquement pour chaque composant en déficit.
                </p>
              </div>
              {icBOM && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={rBOM}>
                  <RotateCcw className="size-3.5" />Colonnes
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed" style={{ minWidth: minWBOM }}>
                <colgroup>{BOM_COLS.map((c) => <col key={c.id} style={{ width: wBOM[c.id] }} />)}</colgroup>
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Composant<ColumnResizer columnId="composant" onStart={srBOM} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Besoin brut<ColumnResizer columnId="besoinBrut" onStart={srBOM} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Stock<ColumnResizer columnId="stock" onStart={srBOM} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">En commande<ColumnResizer columnId="enCommande" onStart={srBOM} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Stock séc.<ColumnResizer columnId="stockSec" onStart={srBOM} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Besoin net<ColumnResizer columnId="besoinNet" onStart={srBOM} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Lead<ColumnResizer columnId="lead" onStart={srBOM} /></th>
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Suggestion<ColumnResizer columnId="suggestion" onStart={srBOM} /></th>
                  </tr>
                </thead>
                <tbody>
                  {bomComputed.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm truncate" title={c.designation}>{c.designation}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm">{r2(c.besoinBrut)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.stock, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.enCommande, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.stockSec, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        <span className={c.besoinNet > 0 ? 'text-red-600' : 'text-emerald-600'}>
                          {r2(c.besoinNet)} <span className="text-xs">{c.unite}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">{c.leadTime}j</td>
                      <td className="px-4 py-3 overflow-hidden">
                        {c.besoinNet === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <Check className="size-3 shrink-0" />Couvert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-red-100 text-red-600 border border-red-200">
                            <ShoppingCart className="size-3 shrink-0" />À commander
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t bg-muted/10 flex items-center gap-2">
              <Calculator className="size-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Besoin brut = Σ (OP_mois × qty/btl) sur 6 mois · Besoin net = max(0, Besoin brut − Stock − En commande + Stock séc.)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ② HORIZON 6 MOIS — composants + OP PF
      ═════════════════════════════════════════════════════════════════════= */}
      {tab === 'horizon' && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                  Composants · Horizon 6 mois glissant
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projection mensuelle des besoins composants. Tient compte du lead time fournisseur.
                </p>
              </div>
              {icHC && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={rHC}>
                  <RotateCcw className="size-3.5" />Colonnes
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed" style={{ minWidth: minWHC }}>
                <colgroup>{HCOMP_COLS.map((c) => <col key={c.id} style={{ width: wHC[c.id] }} />)}</colgroup>
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Composant<ColumnResizer columnId="composant" onStart={srHC} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Lead<ColumnResizer columnId="lead" onStart={srHC} /></th>
                    {MOIS_LABELS.map((m) => (
                      <th key={m} className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                        {m}<ColumnResizer columnId={m} onStart={srHC} />
                      </th>
                    ))}
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Total 6 mois<ColumnResizer columnId="total" onStart={srHC} /></th>
                  </tr>
                </thead>
                <tbody>
                  {horizonComp.map((h) => {
                    const total = r2(h.mois.reduce((s, v) => s + v, 0))
                    return (
                      <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-sm truncate" title={h.designation}>{h.designation}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">{h.leadTime}j</td>
                        {h.mois.map((v, i) => {
                          const val = r2(v)
                          return (
                            <td key={i} className="px-4 py-3 text-right font-mono text-sm">
                              {val === 0
                                ? <span className="text-muted-foreground">0</span>
                                : <span className="text-red-600 font-medium">{formatNumber(val, locale)} <span className="text-xs">{h.unite}</span></span>
                              }
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {formatNumber(total, locale)} <span className="text-xs text-muted-foreground">{h.unite}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                  Ordres Planifiés PF · Horizon 6 mois
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  M+0 issu du calcul ATP. M+1 à M+5 issus des prévisions commerciales.
                </p>
              </div>
              {icHP && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={rHP}>
                  <RotateCcw className="size-3.5" />Colonnes
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed" style={{ minWidth: minWHP }}>
                <colgroup>{HPF_COLS.map((c) => <col key={c.id} style={{ width: wHP[c.id] }} />)}</colgroup>
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Produit fini<ColumnResizer columnId="produitFini" onStart={srHP} /></th>
                    {MOIS_LABELS.map((m, i) => (
                      <th key={m} className="relative text-center px-3 py-3 font-semibold text-xs tracking-wide">
                        {m}
                        {i === 0 && <span className="block font-normal text-[10px] text-blue-500">ATP</span>}
                        <ColumnResizer columnId={m} onStart={srHP} />
                      </th>
                    ))}
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Total OP<ColumnResizer columnId="totalOP" onStart={srHP} /></th>
                  </tr>
                </thead>
                <tbody>
                  {horizonPF.map((pf) => {
                    const total = pf.mois.reduce((s, v) => s + v, 0)
                    return (
                      <tr key={pf.sku} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-sm truncate" title={pf.designation}>{pf.designation}</td>
                        {pf.mois.map((vol, i) => (
                          <td key={i} className="px-3 py-3 text-center">
                            <p className={`font-bold text-sm ${i === 0 ? 'text-blue-600' : ''}`}>{formatNumber(vol, locale)}</p>
                            <p className="text-xs text-muted-foreground">{pf.unite}</p>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold text-sm">{formatNumber(total, locale)}</p>
                          <p className="text-xs text-muted-foreground">{pf.unite}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ③ PIC MACRO · 12 MOIS
      ═════════════════════════════════════════════════════════════════════= */}
      {tab === 'pic' && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="px-6 py-4 border-b">
              <p className="font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground shrink-0" />
                Plan Industriel et Commercial (PIC) · Prévisions annuelles
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agrégation macro sur 12 mois. Dimensionnement campagne agricole et capacités de production.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-6 py-3 font-semibold text-xs tracking-wide">Produit fini</th>
                    <th className="text-right px-6 py-3 font-semibold text-xs tracking-wide">Prévision annuelle</th>
                    <th className="text-right px-6 py-3 font-semibold text-xs tracking-wide">Moyenne / mois</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PREVISIONS_ANNUELLES.map((pf) => (
                    <tr key={pf.sku} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-3">
                        <p className="font-medium text-sm">{pf.designation}</p>
                        <p className="font-mono text-xs text-muted-foreground">{pf.sku}</p>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-semibold text-violet-600">
                        {formatNumber(pf.previsionAnnuelle, locale)} <span className="text-xs font-normal text-muted-foreground">{pf.unite}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-sm text-muted-foreground">
                        {formatNumber(Math.round(pf.previsionAnnuelle / 12), locale)} {pf.unite}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <FlaskConical className="size-4 text-muted-foreground shrink-0" />
                  Besoins MP · Campagne agricole 12 mois
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explosion BOM × prévisions annuelles. Sert à négocier les contrats fournisseurs.
                </p>
              </div>
              {icPIC && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={rPIC}>
                  <RotateCcw className="size-3.5" />Colonnes
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed" style={{ minWidth: minWPIC }}>
                <colgroup>{PIC_COLS.map((c) => <col key={c.id} style={{ width: wPIC[c.id] }} />)}</colgroup>
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Composant / MP<ColumnResizer columnId="composant" onStart={srPIC} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Besoin annuel<ColumnResizer columnId="besoinAnnuel" onStart={srPIC} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Stock actuel<ColumnResizer columnId="stockActuel" onStart={srPIC} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">En commande<ColumnResizer columnId="enCommande" onStart={srPIC} /></th>
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Statut campagne<ColumnResizer columnId="campagne" onStart={srPIC} /></th>
                  </tr>
                </thead>
                <tbody>
                  {picComputed.map((c) => {
                    const couv = c.stock + c.enCommande
                    const ok  = couv >= c.besoinAnnuel
                    const pct = c.besoinAnnuel > 0
                      ? Math.min(100, Math.round((couv / c.besoinAnnuel) * 100))
                      : 100
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-sm truncate" title={c.designation}>{c.designation}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-violet-600">
                          {formatNumber(r2(c.besoinAnnuel), locale)} <span className="text-xs font-normal text-muted-foreground">{c.unite}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatNumber(c.stock, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatNumber(c.enCommande, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {ok ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                <Check className="size-3 shrink-0" />Couvert · {pct}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200 whitespace-nowrap">
                                <AlertTriangle className="size-3 shrink-0" />Déficit · {pct}%
                              </span>
                            )}
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t bg-muted/10 flex items-center gap-2">
              <Calculator className="size-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Besoin annuel = Σ (Prévision annuelle PF × qty/btl composant) · Couverture = Stock actuel + En commande
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
