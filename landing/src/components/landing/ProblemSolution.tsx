import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { AlertTriangle, EyeOff, Boxes } from './Icons'

const ICONS = [EyeOff, Boxes, AlertTriangle]

export function ProblemSolution() {
  const t = useTranslations('problem')
  const points = t.raw('points') as Array<{ title: string; body: string }>

  return (
    <Section id="problem" className="border-b border-[var(--border)] bg-[var(--muted)]/40">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-balance text-[var(--muted-foreground)] md:text-lg">{t('subtitle')}</p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {points.map((p, i) => {
            const Icon = ICONS[i] ?? AlertTriangle
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--muted-foreground)]">{p.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
