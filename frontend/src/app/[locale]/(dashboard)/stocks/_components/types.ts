// ── Vue lots (nouvelle UI) ────────────────────────────────────────────────────

export type TypeArticle = 'MP' | 'AC' | 'PF' | 'PE'
export type StatutQC = 'EnControle' | 'Libere' | 'Bloque'
export type EtatLot = 'Disponible' | 'Dormant' | 'Obsolete'
export type OrigineType = 'Formel' | 'Informel'

export interface LotStock {
  id: string
  numero: string
  sku: string
  designation: string
  type: TypeArticle
  quantite: number
  unite: string
  pmp: number
  valeur: number
  bcBa: string
  reception: string
  dateEntree: string
  dlc: string
  origine: OrigineType
  statutQC: StatutQC | null
  etat: EtatLot
}

export const TYPE_COLORS: Record<TypeArticle, string> = {
  MP: 'bg-blue-100 text-blue-700',
  AC: 'bg-violet-100 text-violet-700',
  PF: 'bg-emerald-100 text-emerald-700',
  PE: 'bg-amber-100 text-amber-700',
}

export const TYPE_LABELS: Record<TypeArticle, string> = {
  MP: 'Matière première',
  AC: 'Art. conditionnement',
  PF: 'Produit fini',
  PE: 'En-cours',
}

export const STATUT_QC_COLORS: Record<StatutQC, string> = {
  EnControle: 'bg-amber-100 text-amber-700 border border-amber-200',
  Libere:     'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Bloque:     'bg-red-100 text-red-700 border border-red-200',
}

export const STATUT_QC_LABELS: Record<StatutQC, string> = {
  EnControle: 'En contrôle',
  Libere:     'Libéré',
  Bloque:     'Bloqué',
}

export const ETAT_COLORS: Record<EtatLot, string> = {
  Disponible: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Dormant:    'bg-pink-100 text-pink-700 border border-pink-200',
  Obsolete:   'bg-orange-100 text-orange-700 border border-orange-200',
}

export const ETAT_LABELS: Record<EtatLot, string> = {
  Disponible: 'Disponible',
  Dormant:    'Dormant',
  Obsolete:   'Obsolète',
}

export const MOCK_LOTS: LotStock[] = [
  {
    id: '1', numero: 'LOT-2026-001', sku: 'MP-FAR-001', designation: 'Farine de blé T55',
    type: 'MP', quantite: 480, unite: 'Kg', pmp: 438, valeur: 210240,
    bcBa: 'BC-2026-040', reception: 'REC-2026-040', dateEntree: '2026-05-10',
    dlc: '2026-08-20', origine: 'Formel', statutQC: 'Libere', etat: 'Disponible',
  },
  {
    id: '2', numero: 'LOT-2026-002', sku: 'MP-ARA-002', designation: 'Arachides brutes',
    type: 'MP', quantite: 180, unite: 'Kg', pmp: 720, valeur: 129600,
    bcBa: 'BA-2026-015', reception: 'REC-2026-015', dateEntree: '2026-02-16',
    dlc: '2026-06-21', origine: 'Informel', statutQC: 'Libere', etat: 'Dormant',
  },
  {
    id: '3', numero: 'LOT-2026-003', sku: 'AC-ETI-003', designation: 'Étiquettes anciennes',
    type: 'AC', quantite: 3500, unite: 'Unité', pmp: 12, valeur: 42000,
    bcBa: 'BC-2026-005', reception: 'REC-2026-005', dateEntree: '2025-11-23',
    dlc: '2026-05-17', origine: 'Formel', statutQC: 'Bloque', etat: 'Obsolete',
  },
  {
    id: '4', numero: 'LOT-2026-004', sku: 'PF-PAI-004', designation: 'Pain de mie',
    type: 'PF', quantite: 120, unite: 'Kg', pmp: 700, valeur: 84000,
    bcBa: 'BC-2026-038', reception: 'REC-2026-038', dateEntree: '2026-05-05',
    dlc: '2026-05-28', origine: 'Formel', statutQC: 'Libere', etat: 'Disponible',
  },
  {
    id: '5', numero: 'LOT-2026-005', sku: 'PF-JUS-005', designation: 'Jus de bissap bouteille 1L',
    type: 'PF', quantite: 250, unite: 'Unité', pmp: 292, valeur: 73000,
    bcBa: 'BC-2026-033', reception: 'REC-2026-033', dateEntree: '2026-04-18',
    dlc: '2026-10-18', origine: 'Formel', statutQC: 'EnControle', etat: 'Disponible',
  },
]

