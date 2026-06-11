'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, Minus,
  FlaskConical, Factory, Zap, Package,
  ChevronDown, ChevronRight, AlertTriangle,
  Layers, BarChart3, GitCompare, Loader2,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { getMarginAnalysis } from '@/lib/actions/marge'
import type { MarginLine } from '@/lib/actions/marge'

// Display constants — must match the values in lib/actions/marge.ts
const OH_RATE     = 0.08
const ENERGIE_UNIT = 50

interface OFReel {
  numero:       string
  sku:          string
  designation:  string
  dateDebut:    string
  dateFin:      string
  qte:          number
  coutMatReel:  number
  coutMODReel:  number
  rebutCout:    number
}

// ══════════════════════════════════════════════════════════════════════════════
// Analyse écarts OF (SAP CO-PC — Variance Analysis)
// ══════════════════════════════════════════════════════════════════════════════

interface AnalyseOF extends OFReel {
  coutTheo:       number
  coutMatStd:     number
  coutMODStd:     number
  coutReelTotal:  number
  ecartMatiere:   number
  ecartMOD:       number
  ecartRebut:     number
  ecartTotal:     number
  ecartPct:       number
  ecartTotalXOF:  number
  margeReelle:    number
  tauxReelle:     number
}

// ══════════════════════════════════════════════════════════════════════════════
// UI Components
// ══════════════════════════════════════════════════════════════════════════════

type Tab = 'benchmark' | 'ofs' | 'ecarts'

