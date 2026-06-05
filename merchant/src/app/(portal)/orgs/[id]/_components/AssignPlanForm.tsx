'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { SubscriptionPlan } from '@/types/merchant'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { updateFactoryPlan } from '@/lib/db-client'

interface Props {
  factoryId: string
  factoryName: string
  plans: SubscriptionPlan[]
  currentPlanId: string | null
}

export function AssignPlanForm({ factoryId, factoryName, plans, currentPlanId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(currentPlanId ?? '')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPlan = plans.find((p) => p.id === currentPlanId)
  const selectedPlan = plans.find((p) => p.id === selectedId)

  async function handleConfirm() {
    if (!selectedId || selectedId === currentPlanId) return
    setLoading(true)
    setError(null)
    try {
      await updateFactoryPlan(factoryId, selectedId)
      setDone(true)
      router.refresh()
      setTimeout(() => { setDone(false); setOpen(false) }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2 px-3 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        {currentPlanId ? 'Changer de plan' : 'Assigner un plan'}
      </button>

      <Modal
        open={open}
        onClose={() => !loading && setOpen(false)}
        title={`Assigner un plan — ${factoryName}`}
        description="Le changement de plan prend effet immédiatement sur ce site."
        size="md"
      >
        {done ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="font-medium text-gray-900">Plan assigné — {selectedPlan?.name}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentPlan && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span>Plan actuel :</span>
                <span className="font-medium text-gray-900">{currentPlan.name}</span>
                <span className="text-gray-400">— {formatCurrency(currentPlan.price_monthly)}/mois</span>
              </div>
            )}

            <div className="space-y-2">
              {plans.map((plan) => {
                const modules = (plan.features_config as { modules?: string[] }).modules ?? []
                const isSelected = selectedId === plan.id
                const isCurrent = currentPlanId === plan.id
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedId(plan.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-semibold text-sm text-gray-900">{plan.name}</span>
                        {isCurrent && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">actuel</span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(plan.price_monthly)}<span className="text-xs font-normal text-gray-400">/mois</span>
                      </span>
                    </div>
                    <div className="ml-5.5 mt-1 flex flex-wrap gap-1">
                      {modules.map((m) => (
                        <span key={m} className="text-xs text-gray-500 uppercase tracking-wide">{m}</span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedId || selectedId === currentPlanId || loading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
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
