'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceStatus, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types/merchant'
import { recordInvoicePayment } from '@/lib/db-client'
import { CheckCircle2, Clock, AlertCircle, XCircle, CreditCard, X, Loader2 } from 'lucide-react'

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

const PAYMENT_METHODS: PaymentMethod[] = [
  'virement', 'wave', 'orange_money', 'mtn_momo', 'moov_money', 'especes', 'cheque', 'stripe',
]

type InvoiceRow = {
  id: string
  amount_xof: number
  status: string
  due_at: string
  paid_at: string | null
  payment_method: string | null
  payment_reference: string | null
  factory?: { name?: string; code?: string; org?: { name?: string } }
}

export function FacturesClient({ initialInvoices }: { initialInvoices: InvoiceRow[] }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices)
  const [modalId, setModalId]   = useState<string | null>(null)
  const [method, setMethod]     = useState<PaymentMethod>('virement')
  const [reference, setReference] = useState('')
  const [note, setNote]         = useState('')
  const [paidAt, setPaidAt]     = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]     = useState(false)

  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_xof, 0)
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount_xof, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount_xof, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  function openModal(id: string) {
    setModalId(id)
    setMethod('virement')
    setReference('')
    setNote('')
    setPaidAt(new Date().toISOString().split('T')[0])
  }

  async function handleSave() {
    if (!modalId) return
    setSaving(true)
    await recordInvoicePayment(modalId, { method, reference, note, paid_at: paidAt })
    setInvoices(prev => prev.map(i =>
      i.id === modalId
        ? { ...i, status: 'paid', paid_at: paidAt, payment_method: method, payment_reference: reference || null }
        : i
    ))
    setSaving(false)
    setModalId(null)
  }

  const modalInvoice = invoices.find(i => i.id === modalId)

  return (
    <div className="space-y-6 max-w-5xl">

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
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Paiement</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((inv) => {
              const status = inv.status as InvoiceStatus
              return (
                <tr key={inv.id} className={`hover:bg-gray-50 ${status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{inv.factory?.org?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 font-mono">{inv.factory?.name} {inv.factory?.code ? `(${inv.factory.code})` : ''}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{formatCurrency(inv.amount_xof)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
                      {STATUS_ICONS[status]}
                      {STATUS_LABELS[status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(inv.due_at)}</td>
                  <td className="px-4 py-3">
                    {inv.paid_at ? (
                      <div>
                        <p className="text-xs text-gray-700">{formatDate(inv.paid_at)}</p>
                        {inv.payment_method && (
                          <p className="text-xs text-gray-400">{PAYMENT_METHOD_LABELS[inv.payment_method as PaymentMethod]}</p>
                        )}
                        {inv.payment_reference && (
                          <p className="text-xs font-mono text-gray-400">{inv.payment_reference}</p>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(status === 'pending' || status === 'overdue') && (
                      <button
                        onClick={() => openModal(inv.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Enregistrer paiement
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal paiement */}
      {modalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setModalId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">

            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Enregistrer un paiement</p>
                  {modalInvoice && (
                    <p className="text-xs text-gray-400">
                      {modalInvoice.factory?.org?.name} · {formatCurrency(modalInvoice.amount_xof)}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setModalId(null)} disabled={saving} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mode de paiement *</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as PaymentMethod)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date de paiement *</label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={e => setPaidAt(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Référence{method === 'virement' ? ' (N° virement)' : method === 'cheque' ? ' (N° chèque)' : ' (réf. transaction)'}
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder={method === 'virement' ? 'ex : VIR-2026-00142' : method === 'wave' ? 'ex : WV-XXXX-XXXX' : ''}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Note (optionnel)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Banque émettrice, remarque..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setModalId(null)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Enregistrement…</>
                  : <><CheckCircle2 className="w-3.5 h-3.5" />Marquer comme payée</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
