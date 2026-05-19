export type ArticleType = 'MP' | 'PSF' | 'PF' | 'AC' | 'CS'
export type ArticleStatut = 'Actif' | 'Bloque' | 'EnCreation'
export type ArticleAppro = 'Achete' | 'Fabrique'

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
  dernierPrixAchat: number | null
  prixVente: number | null
  pmp: number | null
  poidsUnitaire: number | null
  volumeUnitaire: number | null
  dureeVie: number | null
  stockSecurite: number | null
  pointCommande: number | null
  appro: ArticleAppro
  statut: ArticleStatut
  gestionLot: boolean
  delaiControle: number | null
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
  Actif: 'bg-emerald-100 text-emerald-700',
  Bloque: 'bg-red-100 text-red-600',
  EnCreation: 'bg-yellow-100 text-yellow-700',
}

export const STATUT_LABELS: Record<ArticleStatut, string> = {
  Actif: 'Actif',
  Bloque: 'Bloqué',
  EnCreation: 'En création',
}

export const APPRO_COLORS: Record<ArticleAppro, string> = {
  Achete: 'bg-sky-100 text-sky-700',
  Fabrique: 'bg-violet-100 text-violet-700',
}

export const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    code: 'MP-CER-001',
    designation: 'Maïs grain sec',
    type: 'MP',
    famille: 'Céréales',
    sousFamille: 'Grains',
    categorie: 'Maïs',
    uniteStock: 'KG',
    uniteVente: 'T',
    coeffConversion: 1000,
    dernierPrixAchat: 185,
    prixVente: null,
    pmp: 190,
    poidsUnitaire: 1,
    volumeUnitaire: null,
    dureeVie: 365,
    stockSecurite: 5000,
    pointCommande: 8000,
    appro: 'Achete',
    statut: 'Actif',
    gestionLot: true,
    delaiControle: 2,
    protocoleControle: 'PC-MP-001',
    codeBarres: '6221234560001',
    qrCode: 'QR-MP-CER-001',
    createdAt: '2024-01-15',
    updatedAt: '2025-03-10',
  },
  {
    id: '2',
    code: 'MP-CER-002',
    designation: 'Mil décortiqué',
    type: 'MP',
    famille: 'Céréales',
    sousFamille: 'Grains',
    categorie: 'Mil',
    uniteStock: 'KG',
    uniteVente: 'T',
    coeffConversion: 1000,
    dernierPrixAchat: 220,
    prixVente: null,
    pmp: 225,
    poidsUnitaire: 1,
    volumeUnitaire: null,
    dureeVie: 365,
    stockSecurite: 3000,
    pointCommande: 5000,
    appro: 'Achete',
    statut: 'Actif',
    gestionLot: true,
    delaiControle: 2,
    protocoleControle: 'PC-MP-001',
    codeBarres: '6221234560002',
    qrCode: 'QR-MP-CER-002',
    createdAt: '2024-01-15',
    updatedAt: '2025-02-20',
  },
  {
    id: '3',
    code: 'PSF-CER-001',
    designation: 'Farine de maïs enrichie (vrac)',
    type: 'PSF',
    famille: 'Céréales',
    sousFamille: 'Farines',
    categorie: 'Farine de maïs',
    uniteStock: 'KG',
    uniteVente: 'KG',
    coeffConversion: 1,
    dernierPrixAchat: null,
    prixVente: null,
    pmp: 310,
    poidsUnitaire: 1,
    volumeUnitaire: null,
    dureeVie: 180,
    stockSecurite: 2000,
    pointCommande: 3500,
    appro: 'Fabrique',
    statut: 'Actif',
    gestionLot: true,
    delaiControle: 1,
    protocoleControle: 'PC-PSF-001',
    codeBarres: '6221234560003',
    qrCode: 'QR-PSF-CER-001',
    createdAt: '2024-02-01',
    updatedAt: '2025-04-05',
  },
  {
    id: '4',
    code: 'PF-PRO-001',
    designation: 'Farine infantile 1kg - Vitasoja',
    type: 'PF',
    famille: 'Produits finis',
    sousFamille: 'Farines enrichies',
    categorie: 'Farine infantile',
    uniteStock: 'SACHET',
    uniteVente: 'CARTON',
    coeffConversion: 12,
    dernierPrixAchat: null,
    prixVente: 650,
    pmp: 420,
    poidsUnitaire: 1.05,
    volumeUnitaire: 1.2,
    dureeVie: 180,
    stockSecurite: 500,
    pointCommande: 800,
    appro: 'Fabrique',
    statut: 'Actif',
    gestionLot: true,
    delaiControle: 3,
    protocoleControle: 'PC-PF-001',
    codeBarres: '6221234560010',
    qrCode: 'QR-PF-PRO-001',
    createdAt: '2024-03-01',
    updatedAt: '2025-05-01',
  },
  {
    id: '5',
    code: 'AC-EMB-001',
    designation: 'Sachet plastique 1kg imprimé',
    type: 'AC',
    famille: 'Emballages',
    sousFamille: 'Primaires',
    categorie: 'Sachets',
    uniteStock: 'UNITE',
    uniteVente: 'CARTON',
    coeffConversion: 1000,
    dernierPrixAchat: 45,
    prixVente: null,
    pmp: 47,
    poidsUnitaire: 0.02,
    volumeUnitaire: null,
    dureeVie: null,
    stockSecurite: 10000,
    pointCommande: 20000,
    appro: 'Achete',
    statut: 'Actif',
    gestionLot: false,
    delaiControle: null,
    protocoleControle: '',
    codeBarres: '6221234560020',
    qrCode: 'QR-AC-EMB-001',
    createdAt: '2024-01-20',
    updatedAt: '2025-01-15',
  },
  {
    id: '6',
    code: 'CS-EMB-001',
    designation: 'Produit nettoyant sol (5L)',
    type: 'CS',
    famille: 'Emballages',
    sousFamille: 'Secondaires',
    categorie: 'Cartons',
    uniteStock: 'BIDON',
    uniteVente: 'BIDON',
    coeffConversion: 1,
    dernierPrixAchat: 3500,
    prixVente: null,
    pmp: 3500,
    poidsUnitaire: 5.2,
    volumeUnitaire: 5,
    dureeVie: 730,
    stockSecurite: 5,
    pointCommande: 10,
    appro: 'Achete',
    statut: 'Actif',
    gestionLot: false,
    delaiControle: null,
    protocoleControle: '',
    codeBarres: '6221234560030',
    qrCode: 'QR-CS-EMB-001',
    createdAt: '2024-04-10',
    updatedAt: '2025-02-01',
  },
  {
    id: '7',
    code: 'MP-LEG-001',
    designation: 'Arachide coque (bloqué)',
    type: 'MP',
    famille: 'Légumineuses',
    sousFamille: 'Grains secs',
    categorie: 'Arachide',
    uniteStock: 'KG',
    uniteVente: 'T',
    coeffConversion: 1000,
    dernierPrixAchat: 300,
    prixVente: null,
    pmp: 295,
    poidsUnitaire: 1,
    volumeUnitaire: null,
    dureeVie: 180,
    stockSecurite: 0,
    pointCommande: 0,
    appro: 'Achete',
    statut: 'Bloque',
    gestionLot: true,
    delaiControle: 5,
    protocoleControle: 'PC-MP-001',
    codeBarres: '6221234560040',
    qrCode: 'QR-MP-LEG-001',
    createdAt: '2023-06-01',
    updatedAt: '2024-12-01',
  },
  {
    id: '8',
    code: 'PF-PRO-002',
    designation: 'Spaghetti 500g - Bluwa Gold',
    type: 'PF',
    famille: 'Produits finis',
    sousFamille: 'Pâtes',
    categorie: 'Spaghetti',
    uniteStock: 'SACHET',
    uniteVente: 'CARTON',
    coeffConversion: 20,
    dernierPrixAchat: null,
    prixVente: 450,
    pmp: null,
    poidsUnitaire: 0.52,
    volumeUnitaire: 0.6,
    dureeVie: 730,
    stockSecurite: null,
    pointCommande: null,
    appro: 'Fabrique',
    statut: 'EnCreation',
    gestionLot: true,
    delaiControle: null,
    protocoleControle: '',
    codeBarres: '',
    qrCode: '',
    createdAt: '2025-05-10',
    updatedAt: '2025-05-10',
  },
]
