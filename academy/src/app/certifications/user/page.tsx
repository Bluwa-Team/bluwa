import Link from 'next/link'
import { ChevronLeft, CheckCircle2, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Certification Utilisateurs Bluwa  Academy' }

const roles = [
  {
    title: 'User  Opérateurs',
    items: [
      'Utilisation quotidienne de Bluwa pour la saisie et le suivi',
      'Écrans de réception, fabrication, transformation et expédition',
      'Consultation des indicateurs de production',
      'Pilotage des flux opérationnels',
    ],
  },
  {
    title: 'Admin  Configuration',
    items: [
      'Paramétrage des référentiels et structures d\'entrepôt',
      'Gestion des profils utilisateurs et des droits d\'accès',
      'Configuration des règles de stock et des workflows',
      'Sécurisation des données critiques',
    ],
  },
  {
    title: 'Manager  Tableaux de bord & arbitrages',
    items: [
      'Interfaces décisionnelles et rapports de performance',
      'Pilotage des coûts, volumes et qualité',
      'Suivi des actions correctives',
      'Arbitrages tactiques sur la base des indicateurs',
    ],
  },
]

export default function UserCertPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/certifications" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-8">
        <ChevronLeft className="w-4 h-4" /> Certifications
      </Link>

      <div className="flex items-start gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
          <Users className="w-7 h-7 text-white" />
        </div>
        <div>
          <span className="text-xs font-mono text-slate-400">Niveau 1</span>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs Bluwa</h1>
          <p className="text-slate-500 mt-1">
            Certifications fondamentales pour les rôles opérationnels et supports.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {roles.map(r => (
          <div key={r.title} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="font-semibold text-slate-800 mb-3 text-sm border-b border-slate-100 pb-2">{r.title}</p>
            <ul className="space-y-2">
              {r.items.map(i => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-slate-50 rounded-xl p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-800 mb-1">Modules associés</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Link href="/modules/fondations-mdm" className="text-blue-600 hover:underline">→ Module 01  Fondations & MDM</Link>
          <Link href="/modules/stocks-qualite" className="text-blue-600 hover:underline">→ Module 03  Stocks & WM</Link>
        </div>
      </div>
    </div>
  )
}