function KpiCard({
  label, value, sub, icon: Icon, iconBg, iconColor, valueBg, alert = false,
}: {
  label: string; value: string; sub: string
  icon: React.ElementType; iconBg: string; iconColor: string; valueBg: string
  alert?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 border transition-all hover:scale-[1.02] hover:shadow-md ${valueBg} ${alert ? 'ring-1 ring-red-400/40' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`size-4 ${iconColor}`} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${alert ? 'text-red-600' : ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

function MargeBar({ taux, max = 45 }: { taux: number; max?: number }) {
  const pct  = Math.min(100, Math.max(0, (taux / max) * 100))
  const color = taux >= 30 ? 'bg-emerald-500' : taux >= 20 ? 'bg-amber-400' : 'bg-red-500'
  const text  = taux >= 30 ? 'text-emerald-600' : taux >= 20 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${text}`}>{taux.toFixed(1)}%</span>
    </div>
  )
}

function EcartChip({ value, pct, showSign = true }: { value: number; pct?: number; showSign?: boolean }) {
  const favorable = value <= 0
  const zero = value === 0
  if (zero) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
      <Minus className="size-3" />= 0
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      favorable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    }`}>
      {favorable ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
      {showSign && value > 0 ? '+' : ''}{Math.round(value).toLocaleString('fr-FR')}
      {pct !== undefined && ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`}
    </span>
  )
}

function VarianceBar({ value, range }: { value: number; range: number }) {
  const pct = range > 0 ? Math.min(100, Math.abs(value) / range * 100) : 0
  const color = value > 0 ? 'bg-red-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-1 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════════════

export default function AnalyseMargesPage() {
  const locale = useLocale()
  const fmt = (n: number, opts?: Intl.NumberFormatOptions) => formatNumber(n, locale, opts)

  const [tab, setTab]           = useState<Tab>('benchmark')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [standards, setStandards] = useState<MarginLine[]>([])
  const [ofsReel] = useState<OFReel[]>([])

  useEffect(() => {
    getMarginAnalysis().then((data) => {
      setStandards(data)
      setLoading(false)
    })
  }, [])

  // ── Analyse OFs (comparaison avec les standards réels) ─────────────────────
  const analysesOF = useMemo((): AnalyseOF[] => {
    if (!standards.length || !ofsReel.length) return []
    return ofsReel
      .filter((of) => standards.some((s) => s.sku === of.sku))
      .map((of) => {
        const std = standards.find((s) => s.sku === of.sku)!
        const coutReelTotal = of.coutMatReel + of.coutMODReel + of.rebutCout + std.coutFG + std.coutEnergie
        const ecartMatiere  = of.coutMatReel - std.coutMatiere
        const ecartMOD      = of.coutMODReel - std.coutGamme
        const ecartRebut    = of.rebutCout
        const ecartTotal    = ecartMatiere + ecartMOD + ecartRebut
        const ecartPct      = std.coutTotal > 0 ? (ecartTotal / std.coutTotal) * 100 : 0
        const ecartTotalXOF = ecartTotal * of.qte
        const margeReelle   = std.prixVente - coutReelTotal
        const tauxReelle    = std.prixVente > 0 ? (margeReelle / std.prixVente) * 100 : 0
        return {
          ...of,
          coutTheo: std.coutTotal, coutMatStd: std.coutMatiere, coutMODStd: std.coutGamme,
          coutReelTotal, ecartMatiere, ecartMOD, ecartRebut,
          ecartTotal, ecartPct, ecartTotalXOF, margeReelle, tauxReelle,
        }
      })
  }, [standards])

  // ── KPIs pondérés par volume ────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalQteOF     = analysesOF.reduce((s, o) => s + o.qte, 0)
    const avgCoutStd     = standards.length > 0
      ? standards.reduce((s, c) => s + c.coutTotal, 0) / standards.length : 0
    const avgTauxTheo    = standards.length > 0
      ? standards.reduce((s, c) => s + c.taux, 0) / standards.length : 0
    const avgCoutReel    = totalQteOF > 0
      ? analysesOF.reduce((s, o) => s + o.coutReelTotal * o.qte, 0) / totalQteOF : 0
    const avgTauxReel    = totalQteOF > 0
      ? analysesOF.reduce((s, o) => s + o.tauxReelle * o.qte, 0) / totalQteOF : 0
    const totalEcartXOF  = analysesOF.reduce((s, o) => s + o.ecartTotalXOF, 0)
    const ecartMatTotal  = analysesOF.reduce((s, o) => s + o.ecartMatiere * o.qte, 0)
    const ecartMODTotal  = analysesOF.reduce((s, o) => s + o.ecartMOD * o.qte, 0)
    const ecartRebutTotal = analysesOF.reduce((s, o) => s + o.ecartRebut * o.qte, 0)
    return { avgCoutStd, avgTauxTheo, avgCoutReel, avgTauxReel, totalEcartXOF, ecartMatTotal, ecartMODTotal, ecartRebutTotal, totalQteOF }
  }, [standards, analysesOF])

  const maxEcartUnit = analysesOF.length
    ? Math.max(...analysesOF.map((o) => Math.abs(o.ecartTotal)))
    : 1

  const TABS = [
    { key: 'benchmark' as Tab, label: 'Coût standard', icon: Layers },
    { key: 'ofs'       as Tab, label: 'OFs — Réel vs Standard', icon: GitCompare },
    { key: 'ecarts'    as Tab, label: 'Analyse des écarts', icon: BarChart3 },
  ]

  // ── Loading / empty ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" />
        Calcul des coûts standards…
      </div>
    )
  }

  if (!loading && standards.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analyse de marge</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Coût standard : BOM × PMP · Gamme × Taux poste · FG {(OH_RATE * 100).toFixed(0)}% · Énergie
          </p>
        </div>
        <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-24 gap-3">
          <FlaskConical className="size-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Aucun article PF trouvé</p>
          <p className="text-xs text-muted-foreground max-w-xs text-center">
            Créez des articles de type <strong>Produit Fini</strong> avec un prix de vente, une BOM et une gamme pour voir l'analyse de marge.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analyse de marge</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Coût standard : BOM × PMP · Gamme × Taux poste · FG {(OH_RATE * 100).toFixed(0)}% · Énergie {ENERGIE_UNIT} XOF
          {' '}— Écarts ventilés par nature (matière · MOD · rebuts)
        </p>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Coût std moyen"
          value={`${fmt(Math.round(kpis.avgCoutStd))} XOF`}
          sub={`par unité — ${standards.length} PF`}
          icon={FlaskConical}
          iconBg="bg-blue-100" iconColor="text-blue-600" valueBg="bg-blue-50/50"
        />
        <KpiCard
          label="Marge théo. moy."
          value={`${kpis.avgTauxTheo.toFixed(1)} %`}
          sub="calculée sur coût standard"
          icon={TrendingUp}
          iconBg="bg-emerald-100" iconColor="text-emerald-600" valueBg="bg-emerald-50/50"
        />
        <KpiCard
          label="Marge réelle moy."
          value={`${kpis.avgTauxReel.toFixed(1)} %`}
          sub={kpis.totalQteOF > 0 ? `pondérée — ${fmt(kpis.totalQteOF)} unités` : 'aucun OF réel'}
          icon={Factory}
          iconBg="bg-violet-100" iconColor="text-violet-600" valueBg="bg-violet-50/50"
        />
        <KpiCard
          label="Surcoût total OFs"
          value={`${kpis.totalEcartXOF > 0 ? '+' : ''}${fmt(Math.round(kpis.totalEcartXOF))} XOF`}
          sub={kpis.totalEcartXOF > 0 ? 'impact financier période' : kpis.totalEcartXOF < 0 ? 'économie réalisée' : 'aucun OF comparé'}
          icon={kpis.totalEcartXOF > 0 ? TrendingUp : TrendingDown}
          iconBg={kpis.totalEcartXOF > 0 ? 'bg-red-100' : 'bg-emerald-100'}
          iconColor={kpis.totalEcartXOF > 0 ? 'text-red-600' : 'text-emerald-600'}
          valueBg={kpis.totalEcartXOF > 0 ? 'bg-red-50/50' : 'bg-emerald-50/50'}
          alert={kpis.totalEcartXOF > 10_000}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          Tab 1 — Coût standard (données réelles DB)
          ════════════════════════════════════════════════════════════════════════ */}

      {tab === 'benchmark' && (
        <div className="rounded-2xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold w-[30%]">Article PF</th>
                <th className="text-right px-4 py-3 font-semibold">
                  <span className="flex items-center justify-end gap-1"><Package className="size-3" />① Matières</span>
                </th>
                <th className="text-right px-4 py-3 font-semibold">
                  <span className="flex items-center justify-end gap-1"><Factory className="size-3" />② MOD/Machine</span>
                </th>
                <th className="text-right px-4 py-3 font-semibold">
                  <span className="flex items-center justify-end gap-1"><Layers className="size-3" />③ FG {(OH_RATE*100).toFixed(0)}%</span>
                </th>
                <th className="text-right px-4 py-3 font-semibold">
                  <span className="flex items-center justify-end gap-1"><Zap className="size-3" />④ Énergie</span>
                </th>
                <th className="text-right px-4 py-3 font-semibold">Coût std</th>
                <th className="text-right px-4 py-3 font-semibold">Prix vente</th>
                <th className="text-right px-4 py-3 font-semibold">Marge/u</th>
                <th className="px-4 py-3 font-semibold">Taux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {standards.map((c) => (
                <React.Fragment key={c.sku}>
                  <tr
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === c.sku ? null : c.sku)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {expanded === c.sku
                            ? <ChevronDown className="size-3.5" />
                            : <ChevronRight className="size-3.5" />}
                        </span>
                        <div>
                          <p className="font-medium">{c.label}</p>
                          <p className="text-xs text-muted-foreground font-mono">{c.sku} · lot {c.batchSize} u</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.coutMatiere > 0 ? (
                        <>
                          <p className="font-medium">{fmt(Math.round(c.coutMatiere))} XOF</p>
                          {c.coutTotal > 0 && <p className="text-xs text-muted-foreground">{((c.coutMatiere/c.coutTotal)*100).toFixed(0)}%</p>}
                        </>
                      ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.coutGamme > 0 ? (
                        <>
                          <p className="font-medium">{fmt(Math.round(c.coutGamme))} XOF</p>
                          {c.coutTotal > 0 && <p className="text-xs text-muted-foreground">{((c.coutGamme/c.coutTotal)*100).toFixed(0)}%</p>}
                        </>
                      ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {fmt(Math.round(c.coutFG))} XOF
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {fmt(c.coutEnergie)} XOF
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold">
                      {c.coutTotal > 0 ? `${fmt(Math.round(c.coutTotal))} XOF` : <span className="text-muted-foreground/50 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {c.prixVente > 0 ? `${fmt(c.prixVente)} XOF` : <span className="text-muted-foreground/50 text-xs">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${c.margeGross >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {c.margeGross >= 0 ? '+' : ''}{fmt(Math.round(c.margeGross))} XOF
                    </td>
                    <td className="px-4 py-3">
                      {c.prixVente > 0
                        ? <MargeBar taux={c.taux} />
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>

                  {expanded === c.sku && (
                    <tr key={`${c.sku}-drill`} className="bg-muted/20">
                      <td colSpan={9} className="px-8 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* BOM */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">① BOM × PMP</p>
                            {c.lignesBOM.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Aucune BOM définie pour cet article.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="text-left pb-1 font-medium">Composant</th>
                                    <th className="text-right pb-1 font-medium">Qté/u</th>
                                    <th className="text-right pb-1 font-medium">PMP</th>
                                    <th className="text-right pb-1 font-medium">Coût</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {c.lignesBOM.map((l) => (
                                    <tr key={l.code} className="hover:bg-muted/40">
                                      <td className="py-1 pr-2">
                                        <p>{l.designation}</p>
                                        <p className="text-muted-foreground font-mono text-[10px]">{l.code}</p>
                                      </td>
                                      <td className="py-1 text-right tabular-nums text-muted-foreground">
                                        {l.qte < 0.001 ? l.qte.toExponential(2) : l.qte.toFixed(4)} {l.unite}
                                      </td>
                                      <td className="py-1 text-right tabular-nums text-muted-foreground">
                                        {l.pmp > 0 ? `${fmt(l.pmp)} XOF` : <span className="italic">PMP = 0</span>}
                                      </td>
                                      <td className="py-1 text-right tabular-nums font-medium">
                                        {l.cout < 1 ? l.cout.toFixed(2) : fmt(Math.round(l.cout))} XOF
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="font-semibold border-t border-border/50">
                                    <td className="py-1" colSpan={3}>Total matière</td>
                                    <td className="py-1 text-right">{fmt(Math.round(c.coutMatiere))} XOF</td>
                                  </tr>
                                </tbody>
                              </table>
                            )}
                          </div>

                          {/* Gamme */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">② Gamme — taux par poste de charge</p>
                            {c.lignesGamme.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Aucune gamme définie pour cet article.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="text-left pb-1 font-medium">Opération</th>
                                    <th className="text-right pb-1 font-medium">Durée</th>
                                    <th className="text-right pb-1 font-medium">Taux (XOF/h)</th>
                                    <th className="text-right pb-1 font-medium">Coût/u</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {c.lignesGamme.map((l, i) => (
                                    <tr key={i} className="hover:bg-muted/40">
                                      <td className="py-1 pr-2">
                                        <p>{l.operation}</p>
                                        <p className="text-muted-foreground text-[10px]">
                                          {l.codePoste ? `[${l.codePoste}] ` : ''}{l.poste}
                                        </p>
                                      </td>
                                      <td className="py-1 text-right tabular-nums text-muted-foreground">{l.dureeMin.toFixed(0)} min</td>
                                      <td className="py-1 text-right tabular-nums text-muted-foreground">
                                        {l.tauxHoraire > 0 ? `${fmt(l.tauxHoraire)}` : '—'}
                                      </td>
                                      <td className="py-1 text-right tabular-nums font-medium">{l.cout.toFixed(1)} XOF</td>
                                    </tr>
                                  ))}
                                  <tr className="font-semibold border-t border-border/50">
                                    <td className="py-1">Total gamme</td>
                                    <td className="py-1 text-right text-muted-foreground">
                                      {c.lignesGamme.reduce((s, l) => s + l.dureeMin, 0).toFixed(0)} min
                                    </td>
                                    <td className="py-1" />
                                    <td className="py-1 text-right">{fmt(Math.round(c.coutGamme))} XOF</td>
                                  </tr>
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>

                        {/* Récapitulatif coût complet */}
                        <div className="mt-4 grid grid-cols-5 divide-x divide-border rounded-xl border bg-muted/40 overflow-hidden text-xs">
                          {[
                            { label: '① Matières',    val: Math.round(c.coutMatiere), pct: c.coutTotal > 0 ? (c.coutMatiere/c.coutTotal*100).toFixed(0) : null, color: 'text-blue-600' },
                            { label: '② MOD/Machine', val: Math.round(c.coutGamme),   pct: c.coutTotal > 0 ? (c.coutGamme/c.coutTotal*100).toFixed(0) : null,   color: 'text-violet-600' },
                            { label: `③ FG ${(OH_RATE*100).toFixed(0)}%`, val: Math.round(c.coutFG), pct: c.coutTotal > 0 ? (c.coutFG/c.coutTotal*100).toFixed(0) : null, color: 'text-slate-600' },
                            { label: '④ Énergie',     val: c.coutEnergie,             pct: c.coutTotal > 0 ? (c.coutEnergie/c.coutTotal*100).toFixed(0) : null, color: 'text-amber-600' },
                            { label: 'Coût std',       val: Math.round(c.coutTotal),  pct: null, color: 'text-foreground font-bold' },
                          ].map((item) => (
                            <div key={item.label} className="px-3 py-2 text-center">
                              <p className="text-muted-foreground">{item.label}</p>
                              <p className={`font-bold mt-0.5 ${item.color}`}>{fmt(item.val)} XOF</p>
                              {item.pct && <p className="text-[10px] text-muted-foreground">{item.pct}% du coût</p>}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          Tab 2 — OFs réel vs standard
          ════════════════════════════════════════════════════════════════════════ */}

      {tab === 'ofs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground p-3 rounded-xl bg-amber-50/60 border border-amber-200">
            <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
            <span>
              Les ordres de fabrication affichés sont des <strong>données de démonstration</strong>.
              Ils seront remplacés par de vrais OFs dès l'activation du module de production.
              Les coûts standards proviennent quant à eux de la base de données réelle.
            </span>
          </div>

          {analysesOF.length === 0 ? (
            <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-16 gap-2">
              <GitCompare className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Aucun OF de démonstration ne correspond aux articles PF de votre base de données.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 text-xs text-muted-foreground p-3 rounded-xl bg-muted/40 border">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  Coût réel &lt; Standard → favorable
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  Coût réel &gt; Standard → défavorable
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <AlertTriangle className="size-3 text-amber-500" />
                  Seuil alerte : écart &gt; 5%
                </span>
              </div>

              <div className="rounded-2xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-xs text-muted-foreground">
                      <th className="text-left px-4 py-3 font-semibold">N° OF · Dates</th>
                      <th className="text-left px-4 py-3 font-semibold">Article</th>
                      <th className="text-right px-4 py-3 font-semibold">Qté</th>
                      <th className="text-right px-4 py-3 font-semibold">Coût std/u</th>
                      <th className="text-right px-4 py-3 font-semibold">Coût réel/u</th>
                      <th className="px-4 py-3 font-semibold">Écart</th>
                      <th className="text-right px-4 py-3 font-semibold">Impact total</th>
                      <th className="px-4 py-3 font-semibold">Marge réelle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {analysesOF.map((of) => {
                      const fav   = of.ecartTotal <= 0
                      const alert = Math.abs(of.ecartPct) > 5
                      return (
                        <tr key={of.numero} className={`hover:bg-muted/30 transition-colors ${alert && !fav ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs text-muted-foreground">{of.numero}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(of.dateDebut).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
                              {' → '}
                              {new Date(of.dateFin).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{of.designation}</p>
                            <p className="text-xs font-mono text-muted-foreground">{of.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(of.qte)} u</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(Math.round(of.coutTheo))} XOF</td>
                          <td className={`px-4 py-3 text-right tabular-nums font-bold ${fav ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmt(Math.round(of.coutReelTotal))} XOF
                          </td>
                          <td className="px-4 py-3">
                            <EcartChip value={of.ecartTotal} pct={of.ecartPct} />
                            {alert && !fav && (
                              <p className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1">
                                <AlertTriangle className="size-2.5" /> Écart significatif
                              </p>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right tabular-nums font-semibold ${fav ? 'text-emerald-600' : 'text-red-600'}`}>
                            {of.ecartTotalXOF > 0 ? '+' : ''}{fmt(Math.round(of.ecartTotalXOF))} XOF
                          </td>
                          <td className="px-4 py-3"><MargeBar taux={of.tauxReelle} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 font-semibold text-sm border-t-2 border-border">
                      <td className="px-4 py-3" colSpan={2}>Total · {analysesOF.length} OFs</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(kpis.totalQteOF)} u</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(Math.round(kpis.avgCoutStd))} XOF moy.</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(Math.round(kpis.avgCoutReel))} XOF moy.</td>
                      <td className="px-4 py-3" />
                      <td className={`px-4 py-3 text-right tabular-nums ${kpis.totalEcartXOF > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {kpis.totalEcartXOF > 0 ? '+' : ''}{fmt(Math.round(kpis.totalEcartXOF))} XOF
                      </td>
                      <td className="px-4 py-3"><MargeBar taux={kpis.avgTauxReel} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          Tab 3 — Analyse des écarts
          ════════════════════════════════════════════════════════════════════════ */}

      {tab === 'ecarts' && (
        <div className="space-y-4">

          {/* Récapitulatif écarts par nature */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Écart matière',
                sub: 'Consommations réelles vs BOM',
                val: kpis.ecartMatTotal,
                color: 'border-l-4 border-l-blue-400',
                icon: Package,
                iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
              },
              {
                label: 'Écart MOD / Machine',
                sub: 'Temps réels vs Gamme',
                val: kpis.ecartMODTotal,
                color: 'border-l-4 border-l-violet-400',
                icon: Factory,
                iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
              },
              {
                label: 'Écart rebuts',
                sub: 'Unités détruites valorisées',
                val: kpis.ecartRebutTotal,
                color: 'border-l-4 border-l-red-400',
                icon: AlertTriangle,
                iconBg: 'bg-red-100', iconColor: 'text-red-600',
              },
            ].map((c) => (
              <div key={c.label} className={`rounded-2xl border bg-card p-4 ${c.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                    <c.icon className={`size-3.5 ${c.iconColor}`} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</span>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${c.val > 0 ? 'text-red-600' : c.val < 0 ? 'text-emerald-600' : ''}`}>
                  {c.val > 0 ? '+' : ''}{fmt(Math.round(c.val))} XOF
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {kpis.totalEcartXOF !== 0
                    ? `${((c.val / kpis.totalEcartXOF) * 100).toFixed(0)}% de l'écart total`
                    : '—'}
                </p>
              </div>
            ))}
          </div>

          {analysesOF.length === 0 ? (
            <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-16 gap-2">
              <BarChart3 className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun OF correspondant — l'analyse d'écarts sera disponible dès le premier OF réel.</p>
            </div>
          ) : (
            <div className="rounded-2xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-semibold">N° OF</th>
                    <th className="text-left px-4 py-3 font-semibold">Article</th>
                    <th className="text-right px-4 py-3 font-semibold">Qté</th>
                    <th className="px-4 py-3 font-semibold text-blue-600">
                      <span className="flex items-center gap-1"><Package className="size-3" />Écart matière/u</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-violet-600">
                      <span className="flex items-center gap-1"><Factory className="size-3" />Écart MOD/u</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-red-600">
                      <span className="flex items-center gap-1"><AlertTriangle className="size-3" />Écart rebut/u</span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold">Écart total/u</th>
                    <th className="text-right px-4 py-3 font-semibold">Impact XOF</th>
                    <th className="px-4 py-3 font-semibold">Cause principale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {analysesOF.map((of) => {
                    const causes = [
                      { label: 'Matière', val: Math.abs(of.ecartMatiere) },
                      { label: 'MOD',     val: Math.abs(of.ecartMOD) },
                      { label: 'Rebuts',  val: Math.abs(of.ecartRebut) },
                    ].sort((a, b) => b.val - a.val)
                    const causePrincipale = of.ecartTotal === 0 ? 'Conforme' : causes[0].label

                    return (
                      <tr key={of.numero} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs">{of.numero}</p>
                          <p className="text-xs text-muted-foreground">{fmt(of.qte)} u</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{of.designation}</p>
                          <p className="text-xs font-mono text-muted-foreground">{of.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(of.qte)}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EcartChip value={of.ecartMatiere} />
                            <VarianceBar value={of.ecartMatiere} range={maxEcartUnit} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Réel {fmt(Math.round(of.coutMatReel))} vs std {fmt(Math.round(of.coutMatStd))} XOF
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EcartChip value={of.ecartMOD} />
                            <VarianceBar value={of.ecartMOD} range={maxEcartUnit} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Réel {fmt(Math.round(of.coutMODReel))} vs std {fmt(Math.round(of.coutMODStd))} XOF
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {of.ecartRebut > 0 ? (
                            <>
                              <EcartChip value={of.ecartRebut} showSign={false} />
                              <VarianceBar value={of.ecartRebut} range={maxEcartUnit} />
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <EcartChip value={of.ecartTotal} pct={of.ecartPct} />
                        </td>

                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${
                          of.ecartTotalXOF > 0 ? 'text-red-600' : of.ecartTotalXOF < 0 ? 'text-emerald-600' : 'text-muted-foreground'
                        }`}>
                          {of.ecartTotalXOF > 0 ? '+' : ''}{fmt(Math.round(of.ecartTotalXOF))} XOF
                        </td>

                        <td className="px-4 py-3">
                          {of.ecartTotal === 0 ? (
                            <span className="text-xs text-emerald-600 font-medium">✓ Conforme</span>
                          ) : (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              causePrincipale === 'Matière' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              causePrincipale === 'MOD'     ? 'bg-violet-50 text-violet-700 border-violet-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {causePrincipale}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold text-sm border-t-2 border-border">
                    <td className="px-4 py-3" colSpan={3}>Total période</td>
                    <td className="px-4 py-3"><EcartChip value={kpis.ecartMatTotal} /></td>
                    <td className="px-4 py-3"><EcartChip value={kpis.ecartMODTotal} /></td>
                    <td className="px-4 py-3">
                      {kpis.ecartRebutTotal > 0
                        ? <EcartChip value={kpis.ecartRebutTotal} showSign={false} />
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {kpis.totalQteOF > 0
                        ? <EcartChip value={kpis.totalEcartXOF / kpis.totalQteOF} />
                        : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${kpis.totalEcartXOF > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {kpis.totalEcartXOF > 0 ? '+' : ''}{fmt(Math.round(kpis.totalEcartXOF))} XOF
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Note méthodologique */}
          <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-1">Méthodologie</p>
            <p><strong>Coût standard</strong> = ① BOM × PMP (articles.pmp) + ② Gamme × Taux poste (work_centers.rate_per_hour) + ③ FG {(OH_RATE*100).toFixed(0)}% × directs + ④ Forfait énergie {ENERGIE_UNIT} XOF</p>
            <p><strong>Écart matière</strong> = Matières réellement consommées − Quantité BOM × PMP. Origine : dérive prix fournisseur ou surconsommation atelier.</p>
            <p><strong>Écart MOD/Machine</strong> = Temps réels déclarés × Taux poste − Coût gamme standard. Origine : pannes, réglages, cadence insuffisante.</p>
            <p><strong>Écart rebuts</strong> = Unités détruites valorisées au coût standard. Origine : non-conformité matière ou défaut process.</p>
            <p><strong>FG et Énergie</strong> : absorbés au taux standard (Full Absorption Costing). L'écart d'imputation FG est calculé en fin de période (non affiché ici).</p>
          </div>
        </div>
      )}

    </div>
  )
}
