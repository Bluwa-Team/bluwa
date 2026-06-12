// ── Vue lots (nouvelle UI) ────────────────────────────────────────────────────
// TypeArticle aligné sur DB articles.type (migration 002 + @/types/erp)
// StatutQC   aligné sur type unifié (@/types/erp)

export type { ArticleType as TypeArticle } from '@/types/erp'
export type { StatutQC } from '@/types/erp'
export { STATUT_QC_LABELS as STATUT_QC_LABELS_ERP, STATUT_QC_COLORS as STATUT_QC_COLORS_ERP } from '@/types/erp'

import type { ArticleType } from '@/types/erp'
import type { StatutQC } from '@/types/erp'
import type { InventoryDocument, InventoryDocumentItem } from '@/types/erp'

export type EtatLot = 'Disponible' | 'Dormant' | 'Obsolete'
export type OrigineType = 'Formel' | 'Informel'

export interface LotStock {
  id: string
  numero: string
  sku: string
  designation: string
  type: ArticleType
  quantite: number
  unite: string
  unitCost: number   // coût unitaire propre au lot (prix BC/BA ou PMP en fallback)
  valeur: number
  bcBa: string
  reception: string
  dateEntree: string
  dlc: string
  origine: OrigineType
  statutQC: StatutQC | null
  etat: EtatLot
  seuilAlertePeremption: number   // jours avant DLC pour déclencher l'alerte
}

export const TYPE_COLORS: Record<ArticleType, string> = {
  MP:  'bg-blue-100 text-blue-700',
  PSF: 'bg-purple-100 text-purple-700',
  PF:  'bg-emerald-100 text-emerald-700',
  AC:  'bg-violet-100 text-violet-700',
  CS:  'bg-gray-100 text-gray-600',
}

export const TYPE_LABELS: Record<ArticleType, string> = {
  MP:  'Matière première',
  PSF: 'Produit semi-fini',
  PF:  'Produit fini',
  AC:  'Art. conditionnement',
  CS:  'Consommable',
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
    id: '1', numero: 'MP-20260510-0001', sku: 'MP-FAR-001', designation: 'Farine de blé T55',
    type: 'MP', quantite: 480, unite: 'Kg', unitCost:438, valeur: 210240,
    bcBa: 'BC-2026-040', reception: 'REC-2026-040', dateEntree: '2026-05-10',
    dlc: '2026-08-20', origine: 'Formel', statutQC: 'Libere', etat: 'Disponible',
    seuilAlertePeremption: 30,   // 87 jours restants → OK
  },
  {
    id: '2', numero: 'MP-20260510-0002', sku: 'MP-ARA-002', designation: 'Arachides brutes',
    type: 'MP', quantite: 180, unite: 'Kg', unitCost:720, valeur: 129600,
    bcBa: 'BA-2026-015', reception: 'REC-2026-015', dateEntree: '2026-02-16',
    dlc: '2026-06-21', origine: 'Informel', statutQC: 'Libere', etat: 'Dormant',
    seuilAlertePeremption: 30,   // 27 jours restants → ALERTE
  },
  {
    id: '3', numero: 'AC-20260510-0003', sku: 'AC-ETI-003', designation: 'Étiquettes anciennes',
    type: 'AC', quantite: 3500, unite: 'Unité', unitCost:12, valeur: 42000,
    bcBa: 'BC-2026-005', reception: 'REC-2026-005', dateEntree: '2025-11-23',
    dlc: '2026-05-17', origine: 'Formel', statutQC: 'Bloque', etat: 'Obsolete',
    seuilAlertePeremption: 14,   // expiré → CRITIQUE
  },
  {
    id: '4', numero: 'PF-20260510-0004', sku: 'PF-PAI-004', designation: 'Pain de mie',
    type: 'PF', quantite: 120, unite: 'Kg', unitCost:700, valeur: 84000,
    bcBa: 'BC-2026-038', reception: 'REC-2026-038', dateEntree: '2026-05-05',
    dlc: '2026-05-28', origine: 'Formel', statutQC: 'Libere', etat: 'Disponible',
    seuilAlertePeremption: 7,    // 3 jours restants → ALERTE
  },
  {
    id: '5', numero: 'PF-20260510-0005', sku: 'PF-JUS-005', designation: 'Jus de bissap bouteille 1L',
    type: 'PF', quantite: 250, unite: 'Unité', unitCost:292, valeur: 73000,
    bcBa: 'BC-2026-033', reception: 'REC-2026-033', dateEntree: '2026-04-18',
    dlc: '2026-10-18', origine: 'Formel', statutQC: 'EnControle', etat: 'Disponible',
    seuilAlertePeremption: 30,   // 146 jours restants → OK
  },
]

