'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, LogOut } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROUTE_LABELS: Record<string, { module: string; moduleHref: string; page: string }> = {
  '/orgs':                { module: 'Clients',    moduleHref: '/orgs',      page: 'Organisations' },
  '/onboarding':          { module: 'Clients',    moduleHref: '/orgs',      page: 'Onboarding' },
  '/plans':               { module: 'Revenue',    moduleHref: '/plans',     page: 'Vue d\'ensemble' },
  '/plans/abonnements':   { module: 'Revenue',    moduleHref: '/plans',     page: 'Abonnements' },
  '/plans/installation':  { module: 'Revenue',    moduleHref: '/plans',     page: 'Installation' },
  '/plans/services':      { module: 'Revenue',    moduleHref: '/plans',     page: 'Services' },
  '/plans/factures':      { module: 'Revenue',    moduleHref: '/plans',     page: 'Factures' },
  '/support':             { module: 'Support',    moduleHref: '/support',   page: 'Tickets' },
  '/analytics':           { module: 'Analytique', moduleHref: '/analytics', page: 'Analytics SaaS' },
}

interface Props {
  userEmail: string
}

export function Header({ userEmail }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const meta     = ROUTE_LABELS[pathname] ?? ROUTE_LABELS['/' + pathname.split('/')[1]]
  const initial  = userEmail.charAt(0).toUpperCase()
  const username = userEmail.split('@')[0]

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-6 bg-white border-b border-gray-200">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {meta ? (
          <>
            <Link href={meta.moduleHref} className="text-gray-400 hover:text-gray-600 transition-colors">{meta.module}</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="font-medium text-gray-800">{meta.page}</span>
            {pathname.split('/')[1] === 'orgs' && pathname.split('/').length > 2 && pathname.split('/')[2] && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-gray-500 text-xs font-mono">{pathname.split('/')[2].slice(0, 8)}…</span>
              </>
            )}
          </>
        ) : (
          <span className="text-gray-500">Bluwa Merchant</span>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {initial}
          </div>
          <span className="text-sm text-gray-600 font-medium">{username}</span>
        </button>

        {open && (
          <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-900 truncate">{userEmail}</p>
              <p className="text-xs text-gray-400">Bluwa Merchant Portal</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
