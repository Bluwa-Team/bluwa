'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/actions/auth'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function UserMenu() {
  const [user,    setUser]    = useState<SupabaseUser | null>(null)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        Connexion
      </Link>
    )
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg hover:bg-slate-100 px-2 py-1 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
          {initials}
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-44 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <Link
              href="/profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="w-3.5 h-3.5" /> Mon profil
            </Link>
            <form action={signOut}>
              <button type="submit" className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Déconnexion
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
