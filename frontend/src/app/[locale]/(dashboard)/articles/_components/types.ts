export type ArticleType = 'MP' | 'PSF' | 'PF' | 'AC' | 'CS'
export type ArticleStatut = 'Actif' | 'Bloque' | 'EnCreation'
export type ArticleAppro = 'Achete' | 'Fabrique' | 'Interne'

export interface Article {
  id: string
  code: string
  designation: string
  type: ArticleType
  famille: string
  sousFamille: string
  categorie: string
  uniteStock: string
  uniteVente: string
  coeffConversion: number
  uniteAchat: string
  coeffConversionAchat: number
  dernierPrixAchat: number | null
  prixVente: number | null
  pmp: number | null
  devise: string
  poidsUnitaire: number | null
  poidsUnite: string
  volumeUnitaire: number | null
  volumeUnite: string
  dureeVie: number | null
  stockSecurite: number | null
  pointCommande: number | null
  appro: ArticleAppro
  statut: ArticleStatut
  gestionLot: boolean
  delaiControle: number | null
  seuilAlertePeremption: number | null
  protocoleControle: string
  codeBarres: string
  qrCode: string
  createdAt: string
  updatedAt: string
}

export const FAMILLES: Record<string, { sousFamilles: Record<string, string[]> }> = {
  'Céréales': {
    sousFamilles: {
      'Grains': ['Maïs', 'Mil', 'Sorgho'],
      'Farines': ['Farine de maïs', 'Farine de mil'],
    },
  },
  'Légumineuses': {
    sousFamilles: {
      'Grains secs': ['Niébé', 'Arachide'],
      'Transformés': ['Huile d\'arachide', 'Tourteau'],
    },
  },
  'Emballages': {
    sousFamilles: {
      'Primaires': ['Sachets', 'Boîtes'],
      'Secondaires': ['Cartons', 'Palettes'],
    },
  },
  'Produits finis': {
    sousFamilles: {
      'Farines enrichies': ['Farine infantile', 'Farine famille'],
      'Pâtes': ['Spaghetti', 'Macaroni'],
    },
  },
}

// Unités par défaut (fusionnées avec le référentiel de l'organisation)
export const UNITES_STOCK_DEFAUT  = ['kg', 'g', 't', 'L', 'mL', 'unité', 'sachet', 'carton', 'palette', 'sac']
export const UNITES_MESURE_DEFAUT = ['kg', 'g', 't', 'L', 'mL', 'm³', 'cl']
export const UNITES_ACHAT_DEFAUT  = ['kg', 'g', 't', 'L', 'boite', 'sac', 'carton', 'bidon', 'sachet', 'unité']

export const TYPE_LABELS: Record<ArticleType, string> = {
  MP: 'Matière première',
  PSF: 'Produit semi-fini',
  PF: 'Produit fini',
  AC: 'Article de conditionnement',
  CS: 'Consommable',
}

export const TYPE_COLORS: Record<ArticleType, string> = {
  MP: 'bg-blue-100 text-blue-700',
  PSF: 'bg-purple-100 text-purple-700',
  PF: 'bg-green-100 text-green-700',
  AC: 'bg-orange-100 text-orange-700',
  CS: 'bg-gray-100 text-gray-600',
}

export const STATUT_COLORS: Record<ArticleStatut, string> = {
  Actif: 'bg-emerald-100 text-emerald-800',
  Bloque: 'bg-red-600 text-white',
  EnCreation: 'bg-orange-400 text-orange-950',
}

export const STATUT_LABELS: Record<ArticleStatut, string> = {
  Actif: 'Actif',
  Bloque: 'Bloqué',
  EnCreation: 'En création',
}

export const APPRO_COLORS: Record<ArticleAppro, string> = {
  Achete:   'bg-sky-100 text-sky-700',
  Fabrique: 'bg-violet-100 text-violet-700',
  Interne:  'bg-teal-100 text-teal-700',
}
