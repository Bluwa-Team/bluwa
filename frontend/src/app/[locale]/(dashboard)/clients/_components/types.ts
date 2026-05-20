export type ClientStatut = 'Actif' | 'Inactif'
export type ClientType = 'Grossiste' | 'Detaillant' | 'Institutionnel' | 'ONG' | 'Export' | 'Autre'

export interface GrilleTarifaire {
  articleCode: string
  designation: string
  prixNegecie: number
  devise: string
}

export interface Client {
  id: string
  code: string
  raisonSociale: string
  statut: ClientStatut
  type: ClientType
  secteur: string
  langue: string
  ville: string
  pays: string
  incoterm: string
  transport: string
  limiteCredit: number | null
  conditionPaiement: string
  paiementMobile: boolean
  contactPrincipal: string
  telephone: string
  email: string
  grilleTarifaire: GrilleTarifaire[]
  createdAt: string
  updatedAt: string
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  Grossiste: 'Grossiste',
  Detaillant: 'Détaillant',
  Institutionnel: 'Institutionnel',
  ONG: 'ONG / Humanitaire',
  Export: 'Export',
  Autre: 'Autre',
}

export const CLIENT_TYPE_COLORS: Record<ClientType, string> = {
  Grossiste: 'bg-blue-100 text-blue-700',
  Detaillant: 'bg-purple-100 text-purple-700',
  Institutionnel: 'bg-orange-100 text-orange-700',
  ONG: 'bg-teal-100 text-teal-700',
  Export: 'bg-indigo-100 text-indigo-700',
  Autre: 'bg-gray-100 text-gray-600',
}

export const STATUT_COLORS: Record<ClientStatut, string> = {
  Actif: 'bg-emerald-100 text-emerald-800',
  Inactif: 'bg-gray-200 text-gray-600',
}

export const SECTEURS = [
  'Alimentaire / Distribution',
  'Industrie',
  'Institutionnel / ONG',
  'Export',
]

export const LANGUES = ['Français', 'Anglais', 'Portugais', 'Arabe', 'Wolof', 'Autre']

export const CONDITIONS_PAIEMENT = [
  'Comptant',
  '15 jours',
  '30 jours',
  '60 jours',
  '90 jours',
  'Paiement mobile',
  'Virement bancaire',
  'Autre',
]

export const TRANSPORTS = [
  'Client (franco départ)',
  'Fournisseur (livraison incluse)',
  'Sous-traitant désigné',
]

export const INCOTERMS_CLIENT = [
  { code: 'EXW', label: 'EXW :Départ usine' },
  { code: 'DAP', label: 'DAP :Rendu au lieu de destination' },
  { code: 'DDP', label: 'DDP :Rendu droits acquittés' },
  { code: 'FOB', label: 'FOB :Franco à bord' },
  { code: 'CIF', label: 'CIF :Coût assurance fret' },
]

export const PAYS_CLIENTS = [
  'Sénégal', 'Mali', 'Burkina Faso', "Côte d'Ivoire", 'Ghana', 'Guinée',
  'Niger', 'Bénin', 'Togo', 'Nigeria', 'Mauritanie', 'Gambie',
  'France', 'Pays-Bas', 'Espagne', 'Autre',
]

