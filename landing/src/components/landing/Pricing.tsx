import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Check } from './Icons'
import { cn } from '@/lib/utils'

type Plan = {
  name: string
  subtitle: string
  badge?: string
  price: string
  currency: string
  tagline: string
  features: string[]
  highlighted?: boolean
  custom?: boolean
  priceNote?: string
  cta: string
}

export function Pricing() {
  const t = useTranslations('pricing')
  const plans = t.raw('plans') as Plan[]

  return (
    <Section id="pricing" className="border-y border-[var(--border)] bg-[var(--muted)]/40">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] md:text-lg">{t('subtitle')}</p>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">{t('billing')}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-[var(--background)] p-7',
                plan.highlighted
                  ? 'border-[var(--primary)] shadow-[0_24px_60px_-24px_rgb(7_76_225/0.5)]'
                  : 'border-[var(--border)]',
              )}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary-foreground)]">
                  Populaire
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                {plan.badge && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {plan.badge}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs font-medium text-[var(--primary)]">{plan.subtitle}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{plan.tagline}</p>
              {plan.custom ? (
                <div className="mt-5">
                  <span className="text-2xl font-semibold tracking-tight">{plan.price}</span>
                  {plan.priceNote && (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">{plan.priceNote}</p>
                  )}
                </div>
              ) : (
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
                  {plan.currency ? (
                    <span className="text-sm text-[var(--muted-foreground)]">{plan.currency}</span>
                  ) : null}
                </div>
              )}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="#contact" className="mt-7">
                <Button
                  variant={plan.highlighted ? 'primary' : 'outline'}
                  size="md"
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
