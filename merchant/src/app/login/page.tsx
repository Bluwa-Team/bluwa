'use client'

import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'sent'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [step, setStep]       = useState<Step>('email')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const ALLOWED = ['r.okoye@icloud.com']
    if (!email.endsWith('@bluwa.io') && !ALLOWED.includes(email)) {
      setError('Accès réservé aux comptes @bluwa.io')
      return
    }

    setLoading(true)
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    })
    setLoading(false)

    if (authError) {
      setError('Erreur : ' + authError.message)
      return
    }

    setStep('sent')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center gap-3 mb-2">
            <Image src="/logo.png" alt="Bluwa" width={48} height={48} />
            <span className="font-semibold text-gray-900 text-lg">Bluwa Merchant</span>
          </div>
          <p className="text-sm text-gray-500">Accès réservé à l&apos;équipe Bluwa</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={email} autoFocus required
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@bluwa.io"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Envoi…' : 'Recevoir le lien de connexion'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900">Vérifiez votre email</p>
            <p className="text-sm text-gray-500">
              Un lien de connexion a été envoyé à<br />
              <span className="font-medium text-gray-700">{email}</span>
            </p>
            <button onClick={() => { setStep('email'); setError('') }}
              className="text-xs text-blue-600 hover:underline mt-2">
              ← Changer d&apos;email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
