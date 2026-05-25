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
  type ComposantBOM, calcBesoinNetBOM, MOCK_BOM,
  MOIS_LABELS, MOCK_PREVISIONS_6M,
  MOCK_PREVISIONS_ANNUELLES,
} from './_components/types'

type Tab = 'm0' | 'bom' | 'composants6m' | 'op6m' | 'pic'

const TABS: { key: Tab; label: string }[] = [
  { key: 'm0',           label: '① Ordres M+0'       },
  { key: 'bom',          label: '② Explosion BOM'     },
  { key: 'composants6m', label: '③ Composants 6 mois' },
  { key: 'op6m',         label: '④ OP 6 mois'         },
  { key: 'pic',          label: '⑤ PIC Macro · 12 mois' },
]

// ── Colonnes ─────────────────────────────────────────────────────────────────

const MRP_COLUMNS: ResizableColumn[] = [
  { id: 'produit',    defaultWidth: 220, minWidth: 160 },
  { id: 'atp',        defaultWidth: 110, minWidth: 85  },
  { id: 'controle',   defaultWidth: 140, minWidth: 110 },
  { id: 'cmdFerme',   defaultWidth: 130, minWidth: 100 },
  { id: 'prevision',  defaultWidth: 130, minWidth: 100 },
  { id: 'source',     defaultWidth: 160, minWidth: 120 },
  { id: 'stockSec',   defaultWidth: 100, minWidth: 80  },
  { id: 'tailleLot',  defaultWidth: 110, minWidth: 90  },
  { id: 'besoinNet',  defaultWidth: 110, minWidth: 80  },
  { id: 'nbOP',       defaultWidth: 75,  minWidth: 60  },
  { id: 'action',     defaultWidth: 210, minWidth: 170 },
]

const BOM_COLUMNS: ResizableColumn[] = [
  { id: 'composant',  defaultWidth: 220, minWidth: 160 },
  { id: 'besoinBrut', defaultWidth: 120, minWidth: 90  },
  { id: 'stock',      defaultWidth: 110, minWidth: 85  },
  { id: 'enCommande', defaultWidth: 130, minWidth: 100 },
  { id: 'stockSec',   defaultWidth: 110, minWidth: 85  },
  { id: 'besoinNet',  defaultWidth: 120, minWidth: 90  },
  { id: 'lead',       defaultWidth: 80,  minWidth: 60  },
  { id: 'suggestion', defaultWidth: 140, minWidth: 110 },
]

const HORIZON_COMP_COLUMNS: ResizableColumn[] = [
  { id: 'composant', defaultWidth: 220, minWidth: 160 },
  { id: 'lead',      defaultWidth: 70,  minWidth: 60  },
  ...MOIS_LABELS.map((m) => ({ id: m, defaultWidth: 110, minWidth: 90 })),
  { id: 'total',     defaultWidth: 130, minWidth: 100 },
]

const HORIZON_PF_COLUMNS: ResizableColumn[] = [
  { id: 'produitFini', defaultWidth: 240, minWidth: 180 },
  ...MOIS_LABELS.map((m) => ({ id: m, defaultWidth: 115, minWidth: 90 })),
  { id: 'totalOP', defaultWidth: 140, minWidth: 100 },
]

const PIC_COLUMNS: ResizableColumn[] = [
  { id: 'composant',     defaultWidth: 220, minWidth: 160 },
  { id: 'besoinAnnuel',  defaultWidth: 160, minWidth: 120 },
  { id: 'stockActuel',   defaultWidth: 140, minWidth: 110 },
  { id: 'enCommande',    defaultWidth: 140, minWidth: 110 },
  { id: 'campagne',      defaultWidth: 200, minWidth: 160 },
]

