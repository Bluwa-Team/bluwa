'use client'

import React, { useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, Minus,
  FlaskConical, Factory, Zap, Package,
  ChevronDown, ChevronRight, AlertTriangle,
  Layers, BarChart3, GitCompare,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { getBOMByArticleCode } from '../articles/_components/bom'
import { getGammeByArticleCode } from '../articles/_components/gamme'

// ══════════════════════════════════════════════════════════════════════════════
// Paramètres de coût — SAP CO Work Centers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Taux par équipement (XOF/minute).
 * Correspondance SAP : Work Center → Activity Type → Cost Rate.
 * Chaque poste a un taux propre basé sur sa consommation énergie + MOD.
 */
const TAUX_PAR_EQUIPEMENT: Record<string, number> = {
  'Balance industrielle':    80,   // 4 800 XOF/h  — pesée simple, peu d'énergie
  'Cuve inox 500L':         150,   // 9 000 XOF/h  — chauffage + agitation
  'Filtre presse 0.5µm':   120,   // 7 200 XOF/h  — filtre sous pression
  'Cuve de mélange':        100,   // 6 000 XOF/h  — mélange à froid
  'Échangeur thermique':    180,   // 10 800 XOF/h — fort consommateur énergie
  'Lab. qualité':           100,   // 6 000 XOF/h  — MOD qualifiée
  'Ligne embouteillage':    200,   // 12 000 XOF/h — ligne automatisée
  'Zone palettisation':      60,   // 3 600 XOF/h  — manutention simple
}
const TAUX_DEFAUT = 120 // fallback pour équipements non listés

/** Forfait énergie process (vapeur, froid, eau) — XOF/unité de PF */
const ENERGIE_UNIT = 50

/**
 * Taux de frais généraux de fabrication (% des coûts directs matière + MOD).
 * SAP CO : overhead rate absorbé au coût standard (Full Absorption Costing).
 * Les FG non absorbés constituent un écart séparé en fin de période.
 */
const OH_RATE = 0.08  // 8 % — amortissements + loyers + charges fixes

/** PMP des composants (XOF / unité BOM) */
const PMP: Record<string, number> = {
  'MP-0001': 2_500,   // Hibiscus séchées — XOF/kg
  'MP-0002': 800,     // Sucre cristallisé — XOF/kg
  'MP-0003': 50,      // Eau potable filtrée — XOF/L
  'MP-0010': 45_000,  // Gousses de vanille — XOF/kg
  'MP-0011': 1_200,   // Gingembre frais — XOF/kg
  'MP-0012': 800,     // Feuilles de menthe fraîche — XOF/kg
  'MP-0013': 1_500,   // Citronnelle séchée — XOF/kg
  'AC-0001': 250,     // Bouteille verre 1L — XOF/u
  'AC-0002': 25,      // Bouchon métal 1L — XOF/u
  'AC-0003': 15,      // Étiquette autocollante — XOF/u
}

/** Prix de vente HT par référence (XOF) */
const PRIX_VENTE_HT: Record<string, number> = {
  'PF-BIS-001': 1_200,
  'PF-BIS-002': 1_350,
  'PF-BIS-003': 1_300,
  'PF-BIS-004': 1_250,
  'PF-BIS-005': 1_250,
}

const PF_SKUS = [
  { sku: 'PF-BIS-001', label: 'Bissap Pourpre Original 1L'    },
  { sku: 'PF-BIS-002', label: 'Bissap Pourpre Vanille 1L'     },
  { sku: 'PF-BIS-003', label: 'Bissap Pourpre Gingembre 1L'   },
  { sku: 'PF-BIS-004', label: 'Bissap Pourpre Menthe 1L'      },
  { sku: 'PF-BIS-005', label: 'Bissap Pourpre Citronnelle 1L' },
]

// ══════════════════════════════════════════════════════════════════════════════
// Mock OFs — coûts réels décomposés par nature
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Coût réel d'un OF, décomposé en 3 postes (SAP CO-PC settlement).
 * coutMatReel  : matières réellement consommées (sorties de stock constatées)
 * coutMODReel  : temps réels × taux poste (confirmations d'opérations)
 * rebutCout    : rebuts valorisés au coût standard × quantité détruite
 * Les FG et l'énergie sont absorbés au taux standard (pas de variance sur FG).
 */
interface OFReel {
  numero:       string
  sku:          string
  designation:  string
  dateDebut:    string
  dateFin:      string
  qte:          number   // btl produites
  coutMatReel:  number   // XOF/btl — matières réelles
  coutMODReel:  number   // XOF/btl — MOD/machine réelles
  rebutCout:    number   // XOF/btl — rebuts (impact direct)
  // FG et énergie absorbés au standard → pas de variance sur ces postes
}

// Coûts réels décomposés (calculés de façon cohérente avec les nouveaux std)
const MOCK_OFS_REEL: OFReel[] = [
  // OF-041 BIS-001 std≈846 · reel=875 · écart total +29 XOF/btl
  { numero: 'OF-2026-041', sku: 'PF-BIS-001', designation: 'Bissap Pourpre Original 1L',    dateDebut: '2026-05-01', dateFin: '2026-05-02', qte: 200, coutMatReel: 455, coutMODReel: 310, rebutCout:  1 },
  // OF-042 BIS-002 std≈903 · reel=930 · écart total +27 XOF/btl
  { numero: 'OF-2026-042', sku: 'PF-BIS-002', designation: 'Bissap Pourpre Vanille 1L',     dateDebut: '2026-05-05', dateFin: '2026-05-06', qte: 150, coutMatReel: 460, coutMODReel: 357, rebutCout:  0 },
  // OF-043 BIS-003 std≈890 · reel=902 · écart total +12 XOF/btl
  { numero: 'OF-2026-043', sku: 'PF-BIS-003', designation: 'Bissap Pourpre Gingembre 1L',   dateDebut: '2026-05-10', dateFin: '2026-05-11', qte: 180, coutMatReel: 440, coutMODReel: 350, rebutCout:  0 },
  // OF-044 BIS-004 std≈879 · reel=950 · écart total +71 XOF/btl — OF problématique ⚠
  { numero: 'OF-2026-044', sku: 'PF-BIS-004', designation: 'Bissap Pourpre Menthe 1L',      dateDebut: '2026-05-15', dateFin: '2026-05-16', qte: 120, coutMatReel: 470, coutMODReel: 354, rebutCout: 15 },
  // OF-045 BIS-005 std≈887 · reel=880 · écart total -7 XOF/btl — favorable ✓
  { numero: 'OF-2026-045', sku: 'PF-BIS-005', designation: 'Bissap Pourpre Citronnelle 1L', dateDebut: '2026-05-20', dateFin: '2026-05-21', qte: 100, coutMatReel: 426, coutMODReel: 342, rebutCout:  0 },
]

// ══════════════════════════════════════════════════════════════════════════════
// Calcul coût standard — SAP CO Product Costing (CO-PC-PCP)
// ══════════════════════════════════════════════════════════════════════════════

interface LigneBOM {
  code: string; designation: string; unite: string
  qte: number; pmp: number; cout: number
}

interface LigneGamme {
  operation: string; equipement: string
  duree: number; taux: number; cout: number
}

interface CoutStandard {
  sku:         string
  label:       string
  batchSize:   number
  // Composantes coût standard (SAP CO cost components)
  coutMatiere: number  // ① Coût matière (BOM × PMP)
  coutGamme:   number  // ② Coût MOD/Machine (Gamme × Taux poste)
  coutFG:      number  // ③ Frais généraux (OH_RATE × directs)
  coutEnergie: number  // ④ Énergie (forfait)
  coutTotal:   number  // Coût de revient standard
  prixVente:   number
  margeGross:  number
  taux:        number
  // Détails pour drill-down
  lignesBOM:   LigneBOM[]
  lignesGamme: LigneGamme[]
}

function calcCoutStandard(sku: string, label: string): CoutStandard {
  const { bom, ingredients } = getBOMByArticleCode(sku)
  const { etapes } = getGammeByArticleCode(sku)
  const batchSize = bom?.batchSize ?? 100

  // ① Matières
  const lignesBOM: LigneBOM[] = ingredients.map((ing) => ({
    code:        ing.ingredientCode,
    designation: ing.designation,
    unite:       ing.unite,
    qte:         ing.qtyPerUnit,
    pmp:         PMP[ing.ingredientCode] ?? 0,
    cout:        ing.qtyPerUnit * (PMP[ing.ingredientCode] ?? 0),
  }))
  const coutMatiere = lignesBOM.reduce((s, l) => s + l.cout, 0)

  // ② MOD/Machine — taux différencié par poste de charge
  const lignesGamme: LigneGamme[] = etapes.map((e) => {
    const taux = TAUX_PAR_EQUIPEMENT[e.equipement] ?? TAUX_DEFAUT
    return {
      operation:  e.operation,
      equipement: e.equipement,
      duree:      e.duree,
      taux,
      cout:       (e.duree / batchSize) * taux,
    }
  })
  const coutGamme = lignesGamme.reduce((s, l) => s + l.cout, 0)

  // ③ Frais généraux — absorbés sur coûts directs
  const coutFG = (coutMatiere + coutGamme) * OH_RATE

  // ④ Énergie — forfait fixe
  const coutEnergie = ENERGIE_UNIT

  const coutTotal  = coutMatiere + coutGamme + coutFG + coutEnergie
  const prixVente  = PRIX_VENTE_HT[sku] ?? 0
  const margeGross = prixVente - coutTotal
  const taux       = prixVente > 0 ? (margeGross / prixVente) * 100 : 0

  return { sku, label, batchSize, coutMatiere, coutGamme, coutFG, coutEnergie, coutTotal, prixVente, margeGross, taux, lignesBOM, lignesGamme }
}

// ══════════════════════════════════════════════════════════════════════════════
// Analyse écarts OF (SAP CO-PC — Variance Analysis)
// ══════════════════════════════════════════════════════════════════════════════

interface AnalyseOF extends OFReel {
  coutTheo:       number
  coutMatStd:     number
  coutMODStd:     number
  // Coût réel total (FG et énergie absorbés au standard)
  coutReelTotal:  number
  // Écarts par nature (SAP CO Variance Categories)
  ecartMatiere:   number   // Écart matière = réel − standard
  ecartMOD:       number   // Écart MOD/Machine
  ecartRebut:     number   // Écart rebut (valorisé au std)
  ecartTotal:     number   // Somme des écarts
  ecartPct:       number   // Écart / Std en %
  ecartTotalXOF:  number   // Écart total × qte (impact financier)
  // Marge réelle
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

  const [tab, setTab]         = useState<Tab>('benchmark')
  const [expanded, setExpanded] = useState<string | null>(null)

  // ── Standards ──────────────────────────────────────────────────────────────
  const standards = useMemo(
    () => PF_SKUS.map((p) => calcCoutStandard(p.sku, p.label)),
    [],
  )

  // ── Analyse OFs ────────────────────────────────────────────────────────────
  const analysesOF = useMemo((): AnalyseOF[] => {
    return MOCK_OFS_REEL.map((of) => {
      const std = standards.find((s) => s.sku === of.sku)!
      // Coût réel total : direct réels + FG absorbé au standard + énergie std
      const coutReelTotal = of.coutMatReel + of.coutMODReel + of.rebutCout + std.coutFG + std.coutEnergie
      // Écarts par nature
      const ecartMatiere  = of.coutMatReel - std.coutMatiere
      const ecartMOD      = of.coutMODReel - std.coutGamme
      const ecartRebut    = of.rebutCout
      const ecartTotal    = ecartMatiere + ecartMOD + ecartRebut
      const ecartPct      = std.coutTotal > 0 ? (ecartTotal / std.coutTotal) * 100 : 0
      const ecartTotalXOF = ecartTotal * of.qte
      const pv            = PRIX_VENTE_HT[of.sku] ?? 0
      const margeReelle   = pv - coutReelTotal
      const tauxReelle    = pv > 0 ? (margeReelle / pv) * 100 : 0
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
    const totalQteOF = analysesOF.reduce((s, o) => s + o.qte, 0)
    const avgCoutStd = standards.reduce((s, c) => s + c.coutTotal, 0) / standards.length
    const avgTauxTheo = standards.reduce((s, c) => s + c.taux, 0) / standards.length
    // Pondéré par volume produit
    const avgCoutReel = totalQteOF > 0
      ? analysesOF.reduce((s, o) => s + o.coutReelTotal * o.qte, 0) / totalQteOF : 0
    const avgTauxReel = totalQteOF > 0
      ? analysesOF.reduce((s, o) => s + o.tauxReelle * o.qte, 0) / totalQteOF : 0
    const totalEcartXOF = analysesOF.reduce((s, o) => s + o.ecartTotalXOF, 0)
    const ecartMatTotal = analysesOF.reduce((s, o) => s + o.ecartMatiere * o.qte, 0)
    const ecartMODTotal = analysesOF.reduce((s, o) => s + o.ecartMOD * o.qte, 0)
    const ecartRebutTotal = analysesOF.reduce((s, o) => s + o.ecartRebut * o.qte, 0)
    return { avgCoutStd, avgTauxTheo, avgCoutReel, avgTauxReel, totalEcartXOF, ecartMatTotal, ecartMODTotal, ecartRebutTotal, totalQteOF }
  }, [standards, analysesOF])

  // Plage max pour les barres d'écart
  const maxEcartUnit = Math.max(...analysesOF.map((o) => Math.abs(o.ecartTotal)))

  const TABS = [
    { key: 'benchmark' as Tab, label: 'Coût standard', icon: Layers },
    { key: 'ofs'       as Tab, label: 'OFs — Réel vs Standard', icon: GitCompare },
    { key: 'ecarts'    as Tab, label: 'Analyse des écarts', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analyse de marge</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Coût standard : BOM × PMP · Gamme × Taux poste · FG {(OH_RATE * 100).toFixed(0)}% · Énergie{' '}
          — Écarts ventilés par nature (matière · MOD · rebuts)
        </p>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Coût std moyen"
          value={`${fmt(Math.round(kpis.avgCoutStd))} XOF`}
          sub="par bouteille — 5 PF"
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
          sub={`pondérée — ${fmt(kpis.totalQteOF)} btl produites`}
          icon={Factory}
          iconBg="bg-violet-100" iconColor="text-violet-600" valueBg="bg-violet-50/50"
        />
        <KpiCard
          label="Surcoût total OFs"
          value={`${kpis.totalEcartXOF > 0 ? '+' : ''}${fmt(Math.round(kpis.totalEcartXOF))} XOF`}
          sub={kpis.totalEcartXOF > 0 ? 'impact financier période' : 'économie réalisée'}
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
          Tab 1 — Coût standard (SAP CO-PC Product Cost Estimate)
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
                <th className="text-right px-4 py-3 font-semibold">Marge/btl</th>
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
                          <p className="text-xs text-muted-foreground font-mono">{c.sku} · lot {c.batchSize} btl</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <p className="font-medium">{fmt(Math.round(c.coutMatiere))} XOF</p>
                      <p className="text-xs text-muted-foreground">{((c.coutMatiere/c.coutTotal)*100).toFixed(0)}%</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <p className="font-medium">{fmt(Math.round(c.coutGamme))} XOF</p>
                      <p className="text-xs text-muted-foreground">{((c.coutGamme/c.coutTotal)*100).toFixed(0)}%</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {fmt(Math.round(c.coutFG))} XOF
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {fmt(c.coutEnergie)} XOF
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold">
                      {fmt(Math.round(c.coutTotal))} XOF
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {fmt(c.prixVente)} XOF
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600">
                      +{fmt(Math.round(c.margeGross))} XOF
                    </td>
                    <td className="px-4 py-3">
                      <MargeBar taux={c.taux} />
                    </td>
                  </tr>

                  {expanded === c.sku && (
                    <tr key={`${c.sku}-drill`} className="bg-muted/20">
                      <td colSpan={9} className="px-8 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* BOM */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">① BOM × PMP</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left pb-1 font-medium">Composant</th>
                                  <th className="text-right pb-1 font-medium">Qté/btl</th>
                                  <th className="text-right pb-1 font-medium">PMP</th>
                                  <th className="text-right pb-1 font-medium">Coût</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/30">
                                {c.lignesBOM.map((l) => (
                                  <tr key={l.code} className="hover:bg-muted/40">
                                    <td className="py-1 pr-2">{l.designation}</td>
                                    <td className="py-1 text-right tabular-nums text-muted-foreground">
                                      {l.qte < 0.001 ? l.qte.toExponential(2) : l.qte.toFixed(4)} {l.unite}
                                    </td>
                                    <td className="py-1 text-right tabular-nums text-muted-foreground">
                                      {fmt(l.pmp)} XOF
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
                          </div>

                          {/* Gamme — taux par poste */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">② Gamme — taux par poste de charge</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left pb-1 font-medium">Opération</th>
                                  <th className="text-right pb-1 font-medium">Durée</th>
                                  <th className="text-right pb-1 font-medium">Taux</th>
                                  <th className="text-right pb-1 font-medium">Coût/btl</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/30">
                                {c.lignesGamme.map((l, i) => (
                                  <tr key={i} className="hover:bg-muted/40">
                                    <td className="py-1 pr-2">
                                      <p>{l.operation}</p>
                                      <p className="text-muted-foreground text-[10px]">{l.equipement}</p>
                                    </td>
                                    <td className="py-1 text-right tabular-nums text-muted-foreground">{l.duree} min</td>
                                    <td className="py-1 text-right tabular-nums text-muted-foreground">{l.taux} XOF/min</td>
                                    <td className="py-1 text-right tabular-nums font-medium">{l.cout.toFixed(1)} XOF</td>
                                  </tr>
                                ))}
                                <tr className="font-semibold border-t border-border/50">
                                  <td className="py-1">Total gamme</td>
                                  <td className="py-1 text-right text-muted-foreground">
                                    {c.lignesGamme.reduce((s,l)=>s+l.duree,0)} min
                                  </td>
                                  <td className="py-1" />
                                  <td className="py-1 text-right">{fmt(Math.round(c.coutGamme))} XOF</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Récapitulatif coût complet */}
                        <div className="mt-4 grid grid-cols-5 divide-x divide-border rounded-xl border bg-muted/40 overflow-hidden text-xs">
                          {[
                            { label: '① Matières', val: Math.round(c.coutMatiere), pct: (c.coutMatiere/c.coutTotal*100).toFixed(0), color: 'text-blue-600' },
                            { label: '② MOD/Machine', val: Math.round(c.coutGamme), pct: (c.coutGamme/c.coutTotal*100).toFixed(0), color: 'text-violet-600' },
                            { label: `③ FG ${(OH_RATE*100).toFixed(0)}%`, val: Math.round(c.coutFG), pct: (c.coutFG/c.coutTotal*100).toFixed(0), color: 'text-slate-600' },
                            { label: '④ Énergie', val: c.coutEnergie, pct: (c.coutEnergie/c.coutTotal*100).toFixed(0), color: 'text-amber-600' },
                            { label: 'Coût std', val: Math.round(c.coutTotal), pct: null, color: 'text-foreground font-bold' },
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
                  <th className="text-right px-4 py-3 font-semibold">Coût std/btl</th>
                  <th className="text-right px-4 py-3 font-semibold">Coût réel/btl</th>
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
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(of.qte)} btl</td>
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
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(kpis.totalQteOF)} btl</td>
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
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          Tab 3 — Analyse des écarts (SAP CO Variance Analysis)
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

          {/* Tableau ventilation par OF */}
          <div className="rounded-2xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-semibold">N° OF</th>
                  <th className="text-left px-4 py-3 font-semibold">Article</th>
                  <th className="text-right px-4 py-3 font-semibold">Qté</th>
                  <th className="px-4 py-3 font-semibold text-blue-600">
                    <span className="flex items-center gap-1"><Package className="size-3" />Écart matière/btl</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-violet-600">
                    <span className="flex items-center gap-1"><Factory className="size-3" />Écart MOD/btl</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-red-600">
                    <span className="flex items-center gap-1"><AlertTriangle className="size-3" />Écart rebut/btl</span>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">Écart total/btl</th>
                  <th className="text-right px-4 py-3 font-semibold">Impact XOF</th>
                  <th className="px-4 py-3 font-semibold">Cause principale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {analysesOF.map((of) => {
                  // Cause principale = plus grand écart en valeur absolue
                  const causes = [
                    { label: 'Matière', val: Math.abs(of.ecartMatiere) },
                    { label: 'MOD', val: Math.abs(of.ecartMOD) },
                    { label: 'Rebuts', val: Math.abs(of.ecartRebut) },
                  ].sort((a, b) => b.val - a.val)
                  const causePrincipale = of.ecartTotal === 0 ? 'Conforme' : causes[0].label

                  return (
                    <tr key={of.numero} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs">{of.numero}</p>
                        <p className="text-xs text-muted-foreground">{fmt(of.qte)} btl</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{of.designation}</p>
                        <p className="text-xs font-mono text-muted-foreground">{of.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(of.qte)}</td>

                      {/* Écart matière */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <EcartChip value={of.ecartMatiere} />
                          <VarianceBar value={of.ecartMatiere} range={maxEcartUnit} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Réel {fmt(Math.round(of.coutMatReel))} vs std {fmt(Math.round(of.coutMatStd))} XOF
                        </p>
                      </td>

                      {/* Écart MOD */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <EcartChip value={of.ecartMOD} />
                          <VarianceBar value={of.ecartMOD} range={maxEcartUnit} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Réel {fmt(Math.round(of.coutMODReel))} vs std {fmt(Math.round(of.coutMODStd))} XOF
                        </p>
                      </td>

                      {/* Écart rebut */}
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

                      {/* Écart total */}
                      <td className="px-4 py-3 text-right">
                        <EcartChip value={of.ecartTotal} pct={of.ecartPct} />
                      </td>

                      {/* Impact financier */}
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${
                        of.ecartTotalXOF > 0 ? 'text-red-600' : of.ecartTotalXOF < 0 ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}>
                        {of.ecartTotalXOF > 0 ? '+' : ''}{fmt(Math.round(of.ecartTotalXOF))} XOF
                      </td>

                      {/* Cause principale */}
                      <td className="px-4 py-3">
                        {of.ecartTotal === 0 ? (
                          <span className="text-xs text-emerald-600 font-medium">✓ Conforme</span>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            causePrincipale === 'Matière' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            causePrincipale === 'MOD'     ? 'bg-violet-50 text-violet-700 border-violet-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {causePrincipale === 'Matière' && '⬤ '}
                            {causePrincipale === 'MOD'     && '⬤ '}
                            {causePrincipale === 'Rebuts'  && '⬤ '}
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
                  <td className="px-4 py-3">
                    <EcartChip value={kpis.ecartMatTotal} />
                  </td>
                  <td className="px-4 py-3">
                    <EcartChip value={kpis.ecartMODTotal} />
                  </td>
                  <td className="px-4 py-3">
                    {kpis.ecartRebutTotal > 0
                      ? <EcartChip value={kpis.ecartRebutTotal} showSign={false} />
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EcartChip value={kpis.totalEcartXOF / kpis.totalQteOF} />
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${kpis.totalEcartXOF > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {kpis.totalEcartXOF > 0 ? '+' : ''}{fmt(Math.round(kpis.totalEcartXOF))} XOF
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Note méthodologique */}
          <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-1">Méthodologie</p>
            <p><strong>Coût standard</strong> = ① BOM × PMP + ② Gamme × Taux poste (par équipement) + ③ FG {(OH_RATE*100).toFixed(0)}% × directs + ④ Forfait énergie {ENERGIE_UNIT} XOF</p>
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
