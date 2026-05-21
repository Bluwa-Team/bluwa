export type StatutReception = 'Conforme' | 'Reserve' | 'Attente'
export type TypeFournisseur = 'Formel' | 'Informel'

export interface Reception {
  id: string
  numero: string
  date: string
  numeroBon: string | null
  fournisseur: string
  typeFournisseur: TypeFournisseur
  article: string
  quantite: number
  unite: string
  lot: string | null
  codeBarres: string | null
  statut: StatutReception
  cloturee: boolean
}

export const STATUT_RECEPTION_COLORS: Record<StatutReception, string> = {
  Conforme: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Reserve: 'bg-orange-100 text-orange-700 border border-orange-200',
  Attente: 'bg-amber-100 text-amber-700 border border-amber-200',
}

export const STATUT_RECEPTION_LABELS: Record<StatutReception, string> = {
  Conforme: 'Conforme',
  Reserve: 'Réserve',
  Attente: 'Attente',
}

export const MOCK_RECEPTIONS: Reception[] = [
  {
    id: '1',
    numero: 'REC-2026-001',
    date: '2026-05-06',
    numeroBon: 'BC-2026-018',
    fournisseur: 'SOFRUITS SARL',
    typeFournisseur: 'Formel',
    article: "Fleurs d'hibiscus séchées",
    quantite: 250,
    unite: 'Kg',
    lot: 'LOT-HIB-260105',
    codeBarres: '3401597826541',
    statut: 'Conforme',
    cloturee: false,
  },
  {
    id: '2',
    numero: 'REC-2026-002',
    date: '2026-05-07',
    numeroBon: 'BA-INF-024',
    fournisseur: 'Mama Aïssata (marché Sandaga)',
    typeFournisseur: 'Informel',
    article: 'Gingembre frais',
    quantite: 40,
    unite: 'Kg',
    lot: 'LOT-GIN-260507',
    codeBarres: null,
    statut: 'Conforme',
    cloturee: false,
  },
  {
    id: '3',
    numero: 'REC-2026-003',
    date: '2026-05-08',
    numeroBon: 'BC-2026-019',
    fournisseur: "Verrerie de l'Ouest",
    typeFournisseur: 'Formel',
    article: 'Bouteilles verre 1L',
    quantite: 1200,
    unite: 'Unité',
    lot: 'LOT-VER-260508',
    codeBarres: '8901234567890',
    statut: 'Reserve',
    cloturee: false,
  },
  {
    id: '4',
    numero: 'REC-2026-004',
    date: '2026-05-08',
    numeroBon: 'BC-2026-020',
    fournisseur: 'Sucrerie Nationale',
    typeFournisseur: 'Formel',
    article: 'Sucre cristallisé',
    quantite: 500,
    unite: 'Kg',
    lot: 'LOT-SUC-260508',
    codeBarres: null,
    statut: 'Attente',
    cloturee: false,
  },
]
