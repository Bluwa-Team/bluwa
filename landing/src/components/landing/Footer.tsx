import { useTranslations } from 'next-intl'
import { Logo } from './Logo'
import { Globe } from './Icons'

type ResourceItem = { title: string; description: string; href: string }

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const year = new Date().getFullYear()

  const productLinks = [
    { label: tNav('features'), href: '#features' },
    { label: tNav('pricing'), href: '#pricing' },
    { label: tNav('faq'), href: '#faq' },
    { label: tNav('contact'), href: '#contact' },
  ]

  const resourceItems = tNav.raw('resourceItems') as ResourceItem[]

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-[var(--muted-foreground)]">{t('tagline')}</p>
            <p className="mt-2 max-w-xs text-xs italic text-[var(--muted-foreground)]/60">{t('vision')}</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {t('product')}
            </div>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-[var(--foreground)]/80 hover:text-[var(--foreground)]">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {tNav('resources')}
            </div>
            <ul className="mt-4 space-y-2.5">
              {resourceItems.map((item) => (
                <li key={item.title}>
                  <a href={item.href} className="text-sm text-[var(--foreground)]/80 hover:text-[var(--foreground)]">
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-foreground)] md:flex-row md:items-center">
          <span>© {year} Bluwa · {t('rights')}</span>
          <span className="flex items-center gap-1.5">Made in West Africa <Globe className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </footer>
  )
}
