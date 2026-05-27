'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Logo } from './Logo'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Button } from '@/components/ui/Button'
import { Menu, X } from '@/components/landing/Icons'

export function Header() {
  const t = useTranslations('nav')
  const [open, setOpen] = useState(false)

  const links = [
    { href: '#problem', label: t('problem') },
    { href: '#features', label: t('features') },
    { href: '#pricing', label: t('pricing') },
    { href: '#faq', label: t('faq') },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a href="#contact" className="hidden md:inline-flex">
            <Button size="sm">{t('cta')}</Button>
          </a>
          {/* Hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground)] md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--background)] px-6 pb-5 pt-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <a href="#contact" onClick={() => setOpen(false)} className="mt-4 block">
            <Button size="sm" className="w-full">{t('cta')}</Button>
          </a>
        </div>
      )}
    </header>
  )
}
