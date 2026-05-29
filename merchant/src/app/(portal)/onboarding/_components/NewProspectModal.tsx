'use client'

import { useState } from 'react'
import { Modal } from '@/components/modal'
import { Loader2, CheckCircle2 } from 'lucide-react'

const COUNTRIES = ['Sénégal', 'Côte d\'Ivoire', 'Mali', 'Burkina Faso', 'Guinée', 'Mauritanie', 'Niger', 'Togo', 'Bénin', 'Cameroun']

interface Props {
  open: boolean
  onClose: () => void
}

export function NewProspectModal({ open, onClose }: Props) {
  const [form, setForm] = useState({
    org_name: '',
    country: '',
    plan_target: 'Growth',
    assigned_to: 'john@bluwa.io',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 700))
    setLoading(false)
    setDone(true)
    setTimeout(() => {
      setDone(false)
      setForm({ org_name: '', country: '', plan_target: 'Growth', assigned_to: 'john@bluwa.io', notes: '' })
      onClose()
    }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau prospect" description="Ajouter un prospect dans le pipeline d'onboarding">
      {done ? (
        <div className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="font-medium text-gray-900">Prospect ajouté</p>
          <p className="text-sm text-gray-500 mt-1">{form.org_name} → colonne Prospect</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom de l&apos;organisation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.org_name}
              onChange={(e) => set('org_name', e.target.value)}
              placeholder="Ex : Rizerie du Nord"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
              <select
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Pays —</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan visé</label>
              <select
                value={form.plan_target}
                onChange={(e) => set('plan_target', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Starter">Starter</option>
                <option value="Growth">Growth</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigné à</label>
            <input
              type="email"
              value={form.assigned_to}
              onChange={(e) => set('assigned_to', e.target.value)}
              placeholder="prenom@bluwa.io"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Contexte, source du lead, besoins identifiés…"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!form.org_name || loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Ajouter au pipeline
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
