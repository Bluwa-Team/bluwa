'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Section, Eyebrow } from '@/components/ui/Section'
import { ChevronDown } from './Icons'
import { cn } from '@/lib/utils'

export function Faq() {
  const t = useTranslations('faq')
  const items = t.raw('items') as Array<{ q: string; a: string }>
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Section id="faq">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t('title')}
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
          {items.map((item, i) => {
            const isOpen = open === i
            return (
              <button
                key={item.q}
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="block w-full px-6 py-5 text-left transition-colors hover:bg-[var(--accent)]/40"
                aria-expanded={isOpen}
              >
                <div className="flex items-center justify-between gap-6">
                  <span className="font-medium">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-[var(--muted-foreground)] transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </div>
                <div
                  className={cn(
                    'grid transition-all duration-200',
                    isOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="overflow-hidden text-base leading-relaxed text-[var(--muted-foreground)]">
                    {item.a}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
