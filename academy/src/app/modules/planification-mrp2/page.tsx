import { CalendarClock } from 'lucide-react'
import { ModulePage } from '@/components/ModulePage'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Module 02  Planification MRP2 · Bluwa Academy' }

const steps = [
  { label: 'Prévisions de ventes', desc: 'Base de la demande future, consolidée dans le PIC/MPS/S&OP.' },
  { label: 'Plan industriel & commercial (PIC/S&OP)', desc: 'Ajustement de la charge et de la capacité globale à long terme.' },
  { label: 'Plan directeur de production (PDP)', desc: 'Calendrier des produits finis à moyen terme, enrichi par les commandes fermes.' },
  { label: 'Calcul des besoins nets (MRP 1)', desc: 'Explosion de la nomenclature (BOM) → génération automatique des DA et des OF.' },
  { label: 'Analyse des capacités', desc: 'Vérification manuelle de la disponibilité machine et main-d\'œuvre.' },
  { label: 'Validation & lancement de l\'OF', desc: 'Déclenchement final après arbitrage des ressources et des contraintes.' },
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
        'Élaborer le Plan Directeur de Production (PDP).',
        'Calculer les besoins nets en fonction des stocks, commandes et délais.',
        'Piloter l\'atelier avec un focus sur le TRS.',
        'Intégrer les aléas locaux : coupures électriques, pannes machines.',
      ]}
      sections={[
        {
          title: 'Le processus de planification opérationnelle',
          video: {
            title: 'De la prévision des ventes au lancement de l\'OF — le cycle MRP2',
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
