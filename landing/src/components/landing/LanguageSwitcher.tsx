'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--background)] p-1 text-xs font-medium">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          className={cn(
            'rounded-full px-2.5 py-1 uppercase transition-colors',
            l === locale
              ? 'bg-[var(--foreground)] text-[var(--background)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
