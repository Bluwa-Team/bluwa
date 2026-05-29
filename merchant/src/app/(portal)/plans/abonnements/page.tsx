import { getFactoriesWithPlan, getOrgs } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'

const SUB_STATUS = {
  ACTIVE:   { label: 'Actif',    style: 'bg-emerald-100 text-emerald-700' },
  PAST_DUE: { label: 'Impayé',  style: 'bg-red-100 text-red-700' },
  CANCELED: { label: 'Annulé',  style: 'bg-gray-100 text-gray-500' },
}

const PLAN_BADGE: Record<string, string> = {
  Starter:    'bg-gray-100 text-gray-600',
  Growth:     'bg-blue-100 text-blue-700',
  Enterprise: 'bg-violet-100 text-violet-700',
}

export default async function AbonnementsPage() {
  const [factories, orgs] = await Promise.all([getFactoriesWithPlan(), getOrgs()])

  const active   = factories.filter((f) => f.subscription_status === 'ACTIVE')
  const pastDue  = factories.filter((f) => f.subscription_status === 'PAST_DUE')
  const mrr      = active.reduce((s, f) => s + (f.plan?.price_monthly ?? 0), 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/plans" className="hover:text-gray-600">Plans & Billing</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Abonnements</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">MRR total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(mrr)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Sites actifs</p>
          <p className="text-2xl font-bold text-emerald-600">{active.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Impayés</p>
          <p className={`text-2xl font-bold ${pastDue.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{pastDue.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Sites sans abonnement</p>
          <p className="text-2xl font-bold text-gray-400">{factories.filter(f => !f.subscription_plan_id).length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Tous les sites ({factories.length})</h2>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            {formatCurrency(mrr)}/mois
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Site</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Organisation</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">MRR site</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Depuis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {factories.map((f) => {
              const org = orgs.find((o) => o.id === f.organization_id)
              const st  = f.subscription_status ? SUB_STATUS[f.subscription_status] : null
              return (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{f.code}</span>
                      <span className="font-medium text-gray-900">{f.name}</span>
                      {!f.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inactif</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-10">{f.location_city}, {f.location_country}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/orgs/${f.organization_id}`} className="text-gray-700 hover:text-blue-600 text-sm">
                      {org?.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {f.plan ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[f.plan.name] ?? 'bg-gray-100 text-gray-600'}`}>
                        {f.plan.name}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {st ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.style}`}>{st.label}</span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-700">
                    {f.plan && f.subscription_status === 'ACTIVE' ? formatCurrency(f.plan.price_monthly) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{formatDate(f.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
