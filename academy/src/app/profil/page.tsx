import { redirect } from 'next/navigation'
import { Award, BookOpen, CheckCircle2, LogOut } from 'lucide-react'
import type { Metadata } from 'next'
import { getUser, getProfile, signOut } from '@/lib/actions/auth'
import { getAllProgress } from '@/lib/actions/progress'
import { getCertificationsStatus } from '@/lib/actions/certifications'
import { MODULE_LABELS } from '@/types/academy'

export const metadata: Metadata = { title: 'Mon profil · Bluwa Academy' }

const CERT_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   badge: 'bg-blue-600'   },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  badge: 'bg-amber-600'  },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', badge: 'bg-indigo-600' },
}

export default async function ProfilPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [profile, progress, certStatuses] = await Promise.all([
    getProfile(),
    getAllProgress(),
    getCertificationsStatus(),
  ])

  const initials = profile?.full_name
    ?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  const earnedCount = certStatuses.filter(c => c.earned).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{profile?.full_name ?? user.email}</h1>
            <p className="text-sm text-slate-500">{user.email}</p>
            {profile?.organisation && (
              <p className="text-xs text-slate-400 mt-0.5">{profile.organisation}</p>
            )}
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </form>
      </div>

      {/* ── Progression modules ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <h2 className="font-semibold text-slate-800">Progression des modules</h2>
        </div>
        <div className="space-y-4">
          {Object.entries(MODULE_LABELS).map(([slug, label]) => {
            const pct = progress[slug] ?? 0
            return (
              <div key={slug}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-slate-700">{label}</span>
                  <span className="text-xs font-semibold text-slate-500">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Certifications ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800">Certifications</h2>
          </div>
          <span className="text-xs text-slate-500">{earnedCount} / {certStatuses.length} obtenues</span>
        </div>
        <div className="space-y-3">
          {certStatuses.map(cert => {
            const c = CERT_COLORS[cert.color]
            return (
              <div key={cert.level} className={`rounded-xl border p-4 ${cert.earned ? `${c.bg} ${c.border}` : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {cert.earned
                        ? <CheckCircle2 className={`w-4 h-4 ${c.text}`} />
                        : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                      }
                      <span className={`font-semibold text-sm ${cert.earned ? c.text : 'text-slate-500'}`}>
                        {cert.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6">{cert.description}</p>
                  </div>
                  {cert.earned && (
                    <span className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${c.badge}`}>
                      ✓ Obtenue
                    </span>
                  )}
                </div>
                {!cert.earned && (
                  <div className="mt-3 ml-6">
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-1.5">
                      <div className="h-full rounded-full bg-indigo-400" style={{ width: `${cert.progress}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-400">{cert.progress}% des modules requis complétés</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
