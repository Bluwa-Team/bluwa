export type StatutReception = 'Conforme' | 'Reserve' | 'Attente'
export type TypeFournisseur = 'Formel' | 'Informel'
export type StatutLot = 'Libere' | 'EnControle' | 'Bloque'

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
  lot: string | null        // lot stock interne
  lotFourn: string | null   // référence lot fournisseur
  dlc: string | null        // date limite de consommation
  codeBarres: string | null
  statut: StatutReception
  statutLot: StatutLot | null
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

export const STATUT_LOT_LABELS: Record<StatutLot, string> = {
  Libere: 'Lot libéré',
  EnControle: 'Lot en contrôle',
  Bloque: 'Lot bloqué',
}

export const STATUT_LOT_COLORS: Record<StatutLot, string> = {
  Libere: 'text-emerald-600',
  EnControle: 'text-amber-600',
  Bloque: 'text-red-600',
}

export const MOCK_RECEPTIONS: Reception[] = [
  {
    id: '1',
    numero: 'REC-2026-001',
    date: '2026-05-02',
    numeroBon: 'BA-2026-019',
    fournisseur: 'Maraîcher Pikine',
    typeFournisseur: 'Informel',
    article: 'Gingembre frais',
    quantite: 30,
    unite: 'kg',
    lot: 'LOT-GIN-001',
    lotFourn: 'MP-GIN-2604',
    dlc: '2026-05-15',
    codeBarres: null,
    statut: 'Conforme',
    statutLot: 'EnControle',
    cloturee: false,
  },
  {
    id: '2',
    numero: 'REC-2026-002',
    date: '2026-05-09',
    numeroBon: 'BC-2026-057',
    fournisseur: 'Sucrerie Niari',
    typeFournisseur: 'Formel',
    article: 'Sucre cristallisé',
    quantite: 500,
    unite: 'kg',
    lot: 'LOT-SUC-002',
    lotFourn: 'SN-A23-08',
    dlc: '2027-05-09',
    codeBarres: null,
    statut: 'Conforme',
    statutLot: 'EnControle',
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
    lot: 'LOT-VER-003',
    lotFourn: 'VDO-260508',
    dlc: null,
    codeBarres: '8901234567890',
    statut: 'Reserve',
    statutLot: 'Bloque',
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
    unite: 'kg',
    lot: null,
    lotFourn: null,
    dlc: null,
    codeBarres: null,
    statut: 'Attente',
    statutLot: null,
    cloturee: false,
  },
]
