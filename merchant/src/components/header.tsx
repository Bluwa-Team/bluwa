'use client'

import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const ROUTE_LABELS: Record<string, { module: string; page: string }> = {
  '/orgs':                { module: 'Clients',    page: 'Organisations' },
  '/onboarding':          { module: 'Clients',    page: 'Onboarding' },
  '/plans':               { module: 'Revenue',    page: 'Vue d\'ensemble' },
  '/plans/abonnements':   { module: 'Revenue',    page: 'Abonnements' },
  '/plans/installation':  { module: 'Revenue',    page: 'Installation' },
  '/plans/services':      { module: 'Revenue',    page: 'Services' },
  '/plans/factures':      { module: 'Revenue',    page: 'Factures' },
  '/support':             { module: 'Support',    page: 'Tickets' },
  '/analytics':           { module: 'Analytique', page: 'Analytics SaaS' },
}

interface Props {
  userEmail: string
}

export function Header({ userEmail }: Props) {
  const pathname = usePathname()

  // Match exact route first, then fallback to base
  const meta = ROUTE_LABELS[pathname] ?? ROUTE_LABELS['/' + pathname.split('/')[1]]

  const initial = userEmail.charAt(0).toUpperCase()
  const username = userEmail.split('@')[0]

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-6 bg-white border-b border-gray-200">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {meta ? (
          <>
            <span className="text-gray-400">{meta.module}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="font-medium text-gray-800">{meta.page}</span>
            {/* pour /orgs/[id] affiche l'id tronqué */}
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

      {/* User */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {initial}
        </div>
        <span className="text-sm text-gray-600 font-medium">{username}</span>
      </div>
    </header>
  )
}
