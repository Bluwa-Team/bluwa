'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { OrgStatus } from '@/types/merchant'
import { CheckCircle2, PauseCircle, XCircle, Archive, Loader2 } from 'lucide-react'
import { updateOrgStatus } from '@/lib/db-client'

const ACTIONS: { label: string; status: OrgStatus; icon: React.ReactNode; color: string; description: string }[] = [
  {
    label: 'Activer',
    status: 'active',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-700 hover:bg-emerald-50 border-emerald-200',
    description: 'L\'organisation aura accès complet à l\'application.',
  },
  {
    label: 'Suspendre',
    status: 'suspended',
    icon: <PauseCircle className="w-4 h-4" />,
    color: 'text-amber-700 hover:bg-amber-50 border-amber-200',
    description: 'Les utilisateurs ne pourront plus se connecter.',
  },
  {
    label: 'Churned',
    status: 'churned',
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-700 hover:bg-red-50 border-red-200',
    description: 'Marquer ce client comme perdu définitivement.',
  },
  {
    label: 'Archiver',
    status: 'archived',
    icon: <Archive className="w-4 h-4" />,
    color: 'text-gray-500 hover:bg-gray-50 border-gray-200',
    description: 'Désactiver l\'accès et archiver l\'organisation. Les données sont conservées. Irréversible depuis l\'app.',
  },
]

export function OrgStatusActions({ orgId, currentStatus }: { orgId: string; currentStatus: OrgStatus }) {
  const router = useRouter()
  const [pending, setPending] = useState<(typeof ACTIONS)[0] | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function applyStatus() {
    if (!pending) return
    setLoading(true)
    setError(null)
    try {
      await updateOrgStatus(orgId, pending.status)
      setDone(true)
      router.refresh()
      setTimeout(() => { setDone(false); setPending(null) }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const availableActions = ACTIONS.filter((a) => a.status !== currentStatus)

  return (
    <>
      <div className="flex items-center gap-2">
        {availableActions.map((action) => (
          <button
            key={action.status}
            onClick={() => setPending(action)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${action.color}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      <Modal
        open={!!pending}
        onClose={() => !loading && setPending(null)}
        title={pending ? `${pending.label} l'organisation` : ''}
        size="sm"
      >
        {done ? (
          <div className="py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="font-medium text-gray-900">Statut mis à jour</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{pending?.description}</p>
            <p className="text-sm text-gray-500">
              Nouveau statut : <span className="font-semibold text-gray-900">{pending?.label}</span>
            </p>
            <div className="flex gap-2 pt-1">
              {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}
              <button
                onClick={() => setPending(null)}
                disabled={loading}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={applyStatus}
                disabled={loading}
                className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
