import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { ArrowRight, PlayCircle, Sparkles } from '@/components/landing/Icons'

export function Hero() {
  const t = useTranslations('hero')

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div aria-hidden className="bg-radial-brand absolute inset-0" />

      <div className="container-x relative pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)]/70 px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
            {t('badge')}
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            {t('title')}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-[var(--muted-foreground)] md:text-lg">
            {t('subtitle')}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#contact">
              <Button size="lg">
                {t('primaryCta')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <a href="#features">
              <Button size="lg" variant="outline">
                <PlayCircle className="h-4 w-4" />
                {t('secondaryCta')}
              </Button>
            </a>
          </div>

          <p className="mt-6 text-xs text-[var(--muted-foreground)]">{t('trust')}</p>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}

function HeroVisual() {
  const t = useTranslations('heroVisual')
  const kpis = t.raw('kpis') as Array<{ label: string; value: string; trend: string; tone: 'good' | 'warn' }>

  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="absolute inset-x-0 -top-6 -bottom-6 rounded-3xl bg-gradient-to-b from-[var(--primary)]/20 via-transparent to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-4 text-xs text-[var(--muted-foreground)]">{t('browserBar')}</span>
        </div>
        <div className="grid grid-cols-12 gap-4 p-6">
          {/* KPI cards */}
          <div className="col-span-12 grid grid-cols-2 gap-4 md:col-span-8 md:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} tone={kpi.tone} />
            ))}
          </div>
          {/* AI Copilot */}
          <div className="col-span-12 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 md:col-span-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">{t('copilotLabel')}</span>
              <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
                {t('copilotLive')}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
              « {t('copilotMessage')} »
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--muted)]">
              <div className="h-1.5 w-2/3 rounded-full bg-[var(--primary)]" />
            </div>
          </div>
          {/* Chart */}
          <div className="col-span-12 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">{t('chartLabel')}</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{t('chartPeriod')}</span>
            </div>
            <div className="flex h-24 items-end gap-2">
              {[42, 58, 51, 68, 73, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-md bg-gradient-to-t from-[var(--primary)] to-[var(--primary)]/40"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label, value, trend, tone = 'good',
}: {
  label: string; value: string; trend: string; tone?: 'good' | 'warn'
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      <div className={tone === 'good' ? 'mt-1 text-[10px] font-medium text-emerald-600' : 'mt-1 text-[10px] font-medium text-amber-600'}>
        {trend}
      </div>
    </div>
  )
}
