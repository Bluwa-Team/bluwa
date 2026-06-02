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
        </div>

        <div className="mx-auto mt-10" style={{ width: 260 }}>
          <WestAfricaMap />
        </div>
      </div>
    </Section>
  )
}
