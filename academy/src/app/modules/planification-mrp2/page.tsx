import { CalendarClock } from 'lucide-react'
import { ModulePage } from '@/components/ModulePage'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Module 02  Planification MRP2 · Bluwa Academy' }

const steps = [
  { label: 'Prévisions de la demande', desc: 'Saisie des quantités prévisionnelles par produit et par semaine (horizon 6 semaines glissantes). Alimente le Supply Planning et le MRP.' },
  { label: 'Plan de demande', desc: 'Commandes fermes des clients organisées par semaine de livraison. Bluwa retient le maximum entre prévisions et commandes confirmées pour ne jamais sous-estimer la charge.' },
  { label: 'Supply Planning', desc: 'Équilibre automatique entre la demande retenue et la capacité de production. Trois statuts : OK (<85%), Tension (85–100%), Surcharge (>100%).' },
  { label: 'MRP — Calcul des besoins nets', desc: 'Explosion de la nomenclature (BOM) → génération automatique des recommandations : ACHETER, PRODUIRE ou AVANCER une livraison.' },
  { label: 'Analyse des capacités (postes de charge)', desc: 'Vérification de la disponibilité machine et main-d\'œuvre par poste. Prise en compte du taux d\'efficacité et des capacités journalières.' },
  { label: 'Validation & lancement de l\'OF', desc: 'Déclenchement de l\'Ordre de Fabrication après arbitrage des recommandations MRP : convertir, ignorer ou avancer une livraison fournisseur.' },
]

export default function PlanificationMRP2Page() {
  return (
    <ModulePage
      num="02"
      moduleSlug="planification-mrp2"
      title="Planification & Pilotage d'Atelier"
      subtitle="La Méthode MRP2"
      duration="4 heures"
      level="Opérateurs · Managers"
      icon={CalendarClock}
      iconColor="bg-amber-50 text-amber-600"
      objectives={[
        'Saisir et interpréter les prévisions de la demande dans Bluwa.',
        'Lire le Plan de demande et comprendre la règle max(prévisions, commandes fermes).',
        'Analyser le Supply Planning : statuts OK, Tension et Surcharge.',
        'Exploiter les recommandations MRP (ACHETER, PRODUIRE, AVANCER) pour piloter les approvisionnements.',
        'Intégrer les aléas locaux : coupures électriques, pannes machines, saisons agricoles.',
      ]}
      sections={[
        {
          title: 'La chaîne S&OP dans Bluwa — 6 étapes',
          video: {
            title: 'De la prévision de demande au lancement de l\'OF — la chaîne S&OP Bluwa',
            duration: '3 min 20 s',
          },
          content: (
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={s.label} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{s.label}</p>
                    <p className="text-slate-500 text-sm">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          ),
        },
        {
          title: 'TRS  Taux de Rendement Synthétique',
          video: {
            title: 'Calcul du TRS et pilotage de l\'atelier dans Bluwa',
            duration: '2 min 40 s',
          },
          content: (
            <div className="space-y-3">
              <p>Le TRS mesure l'efficacité réelle d'un équipement en intégrant trois types de pertes :</p>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                {[
                  { label: 'Disponibilité', desc: 'Pannes + coupures électriques' },
                  { label: 'Performance', desc: 'Cadences réduites' },
                  { label: 'Qualité', desc: 'Rebuts + retouches' },
                ].map(c => (
                  <div key={c.label} className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <p className="font-semibold text-amber-800">{c.label}</p>
                    <p className="text-amber-600 text-xs mt-1">{c.desc}</p>
                  </div>
                ))}
              </div>
              <p className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                TRS = Disponibilité × Performance × Qualité
              </p>
            </div>
          ),
        },
        {
          title: 'Spécificité régionale  Aléas locaux',
          content: (
            <ul className="space-y-2">
              <li>• <strong>Coupures électriques</strong> : intégrer des créneaux de secours dans le PDP, prévoir des groupes électrogènes.</li>
              <li>• <strong>Pannes fréquentes</strong> : majorer les temps de cycle dans Bluwa pour absorber les indisponibilités.</li>
              <li>• <strong>Saisons agricoles</strong> : adapter les campagnes d'approvisionnement aux périodes de récolte locales.</li>
            </ul>
          ),
        },
      ]}
    />
  )
}
