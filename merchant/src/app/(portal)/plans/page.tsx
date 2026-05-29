import { getPlans, getFactoriesWithPlan, getInstallFees, getServiceOrders, getInvoices } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { Package, Wrench, Users, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const PLAN_ACCENT: Record<string, { border: string; badge: string; text: string }> = {
  Starter:    { border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-600',     text: 'text-gray-900' },
  Growth:     { border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     text: 'text-blue-700' },
  Enterprise: { border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-700' },
}

const SIZE_TARGET: Record<string, string> = {
  tpe:   'TPE · 1–3 users',
  pme:   "PME · jusqu'à 15 users",
  grande: 'Grande structure · illimité',
}

export default async function PlansOverviewPage() {
  const [plans, factories, installFees, serviceOrders, invoices] = await Promise.all([
    getPlans(),
    getFactoriesWithPlan(),
    getInstallFees(),
    getServiceOrders(),
    getInvoices(),
  ])

  const activeFac    = factories.filter((f) => f.subscription_status === 'ACTIVE')
  const mrr          = activeFac.reduce((s, f) => s + (f.plan?.price_monthly ?? 0), 0)
  const installPaid  = installFees.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount_xof, 0)
  const installTotal = installFees.reduce((s, f) => s + f.amount_xof, 0)
  const servicePaid  = serviceOrders.filter((s) => s.status === 'paid').reduce((s, o) => s + o.amount_xof, 0)
  const overdueInv   = invoices.filter((i) => i.status === 'overdue').length

  const QUICK_LINKS = [
    { href: '/plans/abonnements', label: 'Abonnements',       count: `${activeFac.length} sites actifs`,              color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
    { href: '/plans/installation', label: 'Installation',     count: `${installFees.filter(f => f.status !== 'paid').length} en attente`, color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
    { href: '/plans/services',    label: 'Services',          count: `${serviceOrders.filter(s => ['confirmed','delivered'].includes(s.status)).length} en cours`, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    { href: '/plans/factures',    label: 'Factures',          count: overdueInv > 0 ? `${overdueInv} en retard` : `${invoices.length} factures`, color: overdueInv > 0 ? 'text-red-600' : 'text-emerald-600', bg: overdueInv > 0 ? 'bg-red-50' : 'bg-emerald-50', border: overdueInv > 0 ? 'border-red-100' : 'border-emerald-100' },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-400 mb-3">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">MRR · Abonnements</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(mrr)}</p>
          <p className="text-xs text-gray-400 mt-1.5">{activeFac.length} sites actifs</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-400 mb-3">
            <Wrench className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Frais installation</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(installPaid)}</p>
          <p className="text-xs text-gray-400 mt-1.5">sur {formatCurrency(installTotal)} · {installFees.filter(f => f.status !== 'paid').length} en attente</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-400 mb-3">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Services encaissés</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(servicePaid)}</p>
          <p className="text-xs text-gray-400 mt-1.5">{serviceOrders.filter(s => ['confirmed','delivered'].includes(s.status)).length} prestations en cours</p>
        </div>
      </div>

      {/* Raccourcis sous-pages */}
      <div className="grid grid-cols-4 gap-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-between p-4 rounded-xl border ${link.border} ${link.bg} hover:opacity-80 transition-opacity`}
          >
            <div>
              <p className={`text-sm font-semibold ${link.color}`}>{link.label}</p>
              <p className={`text-xs mt-0.5 ${link.color} opacity-70`}>{link.count}</p>
            </div>
            <ArrowRight className={`w-4 h-4 ${link.color} opacity-50`} />
          </Link>
        ))}
      </div>

      {/* Grille plans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Plans d&apos;abonnement</h2>
          <Link href="/plans/abonnements" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            Voir les abonnements →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => {
            const onPlan  = factories.filter((f) => f.subscription_plan_id === plan.id && f.subscription_status === 'ACTIVE').length
            const modules = (plan.features_config as { modules?: string[] }).modules ?? []
            const accent  = PLAN_ACCENT[plan.name] ?? PLAN_ACCENT.Starter
            const planMrr = onPlan * plan.price_monthly
            return (
              <div key={plan.id} className={`bg-white rounded-xl border p-5 ${accent.border}`}>
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-gray-900">{plan.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accent.badge}`}>
                    {onPlan} site{onPlan !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">{SIZE_TARGET[plan.target_size]}</p>

                <div className="space-y-0.5 mb-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-bold ${accent.text}`}>{formatCurrency(plan.price_monthly)}</span>
                    <span className="text-xs text-gray-400">/mois</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-gray-500">{formatCurrency(plan.price_monthly_annual)}/mois annuel</span>
                  </div>
                </div>

                {onPlan > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 mb-4">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{formatCurrency(planMrr)}/mois générés</span>
                  </div>
                )}

                <div className="space-y-1 pt-3 border-t border-gray-100">
                  {modules.map((mod) => (
                    <p key={mod} className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span>
                      <span className="uppercase tracking-wide">{mod}</span>
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
