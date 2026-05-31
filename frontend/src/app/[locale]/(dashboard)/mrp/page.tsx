'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  MoreHorizontal, ArrowRight, Settings,
  Package, TrendingUp, AlertTriangle, Calculator,
  RotateCcw, CalendarDays, Check, ShoppingCart,
  FlaskConical, BadgeCheck, Clock, Bell, Loader2,
  CheckCircle2, XCircle, RefreshCw, ShoppingBag, Factory,
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
import {
  getMrpRecommendations, getLatestMrpRun,
  convertRecommendation, ignoreRecommendation,
} from '@/lib/actions/mrp'
import type { MrpRecommendationRow, MrpRun, MrpRecommendationStatus } from '@/types/erp'
import { HelpPopover } from '@/components/ui/help-popover'
import {
  MRP_ACTION_LABELS, MRP_ACTION_COLORS,
  MRP_REC_STATUS_LABELS, MRP_REC_STATUS_COLORS,
} from '@/types/erp'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'atp' | 'horizon' | 'pic' | 'recommandations'

const TABS: { key: Tab; label: string }[] = [
  { key: 'atp',             label: '① ATP · M+0 & BOM'    },
  { key: 'horizon',         label: '② Horizon 6 mois'      },
  { key: 'pic',             label: "③ Campagne d'appro"      },
  { key: 'recommandations', label: '④ Recommandations'     },
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

  // ── Onglet ④ — Recommandations (données réelles DB) ──────────────────────────
  const [recFilter, setRecFilter] = useState<MrpRecommendationStatus | 'ALL'>('NEW')
  const [recs, setRecs]           = useState<MrpRecommendationRow[]>([])
  const [latestRun, setLatestRun] = useState<MrpRun | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [actingId, setActingId]   = useState<string | null>(null)

  const loadRecs = useCallback(async () => {
    setRecLoading(true)
    const [newRecs, run] = await Promise.all([
      getMrpRecommendations(recFilter),
      getLatestMrpRun(),
    ])
    setRecs(newRecs)
    setLatestRun(run)
    setRecLoading(false)
  }, [recFilter])

  useEffect(() => {
    if (tab === 'recommandations') loadRecs()
  }, [tab, loadRecs])

  async function handleConvert(rec: MrpRecommendationRow) {
    setActingId(rec.id)
    const updated = await convertRecommendation(rec.id)
    if (updated) setRecs((prev) => prev.map((r) => r.id === rec.id ? updated : r))
    setActingId(null)
  }

  async function handleIgnore(rec: MrpRecommendationRow) {
    setActingId(rec.id)
    const updated = await ignoreRecommendation(rec.id)
    if (updated) setRecs((prev) => prev.map((r) => r.id === rec.id ? updated : r))
    setActingId(null)
  }

  // Compteurs par statut (depuis tous les recs chargés)
  const recCounts = useMemo(() => {
    const all = recs
    return {
      NEW:       all.filter((r) => r.status === 'NEW').length,
      CONVERTED: all.filter((r) => r.status === 'CONVERTED').length,
      IGNORED:   all.filter((r) => r.status === 'IGNORED').length,
    }
  }, [recs])

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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">MRP · Planification</h1>
          <HelpPopover section="mrp" />
        </div>
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
          label="Campagne · Prévision annuelle"
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
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.key === 'recommandations' && recCounts.NEW > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                {recCounts.NEW}
              </span>
            )}
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
          ③ CAMPAGNE D'APPROVISIONNEMENT · 12 MOIS
      ═════════════════════════════════════════════════════════════════════= */}
      {tab === 'pic' && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="px-6 py-4 border-b">
              <p className="font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground shrink-0" />
                Campagne d'approvisionnement · Prévisions annuelles
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

      {/* ══════════════════════════════════════════════════════════════════════
          ④ RECOMMANDATIONS MRP — données réelles (migration 012)
      ═════════════════════════════════════════════════════════════════════= */}
      {tab === 'recommandations' && (
        <div className="space-y-4">

          {/* Barre info dernière passe + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Bell className="size-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Recommandations MRP</p>
                {latestRun ? (
                  <p className="text-xs text-muted-foreground">
                    Dernière passe :{' '}
                    <span className="font-mono">
                      {new Date(latestRun.executedAt).toLocaleString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {' · '}{latestRun.executedBySystem ? 'Planificateur auto' : 'Manuel'}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune passe MRP effectuée</p>
                )}
              </div>
            </div>
            <Button
              variant="outline" size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={loadRecs}
              disabled={recLoading}
            >
              {recLoading
                ? <Loader2 className="size-3.5 animate-spin" />
                : <RefreshCw className="size-3.5" />
              }
              Actualiser
            </Button>
          </div>

          {/* Stat cards NEW / CONVERTED / IGNORED */}
          <div className="grid gap-3 grid-cols-3">
            <div className="rounded-xl border bg-orange-50 dark:bg-orange-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Bell className="size-3.5 text-orange-600" />
                </div>
                <span className="text-xs font-semibold text-orange-700">Nouvelles</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{recCounts.NEW}</p>
              <p className="text-xs text-muted-foreground mt-0.5">En attente de traitement</p>
            </div>
            <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-emerald-700">Converties</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{recCounts.CONVERTED}</p>
              <p className="text-xs text-muted-foreground mt-0.5">DA ou OF créé</p>
            </div>
            <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <XCircle className="size-3.5 text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Ignorées</span>
              </div>
              <p className="text-2xl font-bold text-muted-foreground">{recCounts.IGNORED}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rejetées manuellement</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Filtre :</span>
            {(['NEW', 'CONVERTED', 'IGNORED', 'ALL'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setRecFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  recFilter === f
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {f === 'NEW' ? 'Nouvelles' : f === 'CONVERTED' ? 'Converties' : f === 'IGNORED' ? 'Ignorées' : 'Toutes'}
                {f === 'NEW' && recCounts.NEW > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-3.5 min-w-3.5 px-1 rounded-full text-[9px] font-bold bg-orange-500 text-white">
                    {recCounts.NEW}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table recommandations */}
          <div className="rounded-lg border bg-card">
            {recLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Chargement…</span>
              </div>
            ) : recs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Bell className="size-8 opacity-30" />
                <p className="text-sm font-medium">Aucune recommandation</p>
                <p className="text-xs">
                  {recFilter === 'NEW'
                    ? 'Toutes les recommandations ont été traitées.'
                    : 'Lancez une passe MRP pour générer des recommandations.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Article</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide">Action</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Qté suggérée</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide">Date commande</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide">Date besoin</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide">Statut</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recs.map((rec) => {
                      const isActing = actingId === rec.id
                      const reqDate  = new Date(rec.requiredDate)
                      const today    = new Date()
                      const daysLeft = Math.ceil((reqDate.getTime() - today.getTime()) / 86_400_000)
                      const urgent   = daysLeft <= 7 && rec.status === 'NEW'
                      return (
                        <tr key={rec.id} className={`border-b last:border-0 hover:bg-muted/20 ${urgent ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-sm truncate max-w-[200px]" title={rec.articleLabel}>
                              {rec.articleLabel}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">{rec.articleSku}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${MRP_ACTION_COLORS[rec.actionType]}`}>
                              {rec.actionType === 'BUY'
                                ? <ShoppingBag className="size-3 shrink-0" />
                                : rec.actionType === 'PRODUCE'
                                  ? <Factory className="size-3 shrink-0" />
                                  : <RefreshCw className="size-3 shrink-0" />
                              }
                              {MRP_ACTION_LABELS[rec.actionType]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            {formatNumber(rec.suggestedQuantity, locale)}
                            <span className="text-xs font-normal text-muted-foreground ml-1">{rec.articleUnit}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">
                            {new Date(rec.suggestedOrderDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="font-mono text-xs">
                              {new Date(rec.requiredDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            {rec.status === 'NEW' && (
                              <p className={`text-[10px] font-medium mt-0.5 ${urgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {daysLeft < 0 ? `Dépassé de ${-daysLeft}j` : daysLeft === 0 ? "Aujourd'hui" : `${daysLeft}j`}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${MRP_REC_STATUS_COLORS[rec.status]}`}>
                              {MRP_REC_STATUS_LABELS[rec.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {rec.status === 'NEW' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleConvert(rec)}
                                  disabled={isActing}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                  {isActing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3 shrink-0" />}
                                  Valider
                                </button>
                                <button
                                  onClick={() => handleIgnore(rec)}
                                  disabled={isActing}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 border transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                  {isActing ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3 shrink-0" />}
                                  Ignorer
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground text-right block">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 py-3 border-t bg-muted/10 flex items-start gap-2">
              <Calculator className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium">Valider</span> crée une DA (BUY) ou un OF (PRODUCE) et verrouille la recommandation ·{' '}
                <span className="font-medium">Ignorer</span> rejette sans créer de document · Les décisions sont immuables (audit trail).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