// ── Composants UI ─────────────────────────────────────────────────────────────

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
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      className="w-full h-7 px-2 text-sm rounded-md border bg-background font-mono text-right focus:outline-none focus:ring-1 focus:ring-ring"
    />
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function MrpPage() {
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState<Tab>('m0')
  const [produits, setProduits] = useState<ProduitMRP[]>(MOCK_PRODUITS_MRP)

  function updateProduit(id: string, patch: Partial<ProduitMRP>) {
    setProduits((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  // Resizable columns
  const { widths: w1, startResize: sr1, reset: r1, isCustomized: ic1 } = useResizableColumns('bluwa:cols:mrp-m0', MRP_COLUMNS)
  const minW1 = MRP_COLUMNS.reduce((s, c) => s + (w1[c.id] ?? c.defaultWidth ?? 0), 0)
  const { widths: w2, startResize: sr2, reset: r2, isCustomized: ic2 } = useResizableColumns('bluwa:cols:mrp-bom', BOM_COLUMNS)
  const minW2 = BOM_COLUMNS.reduce((s, c) => s + (w2[c.id] ?? c.defaultWidth ?? 0), 0)
  const { widths: w3, startResize: sr3, reset: r3, isCustomized: ic3 } = useResizableColumns('bluwa:cols:mrp-horizon-comp', HORIZON_COMP_COLUMNS)
  const minW3 = HORIZON_COMP_COLUMNS.reduce((s, c) => s + (w3[c.id] ?? c.defaultWidth ?? 0), 0)
  const { widths: w4, startResize: sr4, reset: r4, isCustomized: ic4 } = useResizableColumns('bluwa:cols:mrp-horizon-pf', HORIZON_PF_COLUMNS)
  const minW4 = HORIZON_PF_COLUMNS.reduce((s, c) => s + (w4[c.id] ?? c.defaultWidth ?? 0), 0)
  const { widths: w5, startResize: sr5, reset: r5, isCustomized: ic5 } = useResizableColumns('bluwa:cols:mrp-pic', PIC_COLUMNS)
  const minW5 = PIC_COLUMNS.reduce((s, c) => s + (w5[c.id] ?? c.defaultWidth ?? 0), 0)

  // ── useMemo chain ──────────────────────────────────────────────────────────

  // Tab ① : ATP par PF
  const computed = useMemo(
    () => produits.map((p) => ({ ...p, ...calcMRP(p) })),
    [produits],
  )

  // Tab ④ : OP 6 mois par PF — mois[0] = M+0 (calcMRP), mois[1-5] = MOCK_PREVISIONS_6M
  const horizonPF = useMemo(
    () =>
      MOCK_PRODUITS_MRP.map((p) => {
        const c = computed.find((x) => x.sku === p.sku)
        const mois0 = c?.ofPlanifQte ?? 0
        const prev = MOCK_PREVISIONS_6M[p.sku] ?? [0, 0, 0, 0, 0]
        return {
          sku: p.sku,
          designation: p.designation,
          unite: p.unite,
          mois: [mois0, ...prev] as [number, number, number, number, number, number],
        }
      }),
    [computed],
  )

  // Tab ③ : Composants 6 mois — explosion BOM dynamique mois par mois
  const horizonComp = useMemo(
    () =>
      MOCK_BOM.map((comp) => ({
        ...comp,
        mois: [0, 1, 2, 3, 4, 5].map((mi) =>
          Math.round(
            horizonPF.reduce(
              (s, pf) => s + pf.mois[mi] * (comp.qtyPerPF[pf.sku] ?? 0),
              0,
            ) * 1000,
          ) / 1000,
        ) as [number, number, number, number, number, number],
      })),
    [horizonPF],
  )

  // Tab ② : BOM explosion agrégée 6 mois
  const bomComputed = useMemo(
    () =>
      horizonComp.map((hc) => {
        const besoinBrut = Math.round(hc.mois.reduce((s, v) => s + v, 0) * 1000) / 1000
        const besoinNet = calcBesoinNetBOM(besoinBrut, hc)
        return { ...hc, besoinBrut, besoinNet }
      }),
    [horizonComp],
  )

  // Tab ⑤ : PIC Macro — prévisions annuelles × BOM
  const picComputed = useMemo(
    () =>
      MOCK_BOM.map((comp) => ({
        ...comp,
        besoinAnnuel: Math.round(
          MOCK_PREVISIONS_ANNUELLES.reduce(
            (s, pf) => s + pf.previsionAnnuelle * (comp.qtyPerPF[pf.sku] ?? 0),
            0,
          ) * 1000,
        ) / 1000,
      })),
    [],
  )

  // Stat cards
  const stats = useMemo(() => {
    const avecOP = computed.filter((p) => p.besoinNet > 0)
    const totalBtl = avecOP.reduce((s, p) => s + p.ofPlanifQte, 0)
    const composants = bomComputed.filter((c) => c.besoinNet > 0).length
    const totalAnnuel = MOCK_PREVISIONS_ANNUELLES.reduce((s, p) => s + p.previsionAnnuelle, 0)
    return { pfAnalyses: produits.length, opALancer: avecOP.length, totalBtl, composants, totalAnnuel }
  }, [computed, bomComputed, produits.length])

  const r2fmt = (n: number) => Math.round(n * 100) / 100

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MRP · Material Requirements Planning</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Stocks + Commandes + Prévisions → Ordres Planifiés (OP) sur 6 mois → conversion en OF par la production
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="PF analysés"
          value={String(stats.pfAnalyses)}
          sub="Saveurs Bissap Pourpre"
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900/50"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={Package}
        />
        <StatCard
          label="OP à lancer (M+0)"
          value={String(stats.opALancer)}
          sub={`${stats.opALancer} PF · ${formatNumber(stats.totalBtl, locale)} btl`}
          bgClass="bg-orange-50 dark:bg-orange-950/30"
          iconBgClass="bg-orange-100 dark:bg-orange-900/50"
          iconColorClass="text-orange-600 dark:text-orange-400"
          icon={ArrowRight}
        />
        <StatCard
          label="Composants à commander"
          value={String(stats.composants)}
          sub="Besoin net > 0 sur 6 mois"
          bgClass="bg-red-50 dark:bg-red-950/30"
          iconBgClass="bg-red-100 dark:bg-red-900/50"
          iconColorClass="text-red-600 dark:text-red-400"
          icon={AlertTriangle}
        />
        <StatCard
          label="PIC · Prévision annuelle"
          value={formatNumber(stats.totalAnnuel, locale)}
          sub="btl toutes saveurs · campagne 12 mois"
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900/50"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={TrendingUp}
        />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab ① — Ordres M+0 · ATP ───────────────────────────────────────── */}
      {activeTab === 'm0' && (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <span className="text-muted-foreground">①</span>
                Demande PF → Ordres Planifiés (OP) · M+0 · ATP
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ATP = Stock libéré + Stock en contrôle (si libéré avant l&apos;OP) + OF en cours + Cmd fournisseur − Expéditions.
                Jalonnement à rebours : composants nécessaires 2j avant l&apos;OP.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {ic1 && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={r1}>
                  <RotateCcw className="size-3.5" />
                  Réinitialiser les colonnes
                </Button>
              )}
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <ArrowRight className="size-3.5" />
                Convertir en OF (Production)
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: minW1 }}>
              <colgroup>
                {MRP_COLUMNS.map((c) => (
                  <col key={c.id} style={{ width: w1[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Produit fini<ColumnResizer columnId="produit" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">ATP<ColumnResizer columnId="atp" onStart={sr1} /></th>
                  <th className="relative text-center px-4 py-3 font-semibold text-xs tracking-wide">En contrôle<ColumnResizer columnId="controle" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Cmd ferme<ColumnResizer columnId="cmdFerme" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Prévision<ColumnResizer columnId="prevision" onStart={sr1} /></th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Source<ColumnResizer columnId="source" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Stock séc.<ColumnResizer columnId="stockSec" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Taille lot<ColumnResizer columnId="tailleLot" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Besoin net<ColumnResizer columnId="besoinNet" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Nb OP<ColumnResizer columnId="nbOP" onStart={sr1} /></th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Action<ColumnResizer columnId="action" onStart={sr1} /></th>
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
                      <span className={p.atp <= 0 ? 'text-red-600' : ''}>
                        {formatNumber(p.atp, locale)}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">{p.unite}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.stockEnControle > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          {p.enControleEligible ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              <BadgeCheck className="size-3 shrink-0" />
                              Éligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                              <Clock className="size-3 shrink-0" />
                              Non éligible
                            </span>
                          )}
                          <span className="font-mono text-xs text-muted-foreground">
                            lib. {p.dateLiberation}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><NumberInput value={p.cmdFerme} onChange={(v) => updateProduit(p.id, { cmdFerme: v })} /></td>
                    <td className="px-4 py-3"><NumberInput value={p.prevision} onChange={(v) => updateProduit(p.id, { prevision: v })} /></td>
                    <td className="px-4 py-3 overflow-hidden">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        p.source === 'Commandes fermes'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>{p.source}</span>
                    </td>
                    <td className="px-4 py-3"><NumberInput value={p.stockSec} onChange={(v) => updateProduit(p.id, { stockSec: v })} /></td>
                    <td className="px-4 py-3"><NumberInput value={p.tailleLot} onChange={(v) => updateProduit(p.id, { tailleLot: Math.max(1, v) })} /></td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      <span className={p.besoinNet > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                        {formatNumber(p.besoinNet, locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={p.nbOP > 0 ? 'text-blue-600' : 'text-muted-foreground font-normal'}>
                        {p.nbOP}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.besoinNet > 0 ? (
                          <button className="flex-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1.5 rounded-full transition-colors whitespace-nowrap text-center">
                            {p.nbOP} OP → OF · {formatNumber(p.ofPlanifQte, locale)} {p.unite}
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
              ATP = Stock libéré + Stock en contrôle éligible + OF en cours + Cmd fournisseur − Expéditions · Besoin net = max(0, Demande − ATP + Stock séc.) · OP = ⌈Besoin net / Taille lot⌉ × Taille lot
            </p>
          </div>
        </div>
      )}

      {/* ── Tab ② — Explosion BOM · 6 mois agrégés ─────────────────────────── */}
      {activeTab === 'bom' && (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <span className="text-muted-foreground">②</span>
                Explosion BOM → Composants à approvisionner · 6 mois
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Besoin brut = somme des 6 mois d&apos;explosion BOM. Calculé dynamiquement depuis les nomenclatures et les OP planifiés.
              </p>
            </div>
            {ic2 && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={r2}>
                <RotateCcw className="size-3.5" />
                Réinitialiser les colonnes
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: minW2 }}>
              <colgroup>
                {BOM_COLUMNS.map((c) => (
                  <col key={c.id} style={{ width: w2[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Composant<ColumnResizer columnId="composant" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Besoin brut<ColumnResizer columnId="besoinBrut" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Stock<ColumnResizer columnId="stock" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">En commande<ColumnResizer columnId="enCommande" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Stock séc.<ColumnResizer columnId="stockSec" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Besoin net<ColumnResizer columnId="besoinNet" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Lead<ColumnResizer columnId="lead" onStart={sr2} /></th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Suggestion<ColumnResizer columnId="suggestion" onStart={sr2} /></th>
                </tr>
              </thead>
              <tbody>
                {bomComputed.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-sm truncate" title={c.designation}>{c.designation}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{r2fmt(c.besoinBrut)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.stock, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.enCommande, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.stockSec, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      <span className={c.besoinNet > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {r2fmt(c.besoinNet)} <span className="text-xs">{c.unite}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">{c.leadTime}j</td>
                    <td className="px-4 py-3 overflow-hidden">
                      {c.besoinNet === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <Check className="size-3 shrink-0" />
                          Couvert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-red-100 text-red-600 border border-red-200">
                          <ShoppingCart className="size-3 shrink-0" />
                          À commander
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
      )}

      {/* ── Tab ③ — Composants 6 mois ──────────────────────────────────────── */}
      {activeTab === 'composants6m' && (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                Horizon 6 mois (glissant) · Composants à approvisionner
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Projection mensuelle des besoins composants (BOM × demande PF). Tient compte du{' '}
                <strong>lead time fournisseur</strong> pour anticiper les commandes.
              </p>
            </div>
            {ic3 && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={r3}>
                <RotateCcw className="size-3.5" />
                Réinitialiser les colonnes
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: minW3 }}>
              <colgroup>
                {HORIZON_COMP_COLUMNS.map((c) => (
                  <col key={c.id} style={{ width: w3[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Composant<ColumnResizer columnId="composant" onStart={sr3} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Lead<ColumnResizer columnId="lead" onStart={sr3} /></th>
                  {MOIS_LABELS.map((m) => (
                    <th key={m} className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">
                      {m}<ColumnResizer columnId={m} onStart={sr3} />
                    </th>
                  ))}
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Total 6 mois<ColumnResizer columnId="total" onStart={sr3} /></th>
                </tr>
              </thead>
              <tbody>
                {horizonComp.map((h) => {
                  const total = r2fmt(h.mois.reduce((s, v) => s + v, 0))
                  return (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm truncate" title={h.designation}>{h.designation}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">{h.leadTime}j</td>
                      {h.mois.map((v, i) => {
                        const val = r2fmt(v)
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
      )}

      {/* ── Tab ④ — OP 6 mois par PF ───────────────────────────────────────── */}
      {activeTab === 'op6m' && (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                Horizon 6 mois (glissant) · Ordres Planifiés (OP) par PF
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                M+0 issu du calcul ATP. M+1 à M+5 issus des prévisions commerciales. La responsable production convertit les OP en OF.
              </p>
            </div>
            {ic4 && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={r4}>
                <RotateCcw className="size-3.5" />
                Réinitialiser les colonnes
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: minW4 }}>
              <colgroup>
                {HORIZON_PF_COLUMNS.map((c) => (
                  <col key={c.id} style={{ width: w4[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Produit fini<ColumnResizer columnId="produitFini" onStart={sr4} /></th>
                  {MOIS_LABELS.map((m, i) => (
                    <th key={m} className="relative text-center px-3 py-3 font-semibold text-xs tracking-wide">
                      {m}
                      {i === 0 && <span className="block font-normal text-[10px] text-blue-500">ATP</span>}
                      <ColumnResizer columnId={m} onStart={sr4} />
                    </th>
                  ))}
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Total OP<ColumnResizer columnId="totalOP" onStart={sr4} /></th>
                </tr>
              </thead>
              <tbody>
                {horizonPF.map((pf) => {
                  const totalVol = pf.mois.reduce((s, v) => s + v, 0)
                  return (
                    <tr key={pf.sku} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm truncate" title={pf.designation}>{pf.designation}</td>
                      {pf.mois.map((vol, i) => (
                        <td key={i} className="px-3 py-3 text-center">
                          <p className={`font-bold text-sm ${i === 0 ? 'text-blue-600' : 'text-foreground'}`}>
                            {formatNumber(vol, locale)}
                          </p>
                          <p className="text-xs text-muted-foreground">{pf.unite}</p>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-sm">{formatNumber(totalVol, locale)}</p>
                        <p className="text-xs text-muted-foreground">{pf.unite}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab ⑤ — PIC Macro · 12 mois ────────────────────────────────────── */}
      {activeTab === 'pic' && (
        <div className="space-y-6">

          {/* Prévisions annuelles PF */}
          <div className="rounded-lg border bg-card">
            <div className="px-6 py-4 border-b">
              <p className="font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground shrink-0" />
                Plan Industriel et Commercial (PIC) · Prévisions annuelles
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agrégation macro sur 12 mois. Sert au dimensionnement de la campagne agricole et des capacités de production.
                Pas de gestion de statuts de lots à cet horizon.
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

          {/* Besoins MP annuels */}
          <div className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <FlaskConical className="size-4 text-muted-foreground shrink-0" />
                  Besoins Matières Premières · Campagne agricole 12 mois
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explosion BOM × prévisions annuelles. Sert à négocier les contrats fournisseurs et planifier la récolte.
                </p>
              </div>
              {ic5 && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={r5}>
                  <RotateCcw className="size-3.5" />
                  Réinitialiser les colonnes
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed" style={{ minWidth: minW5 }}>
                <colgroup>
                  {PIC_COLUMNS.map((c) => (
                    <col key={c.id} style={{ width: w5[c.id] }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Composant / MP<ColumnResizer columnId="composant" onStart={sr5} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Besoin annuel<ColumnResizer columnId="besoinAnnuel" onStart={sr5} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">Stock actuel<ColumnResizer columnId="stockActuel" onStart={sr5} /></th>
                    <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide">En commande<ColumnResizer columnId="enCommande" onStart={sr5} /></th>
                    <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide">Statut campagne<ColumnResizer columnId="campagne" onStart={sr5} /></th>
                  </tr>
                </thead>
                <tbody>
                  {picComputed.map((c) => {
                    const couverture = c.stock + c.enCommande
                    const ok = couverture >= c.besoinAnnuel
                    const pct = c.besoinAnnuel > 0
                      ? Math.min(100, Math.round((couverture / c.besoinAnnuel) * 100))
                      : 100
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-sm truncate" title={c.designation}>{c.designation}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-violet-600">
                          {formatNumber(r2fmt(c.besoinAnnuel), locale)} <span className="text-xs font-normal text-muted-foreground">{c.unite}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatNumber(c.stock, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatNumber(c.enCommande, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              {ok ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  <Check className="size-3 shrink-0" />
                                  Couvert · {pct}%
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200 whitespace-nowrap">
                                  <AlertTriangle className="size-3 shrink-0" />
                                  Déficit · {pct}%
                                </span>
                              )}
                            </div>
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
