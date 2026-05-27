'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useRef } from 'react'
import { Section, Eyebrow } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { ArrowRight, Check } from './Icons'
import { sendContact } from '@/app/actions/contact'

const initialState = { success: false as boolean, error: undefined as string | undefined }

export function Contact() {
  const t = useTranslations('contact')
  const formRef = useRef<HTMLFormElement>(null)

  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await sendContact(formData)
      if (result.success) formRef.current?.reset()
      return result.success
        ? { success: true, error: undefined }
        : { success: false, error: (result as { success: false; error: string }).error }
    },
    initialState,
  )

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

          <form ref={formRef} action={action} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-7">
            {state.success ? (
              <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-6 w-6" />
                </div>
                <p className="font-semibold">{t('successTitle')}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{t('successBody')}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                <Field label={t('name')} name="name" required />
                <Field label={t('email')} name="email" type="email" required />
                <Field label={t('company')} name="company" />
                <Field label={t('message')} name="message" textarea required />
                {state.error && (
                  <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                    {state.error}
                  </p>
                )}
                <Button type="submit" size="lg" className="mt-2" disabled={pending}>
                  {pending ? t('sending') : t('submit')}
                  {!pending && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </Section>
  )
}

function Field({
  label, name, type = 'text', textarea = false, required = false,
}: {
  label: string; name: string; type?: string; textarea?: boolean; required?: boolean
}) {
  const base =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20'
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {textarea
        ? <textarea name={name} rows={4} className={base} required={required} />
        : <input name={name} type={type} className={base} required={required} />}
    </label>
  )
}
