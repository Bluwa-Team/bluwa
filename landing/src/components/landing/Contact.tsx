import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { ArrowRight } from './Icons'

export function Contact() {
  const t = useTranslations('contact')

  return (
    <Section id="contact" className="border-t border-[var(--border)] bg-[var(--muted)]/40">
      <div className="container-x">
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <Eyebrow>{t('eyebrow')}</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              {t('title')}
            </h2>
            <p className="mt-4 text-[var(--muted-foreground)] md:text-base">{t('subtitle')}</p>

            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                {t('or')}
              </p>
              <a
                href={`mailto:${t('emailAddress')}`}
                className="mt-1 inline-block text-lg font-medium text-[var(--primary)] hover:underline"
              >
                {t('emailAddress')}
              </a>
            </div>
          </div>

          <form className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-7">
            <div className="grid gap-4">
              <Field label={t('name')} name="name" />
              <Field label={t('email')} name="email" type="email" />
              <Field label={t('company')} name="company" />
              <Field label={t('message')} name="message" textarea />
              <Button type="submit" size="lg" className="mt-2">
                {t('submit')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Section>
  )
}

function Field({
  label,
  name,
  type = 'text',
  textarea = false,
}: {
  label: string
  name: string
  type?: string
  textarea?: boolean
}) {
  const baseClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20'
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
        {label}
      </span>
      {textarea ? (
        <textarea name={name} rows={4} className={baseClass} />
      ) : (
        <input name={name} type={type} className={baseClass} />
      )}
    </label>
  )
}
