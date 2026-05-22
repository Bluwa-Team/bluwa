// ── Stratégie de stock ───────────────────────────────────────────────────────

export type NiveauService = '90' | '95' | '99'

export interface ArticleStrategie {
  id: string
  sku: string
  article: string
  unite: string
  consoMoy: number
  sigmaConso: number
  delaiMoy: number
  delaiMax: number
  niveauService: NiveauService
  stockActuel: number
}

export const Z_VALUES: Record<NiveauService, number> = {
  '90': 1.28,
  '95': 1.65,
  '99': 2.33,
}

export function calcSS(a: ArticleStrategie): number {
  const Z = Z_VALUES[a.niveauService]
  return Math.round(Z * Math.sqrt(a.delaiMoy) * a.sigmaConso + (a.delaiMax - a.delaiMoy) * a.consoMoy)
}

export function calcPointCmd(a: ArticleStrategie, ss: number): number {
  return Math.round(a.consoMoy * a.delaiMoy + ss)
}

export const MOCK_STRATEGIE: ArticleStrategie[] = [
  { id: 's1', sku: 'MAT-HIB-001', article: "Fleurs d'hibiscus séchées", unite: 'kg', consoMoy: 11.3, sigmaConso: 1.6, delaiMoy: 11.5, delaiMax: 14, niveauService: '95', stockActuel: 220  },
  { id: 's2', sku: 'MAT-SUC-002', article: 'Sucre cristallisé',          unite: 'kg', consoMoy: 11.8, sigmaConso: 1.3, delaiMoy: 5.4,  delaiMax: 7,  niveauService: '95', stockActuel: 320  },
  { id: 's3', sku: 'MAT-GIN-003', article: 'Gingembre frais',             unite: 'kg', consoMoy: 1.2,  sigmaConso: 0.2, delaiMoy: 3.5,  delaiMax: 5,  niveauService: '99', stockActuel: 18   },
  { id: 's4', sku: 'EMB-VER-004', article: 'Bouteille verre 1L',          unite: 'u',  consoMoy: 92,   sigmaConso: 9.5, delaiMoy: 17.3, delaiMax: 21, niveauService: '99', stockActuel: 1800 },
  { id: 's5', sku: 'MAT-VAN-005', article: 'Gousses de vanille',          unite: 'kg', consoMoy: 0,    sigmaConso: 0,   delaiMoy: 27.8, delaiMax: 35, niveauService: '99', stockActuel: 3    },
]

// ── Commandes fournisseurs ────────────────────────────────────────────────────

export type StatutCommande = 'EnCours' | 'Recue' | 'Partielle' | 'Annulee'
export type TypeCommande = 'BC' | 'BA'

export interface CommandeFournisseur {
  id: string
  numero: string
  type: TypeCommande
  date: string
  fournisseur: string
  article: string
  quantite: number
  quantiteRecue: number
  unite: string
  livraisonPrevue: string
  contrat: string | null
  reception: string | null
  statut: StatutCommande
}

export const STATUT_COMMANDE_COLORS: Record<StatutCommande, string> = {
  EnCours:  'bg-orange-100 text-orange-700 border border-orange-200',
  Recue:    'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Partielle:'bg-amber-100 text-amber-700 border border-amber-200',
  Annulee:  'bg-red-100 text-red-700 border border-red-200',
}

export const STATUT_COMMANDE_LABELS: Record<StatutCommande, string> = {
  EnCours:  'En cours',
  Recue:    'Reçue',
  Partielle:'Partielle',
  Annulee:  'Annulée',
}

export const MOCK_COMMANDES: CommandeFournisseur[] = [
  {
    id: '1',
    numero: 'BC-2026-058',
    type: 'BC',
    date: '2026-05-05',
    fournisseur: 'Coop. Bissap Kaolack',
    article: "Fleurs d'hibiscus séchées",
    quantite: 300,
    quantiteRecue: 0,
    unite: 'kg',
    livraisonPrevue: '2026-05-17',
    contrat: 'CT-2026-007',
    reception: null,
    statut: 'EnCours',
  },
  {
    id: '2',
    numero: 'BC-2026-057',
    type: 'BC',
    date: '2026-05-04',
    fournisseur: 'Sucrerie Niari',
    article: 'Sucre cristallisé',
    quantite: 500,
    quantiteRecue: 500,
    unite: 'kg',
    livraisonPrevue: '2026-05-09',
    contrat: 'CT-2026-005',
    reception: 'REC-2026-002',
    statut: 'Recue',
  },
  {
    id: '3',
    numero: 'BC-2026-056',
    type: 'BC',
    date: '2026-05-03',
    fournisseur: 'Verrerie Dakar',
    article: 'Bouteille verre 1L',
    quantite: 5000,
    quantiteRecue: 0,
    unite: 'u',
    livraisonPrevue: '2026-05-19',
    contrat: 'CT-2026-003',
    reception: null,
    statut: 'EnCours',
  },
  {
    id: '4',
    numero: 'BC-2026-055',
    type: 'BC',
    date: '2026-05-02',
    fournisseur: 'Vanille Madagascar',
    article: 'Gousses de vanille',
    quantite: 5,
    quantiteRecue: 0,
    unite: 'kg',
    livraisonPrevue: '2026-05-30',
    contrat: 'CT-2025-012',
    reception: null,
    statut: 'EnCours',
  },
  {
    id: '5',
    numero: 'BA-2026-019',
    type: 'BA',
    date: '2026-04-28',
    fournisseur: 'Maraîcher Pikine',
    article: 'Gingembre frais',
    quantite: 30,
    quantiteRecue: 30,
    unite: 'kg',
    livraisonPrevue: '2026-05-02',
    contrat: null,
    reception: 'REC-2026-001',
    statut: 'Recue',
  },
  {
    id: '6',
    numero: 'BC-2026-053',
    type: 'BC',
    date: '2026-04-26',
    fournisseur: 'Imprimerie Plateau',
    article: 'Étiquettes Pourpre 1L',
    quantite: 10000,
    quantiteRecue: 0,
    unite: 'u',
    livraisonPrevue: '2026-05-12',
    contrat: 'CT-2026-001',
    reception: null,
    statut: 'EnCours',
  },
]
