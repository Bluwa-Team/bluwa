import Link from 'next/link'
import { ChevronRight, Award } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Certifications  Bluwa Academy' }

const certs = [
  {
    href: '/certifications/user',
    level: 'Niveau 1',
    title: 'Utilisateurs Bluwa',
    desc: 'Opérateurs, Administrateurs, Managers  maîtrise des outils quotidiens.',
    color: 'bg-blue-600',
  },
  {
    href: '/certifications/metier',
    level: 'Niveau 2',
    title: 'Compétences métier',
    desc: 'Stocks FEFO, Planification, HACCP, Marge BOM  expertise sectorielle.',
    color: 'bg-amber-500',
  },
  {
    href: '/certifications/cbscp',
    level: 'Niveau 3',
    title: 'CBSCP',
    desc: 'Certified Bluwa Supply Chain Professional  la certification élite.',
    color: 'bg-indigo-600',
  },
]

export default function CertificationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Certifications</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Trois niveaux de reconnaissance pour valider vos compétences opérationnelles et sectorielles.
        </p>
      </div>
      <div className="space-y-4">
        {certs.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center shrink-0`}>
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-mono">{c.level}</p>
              <p className="font-semibold text-slate-900">{c.title}</p>
              <p className="text-sm text-slate-500">{c.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
