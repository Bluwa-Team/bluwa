'use client'

import React from 'react'
import { ArrowRight, TrendingUp, TrendingDown, BarChart3, Factory, Boxes, AlertTriangle, Clock, Info, CheckCircle2, Layers, Bell } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  BarChart, Bar, XAxis, CartesianGrid,
  PieChart, Pie, Cell, Label,
} from 'recharts'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { PeriodPicker, type PeriodValue } from '@/components/ui/period-picker'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

// ── Mock data ─────────────────────────────────────────────────────────────────

const KPI_DATA = {
  caMois:        6_400_000,
  caVsM1:        +5,
  margeBrutePct: 35.0,
  margeBruteVal: 2_240_000,
  trs:           76,
  trsDisp:       88,
  trsPerf:       92,
  trsQual:       94,
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

const caMargeChartConfig: ChartConfig = {
  ca:   { label: 'CA',              color: 'var(--chart-1)' },
  cout: { label: 'Coût production', color: 'var(--chart-2)' },
}

const MIX_VENTES = [
  { name: 'Originale',   value: 42, color: 'var(--chart-1)' },
  { name: 'Vanille',     value: 28, color: 'var(--chart-2)' },
  { name: 'Gingembre',   value: 16, color: 'var(--chart-3)' },
  { name: 'Menthe',      value: 8,  color: 'var(--chart-4)' },
  { name: 'Citronnelle', value: 6,  color: 'var(--chart-5)' },
]

const mixChartConfig: ChartConfig = {
  Originale:   { label: 'Originale',   color: 'var(--chart-1)' },
  Vanille:     { label: 'Vanille',     color: 'var(--chart-2)' },
  Gingembre:   { label: 'Gingembre',   color: 'var(--chart-3)' },
  Menthe:      { label: 'Menthe',      color: 'var(--chart-4)' },
  Citronnelle: { label: 'Citronnelle', color: 'var(--chart-5)' },
}

const MARGE_PRODUITS = [
  { produit: 'Vanille',   ecart: +6.8, tendance: 'up'   as const, cause: 'Surconsommation MP · rebuts ligne C.' },
  { produit: 'Gingembre', ecart: -2.1, tendance: 'down' as const, cause: 'Rendement matière amélioré · lot G-114.' },
  { produit: 'Originale', ecart: +1.5, tendance: 'up'   as const, cause: 'Légère dérive coût eau · sous investigation.' },
]

type AlertePrio = {
  id:     string
  niveau: 'rouge' | 'jaune' | 'bleu' | 'vert'
  titre:  string
  detail: string
  lien?:  string
}

const ALERTES_PRIORITAIRES: AlertePrio[] = [
  { id: 'a1', niveau: 'rouge', titre: 'Gousses de vanille : 3 kg restants',   detail: 'Sous stock de sécurité · OF Vanille à risque sous 5j', lien: '/stocks'            },
  { id: 'a2', niveau: 'jaune', titre: 'Lot PF-20260524-0039 · DLC dans 8j',      detail: '142 bouteilles · à prioriser sur ventes Dakar',        lien: '/stocks'            },
  { id: 'a3', niveau: 'bleu',  titre: 'MRP : 4 composants à commander',       detail: 'Calcul à partir des OF planifiés · Voir suggestions',   lien: '/approvisionnement' },
  { id: 'a4', niveau: 'vert',  titre: 'Bouteilles 1L · réception confirmée',  detail: '2 400 u reçues · Verrerie Dakar · Lot OK',              lien: '/reception'         },
]

const ALERTE_CONFIG: Record<AlertePrio['niveau'], {
  icon: React.ElementType
  variant: 'destructive' | 'warning' | 'info' | 'success'
}> = {
  rouge: { icon: AlertTriangle, variant: 'destructive' },
  jaune: { icon: Clock,         variant: 'warning'     },
  bleu:  { icon: Info,          variant: 'info'        },
  vert:  { icon: CheckCircle2,  variant: 'success'     },
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtM(v: number) {
  return `${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiDir({ label, value, sub, bgClass, iconBgClass, iconColorClass, icon: Icon, href }: {
  label: string
  value: string
  sub: string
  bgClass: string
  iconBgClass: string
  iconColorClass: string
  icon: React.ElementType
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`size-4 ${iconColorClass}`} />
        </div>
        <span className="text-sm font-semibold">{label}</span>
        {href && <ArrowRight className="size-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="bg-white dark:bg-background rounded-lg px-3 py-2.5 shadow-sm">
        <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-tight">{sub}</p>
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`group rounded-xl p-3 transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-lg cursor-pointer block ${bgClass}`}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={`rounded-xl p-3 transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-lg cursor-default ${bgClass}`}>
      {inner}
    </div>
  )
}

// ── Marge produit card ────────────────────────────────────────────────────────

function MargeCard({ produit, ecart, tendance, cause }: typeof MARGE_PRODUITS[0]) {
  const bad = ecart > 0
  const strong = Math.abs(ecart) >= 4

  const palette = bad
    ? { text: 'text-red-600 dark:text-red-400', bar: strong ? 'bg-red-500' : 'bg-red-300', badge: 'bg-red-100 dark:bg-red-900/40', icon: 'text-red-600 dark:text-red-400', strip: strong ? 'bg-red-500' : 'bg-red-400' }
    : { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/40', icon: 'text-emerald-600 dark:text-emerald-400', strip: 'bg-emerald-500' }

  const Icon = tendance === 'up' ? TrendingUp : TrendingDown
  const barWidth = `${Math.min(Math.abs(ecart) * 12, 100)}%`

  const bgClass = bad
    ? strong
      ? 'bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-card'
      : 'bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-card'
    : 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-card'

  return (
    <Card className={`border-0 ring-0 shadow-none rounded-xl py-0 gap-0 ${bgClass}`}>
      <CardContent className="p-3 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold leading-none">{produit}</p>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${palette.badge}`}>
            <Icon className={`size-[14px] ${palette.icon}`} />
          </div>
        </div>

        {/* Écart */}
        <div>
          <p className={`text-2xl font-black tracking-tight leading-none ${palette.text}`}>
            {ecart > 0 ? '+' : ''}{ecart}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">écart vs coût cible</p>
        </div>

        {/* Barre de sévérité */}
        <div className="h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${palette.bar}`} style={{ width: barWidth }} />
        </div>

        {/* Cause */}
        <p className="text-[11px] text-muted-foreground truncate" title={cause}>{cause}</p>
      </CardContent>
    </Card>
  )
}

