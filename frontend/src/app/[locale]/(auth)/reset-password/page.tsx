'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError('Lien expiré ou invalide. Veuillez recommencer.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-zinc-50 dark:bg-transparent grid place-items-center px-4 py-16">
      <div className="w-full" style={{ maxWidth: '400px' }}>
        <div className="p-6">
          <div className="text-center">
            <Link href="/" aria-label="Accueil" className="inline-block">
              <Image src="/bluwa_text.png" alt="Bluwa" width={120} height={36} priority className="dark:brightness-0 dark:invert" />
            </Link>
            <h1 className="mb-1 mt-4 text-xl font-semibold">Nouveau mot de passe</h1>
            <p className="text-muted-foreground text-sm">Choisissez un nouveau mot de passe sécurisé.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="block text-sm">Nouveau mot de passe</Label>
              <Input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="block text-sm">Confirmer le mot de passe</Label>
              <Input
                type="password"
                id="confirm"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline font-medium">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </section>
  )
}
