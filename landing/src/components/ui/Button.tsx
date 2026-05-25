import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--brand-600)] shadow-[0_8px_24px_-12px_oklch(0.627_0.233_248/0.7)]',
        ghost:
          'bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)]',
        outline:
          'border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--accent)]',
        dark:
          'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
