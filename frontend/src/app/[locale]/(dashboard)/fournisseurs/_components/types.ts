export type FournisseurStatut = 'Formel' | 'Informel'
export type FournisseurQualification = 'Agree' | 'AQualifier' | 'Suspendu'

export interface Fournisseur {
  id: string
  code: string
  raisonSociale: string
  statut: FournisseurStatut
  qualification: FournisseurQualification
  categorie: string
  devise: string
  contactPrincipal: string
  telephone: string
  email: string
  ville: string
  pays: string
  modeLogistique: string
  paiementMobile: boolean
  scoreFilabilite: number | null
  createdAt: string
  updatedAt: string
}

export const CATEGORIES_FOURNISSEUR = [
  'Matières premières agricoles',
  'Ingrédients & Additifs',
  'Emballages & Conditionnement',
  'Services & Logistique',
  'Autres',
]

export const DEVISES = [
  { code: 'XOF', label: 'XOF :Franc CFA BCEAO' },
  { code: 'XAF', label: 'XAF :Franc CFA BEAC' },
  { code: 'EUR', label: 'EUR :Euro' },
  { code: 'USD', label: 'USD :Dollar américain' },
  { code: 'GBP', label: 'GBP :Livre sterling' },
]

export const PAYS_AFRIQUE_OUEST = [
  'Bénin', 'Burkina Faso', 'Cabo Verde', "Côte d'Ivoire", 'Gambie',
  'Ghana', 'Guinée', 'Guinée-Bissau', 'Libéria', 'Mali', 'Mauritanie',
  'Niger', 'Nigeria', 'Sénégal', 'Sierra Leone', 'Togo',
  'France', 'Pays-Bas', 'Espagne', 'Chine', 'Inde', 'Autre',
]

export const MODES_LOGISTIQUE = [
  { code: 'EXW', label: 'EXW :Départ usine' },
  { code: 'FOB', label: 'FOB :Franco à bord' },
  { code: 'CIF', label: 'CIF :Coût assurance fret' },
  { code: 'DAP', label: 'DAP :Rendu au lieu de destination' },
  { code: 'DDP', label: 'DDP :Rendu droits acquittés' },
  { code: 'CPT', label: 'CPT :Port payé jusqu\'à' },
]

export const QUALIFICATION_COLORS: Record<FournisseurQualification, string> = {
  Agree: 'bg-emerald-100 text-emerald-800',
  AQualifier: 'bg-amber-400 text-amber-950',
  Suspendu: 'bg-red-600 text-white',
}

export const QUALIFICATION_LABELS: Record<FournisseurQualification, string> = {
  Agree: 'Agréé',
  AQualifier: 'À qualifier',
  Suspendu: 'Suspendu',
}

export const STATUT_COLORS: Record<FournisseurStatut, string> = {
  Formel: 'bg-blue-100 text-blue-700',
  Informel: 'bg-gray-100 text-gray-600',
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground'
  if (score >= 70) return 'text-emerald-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

export const MOCK_FOURNISSEURS: Fournisseur[] = [
  {
    id: '1',
    code: 'FRN-SEN-001',
    raisonSociale: 'SATREC Sénégal',
    statut: 'Formel',
    qualification: 'Agree',
    categorie: 'Matières premières agricoles',
    devise: 'XOF',
    contactPrincipal: 'Mamadou Diallo',
    telephone: '+221 77 123 45 67',
    email: 'mdiallo@satrec.sn',
    ville: 'Dakar',
    pays: 'Sénégal',
    modeLogistique: 'DAP',
    paiementMobile: true,
    scoreFilabilite: 82,
    createdAt: '2023-08-01',
    updatedAt: '2025-04-10',
  },
  {
    id: '2',
    code: 'FRN-MLI-001',
    raisonSociale: 'Coopérative Agri-Mali',
    statut: 'Informel',
    qualification: 'AQualifier',
    categorie: 'Matières premières agricoles',
    devise: 'XOF',
    contactPrincipal: 'Fatoumata Coulibaly',
    telephone: '+223 65 432 10 98',
    email: 'fcouli@agrimal.ml',
    ville: 'Bamako',
    pays: 'Mali',
    modeLogistique: 'EXW',
    paiementMobile: true,
    scoreFilabilite: 58,
    createdAt: '2024-01-15',
    updatedAt: '2025-02-20',
  },
  {
    id: '3',
    code: 'FRN-CIV-001',
    raisonSociale: 'PackAfrique SARL',
    statut: 'Formel',
    qualification: 'Agree',
    categorie: 'Emballages & Conditionnement',
    devise: 'XOF',
    contactPrincipal: 'Jean-Paul Konan',
    telephone: '+225 07 654 32 10',
    email: 'jpkonan@packafrique.ci',
    ville: 'Abidjan',
    pays: "Côte d'Ivoire",
    modeLogistique: 'DAP',
    paiementMobile: false,
    scoreFilabilite: 91,
    createdAt: '2023-03-10',
    updatedAt: '2025-05-01',
  },
  {
    id: '4',
    code: 'FRN-NLD-001',
    raisonSociale: 'Royal Ingredients BV',
    statut: 'Formel',
    qualification: 'Agree',
    categorie: 'Ingrédients & Additifs',
    devise: 'EUR',
    contactPrincipal: 'Lars van der Berg',
    telephone: '+31 20 555 44 33',
    email: 'lberg@royalingredients.nl',
    ville: 'Rotterdam',
    pays: 'Pays-Bas',
    modeLogistique: 'CIF',
    paiementMobile: false,
    scoreFilabilite: 95,
    createdAt: '2022-11-01',
    updatedAt: '2025-03-15',
  },
  {
    id: '5',
    code: 'FRN-BFA-001',
    raisonSociale: 'TransSahel Logistics',
    statut: 'Formel',
    qualification: 'AQualifier',
    categorie: 'Services & Logistique',
    devise: 'XOF',
    contactPrincipal: 'Issouf Traoré',
    telephone: '+226 70 111 22 33',
    email: 'itraore@transsahel.bf',
    ville: 'Ouagadougou',
    pays: 'Burkina Faso',
    modeLogistique: 'FOB',
    paiementMobile: true,
    scoreFilabilite: 44,
    createdAt: '2024-06-01',
    updatedAt: '2025-01-08',
  },
  {
    id: '6',
    code: 'FRN-GHA-001',
    raisonSociale: 'GoldCoast Grain Ltd',
    statut: 'Formel',
    qualification: 'Suspendu',
    categorie: 'Matières premières agricoles',
    devise: 'USD',
    contactPrincipal: 'Kwame Asante',
    telephone: '+233 24 999 88 77',
    email: 'kasante@gcgrain.gh',
    ville: 'Accra',
    pays: 'Ghana',
    modeLogistique: 'FOB',
    paiementMobile: false,
    scoreFilabilite: 28,
    createdAt: '2023-09-15',
    updatedAt: '2024-11-20',
  },
]
