import Link from 'next/link'
import { ChevronLeft, CheckCircle2, TrendingUp } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Certification Compétences Métier  Bluwa Academy' }

const domains = [
  {
    title: 'Stocks / FEFO',
    module: '/modules/stocks-qualite',
    items: [
      'Maîtrise des règles de rotation des produits',
      'Contrôle des dates de péremption',
      'Prévention du gaspillage alimentaire',
    ],
  },
  {
    title: 'Planification / TRS',
    module: '/modules/planification-mrp2',
    items: [
      'Mise en œuvre de la planification des ateliers',
      'Calcul et suivi du TRS',
      'Gestion des pannes et coupures électriques',
    ],
  },
  {
    title: 'HACCP / Traçabilité',
    module: '/modules/haccp',
    items: [
      'Compréhension des exigences sanitaires',
      'Analyse des dangers par produit',
      'Traçabilité complète des lots alimentaires',
    ],
  },
  {
    title: 'Analyse de marge / BOM',
    module: '/modules/fondations-mdm',
    items: [
      'Analyse des coûts matières',
      'Calculs de marges par produit',
      'Gestion des nomenclatures de fabrication (BOM)',
    ],
  },
]

export default function MetierCertPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/certifications" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-8">
        <ChevronLeft className="w-4 h-4" /> Certifications
      </Link>

      <div className="flex items-start gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
          <TrendingUp className="w-7 h-7 text-white" />
        </div>
        <div>
          <span className="text-xs font-mono text-slate-400">Niveau 2</span>
          <h1 className="text-2xl font-bold text-slate-900">Montée en compétences métier</h1>
          <p className="text-slate-500 mt-1">
            Expertise sectorielle sur les enjeux clés de l'agroalimentaire ouest-africain.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {domains.map(d => (
          <div key={d.title} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <p className="font-semibold text-slate-800 text-sm">{d.title}</p>
              <Link href={d.module} className="text-xs text-amber-600 hover:underline">Voir le module →</Link>
            </div>
            <ul className="space-y-2">
              {d.items.map(i => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
