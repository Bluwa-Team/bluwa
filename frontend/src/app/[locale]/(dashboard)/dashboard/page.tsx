'use client'

import { ArrowRight, CircleDot } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const TODAY = '2026-05-26'

// ── Mock data ─────────────────────────────────────────────────────────────────

const KPI_DATA = {
  caMois:        6_400_000,
  caVsM1:        +5,
  margeBrutePct: 35.0,
  margeBruteVal: 2_240_000,
  ebitdaPct:     13.1,
  ebitdaVal:     840_000,
  trs:           76,
  trsDisp:       88,
  trsPerf:       92,
  trsQual:       94,
  otif:          91,
  valeurStock:   8_400_000,
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

const MARGE_INSIGHT = {
  ecartMoyen:     +4.2,
  ecartTendance:  'up' as const,
  produitDéviant: 'Vanille',
  ecartProduit:   +6.8,
  commentaire:    'Surconsommation MP & rebuts ligne C.',
}

type AlertePrio = {
  id:     string
  niveau: 'rouge' | 'jaune' | 'bleu' | 'vert'
  emoji:  string
  titre:  string
  detail: string
  lien?:  string
}

const ALERTES_PRIORITAIRES: AlertePrio[] = [
  { id: 'a1', niveau: 'rouge', emoji: '⚠️', titre: 'Gousses de vanille — 3 kg restants',     detail: 'Sous stock de sécurité · OF Vanille à risque sous 5j',         lien: '/stocks'           },
  { id: 'a2', niveau: 'jaune', emoji: '⏳', titre: 'Lot LOT-PFORI-039 — DLC dans 8j',        detail: '142 bouteilles · à prioriser sur ventes Dakar',                lien: '/stocks'           },
  { id: 'a3', niveau: 'bleu',  emoji: '🧑‍💼', titre: 'MRP : 4 composants à commander',         detail: 'Calcul à partir des OF planifiés · Voir suggestions',           lien: '/approvisionnement'},
  { id: 'a4', niveau: 'vert',  emoji: '✅', titre: 'Bouteilles 1L — réception confirmée',    detail: '2 400 u reçues · Verrerie Dakar · Lot OK',                     lien: '/reception'        },
]

const ALERTE_STYLES: Record<AlertePrio['niveau'], { bg: string; border: string; titleColor: string }> = {
  rouge: { bg: 'bg-red-50',    border: 'border-red-200',    titleColor: 'text-red-800'    },
  jaune: { bg: 'bg-amber-50',  border: 'border-amber-200',  titleColor: 'text-amber-800'  },
  bleu:  { bg: 'bg-blue-50',   border: 'border-blue-200',   titleColor: 'text-blue-800'   },
  vert:  { bg: 'bg-emerald-50',border: 'border-emerald-200',titleColor: 'text-emerald-800'},
}

const PL_DATA = {
  ca:           6_400_000,
  coutProd:     4_160_000,
  margebrute:   2_240_000,
  chargesFixes: 1_400_000,
  ebitda:         840_000,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtM(v: number) {
  return `${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
}
function fmtYAxis(v: number) {
  return `${(v / 1_000_000).toFixed(0)}M`
}

// ── KPI card direction ────────────────────────────────────────────────────────

function KpiDir({ label, value, sub, accentClass }: {
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

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name} : {fmtM(p.value)} FCFA</p>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const locale = useLocale()

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

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiDir label="CA du mois"      value={fmtM(KPI_DATA.caMois)}                     sub={`FCFA · ${KPI_DATA.caVsM1 > 0 ? '+' : ''}${KPI_DATA.caVsM1}% vs M-1`}          accentClass="bg-blue-500"    />
        <KpiDir label="Marge brute"     value={`${KPI_DATA.margeBrutePct.toFixed(1)}%`}   sub={`${fmtM(KPI_DATA.margeBruteVal)} FCFA`}                                          accentClass="bg-emerald-500" />
        <KpiDir label="EBITDA prév."    value={`${KPI_DATA.ebitdaPct.toFixed(1)}%`}       sub={`${fmtM(KPI_DATA.ebitdaVal)} FCFA`}                                              accentClass="bg-orange-500"  />
        <KpiDir label="TRS atelier"     value={`${KPI_DATA.trs}%`}                        sub={`Disp ${KPI_DATA.trsDisp} · Perf ${KPI_DATA.trsPerf} · Qual ${KPI_DATA.trsQual}`} accentClass="bg-teal-500"  />
        <KpiDir label="OTIF livraisons" value={`${KPI_DATA.otif}%`}                       sub="On-Time In-Full · 30j"                                                            accentClass="bg-amber-500"  />
        <KpiDir label="Valeur stock"    value={fmtM(KPI_DATA.valeurStock)}                sub="FCFA · MP+PF+AC"                                                                  accentClass="bg-violet-500" />
      </div>

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart CA & Coût */}
        <div className="lg:col-span-2 rounded-2xl border bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span>📈</span> CA &amp; Marge brute
              <span className="text-muted-foreground font-normal">(6 mois)</span>
            </p>
            <span className="text-xs text-muted-foreground">FCFA</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={CA_MARGE_DATA} barGap={4} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
              <Legend iconType="square" iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="ca"   name="CA"              fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cout" name="Coût production" fill="#f97316" radius={[4, 4, 0, 0]} />
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
              <Pie data={MIX_VENTES} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={2} dataKey="value">
                {MIX_VENTES.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip formatter={(v: any, name: any) => [`${v}%`, name]} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
            </PieChart>
          </ResponsiveContainer>
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

      {/* ── Marge insight + Alertes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Analyse de marge — insight compact */}
        <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span>💰</span> Analyse de marge
              <span className="text-muted-foreground font-normal">— Coût théorique vs réel</span>
            </p>
            <Link href={`/${locale}/analyse-marge`} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              Détail <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/40 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Écart coût moyen</p>
              <p className={`text-xl font-bold ${MARGE_INSIGHT.ecartMoyen > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {MARGE_INSIGHT.ecartMoyen > 0 ? '+' : ''}{MARGE_INSIGHT.ecartMoyen}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">sur le coût de revient</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Produit déviant</p>
              <p className="text-xl font-bold text-orange-600">{MARGE_INSIGHT.produitDéviant}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">+{MARGE_INSIGHT.ecartProduit}% d&apos;écart</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Tendance</p>
              <p className={`text-xl font-bold ${MARGE_INSIGHT.ecartTendance === 'up' ? 'text-red-500' : 'text-emerald-500'}`}>
                {MARGE_INSIGHT.ecartTendance === 'up' ? '↑' : '↓'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">vs M-1</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            <span className={`font-semibold ${MARGE_INSIGHT.ecartMoyen > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              Écart moyen : {MARGE_INSIGHT.ecartMoyen > 0 ? '+' : ''}{MARGE_INSIGHT.ecartMoyen}%
            </span>
            {' '}sur le coût de revient — {MARGE_INSIGHT.commentaire}
          </p>
        </div>

        {/* Alertes prioritaires */}
        <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <span>⚠️</span> Alertes prioritaires
          </p>
          <div className="space-y-2">
            {ALERTES_PRIORITAIRES.map((a) => {
              const s = ALERTE_STYLES[a.niveau]
              const inner = (
                <div className={`rounded-xl border px-3.5 py-2.5 ${s.bg} ${s.border}`}>
                  <p className={`text-xs font-semibold flex items-center gap-1.5 ${s.titleColor}`}>
                    <span>{a.emoji}</span> {a.titre}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.detail}</p>
                </div>
              )
              return a.lien
                ? <Link key={a.id} href={`/${locale}${a.lien}`} className="block hover:opacity-80 transition-opacity">{inner}</Link>
                : <div key={a.id}>{inner}</div>
            })}
          </div>
        </div>
      </div>

      {/* ── P&L prévisionnel ── */}
      <div className="rounded-2xl border bg-card shadow-sm p-5">
        <p className="text-sm font-semibold flex items-center gap-2 mb-5">
          <span>🧳</span> P&amp;L prévisionnel — Mois en cours
        </p>
        <div className="grid grid-cols-5 items-center">
          {([
            { label: 'CA',               value: PL_DATA.ca,           color: 'text-foreground',       op: null },
            { label: '– Coût production', value: PL_DATA.coutProd,    color: 'text-muted-foreground', op: '–'  },
            { label: '= Marge brute',     value: PL_DATA.margebrute,  color: 'text-emerald-600',      op: '='  },
            { label: '– Charges fixes',   value: PL_DATA.chargesFixes,color: 'text-muted-foreground', op: '–'  },
            { label: '= EBITDA',          value: PL_DATA.ebitda,      color: 'text-blue-600',         op: '='  },
          ] as const).map((item, i) => (
            <div key={i} className="flex items-center">
              {item.op && (
                <span className="text-lg text-muted-foreground font-light px-2 hidden sm:block">{item.op}</span>
              )}
              <div className={`flex-1 ${i > 0 ? 'pl-2 sm:pl-0' : ''}`}>
                <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                <p className={`text-base font-bold tabular-nums mt-0.5 ${item.color}`}>
                  {item.value.toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
