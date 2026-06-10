'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const CGU_VERSION = '1.0'

const CGU_ARTICLES = [
  {
    title: 'Article 1 — Objet',
    content: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Bluwa ERP, solution de gestion intégrée conçue pour les entreprises agro-alimentaires d'Afrique de l'Ouest, éditée par Bluwa (ci-après « l'Éditeur »).`,
  },
  {
    title: 'Article 2 — Accès à la plateforme',
    content: `L'accès à la plateforme est réservé aux utilisateurs disposant d'un compte valide créé par l'administrateur de leur organisation. L'utilisateur est responsable de la confidentialité de ses identifiants de connexion. Tout accès effectué via ses identifiants est présumé être le fait de l'utilisateur.`,
  },
  {
    title: 'Article 3 — Utilisation autorisée',
    content: `La plateforme est mise à disposition dans le cadre exclusif de la gestion des opérations de l'organisation de l'utilisateur (gestion des stocks, achats, production, qualité). Toute utilisation à des fins concurrentielles, frauduleuses ou contraires aux présentes CGU est strictement interdite.`,
  },
  {
    title: 'Article 4 — Données et confidentialité',
    content: `Les données saisies par l'utilisateur sur la plateforme sont la propriété exclusive de son organisation. L'Éditeur s'engage à ne pas les divulguer à des tiers sans consentement préalable, sauf obligation légale. Les données sont hébergées sur des serveurs sécurisés en Europe (Supabase EU-West). Pour plus de détails, consultez notre Politique de Confidentialité.`,
  },
  {
    title: 'Article 5 — Disponibilité du service',
    content: `L'Éditeur s'engage à maintenir la disponibilité de la plateforme avec un objectif de disponibilité de 99 % (hors maintenance planifiée). Des interruptions peuvent survenir pour maintenance, mises à jour ou raisons indépendantes de la volonté de l'Éditeur. L'Éditeur ne saurait être tenu responsable des pertes liées à une interruption temporaire du service.`,
  },
  {
    title: 'Article 6 — Propriété intellectuelle',
    content: `La plateforme Bluwa ERP, son code, ses interfaces, ses algorithmes et ses contenus sont la propriété exclusive de Bluwa et sont protégés par le droit de la propriété intellectuelle applicable. Toute reproduction, représentation ou exploitation non autorisée est interdite.`,
  },
  {
    title: 'Article 7 — Responsabilités',
    content: `L'utilisateur est seul responsable de l'exactitude des données qu'il saisit sur la plateforme. L'Éditeur ne peut être tenu responsable de décisions prises sur la base de données incorrectes ou incomplètes. La responsabilité de l'Éditeur est limitée au montant des abonnements payés au cours des 12 derniers mois.`,
  },
  {
    title: 'Article 8 — Modifications',
    content: `L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle et devront accepter les nouvelles conditions pour continuer à utiliser la plateforme.`,
  },
  {
    title: 'Article 9 — Résiliation',
    content: `L'Éditeur se réserve le droit de suspendre ou résilier l'accès d'un utilisateur en cas de violation des présentes CGU, sans préavis ni indemnité.`,
  },
  {
    title: 'Article 10 — Loi applicable',
    content: `Les présentes CGU sont soumises au droit togolais et au droit OHADA. Tout litige relatif à leur interprétation ou exécution sera soumis aux juridictions compétentes de Lomé, Togo, après tentative de résolution amiable.`,
  },
]

export default function CguPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  const [accepted, setAccepted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
      if (atBottom) setScrolled(true)
    }
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleAccept() {
    if (!accepted) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/${locale}/login`); return }

    const { error: err } = await supabase
      .from('profiles')
      .update({ cgu_accepted_at: new Date().toISOString(), cgu_version: CGU_VERSION })
      .eq('id', user.id)

    if (err) {
      setError('Une erreur est survenue. Réessayez.')
      setLoading(false)
      return
    }
    router.push(`/${locale}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-start py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <Image src="/bluwa_text.png" alt="Bluwa" width={120} height={36} />
        <span className="text-xs text-gray-500">Version {CGU_VERSION} — Juin 2026</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="bg-[#1447E6] px-6 py-4">
          <h1 className="text-white font-bold text-lg">Conditions Générales d'Utilisation</h1>
          <p className="text-blue-200 text-sm mt-0.5">Lisez attentivement avant d'accéder à la plateforme</p>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="h-[400px] overflow-y-auto px-6 py-5 text-sm text-gray-700 space-y-5 border-b border-gray-100"
        >
          <p className="text-gray-500 italic text-xs">
            Faites défiler jusqu'en bas pour activer l'acceptation.
          </p>

          {CGU_ARTICLES.map((art) => (
            <div key={art.title}>
              <h2 className="font-semibold text-[#0A1628] mb-1">{art.title}</h2>
              <p className="leading-relaxed">{art.content}</p>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
            Bluwa — CGU v{CGU_VERSION} — Juin 2026 · Droit OHADA applicable · Juridiction : Lomé, Togo
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-gray-50 space-y-4">
          <label className={`flex items-start gap-3 cursor-pointer ${!scrolled ? 'opacity-40 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#1447E6] cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-snug">
              J'ai lu et j'accepte les Conditions Générales d'Utilisation de Bluwa ERP (version {CGU_VERSION}).
            </span>
          </label>

          {!scrolled && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              ↓ Faites défiler jusqu'en bas pour activer l'acceptation
            </p>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all
              bg-[#1447E6] text-white hover:bg-[#0f36c4]
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Enregistrement...' : 'Accepter et accéder à la plateforme'}
          </button>
        </div>
      </div>
    </div>
  )
}
