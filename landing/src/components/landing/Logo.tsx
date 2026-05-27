import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center', className)}>
      <Image
        src="/logo.png"
        alt="Bluwa"
        width={120}
        height={40}
        style={{ height: '2rem', width: 'auto' }}
        priority
      />
    </div>
  )
}
