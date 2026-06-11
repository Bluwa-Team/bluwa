// ── Stratégie de stock ────────────────────────────────────────────────────────

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

// ── Commandes fournisseurs — structure Header / Item ──────────────────────────
//
// BCHeader  : un document d'achat (BC ou BA) — informations au niveau de l'en-tête
// BCItem    : une ligne article dans ce document
// BCFlat    : vue aplatie (Header + Item) générée par flattenBC() — utilisée pour
//             l'affichage tabulaire et la rétrocompatibilité

// Valeurs alignées sur la colonne `status` de purchase_orders (migration 003)
export type StatutCommande = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'RECEIVED' | 'CANCELLED'
export type TypeCommande   = 'BC' | 'BA'

// ── En-tête du bon de commande / bon d'achat (→ purchase_orders) ─────────────
export interface BCHeader {
  id: string
  numero: string           // BC-2026-058 / BA-2026-019
  type: TypeCommande
  date: string             // ISO date
  fournisseur: string
  contrat: string | null   // N° contrat-cadre (BC uniquement)
  currency: string         // ISO 4217 — 'XOF' par défaut
  reception: string | null // N° réception associée (REC-YYYY-NNN)
  statut: StatutCommande
}

// ── Ligne article (→ purchase_order_items) ────────────────────────────────────
export interface BCItem {
  id: string
  headerId: string              // → BCHeader.id
  itemPosition: number          // Numéro de ligne 1, 2, 3… (EKPO.EBELP)
  article: string
  quantite: number
  quantiteRecue: number         // Calculé depuis les réceptions — mock uniquement
  unite: string
  puHT: number                  // NOT NULL — obligatoire à la commande
  livraisonPrevue: string       // ISO date — peut varier par ligne
  dureeVie: number | null
  purchaseRequisitionId: string | null  // → purchase_requisitions.id (traçabilité MRP)
  gestionLot?:   boolean  // articles.gestion_lot — détermine statut QC à la réception
  articleType?:  string   // articles.type — pour générer le N° de lot interne
  coeffConversion?: number  // articles.coeff_conversion — facteur unite_achat → unite_stock
}

// ── Vue aplatie : une ligne = un Header × un Item ────────────────────────────
export interface BCFlat {
  // Champs Header
  id: string
  numero: string
  type: TypeCommande
  date: string
  fournisseur: string
  contrat: string | null
  currency: string
  reception: string | null
  statut: StatutCommande
  // Identifiant de la ligne Item
  itemId: string
  // Champs Item
  itemPosition: number
  article: string
  quantite: number
  quantiteRecue: number
  unite: string
  puHT: number
  livraisonPrevue: string
  dureeVie: number | null
  purchaseRequisitionId: string | null  // traçabilité MRP
}

/** Alias de rétrocompatibilité — remplace l'ancienne interface plate */
export type CommandeFournisseur = BCFlat

/** Aplatit les headers + items en une liste de lignes affichables */
export function flattenBC(headers: BCHeader[], items: BCItem[]): BCFlat[] {
  return headers.flatMap((h) => {
    const hItems = items.filter((i) => i.headerId === h.id)
    return hItems.map((i) => ({
      id:                      h.id,
      numero:                  h.numero,
      type:                    h.type,
      date:                    h.date,
      fournisseur:             h.fournisseur,
      contrat:                 h.contrat,
      currency:                h.currency,
      reception:               h.reception,
      statut:                  h.statut,
      itemId:                  i.id,
      itemPosition:            i.itemPosition,
      article:                 i.article,
      quantite:                i.quantite,
      quantiteRecue:           i.quantiteRecue,
      unite:                   i.unite,
      puHT:                    i.puHT,
      livraisonPrevue:         i.livraisonPrevue,
      dureeVie:                i.dureeVie,
      purchaseRequisitionId:   i.purchaseRequisitionId,
    }))
  })
}

export const STATUT_COMMANDE_COLORS: Record<StatutCommande, string> = {
  DRAFT:            'bg-gray-100 text-gray-600 border border-gray-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border border-amber-200',
  APPROVED:         'bg-blue-100 text-blue-700 border border-blue-200',
  SENT:             'bg-violet-100 text-violet-700 border border-violet-200',
  RECEIVED:         'bg-emerald-100 text-emerald-800 border border-emerald-200',
  CANCELLED:        'bg-red-100 text-red-600 border border-red-200',
}

