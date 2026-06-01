'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Logo } from './Logo'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Button } from '@/components/ui/Button'
import { Menu, X, ChevronDown } from '@/components/landing/Icons'

type ResourceItem = { title: string; description: string; href: string }

function ResourcesDropdown({ label, items }: { label: string; items: ResourceItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-lg">
          {items.map((item) => (
            <a
              key={item.title}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 hover:bg-[var(--accent)]/40"
            >
              <div className="text-sm font-medium text-[var(--foreground)]">{item.title}</div>
              <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{item.description}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export function Header() {
  const t = useTranslations('nav')
  const [open, setOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)

  const resourceItems = t.raw('resourceItems') as ResourceItem[]

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
          <ResourcesDropdown label={t('resources')} items={resourceItems} />
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
            {/* Resources mobile */}
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              {t('resources')}
              <ChevronDown className={`h-4 w-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
            </button>
            {resourcesOpen && (
              <div className="ml-3 flex flex-col gap-1 border-l border-[var(--border)] pl-3">
                {resourceItems.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    onClick={() => { setOpen(false); setResourcesOpen(false) }}
                    className="rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            )}
          </nav>
          <a href="#contact" onClick={() => setOpen(false)} className="mt-4 block">
            <Button size="sm" className="w-full">{t('cta')}</Button>
          </a>
        </div>
      )}
    </header>
  )
}
