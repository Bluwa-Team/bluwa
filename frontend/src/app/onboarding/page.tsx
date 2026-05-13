'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormData = {
  orgName: string
  factoryName: string
  factoryLocation: string
}

const STEPS = ['Organisation', 'Usine']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < current
                  ? 'bg-primary text-primary-foreground'
                  : i === current
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === current ? 'font-medium' : 'text-muted-foreground'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px ${i < current ? 'bg-primary' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormData>({
    orgName: '',
    factoryName: '',
    factoryLocation: '',
  })

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Impossible de contacter le serveur.')
      setLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-zinc-50 dark:bg-transparent grid place-items-center px-4 py-16">
      <div className="w-full" style={{ maxWidth: '400px' }}>
        <div className="p-6">
          <div className="text-center mb-6">
            <Link href="/" className="text-xl font-bold tracking-tight">Bluwa</Link>
          </div>

          <StepIndicator current={step} />

          {step === 0 && (
            <form onSubmit={(e) => { e.preventDefault(); setError(''); setStep(1) }} className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold">Votre organisation</h1>
                <p className="text-muted-foreground text-sm mt-1">Le nom de votre groupe ou entreprise</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de l&apos;organisation</Label>
                <Input
                  id="orgName"
                  placeholder="Groupe Sedima"
                  value={form.orgName}
                  onChange={(e) => update('orgName', e.target.value)}
                  required
                />
                {form.orgName && (
                  <p className="text-xs text-muted-foreground">
                    URL : app.bluwa.com/
                    <span className="font-medium text-foreground">
                      {form.orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                    </span>
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full">Continuer</Button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold">Votre première usine</h1>
                <p className="text-muted-foreground text-sm mt-1">Vous pourrez en ajouter d&apos;autres depuis les paramètres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="factoryName">Nom de l&apos;usine</Label>
                <Input
                  id="factoryName"
                  placeholder="Usine Dakar"
                  value={form.factoryName}
                  onChange={(e) => update('factoryName', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="factoryLocation">
                  Localisation <span className="text-muted-foreground">(optionnel)</span>
                </Label>
                <Input
                  id="factoryLocation"
                  placeholder="Dakar, Sénégal"
                  value={form.factoryLocation}
                  onChange={(e) => update('factoryLocation', e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Création...' : 'Créer mon espace'}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setStep(0)}>
                  Retour
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
