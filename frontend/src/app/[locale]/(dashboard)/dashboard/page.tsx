'use client'

import { useMemo } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2,
  Factory, FlaskConical, ShieldAlert, ShoppingCart, Truck,
  CircleDot,
} from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { formatDlcStatus } from '@/types/erp'
import { STATUT_OF_DB_LABELS, STATUT_OF_DB_COLORS } from '../production/_components/types'
import {
  MOCK_PRODUCTION_ORDER_ROWS, MOCK_PURCHASE_REQUISITION_ROWS,
  STATUT_DA_LABELS, STATUT_DA_COLORS,
  type ProductionOrderRow, type PurchaseRequisitionRow,
} from '../mrp/_components/types'
import { MOCK_LOTS } from '../stocks/_components/types'
import {
  MOCK_LOTS_CONTROLE, MOCK_NON_CONFORMITES,
  STATUT_LOT_COLORS, STATUT_LOT_LABELS,
  STATUT_NC_LABELS, STATUT_NC_COLORS,
} from '../qualite/_components/types'
import { MOCK_BC_HEADERS, STATUT_COMMANDE_LABELS, STATUT_COMMANDE_COLORS } from '../approvisionnement/_components/types'

const TODAY = '2026-05-26'

// ── Mock data KPIs direction ──────────────────────────────────────────────────

const KPI_DATA = {
  caMois:       6_400_000,
  caVsM1:       +5,
  margeBrutePct: 35.0,
  margeBruteVal: 2_240_000,
  ebitdaPct:    13.1,
  ebitdaVal:    840_000,
  trs:          76,
  trsDisp:      88,
  trsPerf:      92,
  trsQual:      94,
  otif:         91,
  valeurStock:  8_400_000,
}

const CA_MARGE_DATA = [
  { mois: 'Déc', ca: 4_200_000, cout: 2_730_000 },
  { mois: 'Jan', ca: 4_800_000, cout: 3_120_000 },
  { mois: 'Fév', ca: 5_050_000, cout: 3_283_000 },
  { mois: 'Mar', ca: 5_540_000, cout: 3_601_000 },
  { mois: 'Avr', ca: 6_100_000, cout: 3_965_000 },
  { mois: 'Mai', ca: 6_400_000, cout: 4_160_000 },
]

