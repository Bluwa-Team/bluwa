import { getServiceOrders } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const STATUS = {
  quoted:    { label: 'Devis',     style: 'bg-gray-100 text-gray-500' },
  confirmed: { label: 'Confirmé',  style: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Livré',     style: 'bg-violet-100 text-violet-700' },
  invoiced:  { label: 'Facturé',   style: 'bg-amber-100 text-amber-700' },
  paid:      { label: 'Payé',      style: 'bg-emerald-100 text-emerald-700' },
}

const SERVICE_LABELS: Record<string, string> = {
  formation:           'Formation',
  support_prioritaire: 'Support prioritaire',
  audit_conseil:       'Audit & Conseil',
  migration_donnees:   'Migration données',
}

const SERVICE_PRICE: Record<string, string> = {
  formation:           '50 000 XOF / demi-journée',
  support_prioritaire: '40 000 XOF / mois',
  audit_conseil:       '100–150 000 XOF / jour',
  migration_donnees:   '75 000 XOF / forfait',
}

export default async function ServicesPage() {
  const orders = await getServiceOrders()

  const paid       = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amount_xof, 0)
  const pipeline   = orders.filter((o) => ['confirmed', 'delivered', 'invoiced'].includes(o.status))
  const pipelineCA = pipeline.reduce((s, o) => s + o.amount_xof, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/plans" className="hover:text-gray-600">Plans & Billing</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Services à la carte</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Encaissé</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paid)}</p>
          <p className="text-xs text-gray-400 mt-1">{orders.filter(o => o.status === 'paid').length} prestations</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Pipeline en cours</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(pipelineCA)}</p>
          <p className="text-xs text-gray-400 mt-1">{pipeline.length} prestations</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Devis ouverts</p>
          <p className="text-2xl font-bold text-gray-500">{orders.filter(o => o.status === 'quoted').length}</p>
        </div>
      </div>

      {/* Catalogue */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(SERVICE_LABELS).map(([key, label]) => (
          <div key={key} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400">{SERVICE_PRICE[key]}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Toutes les prestations ({orders.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Service</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Montant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Date prévue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((svc) => {
              const row = svc as typeof svc & { org?: { name?: string }; factory?: { name?: string } | null }
              const st = STATUS[svc.status as keyof typeof STATUS]
              return (
                <tr key={svc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.org?.name ?? '—'}</p>
                    {row.factory && <p className="text-xs text-gray-400">{row.factory.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-700">{SERVICE_LABELS[svc.service_type]}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{svc.description}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-900">{formatCurrency(svc.amount_xof)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.style}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{svc.scheduled_at ? formatDate(svc.scheduled_at) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
