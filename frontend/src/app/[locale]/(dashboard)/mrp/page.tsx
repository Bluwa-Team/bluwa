'use client'

import { useState, useMemo } from 'react'
import {
  MoreHorizontal, ArrowRight, Settings,
  Package, TrendingUp, AlertTriangle, Calculator,
  RotateCcw, CalendarDays, Check, ShoppingCart,
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
  MOCK_HORIZON_COMPOSANTS, MOCK_HORIZON_PF, MOIS_LABELS,
} from './_components/types'

type Tab = 'm0' | 'bom' | 'composants6m' | 'op6m'

const TABS: { key: Tab; label: string }[] = [
  { key: 'm0',           label: '① Ordres M+0'       },
  { key: 'bom',          label: '② Explosion BOM'     },
  { key: 'composants6m', label: '③ Composants 6 mois' },
  { key: 'op6m',         label: '④ OP 6 mois'         },
]

// ── Colonnes tab ① ───────────────────────────────────────────────────────────

const MRP_COLUMNS: ResizableColumn[] = [
  { id: 'produit',   defaultWidth: null               },
  { id: 'stockPF',  defaultWidth: 100, minWidth: 80  },
  { id: 'ofPlanif', defaultWidth: 110, minWidth: 80  },
  { id: 'cmdFerme', defaultWidth: 130, minWidth: 100 },
  { id: 'prevision',defaultWidth: 130, minWidth: 100 },
  { id: 'source',   defaultWidth: 170, minWidth: 130 },
  { id: 'stockSec', defaultWidth: 110, minWidth: 80  },
  { id: 'tailleLot',defaultWidth: 120, minWidth: 90  },
  { id: 'besoinNet',defaultWidth: 110, minWidth: 80  },
  { id: 'nbOP',     defaultWidth: 80,  minWidth: 60  },
  { id: 'action',   defaultWidth: 220, minWidth: 170 },
]
const PRODUIT_MIN = 200

// ── Colonnes tab ② ───────────────────────────────────────────────────────────

const BOM_COLUMNS: ResizableColumn[] = [
  { id: 'composant',   defaultWidth: null               },
  { id: 'besoinBrut',  defaultWidth: 120, minWidth: 90  },
  { id: 'stock',       defaultWidth: 110, minWidth: 85  },
  { id: 'enCommande',  defaultWidth: 130, minWidth: 100 },
  { id: 'stockSec',    defaultWidth: 110, minWidth: 85  },
  { id: 'besoinNet',   defaultWidth: 120, minWidth: 90  },
  { id: 'lead',        defaultWidth: 80,  minWidth: 60  },
  { id: 'suggestion',  defaultWidth: 140, minWidth: 110 },
]
const COMPOSANT_MIN = 200

