import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Check, ArrowRight } from '@/components/landing/Icons'

export function PilotProgram() {
  const t = useTranslations('pilot')
  const receiveItems = t.raw('receiveItems') as string[]
  const expectItems = t.raw('expectItems') as string[]

  return (
    <Section id="pilot" className="border-y border-[var(--border)] bg-[var(--primary)]/5">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]">
            {t('eyebrow')}
          </Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] md:text-lg">{t('subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Ce que vous recevez */}
          <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--background)] p-7">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-[var(--primary)]">
              {t('receiveTitle')}
            </h3>
            <ul className="space-y-3">
              {receiveItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-base">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <Check className="h-3 w-3 text-[var(--primary)]" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ce que nous attendons */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-7">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-[var(--foreground)]">
              {t('expectTitle')}
            </h3>
            <ul className="space-y-3">
              {expectItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-[var(--muted-foreground)]">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--background)] px-4 py-1.5 text-sm font-medium text-[var(--primary)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
            {t('availability')}
          </span>
          <a href="#contact">
            <Button size="lg">
              {t('cta')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </Section>
  )
}