// ── TRS gauge (SVG pur, semi-circulaire) ─────────────────────────────────────

const TRS_SEGMENTS = [
  { from: 0,  to: 60,  color: '#ef4444' },  // rouge
  { from: 60, to: 70,  color: '#f97316' },  // orange
  { from: 70, to: 80,  color: '#eab308' },  // jaune
  { from: 80, to: 90,  color: '#3b82f6' },  // bleu
  { from: 90, to: 100, color: '#22c55e' },  // vert
]

function TrsGauge({ value }: { value: number }) {
  const cx = 50, cy = 50, r = 42, sw = 7

  // Conversion valeur (0-100) → coordonnées sur le demi-cercle
  // 0% = gauche (angle π), 100% = droite (angle 0)
  const pt = (v: number) => ({
    x: cx - r * Math.cos((v / 100) * Math.PI),
    y: cy - r * Math.sin((v / 100) * Math.PI),
  })

  const arc = (v1: number, v2: number) => {
    const s = pt(v1), e = pt(v2)
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
  }

  // Aiguille
  const angle = Math.PI * (1 - value / 100)
  const nl = r - sw - 1
  const nx = (cx + nl * Math.cos(angle)).toFixed(2)
  const ny = (cy - nl * Math.sin(angle)).toFixed(2)

  return (
    <svg viewBox="0 0 100 56" className="w-full h-full overflow-visible" aria-label={`TRS ${value}%`}>
      {/* Fond gris */}
      <path d={arc(0, 100)} fill="none" stroke="#e5e7eb" strokeWidth={sw} strokeLinecap="butt" />
      {/* Segments colorés avec léger espacement */}
      {TRS_SEGMENTS.map((seg, i) => (
        <path
          key={seg.from}
          d={arc(
            seg.from + (i > 0 ? 1 : 0),
            seg.to - (i < TRS_SEGMENTS.length - 1 ? 1 : 0),
          )}
          fill="none"
          stroke={seg.color}
          strokeWidth={sw}
          strokeLinecap={i === 0 || i === TRS_SEGMENTS.length - 1 ? 'round' : 'butt'}
        />
      ))}
      {/* Aiguille */}
      <line x1={cx} y1={cy} x2={nx} y2={ny}
        stroke="#1f2937" strokeWidth={1.5} strokeLinecap="round" />
      {/* Pivot */}
      <circle cx={cx} cy={cy} r={3.5} fill="white" stroke="#1f2937" strokeWidth={1.5} />
    </svg>
  )
}

// ── TRS KPI card ──────────────────────────────────────────────────────────────

