// ── Réceptions fournisseurs — structure Header / Item ────────────────────────
//
// ReceptionHeader : un bon de réception physique (un camion, une livraison)
// ReceptionItem   : une ligne article dans cette réception
// ReceptionFlat   : vue aplatie générée par flattenReception() — affichage + compat.

export type StatutReception  = 'Conforme' | 'Reserve' | 'Attente'
export type TypeFournisseur  = 'Formel' | 'Informel'
export type StatutLot        = 'Libere' | 'EnControle' | 'Bloque'

// ── En-tête du bon de réception ──────────────────────────────────────────────
export interface ReceptionHeader {
  id: string
  numero: string               // REC-2026-001
  date: string                 // ISO date
  numeroBon: string | null     // N° BC ou BA lié
  fournisseur: string
  typeFournisseur: TypeFournisseur
  statut: StatutReception      // statut global de la réception
  cloturee: boolean
}

// ── Ligne article réceptionnée ────────────────────────────────────────────────
export interface ReceptionItem {
  id: string
  headerId: string             // → ReceptionHeader.id
  article: string
  quantite: number
  unite: string
  lot: string | null           // lot stock interne (LOT-XXX-001)
  lotFourn: string | null      // lot fournisseur
  dlc: string | null           // ISO date
  humidite: number | null      // % — contrôle réception MP
  codeBarres: string | null    // EAN-13 / GS1 DataMatrix
  statutLot: StatutLot | null
}

// ── Vue aplatie : une ligne = un Header × un Item ────────────────────────────
export interface ReceptionFlat {
  // Champs Header
  id: string
  numero: string
  date: string
  numeroBon: string | null
  fournisseur: string
  typeFournisseur: TypeFournisseur
  statut: StatutReception
  cloturee: boolean
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
  statutLot: StatutLot | null
}

/** Alias de rétrocompatibilité — remplace l'ancienne interface plate */
export type Reception = ReceptionFlat

/** Aplatit les headers + items en une liste de lignes affichables */
export function flattenReception(headers: ReceptionHeader[], items: ReceptionItem[]): ReceptionFlat[] {
  return headers.flatMap((h) => {
    const hItems = items.filter((i) => i.headerId === h.id)
    return hItems.map((i) => ({
      id:             h.id,
      numero:         h.numero,
      date:           h.date,
      numeroBon:      h.numeroBon,
      fournisseur:    h.fournisseur,
      typeFournisseur:h.typeFournisseur,
      statut:         h.statut,
      cloturee:       h.cloturee,
      itemId:         i.id,
      article:        i.article,
      quantite:       i.quantite,
      unite:          i.unite,
      lot:            i.lot,
      lotFourn:       i.lotFourn,
      dlc:            i.dlc,
      humidite:       i.humidite,
      codeBarres:     i.codeBarres,
      statutLot:      i.statutLot,
    }))
  })
}

export const STATUT_RECEPTION_COLORS: Record<StatutReception, string> = {
  Conforme: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Reserve:  'bg-orange-100 text-orange-700 border border-orange-200',
  Attente:  'bg-amber-100 text-amber-700 border border-amber-200',
}

export const STATUT_RECEPTION_LABELS: Record<StatutReception, string> = {
  Conforme: 'Conforme',
  Reserve:  'Réserve',
  Attente:  'Attente',
}

export const STATUT_LOT_LABELS: Record<StatutLot, string> = {
  Libere:     'Lot libéré',
  EnControle: 'Lot en contrôle',
  Bloque:     'Lot bloqué',
}

export const STATUT_LOT_COLORS: Record<StatutLot, string> = {
  Libere:     'text-emerald-600',
  EnControle: 'text-amber-600',
  Bloque:     'text-red-600',
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_RECEPTION_HEADERS: ReceptionHeader[] = [
  { id: 'rh1', numero: 'REC-2026-001', date: '2026-05-02', numeroBon: 'BA-2026-019', fournisseur: 'Maraîcher Pikine',     typeFournisseur: 'Informel', statut: 'Conforme', cloturee: false },
  { id: 'rh2', numero: 'REC-2026-002', date: '2026-05-09', numeroBon: 'BC-2026-057', fournisseur: 'Sucrerie Niari',       typeFournisseur: 'Formel',   statut: 'Conforme', cloturee: false },
  { id: 'rh3', numero: 'REC-2026-003', date: '2026-05-08', numeroBon: 'BC-2026-019', fournisseur: "Verrerie de l'Ouest",  typeFournisseur: 'Formel',   statut: 'Reserve',  cloturee: false },
  { id: 'rh4', numero: 'REC-2026-004', date: '2026-05-08', numeroBon: 'BC-2026-020', fournisseur: 'Sucrerie Nationale',   typeFournisseur: 'Formel',   statut: 'Attente',  cloturee: false },
]

export const MOCK_RECEPTION_ITEMS: ReceptionItem[] = [
  { id: 'ri1', headerId: 'rh1', article: 'Gingembre frais',     quantite: 30,   unite: 'kg',    lot: 'LOT-GIN-001', lotFourn: 'MP-GIN-2604', dlc: '2026-05-15', humidite: null, codeBarres: null,           statutLot: 'EnControle' },
  { id: 'ri2', headerId: 'rh2', article: 'Sucre cristallisé',    quantite: 500,  unite: 'kg',    lot: 'LOT-SUC-002', lotFourn: 'SN-A23-08',   dlc: '2027-05-09', humidite: null, codeBarres: null,           statutLot: 'EnControle' },
  { id: 'ri3', headerId: 'rh3', article: 'Bouteilles verre 1L',  quantite: 1200, unite: 'Unité', lot: 'LOT-VER-003', lotFourn: 'VDO-260508',  dlc: null,         humidite: null, codeBarres: '8901234567890', statutLot: 'Bloque'     },
  { id: 'ri4', headerId: 'rh4', article: 'Sucre cristallisé',    quantite: 500,  unite: 'kg',    lot: null,          lotFourn: null,          dlc: null,         humidite: null, codeBarres: null,           statutLot: null         },
]

/** Vue aplatie — rétrocompatibilité avec les composants existants */
export const MOCK_RECEPTIONS: Reception[] = flattenReception(MOCK_RECEPTION_HEADERS, MOCK_RECEPTION_ITEMS)
