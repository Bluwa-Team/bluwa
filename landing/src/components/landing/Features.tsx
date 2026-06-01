import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import {
  Boxes,
  Cpu,
  Factory,
  FlaskConical,
  ShoppingBag,
  ShoppingCart,
} from './Icons'

const ICONS = [Boxes, Factory, Cpu, ShoppingCart, ShoppingBag, FlaskConical]

export function Features() {
  const t = useTranslations('features')
  const items = t.raw('items') as Array<{ title: string; body: string }>

  return (
    <Section id="features">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] md:text-lg">{t('subtitle')}</p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--border)] md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = ICONS[i] ?? Cpu
            return (
              <div
                key={item.title}
                className="group relative bg-[var(--background)] p-7 transition-colors hover:bg-[var(--accent)]/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
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
