import { Database } from 'lucide-react'
import { ModulePage } from '@/components/ModulePage'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Module 01  Fondations & MDM · Bluwa Academy' }

export default function FondationsMDMPage() {
  return (
    <ModulePage
      num="01"
      moduleSlug="fondations-mdm"
      title="Fondations & Référentiels Industriels Agro"
      subtitle="La Rigueur MDM"
      duration="3 heures"
      level="Tous niveaux"
      icon={Database}
      iconColor="bg-blue-50 text-blue-600"
      objectives={[
        'Structurer les référentiels produits, matières, fournisseurs et sites.',
        'Standardiser les clés de codification avec le format TYPE-XXXX.',
        'Assurer la qualité des données dans un environnement formel et informel.',
        'Maintenir un référentiel unique malgré la diversité des sources de collecte.',
      ]}
      sections={[
        {
          title: 'Règle de codification  Format TYPE-XXXX',
          video: {
            title: 'Introduction à la codification MDM — Format TYPE-XXXX',
            duration: '2 min 45 s',
            youtubeId: '1HRYOhbZazo', // exemple IA — à remplacer par ta vidéo
          },
          content: (
            <div className="space-y-3">
              <p>Tous les articles Bluwa suivent un format standardisé :</p>
              <div className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1">
                <div><span className="text-blue-600">MATR-0001</span>  Matière première</div>
                <div><span className="text-blue-600">PFTS-0001</span>  Produit semi-fini</div>
                <div><span className="text-blue-600">PFTS-0002</span>  Produit fini</div>
              </div>
              <p>Ce format garantit une identification unique et une traçabilité fiable à travers toute la chaîne.</p>
            </div>
          ),
        },
        {
          title: 'Dualité formel / informel',
          video: {
            title: 'Gérer les circuits formels et informels dans Bluwa',
            duration: '3 min 10 s',
          },
          content: (
            <ul className="space-y-2">
              <li>• Capturer les informations issues des circuits officiels <strong>et</strong> des réseaux de collecte informels.</li>
              <li>• Définir des attributs clairs pour chaque piste de collecte (marché, coopérative, importation…).</li>
              <li>• Consolider dans un référentiel unique pour garantir la traçabilité en aval.</li>
            </ul>
          ),
        },
        {
          title: 'Exemple de catalogue MDM',
          content: (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-3 py-2 font-medium text-slate-700 border border-slate-200">Code article</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-700 border border-slate-200">Désignation</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-700 border border-slate-200">Type de flux</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-700 border border-slate-200">Statut</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-700 border border-slate-200">Date de création</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['MATR-0001', 'Farine de maïs', 'Matière première', 'Actif', '2026-05-22'],
                    ['MATR-0002', 'Huile de palme', 'Matière première', 'Actif', '2026-05-22'],
                    ['PFTS-0001', 'Mélange semi-fini', 'Produit semi-fini', 'Actif', '2026-05-22'],
                    ['PFTS-0002', 'Snack riz épicé', 'Produit fini', 'Actif', '2026-05-22'],
                  ].map(row => (
                    <tr key={row[0]} className="border border-slate-200 hover:bg-slate-50">
                      {row.map((cell, i) => (
                        <td key={i} className={`px-3 py-2 border border-slate-200 ${i === 0 ? 'font-mono text-blue-600' : ''}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        },
        {
          title: 'Mise en pratique terrain',
          video: {
            title: 'Exercice : créer vos premières fiches article dans Bluwa',
            duration: '2 min 55 s',
          },
          content: (
            <ul className="space-y-2">
              <li>• Identifier les matières premières locales : céréales, huiles, épices, packagings.</li>
              <li>• Consolider les données issues des filières agricoles et des marchés informels.</li>
              <li>• Créer les fiches article dans Bluwa avec les bons attributs de traçabilité.</li>
            </ul>
          ),
        },
      ]}
    />
  )
}
