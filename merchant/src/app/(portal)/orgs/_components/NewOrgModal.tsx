'use client'

import { useState } from 'react'
import { Modal } from '@/components/modal'
import { Loader2, Plus, Minus, Building2, CheckCircle2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

const COUNTRIES = [
  'Sénégal', "Côte d'Ivoire", 'Mali', 'Burkina Faso', 'Guinée',
  'Mauritanie', 'Niger', 'Togo', 'Bénin', 'Cameroun',
]

const PLANS = [
  { key: 'starter',    label: 'Starter',    price_monthly: 45000,  install: 150000,  size: 'tpe',   desc: '1–3 users' },
  { key: 'growth',     label: 'Growth',     price_monthly: 150000, install: 500000,  size: 'pme',   desc: 'jusqu\'à 15' },
  { key: 'enterprise', label: 'Enterprise', price_monthly: 350000, install: 1500000, size: 'grande', desc: 'illimité' },
]

interface SiteForm {
  name: string
  city: string
  plan: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XOF'
}

export function NewOrgModal({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [orgName, setOrgName]     = useState('')
  const [country, setCountry]     = useState('')
  const [sites, setSites]         = useState<SiteForm[]>([{ name: '', city: '', plan: 'starter' }])
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)

  function addSite()    { setSites((s) => [...s, { name: '', city: '', plan: 'starter' }]) }
  function removeSite() { setSites((s) => s.length > 1 ? s.slice(0, -1) : s) }

  function updateSite(i: number, field: keyof SiteForm, val: string) {
    setSites((s) => s.map((site, idx) => idx === i ? { ...site, [field]: val } : site))
  }

  const totalInstall = sites.reduce((sum, s) => {
    const plan = PLANS.find((p) => p.key === s.plan)
    return sum + (plan?.install ?? 0)
  }, 0)

  const totalMrr = sites.reduce((sum, s) => {
    const plan = PLANS.find((p) => p.key === s.plan)
    return sum + (plan?.price_monthly ?? 0)
  }, 0)

  const step1Valid = orgName.trim().length > 0 && country.length > 0
  const step2Valid = sites.every((s) => s.name.trim().length > 0 && s.city.trim().length > 0)

  async function handleSubmit() {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    setDone(true)
    setTimeout(() => {
      setDone(false)
      setStep(1)
      setOrgName('')
      setCountry('')
      setSites([{ name: '', city: '', plan: 'starter' }])
      onClose()
    }, 1500)
  }

  function handleClose() {
    setStep(1)
    setOrgName('')
    setCountry('')
    setSites([{ name: '', city: '', plan: 'starter' }])
    setDone(false)
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
                      isDone   ? 'bg-blue-600 text-white' :
                      isActive ? 'bg-blue-600 text-white' :
                                 'bg-gray-100 text-gray-400'
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

          {/* Step 1 — Organisation */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom de l&apos;organisation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={orgName}
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
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Sélectionner…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Sites */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Compteur sites */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nombre de sites</p>
                  <p className="text-xs text-gray-400">Chaque site porte son propre abonnement</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={removeSite}
                    disabled={sites.length <= 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-900 w-6 text-center">{sites.length}</span>
                  <button
                    onClick={addSite}
                    disabled={sites.length >= 8}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Config par site */}
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
                      <input
                        type="text"
                        value={site.name}
                        onChange={(e) => updateSite(i, 'name', e.target.value)}
                        placeholder="Nom du site"
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <input
                        type="text"
                        value={site.city}
                        onChange={(e) => updateSite(i, 'city', e.target.value)}
                        placeholder="Ville"
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    {/* Plan selector */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {PLANS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => updateSite(i, 'plan', p.key)}
                          className={`p-2 rounded-lg border text-left transition-colors ${
                            site.plan === p.key
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <p className="text-xs font-semibold text-gray-900">{p.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{p.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!step2Valid}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Récapitulatif */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Org */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 mb-0.5">Organisation</p>
                <p className="font-semibold text-gray-900">{orgName}</p>
                <p className="text-xs text-gray-400">{country}</p>
              </div>

              {/* Sites */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {sites.length} site{sites.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-1.5">
                  {sites.map((s, i) => {
                    const plan = PLANS.find((p) => p.key === s.plan)!
                    return (
                      <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.city}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{plan.label}</span>
                          <p className="text-xs text-gray-400 mt-0.5">{fmt(plan.price_monthly)}/mois</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Chiffrage */}
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

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
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
