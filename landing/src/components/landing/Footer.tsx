import { useTranslations } from 'next-intl'
import { Logo } from './Logo'

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const year = new Date().getFullYear()

  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: t('product'),
      links: [
        { label: tNav('features'), href: '#features' },
        { label: tNav('pricing'), href: '#pricing' },
        { label: tNav('faq'), href: '#faq' },
      ],
    },
    {
      title: t('company'),
      links: [
        { label: t('about'), href: '#' },
        { label: t('careers'), href: '#' },
        { label: t('blog'), href: '#' },
      ],
    },
    {
      title: t('legal'),
      links: [
        { label: t('terms'), href: '#' },
        { label: t('privacy'), href: '#' },
      ],
    },
  ]

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-[var(--muted-foreground)]">{t('tagline')}</p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {col.title}
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-[var(--foreground)]/80 hover:text-[var(--foreground)]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-foreground)] md:flex-row md:items-center">
          <span>© {year} Bluwa · {t('rights')}</span>
          <span>Made in West Africa</span>
        </div>
      </div>
    </footer>
  )
}
