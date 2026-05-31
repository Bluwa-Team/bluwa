'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { signUp } from '@/lib/actions/auth'

export default function RegisterPage() {
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signUp(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Bluwa Academy</p>
          <h1 className="text-2xl font-bold text-slate-900">Créer un compte</h1>
          <p className="text-sm text-slate-500 mt-1">Suivez votre progression et obtenez vos certifications</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet</label>
            <input
              name="full_name" type="text" required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Adresse e-mail</label>
            <input
              name="email" type="email" required autoComplete="email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="vous@entreprise.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mot de passe</label>
            <input
              name="password" type="password" required minLength={8} autoComplete="new-password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="8 caractères minimum"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Organisation <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <input
              name="organisation" type="text"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Votre entreprise"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
