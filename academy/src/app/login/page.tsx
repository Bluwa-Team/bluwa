'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { signIn } from '@/lib/actions/auth'
import type { Metadata } from 'next'

export default function LoginPage() {
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signIn(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Bluwa Academy</p>
          <h1 className="text-2xl font-bold text-slate-900">Connexion</h1>
          <p className="text-sm text-slate-500 mt-1">Accédez à votre espace apprenant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              name="password" type="password" required autoComplete="current-password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
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
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-indigo-600 hover:underline font-medium">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
