import { getTickets } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { TicketStatus, TicketPriority, TicketMessage } from '@/types/merchant'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'

const STATUS_STYLES: Record<TicketStatus, string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-emerald-100 text-emerald-700',
  closed:      'bg-gray-100 text-gray-500',
}
const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé',
}
const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Faible', medium: 'Normal', high: 'Haute', critical: 'Critique',
}
const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'text-gray-400', medium: 'text-blue-500', high: 'text-amber-500', critical: 'text-red-600 font-semibold',
}
const STATUS_ICONS: Record<TicketStatus, React.ReactNode> = {
  open:        <Clock className="w-4 h-4" />,
  in_progress: <AlertCircle className="w-4 h-4" />,
  resolved:    <CheckCircle2 className="w-4 h-4" />,
  closed:      <XCircle className="w-4 h-4" />,
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tickets = await getTickets()
  const ticket  = tickets.find((t) => t.id === id)
  if (!ticket) notFound()

  const org = (ticket as typeof ticket & { org?: { id: string; name: string } }).org
  const status   = ticket.status   as TicketStatus
  const priority = ticket.priority as TicketPriority

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/support" className="flex items-center gap-1 hover:text-gray-600">
          <ArrowLeft className="w-3.5 h-3.5" />
          Support
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{ticket.subject}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-lg font-semibold text-gray-900 leading-snug">{ticket.subject}</h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_STYLES[status]}`}>
            {STATUS_ICONS[status]}
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-1 border-t border-gray-100 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Organisation</p>
            <p className="font-medium text-gray-800">{org?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Priorité</p>
            <p className={`font-medium ${PRIORITY_STYLES[priority]}`}>{PRIORITY_LABELS[priority]}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Assigné à</p>
            <p className="font-medium text-gray-800">{ticket.assigned_to ?? <span className="text-amber-500 font-normal">Non assigné</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Ouvert le</p>
            <p className="text-gray-600">{formatDate(ticket.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Dernière activité</p>
            <p className="text-gray-600">{formatDate(ticket.updated_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Réf.</p>
            <p className="font-mono text-xs text-gray-500">{ticket.id}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Conversation ({ticket.messages.length} message{ticket.messages.length > 1 ? 's' : ''})
        </h2>
        {(ticket.messages as TicketMessage[]).map((msg) => {
          const isInternal = msg.is_internal
          const isAgent    = msg.author.endsWith('@bluwa.io')
          return (
            <div
              key={msg.id}
              className={`rounded-xl border p-4 ${
                isInternal
                  ? 'bg-amber-50 border-amber-100'
                  : isAgent
                    ? 'bg-blue-50 border-blue-100'
                    : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isAgent ? 'bg-blue-500' : 'bg-gray-400'}`}>
                    {msg.author.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{msg.author}</span>
                  {isInternal && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                      Note interne
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
