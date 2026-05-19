'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signupAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signupAction({ fullName, email, password })

    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Compte créé mais connexion impossible. Essayez de vous connecter.')
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <section className="min-h-screen bg-zinc-50 dark:bg-transparent grid place-items-center px-4 py-16">
      <form onSubmit={handleSignup} className="w-full" style={{ maxWidth: '400px' }}>
        <div className="p-6">
          <div className="text-center mb-6">
            <Link href="/" className="text-xl font-bold tracking-tight">Bluwa</Link>
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-semibold">Créer un compte</h1>
            <p className="text-muted-foreground text-sm mt-1">Commençons par vos informations</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                placeholder="Jean Dupont"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?
          <Link href="/login" className="text-primary underline-offset-4 hover:underline text-sm px-2 font-medium">
            Se connecter
          </Link>
        </p>
      </form>
    </section>
  )
}
