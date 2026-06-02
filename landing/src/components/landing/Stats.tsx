import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { Globe, Coins, Clock, WifiOff } from './Icons'

const ICONS = {
  globe: Globe,
  coins: Coins,
  clock: Clock,
  wifi: WifiOff,
} as const

type StatItem = { icon: keyof typeof ICONS; value: string; unit: string; detail: string }

export function Stats() {
  const t = useTranslations('stats')
  const items = t.raw('items') as StatItem[]

  return (
    <Section id="stats" className="border-b border-[var(--border)] bg-[var(--primary)]/5">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]">
            {t('eyebrow')}
          </Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = ICONS[item.icon] ?? Globe
            return (
              <div
                key={item.unit}
                className="flex flex-col items-center rounded-2xl border border-[var(--primary)]/20 bg-[var(--background)] p-7 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-5 text-4xl font-bold tracking-tight text-[var(--foreground)]">
                  {item.value}
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--primary)]">{item.unit}</div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {item.detail}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
