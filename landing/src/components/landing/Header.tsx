import { useTranslations } from 'next-intl'
import { Logo } from './Logo'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Button } from '@/components/ui/Button'

export function Header() {
  const t = useTranslations('nav')

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
        </div>
      </div>
    </header>
  )
}
