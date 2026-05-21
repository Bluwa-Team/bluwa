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
