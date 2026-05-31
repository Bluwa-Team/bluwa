'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { UserMenu } from '@/components/UserMenu'

const links = [
  { href: '/parcours',       label: 'Parcours'        },
  { href: '/modules',        label: 'Modules'         },
  { href: '/certifications', label: 'Certifications'  },
  { href: '/aide',           label: 'Aide'            },
  { href: '/contact',        label: 'Contact'         },
]

export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Bluwa" className="h-8 w-auto" />
          <span className="text-sm font-semibold text-slate-400 border-l border-slate-200 pl-3 ml-1">Academy</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`transition-colors hover:text-indigo-600 ${
                pathname.startsWith(l.href) ? 'text-indigo-600 font-medium' : 'text-slate-600'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <UserMenu />
        </nav>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-3 text-sm">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-slate-700 hover:text-indigo-600"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-1 border-t border-slate-100">
            <UserMenu />
          </div>
        </div>
      )}
    </header>
  )
}
