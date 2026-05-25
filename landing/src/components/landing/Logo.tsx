import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-bold"
      >
        b
      </div>
      <span className="text-base font-semibold tracking-tight">Bluwa</span>
    </div>
  )
}
