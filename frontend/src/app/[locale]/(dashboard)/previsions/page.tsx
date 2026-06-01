'use client'

import { TrendingUp, Target, Package, CircleDot, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// ── Mock data ──────────────────────────────────────────────────────────────────

const KPI = {
  precision:   87,
  deltaPrec:   +3,
  horizon:     8,     // semaines
  produitsActifs: 12,
  biais:       -2.4,  // % sous-estimation moyenne
}

const PREVISIONS = [
  { produit: 'Jus Originale',   semS1: 3200, semS2: 3400, semS3: 3100, semS4: 3600, tendance: 'up'   },
  { produit: 'Jus Vanille',     semS1: 2100, semS2: 2200, semS3: 2050, semS4: 2300, tendance: 'up'   },
  { produit: 'Jus Gingembre',   semS1: 1200, semS2: 1150, semS3: 1300, semS4: 1250, tendance: 'flat' },
  { produit: 'Jus Menthe',      semS1:  600, semS2:  580, semS3:  550, semS4:  520, tendance: 'down' },
  { produit: 'Jus Citronnelle', semS1:  450, semS2:  480, semS3:  500, semS4:  520, tendance: 'up'   },
]

const CHART_DATA = [
  { sem: 'S-4', reel: 9200, prev: 8800 },
  { sem: 'S-3', reel: 9600, prev: 9400 },
  { sem: 'S-2', reel: 8900, prev: 9100 },
  { sem: 'S-1', reel: 9550, prev: 9300 },
  { sem: 'S+1', reel: null, prev: 9500 },
  { sem: 'S+2', reel: null, prev: 9900 },
  { sem: 'S+3', reel: null, prev: 9650 },
  { sem: 'S+4', reel: null, prev: 10200 },
]

const TENDANCE_ICON = {
  up:   <ArrowUpRight className="size-3.5 text-emerald-500" />,
  down: <ArrowDownRight className="size-3.5 text-red-500" />,
  flat: <Minus className="size-3.5 text-muted-foreground" />,
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PrevisionsPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prévisions de la demande</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Anticipez la demande future pour alimenter le Supply Planning et le MRP.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border">
          <CircleDot className="size-3 text-amber-500" />
          Données simulées
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Précision prévision', value: `${KPI.precision}%`, sub: `${KPI.deltaPrec > 0 ? '+' : ''}${KPI.deltaPrec}% vs mois précédent`, color: 'bg-blue-50 dark:bg-blue-950/30', icon: Target },
          { label: 'Horizon planifié',    value: `${KPI.horizon} sem`,  sub: 'Couverture glissante',                                              color: 'bg-violet-50 dark:bg-violet-950/30', icon: TrendingUp },
          { label: 'Produits actifs',     value: `${KPI.produitsActifs}`, sub: 'Références avec prévision',                                       color: 'bg-teal-50 dark:bg-teal-950/30',   icon: Package },
          { label: 'Biais moyen',         value: `${KPI.biais}%`,       sub: 'Sous-estimation structurelle',                                      color: 'bg-amber-50 dark:bg-amber-950/30',  icon: TrendingUp },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className={`rounded-xl p-4 ${color}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Graphique prévisions vs réel */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Prévisions vs Réel — 4 sem. passées + 4 sem. à venir (unités)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHART_DATA} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="sem" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            />
            <Legend iconType="square" iconSize={10} />
            <Bar dataKey="reel" name="Réel"       fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />
            <Bar dataKey="prev" name="Prévision"  fill="hsl(var(--chart-3))" radius={[4,4,0,0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau des prévisions par produit */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold">Prévisions par produit — 4 prochaines semaines (unités)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Produit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">S+1</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">S+2</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">S+3</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">S+4</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {PREVISIONS.map((p, i) => (
                <tr key={p.produit} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                  <td className="px-5 py-3 font-medium">{p.produit}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.semS1.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.semS2.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.semS3.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.semS4.toLocaleString('fr-FR')}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {TENDANCE_ICON[p.tendance as keyof typeof TENDANCE_ICON]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
