'use client'

import { Sparkles, LogOut, User } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Props = {
  fullName: string
  email: string
  role: string
  canUseAgent: boolean
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppHeader({ fullName, email, role, canUseAgent }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('header')
  const locale = useLocale()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next })
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />

      <div className="flex-1" />

      {canUseAgent && (
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="size-4" />
          <span className="hidden sm:inline">{t('aiAgent')}</span>
        </Button>
      )}

      <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
        {(['fr', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => switchLocale(l)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors uppercase ${
              locale === l
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md hover:bg-accent p-1 pr-2 transition-colors">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials(fullName || email)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline">{fullName || email}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <p className="text-xs text-muted-foreground">{t(`roles.${role}` as any) || role}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="size-4" />
            <span>{t('myProfile')}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="size-4" />
            <span>{t('logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