export const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    code: 'CLT-SEN-001',
    raisonSociale: 'CASINO Distribution Dakar',
    statut: 'Actif',
    type: 'Grossiste',
    secteur: 'Alimentaire / Distribution',
    langue: 'Français',
    ville: 'Dakar',
    pays: 'Sénégal',
    incoterm: 'DAP',
    transport: 'Fournisseur (livraison incluse)',
    limiteCredit: 15000000,
    conditionPaiement: '30 jours',
    paiementMobile: false,
    contactPrincipal: 'Awa Sow',
    telephone: '+221 33 821 00 00',
    email: 'asow@casino.sn',
    grilleTarifaire: [
      { articleCode: 'PF-PRO-001', designation: 'Farine infantile 1kg - Vitasoja', prixNegecie: 620, devise: 'XOF' },
      { articleCode: 'PF-PRO-002', designation: 'Spaghetti 500g - Bluwa Gold', prixNegecie: 430, devise: 'XOF' },
    ],
    createdAt: '2023-02-10',
    updatedAt: '2025-04-01',
  },
  {
    id: '2',
    code: 'CLT-MLI-001',
    raisonSociale: 'Marché Central Bamako SARL',
    statut: 'Actif',
    type: 'Grossiste',
    secteur: 'Alimentaire / Distribution',
    langue: 'Français',
    ville: 'Bamako',
    pays: 'Mali',
    incoterm: 'DAP',
    transport: 'Sous-traitant désigné',
    limiteCredit: 8000000,
    conditionPaiement: '60 jours',
    paiementMobile: true,
    contactPrincipal: 'Moussa Keïta',
    telephone: '+223 76 543 21 09',
    email: 'mkeita@mcentral.ml',
    grilleTarifaire: [
      { articleCode: 'PF-PRO-001', designation: 'Farine infantile 1kg - Vitasoja', prixNegecie: 640, devise: 'XOF' },
    ],
    createdAt: '2023-06-15',
    updatedAt: '2025-02-18',
  },
  {
    id: '3',
    code: 'CLT-SEN-002',
    raisonSociale: 'PAM Sénégal',
    statut: 'Actif',
    type: 'ONG',
    secteur: 'Institutionnel / ONG',
    langue: 'Français',
    ville: 'Dakar',
    pays: 'Sénégal',
    incoterm: 'DDP',
    transport: 'Fournisseur (livraison incluse)',
    limiteCredit: null,
    conditionPaiement: 'Virement bancaire',
    paiementMobile: false,
    contactPrincipal: 'Sophie Dubois',
    telephone: '+221 33 869 00 00',
    email: 'sdubois@wfp.org',
    grilleTarifaire: [
      { articleCode: 'PF-PRO-001', designation: 'Farine infantile 1kg - Vitasoja', prixNegecie: 600, devise: 'XOF' },
    ],
    createdAt: '2022-09-01',
    updatedAt: '2025-05-05',
  },
  {
    id: '4',
    code: 'CLT-CIV-001',
    raisonSociale: 'Supermarché Hayat Abidjan',
    statut: 'Actif',
    type: 'Detaillant',
    secteur: 'Alimentaire / Distribution',
    langue: 'Français',
    ville: 'Abidjan',
    pays: "Côte d'Ivoire",
    incoterm: 'DAP',
    transport: 'Sous-traitant désigné',
    limiteCredit: 5000000,
    conditionPaiement: '30 jours',
    paiementMobile: false,
    contactPrincipal: 'Éric Brou',
    telephone: '+225 07 890 12 34',
    email: 'ebrou@hayat.ci',
    grilleTarifaire: [
      { articleCode: 'PF-PRO-002', designation: 'Spaghetti 500g - Bluwa Gold', prixNegecie: 445, devise: 'XOF' },
    ],
    createdAt: '2024-01-20',
    updatedAt: '2025-03-10',
  },
  {
    id: '5',
    code: 'CLT-GHA-001',
    raisonSociale: 'AfricaExport Ltd',
    statut: 'Actif',
    type: 'Export',
    secteur: 'Export',
    langue: 'Anglais',
    ville: 'Accra',
    pays: 'Ghana',
    incoterm: 'FOB',
    transport: 'Client (franco départ)',
    limiteCredit: 25000000,
    conditionPaiement: 'Virement bancaire',
    paiementMobile: false,
    contactPrincipal: 'James Osei',
    telephone: '+233 24 111 22 33',
    email: 'josei@africaexport.gh',
    grilleTarifaire: [
      { articleCode: 'PF-PRO-001', designation: 'Farine infantile 1kg - Vitasoja', prixNegecie: 580, devise: 'XOF' },
      { articleCode: 'PF-PRO-002', designation: 'Spaghetti 500g - Bluwa Gold', prixNegecie: 420, devise: 'XOF' },
    ],
    createdAt: '2024-03-05',
    updatedAt: '2025-04-20',
  },
  {
    id: '6',
    code: 'CLT-SEN-003',
    raisonSociale: 'Restaurant Teranga Dakar',
    statut: 'Inactif',
    type: 'Detaillant',
    secteur: 'Alimentaire / Distribution',
    langue: 'Français',
    ville: 'Dakar',
    pays: 'Sénégal',
    incoterm: 'EXW',
    transport: 'Client (franco départ)',
    limiteCredit: 500000,
    conditionPaiement: 'Comptant',
    paiementMobile: true,
    contactPrincipal: 'Ibrahima Fall',
    telephone: '+221 77 444 55 66',
    email: 'ifall@teranga.sn',
    grilleTarifaire: [],
    createdAt: '2023-11-01',
    updatedAt: '2024-08-15',
  },
]
