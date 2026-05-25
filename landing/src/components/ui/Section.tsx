import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

export function Section({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('py-20 md:py-28', className)} {...props} />
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-medium tracking-wide text-[var(--muted-foreground)] uppercase',
        className,
      )}
    >
      {children}
    </span>
  )
}
