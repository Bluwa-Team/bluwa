// ── Réceptions fournisseurs — structure Header / Item ────────────────────────
//
// Aligné sur migration 005 :
//   ReceptionHeader ≡ goods_receipts
//   ReceptionItem   ≡ goods_receipt_items
//   ReceptionFlat   : vue aplatie pour l'affichage tabulaire
//
// StatutLot = StatutQC unifié depuis @/types/erp
// (EnControle | Libere | Bloque | NonConforme)

import type { StatutQC } from '@/types/erp'

export type StatutReception  = 'DRAFT' | 'VALIDATED' | 'CANCELLED'
// Mappage UI legacy → migration 005 :
//   'Attente'  → 'DRAFT'      (saisie en cours, pas encore validée)
//   'Conforme' → 'VALIDATED'  (réception confirmée, stock mis à jour)
//   'Reserve'  → 'VALIDATED'  (validée avec réserve — qualiteStatut='Reserve')
//   'CANCELLED'→ 'CANCELLED'  (livraison refusée)

export type QualiteStatut    = 'Conforme' | 'Reserve' | 'NonJuge'
// Niveau qualité de la réception (orthogonal au statut workflow)

export type TypeFournisseur  = 'Formel' | 'Informel'

/** @deprecated Utiliser StatutQC depuis @/types/erp */
export type StatutLot = StatutQC

// ── En-tête du bon de réception (≡ goods_receipts) ───────────────────────────
export interface ReceptionHeader {
  id: string
  numero: string                 // REC-2026-001
  date: string                   // ISO date = received_at
  deliveryNoteNumber: string | null  // N° BL fournisseur (goods_receipts.delivery_note_number)
  numeroBon: string | null       // N° BC ou BA lié (purchase_orders.order_number)
  fournisseur: string
  typeFournisseur: TypeFournisseur
  statut: StatutReception        // statut workflow (goods_receipts.status)
  qualiteStatut: QualiteStatut   // appréciation qualité globale
}

// ── Ligne article réceptionnée (≡ goods_receipt_items) ───────────────────────
export interface ReceptionItem {
  id: string
  headerId: string               // → ReceptionHeader.id
  article: string
  quantite: number
  unite: string
  lot: string | null             // batch_number attribué à la réception
  lotFourn: string | null        // lot fournisseur
  dlc: string | null             // expiry_date (ISO date)
  humidite: number | null        // % — contrôle réception MP agro
  codeBarres: string | null      // EAN-13 / GS1 DataMatrix
  statutLot: StatutQC | null     // statut QC du lot (unifié)
}

// ── Vue aplatie : une ligne = un Header × un Item ────────────────────────────
export interface ReceptionFlat {
  // Champs Header
  id: string
  numero: string
  date: string
  deliveryNoteNumber: string | null
  numeroBon: string | null
  fournisseur: string
  typeFournisseur: TypeFournisseur
  statut: StatutReception
  qualiteStatut: QualiteStatut
  // Identifiant de la ligne Item
  itemId: string
  // Champs Item
  article: string
  quantite: number
  unite: string
  lot: string | null
  lotFourn: string | null
  dlc: string | null
  humidite: number | null
  codeBarres: string | null
  statutLot: StatutQC | null
}

/** Alias de rétrocompatibilité — remplace l'ancienne interface plate */
export type Reception = ReceptionFlat

/** Aplatit les headers + items en une liste de lignes affichables */
export function flattenReception(headers: ReceptionHeader[], items: ReceptionItem[]): ReceptionFlat[] {
  return headers.flatMap((h) => {
    const hItems = items.filter((i) => i.headerId === h.id)
    return hItems.map((i) => ({
      id:                 h.id,
      numero:             h.numero,
      date:               h.date,
      deliveryNoteNumber: h.deliveryNoteNumber,
      numeroBon:          h.numeroBon,
      fournisseur:        h.fournisseur,
      typeFournisseur:    h.typeFournisseur,
      statut:             h.statut,
      qualiteStatut:      h.qualiteStatut,
      itemId:             i.id,
      article:            i.article,
      quantite:           i.quantite,
      unite:              i.unite,
      lot:                i.lot,
      lotFourn:           i.lotFourn,
      dlc:                i.dlc,
      humidite:           i.humidite,
      codeBarres:         i.codeBarres,
      statutLot:          i.statutLot,
    }))
  })
}