// ── Composants ───────────────────────────────────────────────────────────────

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
  const bom: ComposantBOM[] = MOCK_BOM

  function updateProduit(id: string, patch: Partial<ProduitMRP>) {
    setProduits((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  // Colonnes tab ①
  const { widths: w1, startResize: sr1, reset: r1, isCustomized: ic1 } = useResizableColumns('bluwa:cols:mrp-m0', MRP_COLUMNS)
  const minW1 = MRP_COLUMNS.reduce((s, c) => s + (c.defaultWidth == null ? PRODUIT_MIN : (w1[c.id] ?? c.defaultWidth ?? 0)), 0)

  // Colonnes tab ②
  const { widths: w2, startResize: sr2, reset: r2, isCustomized: ic2 } = useResizableColumns('bluwa:cols:mrp-bom', BOM_COLUMNS)
  const minW2 = BOM_COLUMNS.reduce((s, c) => s + (c.defaultWidth == null ? COMPOSANT_MIN : (w2[c.id] ?? c.defaultWidth ?? 0)), 0)

  const computed = useMemo(() => produits.map((p) => ({ ...p, ...calcMRP(p) })), [produits])
  const bomComputed = useMemo(() => bom.map((c) => ({ ...c, besoinNet: calcBesoinNetBOM(c) })), [bom])

  const stats = useMemo(() => {
    const avecOP = computed.filter((p) => p.besoinNet > 0)
    const totalBtl = avecOP.reduce((s, p) => s + p.nbOP * p.tailleLot, 0)
    const totalOP6mois = computed.reduce((s, p) => s + p.nbOP * 6, 0)
    const composants = bomComputed.filter((c) => c.besoinNet > 0).length
    return { pfAnalyses: produits.length, opALancer: avecOP.length, totalBtl, totalOP6mois, composants }
  }, [computed, bomComputed, produits.length])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MRP — Material Requirements Planning</h1>
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
          label="OP horizon 6 mois"
          value={String(stats.totalOP6mois)}
          sub="À convertir en OF par la production"
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900/50"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={TrendingUp}
        />
        <StatCard
          label="Composants à commander"
          value={String(stats.composants)}
          sub={`M+0 · ${formatNumber(stats.totalBtl, locale)} sur 6 mois`}
          bgClass="bg-red-50 dark:bg-red-950/30"
          iconBgClass="bg-red-100 dark:bg-red-900/50"
          iconColorClass="text-red-600 dark:text-red-400"
          icon={AlertTriangle}
        />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab ① — Ordres M+0 ─────────────────────────────────────────────── */}
      {activeTab === 'm0' && (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <span className="text-muted-foreground">①</span>
                Demande PF → Ordres Planifiés (OP) — M+0
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Le MRP génère des OP. La conversion OP → OF est réalisée par le responsable production dans le module Ordres de Fabrication.
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
                  <col key={c.id} style={c.defaultWidth == null ? undefined : { width: w1[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Produit fini</th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Stock PF<ColumnResizer columnId="stockPF" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">OF planif.<ColumnResizer columnId="ofPlanif" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Cmd ferme<ColumnResizer columnId="cmdFerme" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Prévision<ColumnResizer columnId="prevision" onStart={sr1} /></th>
                  <th className="relative text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Source<ColumnResizer columnId="source" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Stock séc.<ColumnResizer columnId="stockSec" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Taille lot<ColumnResizer columnId="tailleLot" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Besoin net<ColumnResizer columnId="besoinNet" onStart={sr1} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Nb OP<ColumnResizer columnId="nbOP" onStart={sr1} /></th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {computed.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm truncate" title={p.designation}>{p.designation}</p>
                      <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatNumber(p.stockPF, locale)}<span className="text-muted-foreground text-xs ml-1">{p.unite}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(p.ofPlanif, locale)}</td>
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
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                      {p.nbOP > 0 ? p.nbOP : <span className="text-muted-foreground font-normal">0</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.besoinNet > 0 ? (
                          <button className="flex-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1.5 rounded-full transition-colors whitespace-nowrap text-center">
                            {p.nbOP} OP → OF · {formatNumber(p.nbOP * p.tailleLot, locale)} {p.unite}
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
              Besoin net = max(Cmd ferme, Prévision) − Stock PF + Stock séc. − OF planifié · NB OP = ⌈Besoin net / Taille lot⌉
            </p>
          </div>
        </div>
      )}

      {/* ── Tab ② — Explosion BOM ──────────────────────────────────────────── */}
      {activeTab === 'bom' && (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 border-b">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <span className="text-muted-foreground">②</span>
                Explosion BOM → Composants à approvisionner
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calculé automatiquement à partir des nomenclatures et des OF à lancer ci-dessus.
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
                  <col key={c.id} style={c.defaultWidth == null ? undefined : { width: w2[c.id] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Composant</th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Besoin brut<ColumnResizer columnId="besoinBrut" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Stock<ColumnResizer columnId="stock" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">En commande<ColumnResizer columnId="enCommande" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Stock séc.<ColumnResizer columnId="stockSec" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Besoin net<ColumnResizer columnId="besoinNet" onStart={sr2} /></th>
                  <th className="relative text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Lead<ColumnResizer columnId="lead" onStart={sr2} /></th>
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {bomComputed.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-sm truncate" title={c.designation}>{c.designation}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{c.besoinBrut} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.stock, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.enCommande, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(c.stockSec, locale)} <span className="text-muted-foreground text-xs">{c.unite}</span></td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      <span className={c.besoinNet > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {c.besoinNet} <span className="text-xs">{c.unite}</span>
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
              Besoin net = max(0, Besoin brut − Stock − En commande + Stock séc.)
            </p>
          </div>
        </div>
      )}

      {/* ── Tab ③ — Composants 6 mois ──────────────────────────────────────── */}
      {activeTab === 'composants6m' && (
        <div className="rounded-lg border bg-card">
          <div className="px-6 py-4 border-b">
            <p className="font-semibold flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground shrink-0" />
              Horizon 6 mois (glissant) — Composants à approvisionner
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Projection mensuelle des besoins composants (BOM × demande PF). Tient compte du{' '}
              <strong>lead time fournisseur</strong> pour anticiper les commandes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: 220 }} />
                <col style={{ width: 70 }} />
                {MOIS_LABELS.map((m) => <col key={m} style={{ width: 110 }} />)}
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Composant</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Lead</th>
                  {MOIS_LABELS.map((m) => (
                    <th key={m} className="text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">{m}</th>
                  ))}
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Total net</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HORIZON_COMPOSANTS.map((h) => {
                  const total = h.mois.reduce((s, v) => s + v, 0)
                  return (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm truncate" title={h.designation}>{h.designation}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">{h.leadTime}j</td>
                      {h.mois.map((v, i) => (
                        <td key={i} className="px-4 py-3 text-right font-mono text-sm">
                          {v === 0
                            ? <span className="text-muted-foreground">—</span>
                            : <span className="text-red-600 font-medium">{v} <span className="text-xs">{h.unite}</span></span>
                          }
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {total} <span className="text-xs text-muted-foreground">{h.unite}</span>
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
          <div className="px-6 py-4 border-b">
            <p className="font-semibold flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground shrink-0" />
              Horizon 6 mois (glissant) — Ordres Planifiés (OP) par PF
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Projection mensuelle (demande, stock de sécurité, taille de lot). La responsable production sélectionne les OP à{' '}
              <strong>convertir en OF</strong>.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: 240 }} />
                {MOIS_LABELS.map((m) => <col key={m} style={{ width: 115 }} />)}
                <col style={{ width: 140 }} />
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide uppercase">Produit fini</th>
                  {MOIS_LABELS.map((m) => (
                    <th key={m} className="text-center px-3 py-3 font-semibold text-xs tracking-wide uppercase">{m}</th>
                  ))}
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide uppercase">Total OP</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HORIZON_PF.map((pf) => {
                  const totalOP = pf.mois.reduce((s, m) => s + m.op, 0)
                  const totalVol = pf.mois.reduce((s, m) => s + m.vol, 0)
                  return (
                    <tr key={pf.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm truncate" title={pf.designation}>{pf.designation}</td>
                      {pf.mois.map((m, i) => (
                        <td key={i} className="px-3 py-3 text-center">
                          <p className="font-bold text-sm text-blue-600">{m.op} OP</p>
                          <p className="text-xs text-muted-foreground">{formatNumber(m.vol, locale)} {pf.unite}</p>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-sm">{totalOP} OP</p>
                        <p className="text-xs text-muted-foreground">({formatNumber(totalVol, locale)} {pf.unite})</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
