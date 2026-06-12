'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        setError('Une erreur est survenue. Veuillez réessayer.')
        return
      }

      setSent(true)
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
            <h1 className="mb-1 mt-4 text-xl font-semibold">Mot de passe oublié</h1>
            <p className="text-muted-foreground text-sm">
              {sent
                ? 'Vérifiez votre boîte mail.'
                : 'Entrez votre email pour recevoir un lien de réinitialisation.'}
            </p>
          </div>

          {sent ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Un lien a été envoyé à <span className="font-medium text-foreground">{email}</span>.
                Pensez à vérifier vos spams.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={() => setSent(false)}>
                Renvoyer un lien
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="block text-sm">Email</Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </Button>
            </form>
          )}
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