const MIX_VENTES = [
  { name: 'Originale',   value: 42, color: '#2563eb' },
  { name: 'Vanille',     value: 28, color: '#f97316' },
  { name: 'Gingembre',   value: 16, color: '#ef4444' },
  { name: 'Menthe',      value: 8,  color: '#22c55e' },
  { name: 'Citronnelle', value: 6,  color: '#93c5fd' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtM(v: number) {
  return `${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
}

function fmtYAxis(v: number) {
  return `${(v / 1_000_000).toFixed(0)}M`
}

// ── KPI Card direction ────────────────────────────────────────────────────────

function KpiDir({
  label, value, sub, accentClass,
}: {
  label: string; value: string; sub: string; accentClass: string
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className={`h-1 w-full ${accentClass}`} />
      <div className="p-4 flex flex-col gap-1 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
        <p className="text-xs text-muted-foreground leading-snug">{sub}</p>
      </div>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, badge, badgeColor = 'bg-muted text-muted-foreground',
  icon: Icon, href, children,
}: {
  title: string; badge?: number; badgeColor?: string
  icon: React.ElementType; href?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{title}</span>
          {badge !== undefined && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
          )}
        </div>
        {href && (
          <Link href={href} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Voir tout <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max, colorClass = 'bg-rose-500' }: { value: number; max: number; colorClass?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── Custom tooltip recharts ───────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name} : {fmtM(p.value)} FCFA
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const locale = useLocale()

  const activeOFs = useMemo(
    () => MOCK_PRODUCTION_ORDER_ROWS.filter((o: ProductionOrderRow) =>
      o.status === 'PLANNED' || o.status === 'RELEASED' || o.status === 'IN_PROGRESS',
    ), [],
  )
  const lotsEnControle = useMemo(() => MOCK_LOTS_CONTROLE.filter((l) => l.statut === 'EnControle'), [])
  const ncOuvertes     = useMemo(() => MOCK_NON_CONFORMITES.filter((n) => n.statut !== 'Clos'), [])
  const daPending      = useMemo(() => MOCK_PURCHASE_REQUISITION_ROWS.filter((d) => d.status === 'PENDING'), [])
  const bcActifs       = useMemo(() => MOCK_BC_HEADERS.filter((b) => b.statut === 'PENDING' || b.statut === 'APPROVED'), [])
  const stockAlerts    = useMemo(() => MOCK_LOTS.filter((lot) => {
    if (!lot.dlc) return false
    const diff = Math.ceil((new Date(lot.dlc).getTime() - new Date(TODAY).getTime()) / 86_400_000)
    return diff <= lot.seuilAlertePeremption
  }), [])
  const daUrgentes = useMemo(
    () => daPending.filter((d) => Math.ceil((new Date(d.requestedDeliveryDate).getTime() - new Date(TODAY).getTime()) / 86_400_000) <= 7),
    [daPending],
  )

  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(TODAY))

  return (
    <div className="space-y-6 p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border">
          <CircleDot className="size-3 text-emerald-500" />
          Données simulées
        </div>
      </div>

      {/* ── KPI direction (6 cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiDir
          label="CA du mois"
          value={fmtM(KPI_DATA.caMois)}
          sub={`FCFA · ${KPI_DATA.caVsM1 > 0 ? '+' : ''}${KPI_DATA.caVsM1}% vs M-1`}
          accentClass="bg-blue-500"
        />
        <KpiDir
          label="Marge brute"
          value={`${KPI_DATA.margeBrutePct.toFixed(1)}%`}
          sub={`${fmtM(KPI_DATA.margeBruteVal)} FCFA`}
          accentClass="bg-emerald-500"
        />
        <KpiDir
          label="EBITDA prév."
          value={`${KPI_DATA.ebitdaPct.toFixed(1)}%`}
          sub={`${fmtM(KPI_DATA.ebitdaVal)} FCFA`}
          accentClass="bg-orange-500"
        />
        <KpiDir
          label="TRS atelier"
          value={`${KPI_DATA.trs}%`}
          sub={`Disp ${KPI_DATA.trsDisp} · Perf ${KPI_DATA.trsPerf} · Qual ${KPI_DATA.trsQual}`}
          accentClass="bg-teal-500"
        />
        <KpiDir
          label="OTIF livraisons"
          value={`${KPI_DATA.otif}%`}
          sub="On-Time In-Full · 30j"
          accentClass="bg-amber-500"
        />
        <KpiDir
          label="Valeur stock"
          value={fmtM(KPI_DATA.valeurStock)}
          sub="FCFA · MP+PF+AC"
          accentClass="bg-violet-500"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart CA & Marge */}
        <div className="lg:col-span-2 rounded-2xl border bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span>📈</span> CA &amp; Marge brute <span className="text-muted-foreground font-normal">(6 mois)</span>
            </p>
            <span className="text-xs text-muted-foreground">FCFA</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={CA_MARGE_DATA} barGap={4} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="mois"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtYAxis}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
              <Legend
                iconType="square"
                iconSize={10}
                formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>}
              />
              <Bar dataKey="ca"   name="CA"               fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cout" name="Coût production"  fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut mix ventes */}
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <p className="text-sm font-semibold flex items-center gap-2 mb-4">
            <span>🧃</span> Mix ventes par saveur
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={MIX_VENTES}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                dataKey="value"
              >
                {MIX_VENTES.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [`${v}%`, name]}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Légende manuelle */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-2">
            {MIX_VENTES.map((e) => (
              <div key={e.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: e.color }} />
                <span className="text-[11px] text-muted-foreground">{e.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Opérationnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Colonne gauche 2/3 */}
        <div className="lg:col-span-2 space-y-4">

          {/* Production en cours */}
          <Section title="Production en cours" badge={activeOFs.length}
            badgeColor="bg-violet-100 text-violet-700" icon={Factory} href={`/${locale}/production`}>
            {activeOFs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun OF actif</p>
            ) : (
              <div className="space-y-2">
                {activeOFs.map((of) => {
                  const pct = of.quantityTarget > 0 ? Math.round((of.quantityProduced / of.quantityTarget) * 100) : 0
                  const colorClass = of.status === 'IN_PROGRESS' ? 'bg-rose-500' : of.status === 'RELEASED' ? 'bg-violet-500' : 'bg-blue-400'
                  return (
                    <div key={of.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono text-muted-foreground">{of.orderNumber}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUT_OF_DB_COLORS[of.status]}`}>
                            {STATUT_OF_DB_LABELS[of.status]}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{of.factoryName}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{of.articleLabel}</p>
                        <div className="mt-1.5">
                          <ProgressBar value={of.quantityProduced} max={of.quantityTarget} colorClass={colorClass} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums">{of.quantityProduced}<span className="text-muted-foreground font-normal">/{of.quantityTarget}</span></p>
                        <p className="text-xs text-muted-foreground">{of.unitLabel}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Demandes d'achat */}
          <Section title="Demandes d'achat" badge={daPending.length}
            badgeColor="bg-orange-100 text-orange-700" icon={ShoppingCart} href={`/${locale}/approvisionnement`}>
            {daPending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune DA en attente</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left font-medium pb-2 px-1">N° DA</th>
                      <th className="text-left font-medium pb-2 px-1">Article</th>
                      <th className="text-left font-medium pb-2 px-1">Site</th>
                      <th className="text-right font-medium pb-2 px-1">Qté</th>
                      <th className="text-left font-medium pb-2 px-1">Date limite</th>
                      <th className="text-left font-medium pb-2 px-1">OF source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {daPending.map((da) => {
                      const diff = Math.ceil((new Date(da.requestedDeliveryDate).getTime() - new Date(TODAY).getTime()) / 86_400_000)
                      const urgent = diff <= 7
                      return (
                        <tr key={da.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-1 font-mono text-muted-foreground">{da.requisitionNumber}</td>
                          <td className="py-2 px-1">
                            <p className="font-medium">{da.articleLabel}</p>
                            <p className="text-muted-foreground">{da.articleSku}</p>
                          </td>
                          <td className="py-2 px-1 text-muted-foreground">{da.factoryName}</td>
                          <td className="py-2 px-1 text-right tabular-nums font-medium">{da.quantityRequired} {da.unitLabel}</td>
                          <td className="py-2 px-1">
                            <span className={`font-medium ${urgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {urgent && '⚠ '}
                              {new Date(da.requestedDeliveryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </span>
                          </td>
                          <td className="py-2 px-1">
                            {da.sourceOrderNumber && (
                              <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-mono text-[10px]">
                                {da.sourceOrderNumber}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

        </div>

        {/* Colonne droite 1/3 */}
        <div className="space-y-4">

          <Section title="Contrôle qualité" badge={lotsEnControle.length}
            badgeColor="bg-amber-100 text-amber-700" icon={FlaskConical} href={`/${locale}/qualite`}>
            <div className="space-y-2">
              {lotsEnControle.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun lot en contrôle</p>
              ) : lotsEnControle.map((lot) => (
                <div key={lot.id} className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{lot.codeLot}</p>
                    <p className="text-xs font-medium mt-0.5 truncate">{lot.article}</p>
                    <p className="text-[10px] text-muted-foreground">{lot.origine} · {lot.quantite} {lot.unite}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${STATUT_LOT_COLORS[lot.statut]}`}>
                    {STATUT_LOT_LABELS[lot.statut]}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Non-conformités ouvertes" badge={ncOuvertes.length}
            badgeColor={ncOuvertes.length > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}
            icon={ShieldAlert} href={`/${locale}/qualite`}>
            <div className="space-y-2">
              {ncOuvertes.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 justify-center py-2">
                  <CheckCircle2 className="size-4" /> Aucune NC ouverte
                </div>
              ) : ncOuvertes.map((nc) => (
                <div key={nc.id} className="p-2.5 rounded-xl bg-red-50/60 border border-red-100">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{nc.numero}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUT_NC_COLORS[nc.statut]}`}>
                      {STATUT_NC_LABELS[nc.statut]}
                    </span>
                  </div>
                  <p className="text-xs font-medium">{nc.article}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{nc.cause}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Alertes péremption" badge={stockAlerts.length}
            badgeColor={stockAlerts.length > 0 ? 'bg-pink-100 text-pink-700' : 'bg-muted text-muted-foreground'}
            icon={AlertTriangle} href={`/${locale}/stocks`}>
            <div className="space-y-2">
              {stockAlerts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucune alerte</p>
              ) : stockAlerts.map((lot) => {
                const { label, urgent, expired } = formatDlcStatus(lot.dlc, TODAY)
                return (
                  <div key={lot.id} className={`p-2.5 rounded-xl border ${expired ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-100'}`}>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-medium truncate">{lot.designation}</p>
                      <span className={`text-[10px] font-bold shrink-0 ${expired ? 'text-red-600' : 'text-orange-600'}`}>{label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{lot.numero} · {lot.quantite} {lot.unite}</p>
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="Commandes fournisseurs" badge={bcActifs.length}
            badgeColor="bg-blue-100 text-blue-700" icon={Truck} href={`/${locale}/approvisionnement`}>
            <div className="space-y-2">
              {bcActifs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucune commande active</p>
              ) : bcActifs.map((bc) => (
                <div key={bc.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{bc.numero}</p>
                    <p className="text-xs font-medium truncate">{bc.fournisseur}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${STATUT_COMMANDE_COLORS[bc.statut]}`}>
                    {STATUT_COMMANDE_LABELS[bc.statut]}
                  </span>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}
