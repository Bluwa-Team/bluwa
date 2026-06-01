'use client'

import { ShoppingBag, CalendarClock, CircleDot, TrendingUp, AlertTriangle } from 'lucide-react'

// ── Mock data ──────────────────────────────────────────────────────────────────

const KPI = {
  commandesFermes: 18,
  unitesTotales:   47_200,
  horizonJours:    42,
  valeurFCFA:      28_400_000,
}

const COMMANDES = [
  { id: 'CMD-0089', client: 'Auchan Dakar',       produit: 'Jus Originale',  qte: 4800, livraison: '2026-06-10', statut: 'confirmé'  },
  { id: 'CMD-0090', client: 'Casino Abidjan',      produit: 'Jus Vanille',    qte: 3200, livraison: '2026-06-12', statut: 'confirmé'  },
  { id: 'CMD-0091', client: 'Carrefour Lomé',      produit: 'Jus Gingembre',  qte: 2400, livraison: '2026-06-14', statut: 'en attente'},
  { id: 'CMD-0092', client: 'Jumia Sénégal',       produit: 'Jus Originale',  qte: 1600, livraison: '2026-06-18', statut: 'confirmé'  },
  { id: 'CMD-0093', client: 'Marché Central Dakar',produit: 'Jus Menthe',     qte: 900,  livraison: '2026-06-20', statut: 'urgent'    },
  { id: 'CMD-0094', client: 'Auchan Dakar',        produit: 'Jus Citronnelle',qte: 1200, livraison: '2026-06-25', statut: 'confirmé'  },
]

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  confirmé:  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', label: 'Confirmé'   },
  'en attente': { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-700 dark:text-amber-300',    label: 'En attente' },
  urgent:    { bg: 'bg-red-100 dark:bg-red-900/40',         text: 'text-red-700 dark:text-red-300',        label: '⚡ Urgent'   },
}

// Agrégation par semaine
const PAR_SEMAINE = [
  { sem: 'S+1 (09 juin)', unites: 8000,  commandes: 4 },
  { sem: 'S+2 (16 juin)', unites: 12400, commandes: 6 },
  { sem: 'S+3 (23 juin)', unites: 9800,  commandes: 5 },
  { sem: 'S+4 (30 juin)', unites: 17000, commandes: 3 },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DemandeClientsPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plan de demande</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Commandes fermes et signaux de demande confirmés — alimentent directement le Supply Planning.
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
          { label: 'Commandes fermes', value: KPI.commandesFermes,              sub: '4 prochaines semaines',    color: 'bg-blue-50 dark:bg-blue-950/30',    icon: ShoppingBag   },
          { label: 'Unités à livrer',  value: KPI.unitesTotales.toLocaleString('fr-FR'), sub: 'Toutes références', color: 'bg-teal-50 dark:bg-teal-950/30',    icon: TrendingUp    },
          { label: 'Horizon couvert',  value: `${KPI.horizonJours}j`,           sub: 'Commandes enregistrées',   color: 'bg-violet-50 dark:bg-violet-950/30', icon: CalendarClock },
          { label: 'Valeur totale',    value: `${(KPI.valeurFCFA/1_000_000).toFixed(1)}M`, sub: 'FCFA · commandes fermes', color: 'bg-emerald-50 dark:bg-emerald-950/30', icon: TrendingUp },
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
        {PAR_SEMAINE.map(s => (
          <div key={s.sem} className="rounded-xl border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{s.sem}</p>
            <p className="text-xl font-bold tabular-nums">{s.unites.toLocaleString('fr-FR')} u</p>
            <p className="text-xs text-muted-foreground">{s.commandes} commandes</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.min((s.unites / 20000) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Alerte urgent */}
      <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3">
        <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-sm text-red-700 dark:text-red-300">
          <span className="font-semibold">CMD-0093</span> — Marché Central Dakar · Jus Menthe · 900 u · livraison urgente le 20 juin.
          Vérifier la disponibilité stock avant confirmation.
        </p>
      </div>

      {/* Tableau des commandes */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold">Commandes fermes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">N° commande</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qté (u)</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Livraison</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {COMMANDES.map((c, i) => {
                const s = STATUT_STYLE[c.statut]
                return (
                  <tr key={c.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.id}</td>
                    <td className="px-4 py-3 font-medium">{c.client}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.produit}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{c.qte.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(c.livraison).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
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
