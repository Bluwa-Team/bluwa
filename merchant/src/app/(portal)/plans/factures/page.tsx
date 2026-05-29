import { getInvoices } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceStatus } from '@/types/merchant'
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-emerald-100 text-emerald-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'En attente', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée',
}
const STATUS_ICONS: Record<InvoiceStatus, React.ReactNode> = {
  paid:      <CheckCircle2 className="w-3.5 h-3.5" />,
  pending:   <Clock className="w-3.5 h-3.5" />,
  overdue:   <AlertCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
}

export default async function FacturesPage() {
  const invoices = await getInvoices()

  const totalPaid    = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount_xof, 0)
  const totalPending = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount_xof, 0)
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount_xof, 0)
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/plans" className="hover:text-gray-600">Plans & Billing</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Factures SaaS</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Payées</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.status === 'paid').length} factures</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">En attente</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.status === 'pending').length} factures</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">En retard</p>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCurrency(totalOverdue)}</p>
          <p className="text-xs text-gray-400 mt-1">{overdueCount} factures</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Total émis</p>
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          <p className="text-xs text-gray-400 mt-1">toutes factures</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Toutes les factures ({invoices.length})</h2>
          {overdueCount > 0 && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
              {overdueCount} en retard
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Site / Organisation</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Montant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Échéance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Payée le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((inv) => {
              const row = inv as typeof inv & { factory?: { name?: string; code?: string; org?: { name?: string } } }
              const status = inv.status as InvoiceStatus
              return (
                <tr key={inv.id} className={`hover:bg-gray-50 ${status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.factory?.org?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.factory?.name} {row.factory?.code ? `(${row.factory.code})` : ''}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{formatCurrency(inv.amount_xof)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
                      {STATUS_ICONS[status]}
                      {STATUS_LABELS[status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(inv.due_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
