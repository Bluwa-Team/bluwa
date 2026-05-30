import Link from 'next/link'
import { ChevronLeft, Clock, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ModuleSection {
  title: string
  content: React.ReactNode
}

interface Props {
  num: string
  title: string
  subtitle: string
  duration: string
  level: string
  icon: LucideIcon
  iconColor: string
  objectives: string[]
  sections: ModuleSection[]
}

export function ModulePage({ num, title, subtitle, duration, level, icon: Icon, iconColor, objectives, sections }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/modules" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-8">
        <ChevronLeft className="w-4 h-4" /> Tous les modules
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs font-mono text-slate-400">Module {num}</span>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 mt-1">{subtitle}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {duration}</span>
            <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {level}</span>
          </div>
        </div>
      </div>

      {/* Objectifs */}
      <div className="bg-slate-50 rounded-xl p-6 mb-8">
        <h2 className="font-semibold text-slate-800 mb-3">Objectifs du module</h2>
        <ul className="space-y-2">
          {objectives.map(o => (
            <li key={o} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
              {o}
            </li>
          ))}
        </ul>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map(s => (
          <div key={s.title} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">{s.title}</h3>
            </div>
            <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed">
              {s.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