function TrsKpiCard({ href }: { href: string }) {
  return (
    <Link href={href} className="group rounded-xl p-3 transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-lg cursor-pointer block bg-teal-50 dark:bg-teal-950/30">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-100 dark:bg-teal-900/50">
          <Factory className="size-4 text-teal-600 dark:text-teal-400" />
        </div>
        <span className="text-sm font-semibold">TRS atelier</span>
        <ArrowRight className="size-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="bg-white dark:bg-background rounded-lg px-3 py-2.5 shadow-sm flex items-center gap-2">
        {/* Texte */}
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold tracking-tight leading-none">{KPI_DATA.trs}%</p>
          <p className="text-xs text-muted-foreground mt-1 leading-tight truncate">
            Disp {KPI_DATA.trsDisp} · Perf {KPI_DATA.trsPerf} · Qual {KPI_DATA.trsQual}
          </p>
        </div>
        {/* Jauge */}
        <div className="w-[72px] h-[42px] shrink-0">
          <TrsGauge value={KPI_DATA.trs} />
        </div>
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const locale = useLocale()
  const [periodeCA, setPeriodeCA] = React.useState<PeriodValue>({ preset: '6m' })
  const [periodeStock, setPeriodeStock] = React.useState<PeriodValue>({ preset: '6m' })

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        <KpiDir
          label="CA du mois"
          value={fmtM(KPI_DATA.caMois)}
          sub={`FCFA · ${KPI_DATA.caVsM1 > 0 ? '+' : ''}${KPI_DATA.caVsM1}% vs M-1`}
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900/50"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={TrendingUp}
        />
        <KpiDir
          label="Marge brute"
          value={`${KPI_DATA.margeBrutePct.toFixed(1)}%`}
          sub={`${fmtM(KPI_DATA.margeBruteVal)} FCFA`}
          bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/50"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          icon={BarChart3}
          href={`/${locale}/analyse-marge`}
        />
        <TrsKpiCard href={`/${locale}/production`} />
        <KpiDir
          label="Valeur stock"
          value={fmtM(KPI_DATA.valeurStock)}
          sub="FCFA · MP+PF+AC"
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900/50"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={Boxes}
          href={`/${locale}/stocks`}
        />
      </div>

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart CA & Coût */}
        <Card className="lg:col-span-2 py-3 gap-2">
          <CardHeader>
            <CardTitle>CA &amp; Marge brute</CardTitle>
            <CardDescription>6 derniers mois · FCFA</CardDescription>
            <CardAction>
              <PeriodPicker value={periodeCA} onChange={setPeriodeCA} defaultPreset="6m" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={caMargeChartConfig} className="h-[200px] w-full">
              <BarChart accessibilityLayer data={CA_MARGE_DATA}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="mois" tickLine={false} tickMargin={10} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" formatter={(v) => `${fmtM(Number(v))} FCFA`} />}
                />
                <Bar dataKey="ca"   fill="var(--color-ca)"   radius={4} />
                <Bar dataKey="cout" fill="var(--color-cout)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 font-medium leading-none">
              En hausse de +{KPI_DATA.caVsM1}% ce mois <TrendingUp className="size-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              CA vs coût de production sur la période sélectionnée
            </div>
          </CardFooter>
        </Card>

        {/* Donut mix ventes */}
        <Card className="py-3 gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/50">
                <Layers className="size-[15px] text-violet-600 dark:text-violet-400" />
              </div>
              Répartition du stock
            </CardTitle>
            <CardAction>
              <PeriodPicker value={periodeStock} onChange={setPeriodeStock} defaultPreset="6m" />
            </CardAction>
          </CardHeader>
          <CardContent className="pb-2">
            <ChartContainer config={mixChartConfig} className="mx-auto h-[220px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} nameKey="name" hideLabel />} />
                <Pie
                  data={MIX_VENTES}
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                              {MIX_VENTES[0].value}%
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-[10px]">
                              {MIX_VENTES[0].name}
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                  {MIX_VENTES.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {MIX_VENTES.map((e) => (
                <div key={e.name} className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                  <span className="text-[11px] text-muted-foreground truncate flex-1">{e.name}</span>
                  <span className="text-[11px] font-semibold tabular-nums">{e.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Analyse de marge + Alertes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Analyse de marge */}
        <Card className="lg:col-span-3 py-3 gap-3">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-100 dark:bg-rose-900/50">
                <BarChart3 className="size-[15px] text-rose-600 dark:text-rose-400" />
              </div>
              Analyse de marge
            </CardTitle>
            <CardAction className="row-span-1 self-center">
              <Link href={`/${locale}/analyse-marge`} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                Détail <ArrowRight className="size-3" />
              </Link>
            </CardAction>
            <CardDescription className="mt-2">Écart vs coût cible · 3 produits</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {MARGE_PRODUITS.map((m) => <MargeCard key={m.produit} {...m} />)}
          </CardContent>
        </Card>

        {/* Alertes */}
        <Card className="lg:col-span-2 py-3 gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/50">
                <Bell className="size-[15px] text-amber-600 dark:text-amber-400" />
              </div>
              Alertes prioritaires
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {ALERTES_PRIORITAIRES.map((a) => {
              const cfg = ALERTE_CONFIG[a.niveau]
              const alertEl = (
                <Alert variant={cfg.variant} icon={cfg.icon as never} title={a.titre}>
                  {a.detail}
                </Alert>
              )
              return a.lien
                ? <Link key={a.id} href={`/${locale}${a.lien}`} className="block hover:opacity-80 transition-opacity">{alertEl}</Link>
                : <div key={a.id}>{alertEl}</div>
            })}
          </CardContent>
        </Card>

      </div>


    </div>
  )
}
