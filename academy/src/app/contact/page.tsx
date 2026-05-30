import { Mail, MessageSquare } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contact  Bluwa Academy' }

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Contactez-nous</h1>
        <p className="text-slate-500">
          Demande de formation, d'accès à la plateforme ou question sur nos certifications.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-10">
        <a
          href="mailto:academy@bluwa.io"
          className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Par e-mail</p>
            <p className="text-xs text-indigo-600 mt-1">academy@bluwa.io</p>
            <p className="text-xs text-slate-500 mt-1">Réponse sous 48h ouvrées.</p>
          </div>
        </a>

        <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Via l'application</p>
            <p className="text-xs text-slate-500 mt-1">
              Connectez-vous à votre compte Bluwa et utilisez le chat d'assistance intégré.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6">
        <p className="font-semibold text-slate-800 mb-4">Formulaire de demande</p>
        <form className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet</label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Adresse e-mail</label>
            <input
              type="email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="vous@entreprise.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Objet de la demande</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Demande de formation</option>
              <option>Accès à la plateforme Academy</option>
              <option>Information sur le CBSCP</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
            <textarea
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Décrivez votre besoin..."
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Envoyer la demande
          </button>
        </form>
      </div>
    </div>
  )
}
