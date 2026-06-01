'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { completeOnboardingAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormData = {
  orgName: string
  factoryName: string
  factoryLocation: string
}

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= current
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
          {i < labels.length - 1 && (
            <div className={`w-8 h-px ${i < current ? 'bg-primary' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
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

    const result = await completeOnboardingAction({
      orgName: form.orgName,
      factoryName: form.factoryName,
      factoryCity: form.factoryLocation,
    })

    if (result && !result.ok) {
      setError(result.error || t('errors.generic'))
      setLoading(false)
    }
  }

  const stepLabels = [t('steps.organization'), t('steps.factory')]
  const slug = form.orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <section className="min-h-screen bg-zinc-50 dark:bg-transparent grid place-items-center px-4 py-16">
      <div className="w-full" style={{ maxWidth: '400px' }}>
        <div className="p-6">
          <div className="text-center mb-6">
            <Link href="/" className="text-xl font-bold tracking-tight">Bluwa</Link>
          </div>

          <StepIndicator current={step} labels={stepLabels} />

          {step === 0 && (
            <form
              onSubmit={(e) => { e.preventDefault(); setError(''); setStep(1) }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-xl font-semibold">{t('organization.title')}</h1>
                <p className="text-muted-foreground text-sm mt-1">{t('organization.subtitle')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgName">{t('organization.nameLabel')}</Label>
                <Input
                  id="orgName"
                  placeholder={t('organization.namePlaceholder')}
                  value={form.orgName}
                  onChange={(e) => update('orgName', e.target.value)}
                  required
                />
                {form.orgName && (
                  <p className="text-xs text-muted-foreground">
                    {t('organization.urlHint')}
                    <span className="font-medium text-foreground">{slug}</span>
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full">{t('organization.continue')}</Button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold">{t('factory.title')}</h1>
                <p className="text-muted-foreground text-sm mt-1">{t('factory.subtitle')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="factoryName">{t('factory.nameLabel')}</Label>
                <Input
                  id="factoryName"
                  placeholder={t('factory.namePlaceholder')}
                  value={form.factoryName}
                  onChange={(e) => update('factoryName', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="factoryLocation">
                  {t('factory.locationLabel')}{' '}
                  <span className="text-muted-foreground">{t('factory.locationOptional')}</span>
                </Label>
                <Input
                  id="factoryLocation"
                  placeholder={t('factory.locationPlaceholder')}
                  value={form.factoryLocation}
                  onChange={(e) => update('factoryLocation', e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('factory.submitting') : t('factory.submit')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep(0)}
                >
                  {t('factory.back')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
