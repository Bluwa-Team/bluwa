'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Building2, CreditCard, HeadphonesIcon, BarChart3,
  LogOut, GitBranch, Package, Wrench, Users, FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Couleurs figées par groupe — inline styles pour contourner le JIT Tailwind v4
const COLORS = {
  clients:    { label: '#60a5fa', activeBg: 'rgba(59,130,246,0.15)', activeText: '#93c5fd', icon: '#60a5fa' },
  revenue:    { label: '#34d399', activeBg: 'rgba(16,185,129,0.15)', activeText: '#6ee7b7', icon: '#34d399' },
  support:    { label: '#fbbf24', activeBg: 'rgba(245,158,11,0.15)', activeText: '#fde68a', icon: '#fbbf24' },
  analytique: { label: '#a78bfa', activeBg: 'rgba(139,92,246,0.15)', activeText: '#c4b5fd', icon: '#a78bfa' },
}

type SubItem = { href: string; label: string; icon: React.ElementType }

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function NavLink({
    href, label, icon: Icon, color, exact = true,
  }: {
    href: string; label: string; icon: React.ElementType
    color: typeof COLORS.clients; exact?: boolean
  }) {
    const active = exact
      ? pathname === href || pathname.startsWith(href + '/')
      : pathname === href
    return (
      <Link
        href={href}
        style={active ? { backgroundColor: color.activeBg, color: color.activeText } : undefined}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
          active ? 'font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
        )}
      >
        <Icon
          style={active ? { color: color.icon } : undefined}
          className={cn('w-4 h-4 shrink-0', !active && 'text-gray-600')}
        />
        {label}
      </Link>
    )
  }

  return (
    <aside style={{ backgroundColor: '#030712', color: '#d1d5db' }} className="w-56 shrink-0 h-screen flex flex-col">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
        <Image src="/logo.png" alt="Bluwa" width={28} height={28} className="shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">Bluwa</p>
          <p className="text-xs text-gray-500">Merchant Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">

        {/* ── CLIENTS */}
        <div>
          <p style={{ color: COLORS.clients.label }} className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest">
            Clients
          </p>
          <div className="space-y-0.5">
            <NavLink href="/orgs"       label="Organisations" icon={Building2} color={COLORS.clients} />
            <NavLink href="/onboarding" label="Onboarding"    icon={GitBranch} color={COLORS.clients} />
          </div>
        </div>

        {/* ── REVENUE */}
        <div>
          <p style={{ color: COLORS.revenue.label }} className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest">
            Revenue
          </p>
          <div className="space-y-0.5">
            {(() => {
              const inSection = pathname === '/plans' || pathname.startsWith('/plans/')
              const exactMatch = pathname === '/plans'
              const c = COLORS.revenue
              const children: SubItem[] = [
                { href: '/plans/abonnements', label: 'Abonnements', icon: Package  },
                { href: '/plans/installation', label: 'Installation', icon: Wrench },
                { href: '/plans/services',     label: 'Services',    icon: Users   },
                { href: '/plans/factures',     label: 'Factures',    icon: FileText },
              ]
              return (
                <div>
                  <Link
                    href="/plans"
                    style={exactMatch ? { backgroundColor: c.activeBg, color: c.activeText } : inSection ? undefined : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                      exactMatch ? 'font-medium' : inSection ? 'bg-white/5 text-gray-300 font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    )}
                  >
                    <CreditCard
                      style={inSection ? { color: c.icon } : undefined}
                      className={cn('w-4 h-4 shrink-0', !inSection && 'text-gray-600')}
                    />
                    Plans &amp; Billing
                  </Link>

                  {inSection && (
                    <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                      {children.map(({ href, label, icon: CIcon }) => {
                        const childActive = pathname === href
                        return (
                          <Link
                            key={href}
                            href={href}
                            style={childActive ? { backgroundColor: c.activeBg, color: c.activeText } : undefined}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                              childActive ? 'font-medium' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                            )}
                          >
                            <CIcon
                              style={childActive ? { color: c.icon } : undefined}
                              className={cn('w-3.5 h-3.5 shrink-0', !childActive && 'text-gray-600')}
                            />
                            {label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* ── SUPPORT */}
        <div>
          <p style={{ color: COLORS.support.label }} className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest">
            Support
          </p>
          <div className="space-y-0.5">
            <NavLink href="/support" label="Tickets" icon={HeadphonesIcon} color={COLORS.support} />
          </div>
        </div>

        {/* ── ANALYTIQUE */}
        <div>
          <p style={{ color: COLORS.analytique.label }} className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest">
            Analytique
          </p>
          <div className="space-y-0.5">
            <NavLink href="/analytics" label="Analytics SaaS" icon={BarChart3} color={COLORS.analytique} />
          </div>
        </div>

      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
