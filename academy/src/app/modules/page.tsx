import Link from 'next/link'
import { Database, CalendarClock, Boxes, ShieldCheck, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Modules de formation · Bluwa Academy' }

const modules = [
  {
    icon: Database,
    num: '01',
    title: 'Fondations & Référentiels MDM',
    desc: 'Structurer les référentiels produits, matières et fournisseurs dans un environnement formel et informel.',
    duration: '3h',
    href: '/modules/fondations-mdm',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: CalendarClock,
    num: '02',
    title: 'Planification & Pilotage MRP2',
    desc: 'PDP, calcul des besoins nets, TRS et gestion des aléas locaux (coupures, pannes).',
    duration: '4h',
    href: '/modules/planification-mrp2',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Boxes,
    num: '03',
    title: 'Stocks & Contrôle qualité WM',
    desc: 'FEFO/FIFO, traçabilité des lots, blocage qualité et valorisation financière au coût réel.',
    duration: '4h',
    href: '/modules/stocks-qualite',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: ShieldCheck,
    num: '04',
    title: 'Qualité & Sécurité sanitaire HACCP',
    desc: 'Analyse des dangers, blocage automatique des lots non conformes et conformité réglementaire.',
    duration: '3h',
    href: '/modules/haccp',
    color: 'bg-red-50 text-red-600',
  },
]

export default function ModulesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Modules de formation</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Quatre modules pour couvrir l'ensemble des opérations de la Suite Industrielle Bluwa.
        </p>
      </div>
      <div className="grid gap-4">
        {modules.map(m => (
          <Link
            key={m.num}
            href={m.href}
            className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow flex gap-4 items-center"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
              <m.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-mono text-slate-400">Module {m.num}</span>
                <span className="text-xs text-slate-400">{m.duration}</span>
              </div>
              <h2 className="font-semibold text-slate-900 mb-1">{m.title}</h2>
              <p className="text-sm text-slate-500">{m.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
