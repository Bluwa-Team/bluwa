import Link from 'next/link'
import { ChevronRight, CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parcours de certification · Bluwa Academy',
}

const levels = [
  {
    num: 1,
    title: 'Utilisateurs Bluwa',
    color: 'bg-blue-600',
    ring: 'ring-blue-200',
    certs: [
      {
        title: 'User — Opérateurs',
        items: [
          'Utilisation quotidienne de Bluwa',
          'Saisie des réceptions, fabrications et expéditions',
          'Consultation des indicateurs de production',
        ],
      },
      {
        title: 'Admin — Configuration',
        items: [
          'Paramétrage des référentiels',
          'Gestion des droits d\'accès',
          'Structures d\'entrepôt et workflows',
        ],
      },
      {
        title: 'Manager — Tableaux de bord',
        items: [
          'Interfaces décisionnelles et rapports',
          'Pilotage des coûts et des volumes',
          'Actions correctives et arbitrages',
        ],
      },
    ],
    href: '/certifications/user',
  },
  {
    num: 2,
    title: 'Montée en compétences métier',
    color: 'bg-amber-500',
    ring: 'ring-amber-200',
    certs: [
      {
        title: 'Stocks / FEFO',
        items: ['Rotation des produits', 'Contrôle des dates de péremption', 'Prévention du gaspillage'],
      },
      {
        title: 'Planification / TRS',
        items: ['Planification des ateliers', 'Taux de rendement synthétique', 'Gestion des pannes et coupures'],
      },
      {
        title: 'HACCP / Traçabilité',
        items: ['Exigences sanitaires', 'Analyse des dangers', 'Traçabilité des lots'],
      },
      {
        title: 'Analyse de marge / BOM',
        items: ['Coûts matières', 'Calculs de marges par produit', 'Nomenclatures de fabrication'],
      },
    ],
    href: '/certifications/metier',
  },
  {
    num: 3,
    title: 'Le Standard Sectoriel',
    color: 'bg-indigo-600',
    ring: 'ring-indigo-200',
    certs: [
      {
        title: 'CBSCP — Certified Bluwa Supply Chain Professional',
        items: [
          'Validation complète MDM, planification, stockage',
          'Qualité et conformité sectorielle',
          'Destiné aux responsables SC et directeurs industriels',
        ],
      },
    ],
    href: '/certifications/cbscp',
  },
]

export default function ParcoursPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Parcours de certification</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Trois niveaux progressifs pour ancrer vos compétences opérationnelles et sectorielles.
        </p>
      </div>

      <div className="space-y-10">
        {levels.map(l => (
          <div key={l.num} className={`rounded-2xl border-2 ring-4 ${l.ring} border-transparent overflow-hidden`}>
            <div className={`${l.color} px-6 py-4 text-white flex items-center justify-between`}>
              <div>
                <span className="text-xs font-mono opacity-70">Niveau {l.num}</span>
                <h2 className="text-xl font-bold">{l.title}</h2>
              </div>
              <Link
                href={l.href}
                className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-lg"
              >
                Détails <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-4 bg-white">
              {l.certs.map(c => (
                <div key={c.title} className="bg-slate-50 rounded-xl p-4">
                  <p className="font-semibold text-slate-800 mb-2 text-sm">{c.title}</p>
                  <ul className="space-y-1">
                    {c.items.map(i => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
