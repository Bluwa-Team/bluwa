import Link from 'next/link'
import { LifeBuoy, Smartphone, Monitor, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Aide · Bluwa Academy' }

export default function AidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
        <LifeBuoy className="w-7 h-7 text-indigo-600" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-3">Aide contextuelle</h1>
      <p className="text-slate-500 max-w-lg mx-auto mb-10">
        L'aide est intégrée directement dans la Suite Industrielle Bluwa et l'application mobile.
        Pas besoin de quitter votre flux de travail pour trouver un guide.
      </p>

      <div className="grid sm:grid-cols-3 gap-5 text-left mb-12">
        {[
          {
            icon: Monitor,
            title: 'ERP Bluwa',
            desc: 'Chaque écran de l\'ERP dispose d\'une icône d\'aide contextuelle donnant accès aux procédures et règles métier.',
          },
          {
            icon: Smartphone,
            title: 'App mobile',
            desc: 'L\'application Bluwa Ops embarque des guides pas à pas pour les opérateurs terrain.',
          },
          {
            icon: BookOpen,
            title: 'Bluwa Academy',
            desc: 'Pour une formation approfondie, les modules Academy couvrent les fondements théoriques et les cas pratiques.',
          },
        ].map(c => (
          <div key={c.title} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mb-3">
              <c.icon className="w-5 h-5 text-slate-600" />
            </div>
            <p className="font-semibold text-slate-800 mb-1 text-sm">{c.title}</p>
            <p className="text-xs text-slate-500">{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-xl p-6">
        <p className="font-semibold text-slate-800 mb-1">Vous avez une question spécifique ?</p>
        <p className="text-sm text-slate-500 mb-4">
          Notre équipe est disponible pour accompagner vos équipes dans la prise en main de Bluwa.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          Nous contacter
        </Link>
      </div>
    </div>
  )
}