// ── Types DB-alignés — migration 007 ────────────────────────────────────────

/**
 * Types de mouvements de stock — alignés sur stock_movements.movement_type CHECK.
 * Correspondance SAP MM-IM (types de mouvement) :
 *   ENTRY_PO  → 101 (GR depuis BC/BA)
 *   CONSO_OF  → 261 (Sortie pour OF)
 *   ENTRY_OF  → 131 (Entrée production OF terminé)
 *   INV_ADJ   → 701/702 (Écart inventaire +/−)
 *   INIT      → 561 (Initialisation stock)
 */
export type MovementType = 'ENTRY_PO' | 'CONSO_OF' | 'ENTRY_OF' | 'INV_ADJ' | 'INIT'

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  ENTRY_PO: 'Entrée achat',
  CONSO_OF: 'Consommation production',
  ENTRY_OF: 'Entrée production',
  INV_ADJ:  'Écart inventaire',
  INIT:     'Initialisation',
}

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  ENTRY_PO: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  CONSO_OF: 'bg-red-100 text-red-700 border border-red-200',
  ENTRY_OF: 'bg-blue-100 text-blue-700 border border-blue-200',
  INV_ADJ:  'bg-amber-100 text-amber-700 border border-amber-200',
  INIT:     'bg-slate-100 text-slate-600 border border-slate-200',
}

/** Sens comptable du mouvement (+1 = entrée, -1 = sortie) */
export const MOVEMENT_TYPE_SIGN: Record<MovementType, 1 | -1> = {
  ENTRY_PO: 1,
  CONSO_OF: -1,
  ENTRY_OF: 1,
  INV_ADJ:  1,   // quantité signée stockée directement
  INIT:     1,
}

/**
 * Mouvement de stock — aligné sur stock_movements (migration 007).
 * quantity : toujours positif sauf INV_ADJ (peut être négatif).
 */
export interface StockMovement {
  id:                 string
  organizationId:     string
  factoryId:          string
  articleId:          string
  articleCode:        string         // enrichi en frontend (join articles)
  articleDesignation: string         // enrichi en frontend
  unite:              string         // enrichi en frontend
  movementType:       MovementType
  quantity:           number
  sourceDocumentType: 'PURCHASE_ORDER' | 'PRODUCTION_ORDER' | 'INVENTORY' | null
  sourceDocumentId:   string | null
  batchNumber:        string | null
  createdBy:          string | null
  createdAt:          string
}

// Source de vérité déplacée dans @/types/erp — re-exports pour rétrocompatibilité
export type {
  InventoryStatus,
  InventoryDocument,
  InventoryDocumentItem,
} from '@/types/erp'
export {
  INVENTORY_STATUS_LABELS,
  INVENTORY_STATUS_COLORS,
} from '@/types/erp'

// ── Mock data — Inventaires ───────────────────────────────────────────────────

export const MOCK_INVENTORY_DOCS: InventoryDocument[] = [
  {
    id: 'inv-001', organizationId: 'org-1', factoryId: 'fac-1',
    documentNumber: 'INV-2026-0003', status: 'PROPOSED',
    createdBy: 'user-1', createdAt: '2026-05-27T08:00:00Z', postedAt: null,
  },
  {
    id: 'inv-002', organizationId: 'org-1', factoryId: 'fac-1',
    documentNumber: 'INV-2026-0002', status: 'COUNTED',
    createdBy: 'user-1', createdAt: '2026-05-20T08:00:00Z', postedAt: null,
  },
  {
    id: 'inv-003', organizationId: 'org-1', factoryId: 'fac-1',
    documentNumber: 'INV-2026-0001', status: 'POSTED',
    createdBy: 'user-1', createdAt: '2026-05-10T08:00:00Z', postedAt: '2026-05-12T14:30:00Z',
  },
]

