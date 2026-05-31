import Link from 'next/link'
import {
  Database, CalendarClock, Boxes, ShieldCheck,
  ArrowRight, Award, LifeBuoy, ChevronRight
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bluwa Academy — Formations agroalimentaires pour l\'Afrique de l\'Ouest',
  description: 'Maîtrisez Bluwa ERP et certifiez vos compétences opérationnelles en production, stocks, qualité et planification agroalimentaire.',
}

const modules = [
  {
    icon: Database,
    num: '01',
    title: 'Fondations & Référentiels MDM',
    desc: 'Structurer vos référentiels produits, matières et fournisseurs.',
    duration: '3h',
    href: '/modules/fondations-mdm',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: CalendarClock,
    num: '02',
    title: 'Planification & Pilotage MRP2',
    desc: 'PDP, calcul des besoins nets et TRS en contexte agroalimentaire.',
    duration: '4h',
    href: '/modules/planification-mrp2',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Boxes,
    num: '03',
    title: 'Stocks & Contrôle qualité WM',
    desc: 'FEFO/FIFO, traçabilité des lots et valorisation financière.',
    duration: '4h',
    href: '/modules/stocks-qualite',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: ShieldCheck,
    num: '04',
    title: 'Qualité & Sécurité sanitaire HACCP',
    desc: 'Analyse des dangers, blocage des lots et conformité réglementaire.',
    duration: '3h',
    href: '/modules/haccp',
    color: 'bg-red-50 text-red-600',
  },
]

const levels = [
  {
    num: '01',
    title: 'Utilisateurs Bluwa',
    roles: ['Opérateurs', 'Administrateurs', 'Managers'],
    desc: 'Maîtrise des écrans quotidiens, configuration système et pilotage des tableaux de bord.',
    href: '/certifications/user',
    color: 'border-blue-200 bg-blue-50',
    badge: 'text-blue-700 bg-blue-100',
  },
  {
    num: '02',
    title: 'Montée en compétences métier',
    roles: ['Stocks FEFO', 'Planification', 'HACCP', 'Marge BOM'],
    desc: 'Expertise sectorielle sur les enjeux clés de l\'agroalimentaire ouest-africain.',
    href: '/certifications/metier',
    color: 'border-amber-200 bg-amber-50',
    badge: 'text-amber-700 bg-amber-100',
  },
  {
    num: '03',
    title: 'CBSCP',
    roles: ['Certified Bluwa Supply Chain Professional'],
    desc: 'La certification élite pour les responsables supply chain et directeurs industriels.',
    href: '/certifications/cbscp',
    color: 'border-indigo-200 bg-indigo-50',
    badge: 'text-indigo-700 bg-indigo-100',
  },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4">
            Bluwa Academy
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Maîtrisez vos opérations<br />
            <span className="text-indigo-400">agroalimentaires</span>
          </h1>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            Des formations certifiantes conçues pour les industries agroalimentaires
            d'Afrique de l'Ouest  du référentiel MDM à la certification CBSCP.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/parcours"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              Commencer <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/modules/fondations-mdm"
              className="border border-slate-500 hover:border-slate-400 text-slate-200 px-6 py-3 rounded-lg transition-colors"
            >
              Voir les modules
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Niveaux */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Trois niveaux de certification</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Une progression maîtrisée, du rôle opérationnel à l'expertise supply chain.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {levels.map(l => (
              <Link
                key={l.num}
                href={l.href}
                className={`border-2 rounded-xl p-6 hover:shadow-md transition-shadow ${l.color}`}
              >
                <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded ${l.badge}`}>
                  Niveau {l.num}
                </span>
                <h3 className="font-bold text-slate-900 mt-4 mb-2">{l.title}</h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {l.roles.map(r => (
                    <span key={r} className="text-xs bg-white/70 text-slate-600 px-2 py-0.5 rounded-full border">
                      {r}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-600">{l.desc}</p>
                <div className="flex items-center gap-1 text-sm font-medium text-slate-700 mt-4">
                  Voir le parcours <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Modules */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Les 4 modules de formation</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Chaque module couvre un domaine clé de la Suite Industrielle Bluwa.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {modules.map(m => (
              <Link
                key={m.num}
                href={m.href}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow flex gap-4"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-slate-400">Module {m.num}</span>
                    <span className="text-xs text-slate-400">{m.duration}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{m.title}</h3>
                  <p className="text-sm text-slate-500">{m.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 self-center shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CBSCP highlight */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-700 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Award className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <span className="text-indigo-200 text-sm font-semibold uppercase tracking-wider">
              Certification élite
            </span>
            <h2 className="text-2xl font-bold mt-1 mb-2">CBSCP</h2>
            <p className="text-indigo-100 mb-4">
              Certified Bluwa Supply Chain Professional  la certification avancée pour
              les responsables supply chain, directeurs industriels et experts qualité.
            </p>
            <Link
              href="/certifications/cbscp"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Découvrir le CBSCP <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Aide contextuelle */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <LifeBuoy className="w-6 h-6 text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Déjà utilisateur Bluwa ?</h2>
          <p className="text-slate-500 mb-6">
            L'aide contextuelle est intégrée directement dans l'application ERP et l'app mobile.
            Retrouvez des guides pas à pas sur chaque écran sans quitter votre flux de travail.
          </p>
          <Link
            href="/aide"
            className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Accéder à l'aide <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