export const STATUT_COMMANDE_LABELS: Record<StatutCommande, string> = {
  DRAFT:            'Brouillon',
  PENDING_APPROVAL: 'Attente approbation',
  APPROVED:         'Approuvée',
  SENT:             'Envoyée',
  RECEIVED:         'Reçue',
  CANCELLED:        'Annulée',
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_BC_HEADERS: BCHeader[] = [
  { id: 'h1', numero: 'BC-2026-058', type: 'BC', date: '2026-05-05', fournisseur: 'Coop. Bissap Kaolack', contrat: 'CT-2026-007', currency: 'XOF', reception: null,           statut: 'PENDING_APPROVAL' },
  { id: 'h2', numero: 'BC-2026-057', type: 'BC', date: '2026-05-04', fournisseur: 'Sucrerie Niari',        contrat: 'CT-2026-005', currency: 'XOF', reception: 'REC-2026-002', statut: 'RECEIVED'         },
  { id: 'h3', numero: 'BC-2026-056', type: 'BC', date: '2026-05-03', fournisseur: 'Verrerie Dakar',        contrat: 'CT-2026-003', currency: 'XOF', reception: null,           statut: 'APPROVED'         },
  { id: 'h4', numero: 'BC-2026-055', type: 'BC', date: '2026-05-02', fournisseur: 'Vanille Madagascar',    contrat: 'CT-2025-012', currency: 'EUR', reception: null,           statut: 'PENDING_APPROVAL' },
  { id: 'h5', numero: 'BA-2026-019', type: 'BA', date: '2026-04-28', fournisseur: 'Maraîcher Pikine',      contrat: null,          currency: 'XOF', reception: 'REC-2026-001', statut: 'CANCELLED'        },
  { id: 'h6', numero: 'BC-2026-053', type: 'BC', date: '2026-04-26', fournisseur: 'Imprimerie Plateau',    contrat: 'CT-2026-001', currency: 'XOF', reception: null,           statut: 'DRAFT'    },
]

export const MOCK_BC_ITEMS: BCItem[] = [
  { id: 'i1', headerId: 'h1', itemPosition: 1, article: "Fleurs d'hibiscus séchées", quantite: 300,   quantiteRecue: 0,   unite: 'kg', puHT: 2500,  livraisonPrevue: '2026-05-17', dureeVie: 365,  purchaseRequisitionId: 'da-001' },
  { id: 'i2', headerId: 'h2', itemPosition: 1, article: 'Sucre cristallisé',          quantite: 500,   quantiteRecue: 500, unite: 'kg', puHT: 800,   livraisonPrevue: '2026-05-09', dureeVie: 730,  purchaseRequisitionId: 'da-002' },
  { id: 'i3', headerId: 'h3', itemPosition: 1, article: 'Bouteille verre 1L',          quantite: 5000,  quantiteRecue: 0,   unite: 'u',  puHT: 250,   livraisonPrevue: '2026-05-19', dureeVie: null, purchaseRequisitionId: null     },
  { id: 'i4', headerId: 'h4', itemPosition: 1, article: 'Gousses de vanille',          quantite: 5,     quantiteRecue: 0,   unite: 'kg', puHT: 45000, livraisonPrevue: '2026-05-30', dureeVie: 180,  purchaseRequisitionId: null     },
  { id: 'i5', headerId: 'h5', itemPosition: 1, article: 'Gingembre frais',             quantite: 30,    quantiteRecue: 30,  unite: 'kg', puHT: 1200,  livraisonPrevue: '2026-05-02', dureeVie: 30,   purchaseRequisitionId: 'da-003' },
  { id: 'i6', headerId: 'h6', itemPosition: 1, article: 'Étiquettes Pourpre 1L',       quantite: 10000, quantiteRecue: 0,   unite: 'u',  puHT: 15,    livraisonPrevue: '2026-05-12', dureeVie: null, purchaseRequisitionId: null     },
]

/** Vue aplatie — rétrocompatibilité avec les composants existants */
export const MOCK_COMMANDES: CommandeFournisseur[] = flattenBC(MOCK_BC_HEADERS, MOCK_BC_ITEMS)
