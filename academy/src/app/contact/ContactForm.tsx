'use client'

import { useState, type FormEvent } from 'react'
import { CheckCircle } from 'lucide-react'
import { sendContactEmail } from '@/lib/actions/email'

const OBJETS = [
  'Demande de formation',
  'Accès à la plateforme Academy',
  'Information sur le CBSCP',
  'Autre',
]

export function ContactForm() {
  const [nom,     setNom]     = useState('')
  const [email,   setEmail]   = useState('')
  const [objet,   setObjet]   = useState(OBJETS[0])
  const [message, setMessage] = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await sendContactEmail({ nom, email, objet, message })

    if (result.fallback) {
      // Pas de clé Resend → fallback mailto
      const subject = encodeURIComponent(`[Bluwa Academy] ${objet} — ${nom}`)
      const body    = encodeURIComponent(`Nom : ${nom}\nEmail : ${email}\nObjet : ${objet}\n\n${message}`)
      window.location.href = `mailto:academy@bluwa.io?subject=${subject}&body=${body}`
    }

    if (!result.success) {
      setError(result.error ?? "Erreur lors de l'envoi.")
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <p className="font-semibold text-emerald-800 text-lg mb-2">Message envoyé</p>
        <p className="text-sm text-emerald-700">
          Nous avons bien reçu votre demande et vous répondrons sous 48h ouvrées.
        </p>
        <button
          onClick={() => { setSent(false); setNom(''); setEmail(''); setMessage('') }}
          className="mt-4 text-xs text-emerald-600 hover:underline"
        >
          Envoyer une nouvelle demande
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet</label>
        <input
          type="text" required value={nom} onChange={e => setNom(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Votre nom"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Adresse e-mail</label>
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="vous@entreprise.com"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Objet de la demande</label>
        <select
          value={objet} onChange={e => setObjet(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {OBJETS.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
        <textarea
          rows={4} required value={message} onChange={e => setMessage(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Décrivez votre besoin..."
        />
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <button
        type="submit" disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
      >
        {loading ? 'Envoi…' : 'Envoyer la demande'}
      </button>
    </form>
  )
}