// ── Anciens types (conservés pour compatibilité) ──────────────────────────────

export type StatutStock = 'OK' | 'Alerte' | 'Rupture' | 'Exces'
export type TypeMouvement = 'Entree' | 'Sortie' | 'Transfert' | 'Ajustement'
export type StatutLot = 'OK' | 'Quarantaine' | 'ProcheExpiration' | 'Expire'

export interface StockLigne {
  id: string
  articleCode: string
  articleDesignation: string
  articleType: string
  entrepot: string
  emplacement: string
  lot: string
  datePeremption: string | null
  quantite: number
  unite: string
  pmp: number | null
  valeurStock: number | null
  stockSecurite: number | null
  pointCommande: number | null
  statut: StatutStock
}

export interface Mouvement {
  id: string
  date: string
  type: TypeMouvement
  articleCode: string
  articleDesignation: string
  lot: string
  quantite: number
  unite: string
  entrepotSource: string
  entrepotDest: string
  reference: string
  motif: string
  operateur: string
}

export interface Lot {
  id: string
  lotCode: string
  articleCode: string
  articleDesignation: string
  entrepot: string
  emplacement: string
  quantite: number
  unite: string
  dateReception: string
  datePeremption: string | null
  joursRestants: number | null
  statut: StatutLot
}

export const ENTREPOTS: Record<string, { nom: string; emplacements: string[] }> = {
  'ENT-MP-01': { nom: 'Entrepôt MP - Dakar', emplacements: ['Zone A', 'Zone B', 'Zone C', 'Zone D'] },
  'ENT-PF-01': { nom: 'Entrepôt PF - Dakar', emplacements: ['Allée 1', 'Allée 2', 'Allée 3'] },
  'ENT-EMB-01': { nom: 'Entrepôt Emballages', emplacements: ['Étagère 1', 'Étagère 2', 'Étagère 3'] },
}

export const STATUT_STOCK_COLORS: Record<StatutStock, string> = {
  OK: 'bg-emerald-100 text-emerald-800',
  Alerte: 'bg-amber-400 text-amber-950',
  Rupture: 'bg-red-600 text-white',
  Exces: 'bg-blue-100 text-blue-700',
}

export const STATUT_STOCK_LABELS: Record<StatutStock, string> = {
  OK: 'OK',
  Alerte: 'Alerte',
  Rupture: 'Rupture',
  Exces: 'Excès',
}

export const MOUVEMENT_COLORS: Record<TypeMouvement, string> = {
  Entree: 'bg-emerald-100 text-emerald-700',
  Sortie: 'bg-red-100 text-red-600',
  Transfert: 'bg-blue-100 text-blue-700',
  Ajustement: 'bg-purple-100 text-purple-700',
}

export const MOUVEMENT_LABELS: Record<TypeMouvement, string> = {
  Entree: 'Entrée',
  Sortie: 'Sortie',
  Transfert: 'Transfert',
  Ajustement: 'Ajustement',
}

export const STATUT_LOT_COLORS: Record<StatutLot, string> = {
  OK: 'bg-emerald-100 text-emerald-800',
  Quarantaine: 'bg-amber-400 text-amber-950',
  ProcheExpiration: 'bg-orange-400 text-orange-950',
  Expire: 'bg-red-600 text-white',
}

export const STATUT_LOT_LABELS: Record<StatutLot, string> = {
  OK: 'OK',
  Quarantaine: 'Quarantaine',
  ProcheExpiration: 'Proche expiration',
  Expire: 'Expiré',
}
