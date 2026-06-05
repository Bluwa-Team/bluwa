'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'code'

export default function LoginPage() {
  const [email, setEmail]   = useState('')
  const [code, setCode]     = useState('')
  const [step, setStep]     = useState<Step>('email')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.endsWith('@bluwa.io')) {
      setError('Accès réservé aux comptes @bluwa.io')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('code')
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    setLoading(false)
    if (err) { setError('Code incorrect ou expiré'); return }
    router.push('/orgs')
    router.refresh()
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
          <form onSubmit={sendCode} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
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
              {loading ? 'Envoi…' : 'Recevoir le code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="text-center pb-1">
              <p className="text-sm font-medium text-gray-700">Code envoyé à</p>
              <p className="text-sm text-blue-600 font-semibold">{email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code à 6 chiffres</label>
              <input
                type="text" value={code} autoFocus required
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center tracking-[0.5em] text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading || code.length < 6}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Vérification…' : 'Se connecter'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Changer d&apos;email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
