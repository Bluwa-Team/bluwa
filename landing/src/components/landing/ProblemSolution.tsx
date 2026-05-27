import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { AlertTriangle, EyeOff, LineChart } from './Icons'

type SolutionRow = { label: string; value: string }

const ICONS = [EyeOff, LineChart, AlertTriangle]

export function ProblemSolution() {
  const t = useTranslations('problem')
  const tRoot = useTranslations()
  const points = t.raw('points') as Array<{ title: string; body: string }>
  const solutionRows = tRoot.raw('solutionRows') as SolutionRow[]

  return (
    <Section id="problem" className="border-b border-[var(--border)] bg-[var(--muted)]/40">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] md:text-lg">{t('subtitle')}</p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {points.map((p, i) => {
            const Icon = ICONS[i] ?? AlertTriangle
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{p.body}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-16 grid items-center gap-10 rounded-3xl border border-[var(--border)] bg-[var(--background)] p-8 md:grid-cols-2 md:p-12">
          <div>
            <Eyebrow className="bg-[var(--primary)]/10 text-[var(--primary)]">
              {t('solutionEyebrow')}
            </Eyebrow>
            <h3 className="mt-4 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              {t('solutionTitle')}
            </h3>
            <p className="mt-4 text-[var(--muted-foreground)] md:text-base">{t('solutionBody')}</p>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-5">
              <div className="space-y-3">
                {solutionRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-lg bg-[var(--background)] px-4 py-3 text-sm"
                  >
                    <span className="font-medium">{row.label}</span>
                    <span className="text-right text-[var(--muted-foreground)]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
