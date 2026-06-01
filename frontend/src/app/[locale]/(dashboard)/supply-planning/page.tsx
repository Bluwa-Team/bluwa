'use client'

import { Factory, CircleDot, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

// ── Mock data ──────────────────────────────────────────────────────────────────

const KPI = {
  semainesPlannifiees: 4,
  tauxCouverture:      82,    // % capacité utilisée
  produitsEnTension:   2,
  totalUnitesProd:     47_200,
}

type Statut = 'ok' | 'tension' | 'surcharge'

interface PlanLigne {
  produit:    string
  demande:    number
  capacite:   number
  planifie:   number
  couverture: number
  statut:     Statut
  action?:    string
}

const PLAN: PlanLigne[] = [
  { produit: 'Jus Originale',   demande: 14300, capacite: 16000, planifie: 14300, couverture: 100, statut: 'ok'       },
  { produit: 'Jus Vanille',     demande:  9650, capacite:  8000, planifie:  8000, couverture:  83, statut: 'tension',  action: 'Heure sup. semaine 2 ou report S+5'   },
  { produit: 'Jus Gingembre',   demande:  5100, capacite:  6000, planifie:  5100, couverture: 100, statut: 'ok'       },
  { produit: 'Jus Menthe',      demande:  2150, capacite:  4000, planifie:  2150, couverture: 100, statut: 'ok'       },
  { produit: 'Jus Citronnelle', demande:  2200, capacite:  2000, planifie:  2000, couverture:  91, statut: 'tension',  action: 'Externaliser 200 u ou décaler livraison' },
]

const SEMAINES = [
  { sem: 'S+1', charge: 78,  alerte: false },
  { sem: 'S+2', charge: 95,  alerte: true  },
  { sem: 'S+3', charge: 71,  alerte: false },
  { sem: 'S+4', charge: 86,  alerte: false },
]

const STATUT_CONFIG: Record<Statut, { icon: React.ElementType; color: string; label: string; bar: string }> = {
  ok:       { icon: CheckCircle2,  color: 'text-emerald-600 dark:text-emerald-400', label: 'OK',      bar: 'bg-emerald-500' },
  tension:  { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400',    label: 'Tension', bar: 'bg-amber-500'   },
  surcharge:{ icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',        label: 'Charge',  bar: 'bg-red-500'     },
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupplyPlanningPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Supply Planning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Équilibrez la demande et la capacité de production avant de lancer le MRP.
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
          { label: 'Semaines planifiées', value: KPI.semainesPlannifiees,              sub: 'Horizon courant',            color: 'bg-blue-50 dark:bg-blue-950/30',    icon: Clock         },
          { label: 'Taux d\'utilisation', value: `${KPI.tauxCouverture}%`,             sub: 'Capacité atelier',           color: 'bg-teal-50 dark:bg-teal-950/30',    icon: Factory       },
          { label: 'Produits en tension', value: KPI.produitsEnTension,               sub: 'Capacité < demande',          color: 'bg-amber-50 dark:bg-amber-950/30',  icon: AlertTriangle },
          { label: 'Unités à produire',   value: KPI.totalUnitesProd.toLocaleString('fr-FR'), sub: '4 semaines glissantes', color: 'bg-violet-50 dark:bg-violet-950/30', icon: TrendingUp    },
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

      {/* Charge par semaine */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SEMAINES.map(s => (
          <div key={s.sem} className={`rounded-xl border p-4 space-y-2 ${s.alerte ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20' : 'bg-card'}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">{s.sem}</p>
              {s.alerte && <AlertTriangle className="size-3.5 text-amber-500" />}
            </div>
            <p className={`text-2xl font-bold ${s.charge >= 90 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {s.charge}%
            </p>
            <p className="text-xs text-muted-foreground">utilisation capacité</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${s.charge >= 90 ? 'bg-amber-500' : s.charge >= 80 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                style={{ width: `${s.charge}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Plan par produit */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Plan de production — Demande vs Capacité</h2>
          <span className="text-xs text-muted-foreground">4 semaines · toutes références</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Produit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Demande (u)</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Capacité (u)</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Planifié (u)</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Couverture</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Statut / Action</th>
              </tr>
            </thead>
            <tbody>
              {PLAN.map((p, i) => {
                const cfg = STATUT_CONFIG[p.statut]
                const Icon = cfg.icon
                return (
                  <tr key={p.produit} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-5 py-3 font-medium">{p.produit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.demande.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.capacite.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{p.planifie.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${p.couverture}%` }} />
                        </div>
                        <span className="text-xs tabular-nums w-8 text-right">{p.couverture}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-1.5">
                        <Icon className={`size-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                        <span className={`text-xs ${p.action ? 'text-muted-foreground' : cfg.color + ' font-medium'}`}>
                          {p.action ?? cfg.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
