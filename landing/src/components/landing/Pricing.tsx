import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Check } from './Icons'
import { cn } from '@/lib/utils'

type Plan = {
  name: string
  subtitle: string
  badge?: string
  install: string
  price: string
  currency: string
  priceNote?: string
  tagline: string
  features: string[]
  highlighted?: boolean
  custom?: boolean
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
        </div>

        {/* Per-site callout */}
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-[var(--primary)] bg-[var(--primary)]/5 px-6 py-5 text-center">
          <p className="text-base font-semibold text-[var(--primary)]">{t('perSiteNote')}</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t('perSiteDetail')}</p>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">{t('billingNote')}</p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-[var(--background)]',
                plan.highlighted
                  ? 'border-[var(--primary)] shadow-[0_24px_60px_-24px_rgb(7_76_225/0.5)]'
                  : 'border-[var(--border)]',
              )}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary-foreground)]">
                  {plan.badge ?? 'Populaire'}
                </span>
              ) : null}

              <div className="p-7">
                <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                <p className="mt-0.5 text-xs font-medium text-[var(--primary)]">{plan.subtitle}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{plan.tagline}</p>

                {/* Step 1 — Installation */}
                <div className="mt-5 rounded-xl bg-[var(--muted)]/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--primary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                      {t('step1Label')}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">{t('step1Title')}</span>
                  </div>
                  {plan.custom ? (
                    <div className="mt-2 text-2xl font-semibold tracking-tight">{plan.install}</div>
                  ) : (
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-semibold tracking-tight">{plan.install}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">XOF</span>
                    </div>
                  )}
                  <p className="mt-1 text-[10px] leading-snug text-[var(--muted-foreground)]">
                    {t('step1Subtitle')}
                  </p>
                </div>

                {/* Step 2 — Subscription */}
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)]">
                      {t('step2Label')}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">{t('step2Title')}</span>
                  </div>
                  {plan.custom ? (
                    <>
                      <div className="mt-2 text-2xl font-semibold tracking-tight">{plan.price}</div>
                      {plan.priceNote && (
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{plan.priceNote}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
                        <span className="text-sm text-[var(--muted-foreground)]">{plan.currency}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                        {t('step2Subtitle')}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <ul className="flex-1 border-t border-[var(--border)] px-7 py-5 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="px-7 pb-7">
                <a href="#contact">
                  <Button
                    variant={plan.highlighted ? 'primary' : 'outline'}
                    size="md"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
