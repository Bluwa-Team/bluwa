'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { Loader2, Plus, Minus, Building2, CheckCircle2 } from 'lucide-react'
import { SubscriptionPlan } from '@/types/merchant'
import { createOrg } from '@/lib/db-client'

const COUNTRIES = [
  'Sénégal', "Côte d'Ivoire", 'Mali', 'Burkina Faso', 'Guinée',
  'Mauritanie', 'Niger', 'Togo', 'Bénin', 'Cameroun',
]

interface SiteForm {
  name: string
  city: string
  plan_id: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XOF'
}

const INSTALL_AMOUNTS: Record<string, number> = { tpe: 150000, pme: 500000, grande: 1500000 }

interface Props {
  open: boolean
  onClose: () => void
  plans: SubscriptionPlan[]
}

export function NewOrgModal({ open, onClose, plans }: Props) {
  const router = useRouter()
  const [step, setStep]     = useState<1 | 2 | 3>(1)
  const [orgName, setOrgName] = useState('')
  const [country, setCountry] = useState('')
  const [sites, setSites]   = useState<SiteForm[]>([{ name: '', city: '', plan_id: plans[0]?.id ?? '' }])
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const sortedPlans = [...plans].sort((a, b) => a.price_monthly - b.price_monthly)

  function addSite()    { setSites((s) => [...s, { name: '', city: '', plan_id: sortedPlans[0]?.id ?? '' }]) }
  function removeSite() { setSites((s) => s.length > 1 ? s.slice(0, -1) : s) }

  function updateSite(i: number, field: keyof SiteForm, val: string) {
    setSites((s) => s.map((site, idx) => idx === i ? { ...site, [field]: val } : site))
  }

  const totalInstall = sites.reduce((sum, s) => {
    const plan = sortedPlans.find((p) => p.id === s.plan_id)
    return sum + INSTALL_AMOUNTS[plan?.target_size ?? 'tpe']
  }, 0)

  const totalMrr = sites.reduce((sum, s) => {
    const plan = sortedPlans.find((p) => p.id === s.plan_id)
    return sum + (plan?.price_monthly ?? 0)
  }, 0)

  const step1Valid = orgName.trim().length > 0 && country.length > 0
  const step2Valid = sites.every((s) => s.name.trim().length > 0 && s.city.trim().length > 0)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      await createOrg(
        orgName.trim(),
        country,
        sites.map((s) => {
          const plan = sortedPlans.find((p) => p.id === s.plan_id)
          return { name: s.name.trim(), city: s.city.trim(), plan_id: s.plan_id || null, plan_size: plan?.target_size ?? 'tpe' }
        }),
      )
      setDone(true)
      router.refresh()
      setTimeout(() => {
        setDone(false)
        setStep(1)
        setOrgName('')
        setCountry('')
        setSites([{ name: '', city: '', plan_id: sortedPlans[0]?.id ?? '' }])
        onClose()
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setStep(1); setOrgName(''); setCountry('')
    setSites([{ name: '', city: '', plan_id: sortedPlans[0]?.id ?? '' }])
    setDone(false); setError(null)
    onClose()
  }

  const stepLabels = ['Organisation', 'Sites', 'Récapitulatif']

  return (
    <Modal open={open} onClose={handleClose} title="Nouvelle organisation" size="lg">
      {done ? (
        <div className="py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="font-semibold text-gray-900 text-lg">{orgName}</p>
          <p className="text-sm text-gray-500 mt-1">{sites.length} site{sites.length > 1 ? 's' : ''} créé{sites.length > 1 ? 's' : ''}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stepper */}
          <div className="flex items-center gap-0">
            {stepLabels.map((label, idx) => {
              const num = idx + 1
              const isActive = step === num
              const isDone   = step > num
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isDone || isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone ? '✓' : num}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-blue-700' : isDone ? 'text-gray-500' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                  {idx < stepLabels.length - 1 && (
                    <div className={`flex-1 h-px mx-3 ${step > num ? 'bg-blue-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom de l&apos;organisation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" autoFocus value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex : Groupe SOKA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pays du siège <span className="text-red-500">*</span>
                </label>
                <select
                  value={country} onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Sélectionner…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setStep(2)} disabled={!step1Valid}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nombre de sites</p>
                  <p className="text-xs text-gray-400">Chaque site porte son propre abonnement</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={removeSite} disabled={sites.length <= 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors">
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-900 w-6 text-center">{sites.length}</span>
                  <button onClick={addSite} disabled={sites.length >= 8}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {sites.map((site, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">Site {i + 1}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={site.name} onChange={(e) => updateSite(i, 'name', e.target.value)}
                        placeholder="Nom du site"
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <input type="text" value={site.city} onChange={(e) => updateSite(i, 'city', e.target.value)}
                        placeholder="Ville"
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {sortedPlans.map((p) => (
                        <button key={p.id} type="button" onClick={() => updateSite(i, 'plan_id', p.id)}
                          className={`p-2 rounded-lg border text-left transition-colors ${
                            site.plan_id === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}>
                          <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{fmt(p.price_monthly)}/mois</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  ← Retour
                </button>
                <button onClick={() => setStep(3)} disabled={!step2Valid}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 mb-0.5">Organisation</p>
                <p className="font-semibold text-gray-900">{orgName}</p>
                <p className="text-xs text-gray-400">{country}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {sites.length} site{sites.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-1.5">
                  {sites.map((s, i) => {
                    const plan = sortedPlans.find((p) => p.id === s.plan_id)
                    return (
                      <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.city}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{plan?.name}</span>
                          <p className="text-xs text-gray-400 mt-0.5">{fmt(plan?.price_monthly ?? 0)}/mois</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Frais installation (one-shot)</span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(totalInstall)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50">
                  <span className="text-sm font-medium text-blue-700">MRR estimé</span>
                  <span className="text-sm font-bold text-blue-700">{fmt(totalMrr)}/mois</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} disabled={loading}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40">
                  ← Retour
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Créer l&apos;organisation
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
