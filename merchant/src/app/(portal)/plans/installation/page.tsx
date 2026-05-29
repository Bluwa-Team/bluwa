import { getInstallFees } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const STATUS = {
  paid:    { label: 'Payé',       style: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'Partiel',    style: 'bg-amber-100 text-amber-700' },
  pending: { label: 'En attente', style: 'bg-red-100 text-red-700' },
}

const SIZE_LABELS: Record<string, string> = { tpe: 'TPE', pme: 'PME', grande: 'Grande' }
const SIZE_AMOUNTS: Record<string, number> = { tpe: 150000, pme: 500000, grande: 1500000 }

export default async function InstallationPage() {
  const fees = await getInstallFees()

  const total   = fees.reduce((s, f) => s + f.amount_xof, 0)
  const paid    = fees.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount_xof, 0)
  const pending = fees.filter((f) => f.status !== 'paid').reduce((s, f) => s + f.amount_xof, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/plans" className="hover:text-gray-600">Plans & Billing</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Frais d&apos;installation</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Total facturable</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-400 mt-1">{fees.length} sites</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Encaissé</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paid)}</p>
          <p className="text-xs text-gray-400 mt-1">{fees.filter(f => f.status === 'paid').length} payés</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">À encaisser</p>
          <p className={`text-2xl font-bold ${pending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{formatCurrency(pending)}</p>
          <p className="text-xs text-gray-400 mt-1">{fees.filter(f => f.status !== 'paid').length} en attente</p>
        </div>
      </div>

      {/* Grille tarifaire de référence */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(SIZE_AMOUNTS).map(([size, amount]) => (
          <div key={size} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{SIZE_LABELS[size]}</p>
              <p className="text-sm text-gray-600 mt-0.5">{size === 'tpe' ? '1–10 users' : size === 'pme' ? '10–50 users' : '50+ users'}</p>
            </div>
            <p className="text-base font-bold text-gray-800">{formatCurrency(amount)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Détail par site ({fees.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Site</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Taille</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Montant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Payé le</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fees.map((fee) => {
              const feeRow = fee as typeof fee & { factory?: { name?: string; code?: string; organization?: { name?: string } } }
              const st = STATUS[fee.status as keyof typeof STATUS]
              return (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{feeRow.factory?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{feeRow.factory?.organization?.name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{SIZE_LABELS[fee.size]}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{formatCurrency(fee.amount_xof)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.style}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fee.paid_at ? formatDate(fee.paid_at) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fee.notes ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
