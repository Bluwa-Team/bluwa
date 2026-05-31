import { Mail, MessageSquare } from 'lucide-react'
import type { Metadata } from 'next'
import { ContactForm } from './ContactForm'

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
        <ContactForm />
      </div>
    </div>
  )
}
