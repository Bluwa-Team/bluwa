import { ShieldCheck } from 'lucide-react'
import { ModulePage } from '@/components/ModulePage'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Module 04 · HACCP · Bluwa Academy' }

export default function HACCPPage() {
  return (
    <ModulePage
      num="04"
      title="Qualité Industrielle & Sécurité Sanitaire"
      subtitle="Les Standards HACCP"
      duration="3 heures"
      level="Managers · Responsables qualité"
      icon={ShieldCheck}
      iconColor="bg-red-50 text-red-600"
      objectives={[
        'Appliquer les 7 principes HACCP dans l\'ensemble des opérations.',
        'Protéger la chaîne de production contre les risques microbiologiques et chimiques.',
        'Intégrer les laboratoires nationaux dans le système de pilotage.',
        'Déclencher les workflows de retrait en cas de non-conformité.',
      ]}
      sections={[
        {
          title: 'Les 7 principes HACCP',
          content: (
            <ol className="space-y-2">
              {[
                'Analyse des dangers — identifier les risques biologiques, chimiques et physiques.',
                'Détermination des CCP (Points Critiques de Contrôle).',
                'Établissement des limites critiques pour chaque CCP.',
                'Mise en place d\'un système de surveillance.',
                'Détermination des mesures correctives.',
                'Vérification du système HACCP.',
                'Documentation et archivage.',
              ].map((p, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          ),
        },
        {
          title: 'Blocage automatique des lots dans Bluwa',
          content: (
            <div className="space-y-3">
              <p>Dès la détection d'une anomalie, Bluwa déclenche automatiquement :</p>
              <ul className="space-y-2">
                <li className="flex gap-2 text-sm">
                  <span className="text-red-500 font-bold">→</span>
                  Passage du lot au statut <span className="font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs">Bloqué</span>
                </li>
                <li className="flex gap-2 text-sm">
                  <span className="text-red-500 font-bold">→</span>
                  Notification au responsable qualité et au responsable de production.
                </li>
                <li className="flex gap-2 text-sm">
                  <span className="text-red-500 font-bold">→</span>
                  Workflow de décision : destruction ou retour fournisseur.
                </li>
                <li className="flex gap-2 text-sm">
                  <span className="text-red-500 font-bold">→</span>
                  Traçabilité complète de l'incident pour le reporting sanitaire.
                </li>
              </ul>
            </div>
          ),
        },
        {
          title: 'Interfaces avec les laboratoires nationaux',
          content: (
            <ul className="space-y-2 text-sm">
              <li>• Saisie des résultats d'analyses physico-chimiques et microbiologiques dans Bluwa.</li>
              <li>• Validation systématique des résultats avant libération du lot.</li>
              <li>• Reporting aux autorités sanitaires selon les exigences locales (ANSSA, ONSSA…).</li>
              <li>• Conservation des certificats d'analyse pour l'audit et la certification.</li>
            </ul>
          ),
        },
      ]}
    />
  )
}
