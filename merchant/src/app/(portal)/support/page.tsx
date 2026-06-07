import { getTickets } from '@/lib/db'
import { TicketStatus, TicketPriority } from '@/types/merchant'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
}

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-amber-500',
  critical: 'text-red-600 font-semibold',
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Faible',
  medium: 'Normal',
  high: 'Haute',
  critical: 'Critique',
}

export default async function SupportPage() {
  const tickets = await getTickets()
  const open = tickets.filter((t) => t.status === 'open').length
  const critical = tickets.filter((t) => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Support</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {open} ticket{open > 1 ? 's' : ''} ouvert{open > 1 ? 's' : ''}
          {critical > 0 && <span className="text-red-600 font-medium"> · {critical} critique</span>}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sujet</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Site</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Priorité</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assigné à</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Mis à jour</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((ticket) => {
              return (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/support/${ticket.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {ticket.subject}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{ticket.messages.length} message{ticket.messages.length > 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900 text-sm">{ticket.factory?.name ?? '—'}</span>
                    {ticket.factory?.org && (
                      <p className="text-xs text-gray-400 mt-0.5">{ticket.factory.org.name}</p>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-xs ${PRIORITY_STYLES[ticket.priority as keyof typeof PRIORITY_STYLES]}`}>
                    {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status as keyof typeof STATUS_STYLES]}`}>
                      {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{ticket.assigned_to ?? <span className="text-amber-500">Non assigné</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(ticket.updated_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