export const STATUT_RECEPTION_COLORS: Record<StatutReception, string> = {
  DRAFT:      'bg-amber-100 text-amber-700 border border-amber-200',
  VALIDATED:  'bg-emerald-100 text-emerald-800 border border-emerald-200',
  CANCELLED:  'bg-gray-100 text-gray-500 border border-gray-200',
}

export const STATUT_RECEPTION_LABELS: Record<StatutReception, string> = {
  DRAFT:     'En cours',
  VALIDATED: 'Validée',
  CANCELLED: 'Annulée',
}

export const QUALITE_STATUT_COLORS: Record<QualiteStatut, string> = {
  Conforme: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Reserve:  'bg-orange-100 text-orange-700 border border-orange-200',
  NonJuge:  'bg-amber-100 text-amber-700 border border-amber-200',
}

export const QUALITE_STATUT_LABELS: Record<QualiteStatut, string> = {
  Conforme: 'Conforme',
  Reserve:  'Réserve',
  NonJuge:  'Non jugée',
}

/** @deprecated Utiliser STATUT_QC_LABELS de @/types/erp */
export const STATUT_LOT_LABELS: Record<StatutQC, string> = {
  Libere:      'Lot libéré',
  EnControle:  'Lot en contrôle',
  Bloque:      'Lot bloqué',
  NonConforme: 'Non-conforme',
}

/** @deprecated Utiliser STATUT_QC_COLORS de @/types/erp */
export const STATUT_LOT_COLORS: Record<StatutQC, string> = {
  Libere:      'text-emerald-600',
  EnControle:  'text-amber-600',
  Bloque:      'text-red-600',
  NonConforme: 'text-red-700 font-semibold',
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_RECEPTION_HEADERS: ReceptionHeader[] = [
  { id: 'rh1', numero: 'REC-2026-001', date: '2026-05-02', deliveryNoteNumber: 'BL-MP-2604-01', numeroBon: 'BA-2026-019', fournisseur: 'Maraîcher Pikine',    typeFournisseur: 'Informel', statut: 'VALIDATED', qualiteStatut: 'Conforme' },
  { id: 'rh2', numero: 'REC-2026-002', date: '2026-05-09', deliveryNoteNumber: 'SN-A23-BL-0508', numeroBon: 'BC-2026-057', fournisseur: 'Sucrerie Niari',      typeFournisseur: 'Formel',   statut: 'VALIDATED', qualiteStatut: 'Conforme' },
  { id: 'rh3', numero: 'REC-2026-003', date: '2026-05-08', deliveryNoteNumber: 'VDO-BL-0508',    numeroBon: 'BC-2026-019', fournisseur: "Verrerie de l'Ouest", typeFournisseur: 'Formel',   statut: 'VALIDATED', qualiteStatut: 'Reserve'  },
  { id: 'rh4', numero: 'REC-2026-004', date: '2026-05-08', deliveryNoteNumber: null,              numeroBon: 'BC-2026-020', fournisseur: 'Sucrerie Nationale',  typeFournisseur: 'Formel',   statut: 'DRAFT',     qualiteStatut: 'NonJuge'  },
]

export const MOCK_RECEPTION_ITEMS: ReceptionItem[] = [
  { id: 'ri1', headerId: 'rh1', article: 'Gingembre frais',     quantite: 30,   unite: 'kg',    lot: 'MP-20260415-01', lotFourn: 'MP-GIN-2604', dlc: '2026-05-15', humidite: null, codeBarres: null,           statutLot: 'EnControle' },
  { id: 'ri2', headerId: 'rh2', article: 'Sucre cristallisé',    quantite: 500,  unite: 'kg',    lot: 'MP-20260509-01', lotFourn: 'SN-A23-08',   dlc: '2027-05-09', humidite: null, codeBarres: null,           statutLot: 'EnControle' },
  { id: 'ri3', headerId: 'rh3', article: 'Bouteilles verre 1L',  quantite: 1200, unite: 'Unité', lot: 'AC-20260508-01', lotFourn: 'VDO-260508',  dlc: null,         humidite: null, codeBarres: '8901234567890', statutLot: 'Bloque'     },
  { id: 'ri4', headerId: 'rh4', article: 'Sucre cristallisé',    quantite: 500,  unite: 'kg',    lot: null,          lotFourn: null,          dlc: null,         humidite: null, codeBarres: null,           statutLot: null         },
]

/** Vue aplatie — rétrocompatibilité avec les composants existants */
export const MOCK_RECEPTIONS: Reception[] = flattenReception(MOCK_RECEPTION_HEADERS, MOCK_RECEPTION_ITEMS)
