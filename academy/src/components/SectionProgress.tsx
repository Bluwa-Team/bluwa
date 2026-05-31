'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, Circle, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markSectionComplete, unmarkSectionComplete } from '@/lib/actions/progress'

interface Props {
  moduleSlug:   string
  sectionTitle: string
}

export function SectionProgress({ moduleSlug, sectionTitle }: Props) {
  const [loggedIn,  setLoggedIn]  = useState(false)
  const [completed, setCompleted] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [pending,   startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return }
      setLoggedIn(true)

      const { data: progress } = await supabase
        .from('academy_section_progress')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('module_slug', moduleSlug)
        .eq('section_title', sectionTitle)
        .maybeSingle()

      setCompleted(!!progress)
      setLoading(false)
    })
  }, [moduleSlug, sectionTitle])

  if (loading) return <div className="h-8 w-40 rounded-lg bg-slate-100 animate-pulse mt-4" />

  if (!loggedIn) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-1.5 mt-4 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
      >
        <LogIn className="w-3.5 h-3.5" />
        Connectez-vous pour suivre votre progression
      </a>
    )
  }

  function toggle() {
    startTransition(async () => {
      if (completed) {
        await unmarkSectionComplete(moduleSlug, sectionTitle)
        setCompleted(false)
      } else {
        await markSectionComplete(moduleSlug, sectionTitle)
        setCompleted(true)
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-2 mt-4 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
        completed
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
      }`}
    >
      {completed
        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Section complétée</>
        : <><Circle className="w-3.5 h-3.5" /> Marquer comme vu</>
      }
    </button>
  )
}
