import { Boxes } from 'lucide-react'
import { ModulePage } from '@/components/ModulePage'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Module 03  Stocks & Qualité WM · Bluwa Academy' }

const execSteps = [
  { label: 'OF validé / créé', desc: 'Génération du bon de sortie des composants.' },
  { label: 'Sortie stock composants', desc: 'Sortie physique et informatique selon la BOM.' },
  { label: 'Suivi des étapes de transformation', desc: 'Guidage opérateur pas à pas. Saisie obligatoire des temps et rendements.' },
  { label: 'Déclaration de fin de fabrication', desc: 'Clôture de l\'OF. Saisie des sous-produits et rebuts.' },
  { label: 'Contrôle qualité sortie', desc: 'Tests lab + terrain. Statut "Libéré" ou "Bloqué" selon les mesures.' },
  { label: 'Entrée en stock produit fini', desc: 'Valorisation au coût réel, mise à disposition ADV.' },
]

export default function StocksQualitePage() {
  return (
    <ModulePage
      num="03"
      moduleSlug="stocks-qualite"
      title="Gestion des stocks & Contrôle qualité"
      subtitle="L'Optimisation WM"
      duration="4 heures"
      level="Opérateurs · Managers"
      icon={Boxes}
      iconColor="bg-indigo-50 text-indigo-600"
      objectives={[
        'Synchroniser les mouvements physiques et les statuts qualité.',
        'Garantir la traçabilité des lots matières premières → produits finis.',
        'Appliquer FEFO/FIFO pour les produits périssables.',
        'Mesurer la performance financière des OF.',
      ]}
      sections={[
        {
          title: 'Zoning des stocks',
          video: {
            title: 'Les 4 zones de stock dans Bluwa WM — libre, quarantaine, rétention, rebuts',
            duration: '2 min 30 s',
          },
          content: (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { zone: 'Stock libre', color: 'bg-indigo-50 border-indigo-200 text-indigo-800', desc: 'Disponible pour production et ADV.' },
                { zone: 'Quarantaine', color: 'bg-amber-50 border-amber-200 text-amber-800', desc: 'En attente de libération qualité.' },
                { zone: 'Rétention qualité', color: 'bg-orange-50 border-orange-200 text-orange-800', desc: 'Analyse en cours, usage bloqué.' },
                { zone: 'Rebuts', color: 'bg-red-50 border-red-200 text-red-800', desc: 'Lot non conforme, à détruire ou retourner.' },
              ].map(z => (
                <div key={z.zone} className={`rounded-lg border p-3 ${z.color}`}>
                  <p className="font-semibold">{z.zone}</p>
                  <p className="text-xs mt-1 opacity-80">{z.desc}</p>
                </div>
              ))}
            </div>
          ),
        },
        {
          title: 'Phase exécution terrain  Séquence OF',
          video: {
            title: 'Suivi d\'un ordre de fabrication de A à Z dans Bluwa',
            duration: '3 min 15 s',
          },
          content: (
            <ol className="space-y-3">
              {execSteps.map((s, i) => (
                <li key={s.label} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
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
          title: 'Principes de contrôle qualité',
          content: (
            <ul className="space-y-2">
              <li>• Le <strong>statut qualité</strong> bloque ou autorise l'usage d'un lot  indépendant du statut logistique.</li>
              <li>• Prélèvement d'échantillon déclenché <strong>automatiquement</strong> à la réception MP ou à la clôture d'un OF.</li>
              <li>• Les deux dimensions (qualité + logistique) sont gérées séparément mais affichées ensemble.</li>
              <li>• En cas de rejet : destruction du lot <strong>ou</strong> retour fournisseur avec flux litige achat.</li>
            </ul>
          ),
        },
      ]}
    />
  )
}