export const MOCK_INVENTORY_ITEMS: InventoryDocumentItem[] = [
  // INV-2026-0002 (COUNTED) — lignes avec écarts
  {
    id: 'ii-01', inventoryDocumentId: 'inv-002',
    articleId: 'a-1', articleCode: 'MP-FAR-001', articleDesignation: 'Farine de blé T55',
    unite: 'Kg', batchNumber: 'MP-20260510-0001',
    bookQuantity: 480, countedQuantity: 472, differenceQuantity: -8,
  },
  {
    id: 'ii-02', inventoryDocumentId: 'inv-002',
    articleId: 'a-2', articleCode: 'MP-ARA-002', articleDesignation: 'Arachides brutes',
    unite: 'Kg', batchNumber: 'MP-20260510-0002',
    bookQuantity: 180, countedQuantity: 180, differenceQuantity: 0,
  },
  {
    id: 'ii-03', inventoryDocumentId: 'inv-002',
    articleId: 'a-5', articleCode: 'PF-JUS-005', articleDesignation: 'Jus de bissap 1L',
    unite: 'Unité', batchNumber: 'PF-20260510-0005',
    bookQuantity: 250, countedQuantity: 263, differenceQuantity: 13,
  },
  // INV-2026-0001 (POSTED) — écarts déjà imputés
  {
    id: 'ii-04', inventoryDocumentId: 'inv-003',
    articleId: 'a-3', articleCode: 'AC-ETI-003', articleDesignation: 'Étiquettes autocollantes',
    unite: 'Unité', batchNumber: null,
    bookQuantity: 3500, countedQuantity: 3420, differenceQuantity: -80,
  },
  {
    id: 'ii-05', inventoryDocumentId: 'inv-003',
    articleId: 'a-4', articleCode: 'PF-PAI-004', articleDesignation: 'Pain de mie',
    unite: 'Kg', batchNumber: 'PF-20260510-0004',
    bookQuantity: 120, countedQuantity: 120, differenceQuantity: 0,
  },
]

// ── Mock data — Mouvements de stock ──────────────────────────────────────────

export const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'sm-001', organizationId: 'org-1', factoryId: 'fac-1',
    articleId: 'a-1', articleCode: 'MP-FAR-001', articleDesignation: 'Farine de blé T55',
    unite: 'Kg', movementType: 'ENTRY_PO', quantity: 500,
    sourceDocumentType: 'PURCHASE_ORDER', sourceDocumentId: 'po-040',
    batchNumber: 'MP-20260510-0001', createdBy: 'user-1', createdAt: '2026-05-10T09:15:00Z',
  },
  {
    id: 'sm-002', organizationId: 'org-1', factoryId: 'fac-1',
    articleId: 'a-1', articleCode: 'MP-FAR-001', articleDesignation: 'Farine de blé T55',
    unite: 'Kg', movementType: 'CONSO_OF', quantity: 20,
    sourceDocumentType: 'PRODUCTION_ORDER', sourceDocumentId: 'of-041',
    batchNumber: 'MP-20260510-0001', createdBy: 'user-2', createdAt: '2026-05-15T11:00:00Z',
  },
  {
    id: 'sm-003', organizationId: 'org-1', factoryId: 'fac-1',
    articleId: 'a-5', articleCode: 'PF-JUS-005', articleDesignation: 'Jus de bissap 1L',
    unite: 'Unité', movementType: 'ENTRY_OF', quantity: 250,
    sourceDocumentType: 'PRODUCTION_ORDER', sourceDocumentId: 'of-045',
    batchNumber: 'PF-20260510-0005', createdBy: 'user-2', createdAt: '2026-05-21T15:30:00Z',
  },
  {
    id: 'sm-004', organizationId: 'org-1', factoryId: 'fac-1',
    articleId: 'a-3', articleCode: 'AC-ETI-003', articleDesignation: 'Étiquettes autocollantes',
    unite: 'Unité', movementType: 'INV_ADJ', quantity: -80,
    sourceDocumentType: 'INVENTORY', sourceDocumentId: 'inv-003',
    batchNumber: null, createdBy: 'user-1', createdAt: '2026-05-12T14:30:00Z',
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
  unitCost:number | null
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

// Configuration usine — importée depuis la couche partagée
export { ENTREPOTS } from '@/config'

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
