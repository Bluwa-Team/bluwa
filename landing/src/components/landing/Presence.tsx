import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { WestAfricaMap } from './WestAfricaMap'

export function Presence() {
  const t = useTranslations('presence')

  return (
    <Section id="presence" className="border-b border-[var(--border)] bg-[var(--muted)]/30">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] md:text-lg">{t('subtitle')}</p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl border border-[var(--border)] shadow-sm">
          <WestAfricaMap />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          {(t.raw('countries') as string[]).map((country) => (
            <span
              key={country}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)]"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              {country}
            </span>
          ))}
        </div>
      </div>
    </Section>
  )
}
