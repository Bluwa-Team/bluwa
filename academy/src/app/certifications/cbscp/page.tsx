import Link from 'next/link'
import { ChevronLeft, Award, CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CBSCP · Certified Bluwa Supply Chain Professional' }

const competencies = [
  'Maîtrise complète du module MDM et des référentiels industriels',
  'Planification avancée MRP2 — PDP, MRP1, gestion des capacités',
  'Gestion des stocks WM — FEFO, traçabilité et valorisation financière',
  'Qualité & HACCP — analyse des dangers, CCP et conformité réglementaire',
  'Arbitrage supply chain — coûts, délais, qualité et service client',
  'Pilotage des indicateurs de performance (TRS, rotation, marge BOM)',
  'Interfaces avec les autorités sanitaires et les laboratoires nationaux',
]

const targets = [
  'Responsables supply chain',
  'Directeurs industriels',
  'Experts qualité',
  'Consultants ERP agroalimentaire',
]

export default function CBSCPPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/certifications" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-8">
        <ChevronLeft className="w-4 h-4" /> Certifications
      </Link>

      {/* Hero CBSCP */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-600 text-white rounded-2xl p-8 mb-8 flex gap-6 items-start">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
          <Award className="w-8 h-8 text-white" />
        </div>
        <div>
          <span className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">Niveau 3 · Certification élite</span>
          <h1 className="text-2xl font-bold mt-1">CBSCP</h1>
          <p className="text-indigo-100 text-sm mt-1">Certified Bluwa Supply Chain Professional</p>
          <p className="text-indigo-100 mt-3 text-sm">
            La certification avancée qui valide une maîtrise complète de la Suite Industrielle Bluwa
            dans le contexte agroalimentaire ouest-africain.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {/* Public cible */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-xl p-5">
          <p className="font-semibold text-slate-800 mb-3 text-sm">Public cible</p>
          <ul className="space-y-2">
            {targets.map(t => (
              <li key={t} className="text-xs text-slate-600 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Compétences validées */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <p className="font-semibold text-slate-800 mb-3 text-sm">Compétences validées</p>
          <ul className="space-y-2">
            {competencies.map(c => (
              <li key={c} className="flex items-start gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-800 mb-2">Modules requis pour le CBSCP</p>
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {[
            ['/modules/fondations-mdm', 'Module 01 · Fondations & MDM'],
            ['/modules/planification-mrp2', 'Module 02 · Planification MRP2'],
            ['/modules/stocks-qualite', 'Module 03 · Stocks & Qualité WM'],
            ['/modules/haccp', 'Module 04 · HACCP & Sécurité sanitaire'],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="text-indigo-600 hover:underline flex items-center gap-1">
              → {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Demander un accès CBSCP
        </Link>
      </div>
    </div>
  )
}
