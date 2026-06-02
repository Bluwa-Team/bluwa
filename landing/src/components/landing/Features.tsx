import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { Factory, Shield, GraduationCap } from './Icons'

const ICONS = [Factory, Shield, GraduationCap]

export function Features() {
  const t = useTranslations('features')
  const items = t.raw('items') as Array<{ title: string; body: string }>

  return (
    <Section id="features" className="border-b border-[var(--border)]">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-balance text-[var(--muted-foreground)] md:text-lg">{t('subtitle')}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((item, i) => {
            const Icon = ICONS[i] ?? Factory
            return (
              <div
                key={item.title}
                className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)] p-8 transition-shadow hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-3 flex-1 text-base leading-relaxed text-[var(--muted-foreground)]">
                  {item.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
