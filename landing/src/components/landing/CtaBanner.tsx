import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { ArrowRight } from './Icons'

export function CtaBanner() {
  const t = useTranslations('ctaBanner')

  return (
    <section className="relative overflow-hidden bg-[var(--primary)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_oklch(0.72_0.19_248/0.3),_transparent_60%)]" />
      <div className="container-x relative py-20 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-balance text-base text-white/75">
          {t('subtitle')}
        </p>
        <a href="#contact" className="mt-9 inline-block">
          <Button size="lg" className="bg-white text-[var(--primary)] hover:bg-white/90 shadow-lg">
            {t('cta')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </section>
  )
}
