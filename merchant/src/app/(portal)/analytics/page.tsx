import { getOrgs, getInvoices, getFactoriesWithPlan } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Users, DollarSign, AlertCircle, TrendingDown } from 'lucide-react'

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AnalyticsPage() {
  const [orgs, invoices, factories] = await Promise.all([
    getOrgs(),
    getInvoices(),
    getFactoriesWithPlan(),
  ])

  const activeOrgs = orgs.filter((o) => o.status === 'active')
  const trialOrgs = orgs.filter((o) => o.status === 'trial')
  const churnedOrgs = orgs.filter((o) => o.status === 'churned')

  const mrr = factories
    .filter((f) => f.subscription_status === 'ACTIVE')
    .reduce((s, f) => s + (f.plan?.price_monthly ?? 0), 0)
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount_xof, 0)
  const churnRate = orgs.length > 0
    ? ((churnedOrgs.length / orgs.length) * 100).toFixed(1)
    : '0.0'

  // Répartition par plan
  const activeSites = factories.filter((f) => f.subscription_status === 'ACTIVE')
  const planBreakdown = ['Starter', 'Growth', 'Enterprise'].map((name) => ({
    name,
    count: activeSites.filter((f) => f.plan?.name === name).length,
    revenue: activeSites
      .filter((f) => f.plan?.name === name)
      .reduce((s, f) => s + (f.plan?.price_monthly ?? 0), 0),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Analytics SaaS</h1>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="MRR"
          value={formatCurrency(mrr)}
          sub={`${activeSites.length} sites actifs · ${activeOrgs.length} orgs`}
          icon={<DollarSign className="w-4 h-4 text-emerald-700" />}
          color="bg-emerald-100"
        />
        <KpiCard
          label="Total encaissé"
          value={formatCurrency(totalPaid)}
          sub="Toutes factures payées"
          icon={<TrendingUp className="w-4 h-4 text-blue-700" />}
          color="bg-blue-100"
        />
        <KpiCard
          label="En période d'essai"
          value={String(trialOrgs.length)}
          sub="À convertir en payant"
          icon={<Users className="w-4 h-4 text-amber-600" />}
          color="bg-amber-100"
        />
        <KpiCard
          label="Churn rate"
          value={`${churnRate}%`}
          sub={`${churnedOrgs.length} org${churnedOrgs.length > 1 ? 's' : ''} perdue${churnedOrgs.length > 1 ? 's' : ''}`}
          icon={<TrendingDown className="w-4 h-4 text-red-600" />}
          color="bg-red-100"
        />
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <strong>{overdueCount} facture{overdueCount > 1 ? 's' : ''} en retard</strong> — relances à effectuer.
        </div>
      )}

      {/* Répartition par plan */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Répartition par plan</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sites actifs</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Revenu mensuel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">% du MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {planBreakdown.map((p) => (
                <tr key={p.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-700">{p.count}</td>
                  <td className="px-4 py-3 font-mono text-gray-900">{formatCurrency(p.revenue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-1.5 bg-blue-500 rounded-full"
                          style={{ width: mrr > 0 ? `${(p.revenue / mrr) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {mrr > 0 ? `${((p.revenue / mrr) * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
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
