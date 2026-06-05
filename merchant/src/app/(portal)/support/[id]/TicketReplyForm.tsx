'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { addTicketReply } from '@/lib/db-client'
import { TicketMessage, TicketStatus } from '@/types/merchant'

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open',        label: 'Ouvert' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved',    label: 'Résolu' },
  { value: 'closed',      label: 'Fermé' },
]

interface Props {
  ticketId: string
  currentMessages: TicketMessage[]
  currentStatus: TicketStatus
  authorEmail: string
}

export function TicketReplyForm({ ticketId, currentMessages, currentStatus, authorEmail }: Props) {
  const router = useRouter()
  const [content, setContent]       = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [newStatus, setNewStatus]   = useState<TicketStatus>(currentStatus)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    try {
      const statusChange = newStatus !== currentStatus ? newStatus : undefined
      await addTicketReply(ticketId, currentMessages, authorEmail, content.trim(), isInternal, statusChange)
      setContent('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Répondre</h2>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Votre message…"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded accent-amber-500"
            />
            Note interne
          </label>

          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="text-xs text-gray-400">Statut :</span>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 bg-white"
            >
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Envoyer
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  )
}
