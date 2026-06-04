// ── Logistique — Bons de livraison ────────────────────────────────────────────
//
// BonLivraison     ≡ delivery_notes      (migration 015)
// BonLivraisonItem ≡ delivery_note_items (migration 015)
//
// Statuts alignés sur delivery_notes.status CHECK DB :
//   DRAFT → PREPARED → SHIPPED → DELIVERED (ou CANCELLED)

export type StatutBL = 'DRAFT' | 'PREPARED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

// ── En-tête du bon de livraison ───────────────────────────────────────────────
export interface BonLivraison {
  id:               string
  numero:           string           // BL-2026-NNNN
  salesOrderId:     string | null
  commandeNum:      string | null    // sales_orders.order_number
  client:           string
  clientId:         string
  date:             string           // delivery_date (ISO date)
  statut:           StatutBL
  transporteur:     string | null
  refSuivi:         string | null    // tracking_ref
  adresseLivraison: string | null
  notes:            string | null
}

// ── Ligne article ─────────────────────────────────────────────────────────────
export interface BonLivraisonItem {
  id:                string
  blId:              string
  salesOrderItemId:  string | null
  articleId:         string
  article:           string          // article_label
  itemPosition:      number
  quantiteCommandee: number
  quantiteLivree:    number
  unite:             string
  lot:               string | null   // batch_number expédié
}

// ── Couleurs & labels ─────────────────────────────────────────────────────────
export const STATUT_BL_COLORS: Record<StatutBL, string> = {
  DRAFT:     'bg-gray-100 text-gray-600 border border-gray-200',
  PREPARED:  'bg-amber-100 text-amber-700 border border-amber-200',
  SHIPPED:   'bg-violet-100 text-violet-700 border border-violet-200',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-400 border border-red-100',
}

export const STATUT_BL_LABELS: Record<StatutBL, string> = {
  DRAFT:     'Brouillon',
  PREPARED:  'Préparé',
  SHIPPED:   'Expédié',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
}

export const STATUT_BL_NEXT: Partial<Record<StatutBL, StatutBL>> = {
  DRAFT:    'PREPARED',
  PREPARED: 'SHIPPED',
  SHIPPED:  'DELIVERED',
}

// ── Mock data ─────────────────────────────────────────────────────────────────
export const MOCK_BL: BonLivraison[] = [
  {
    id: 'bl1', numero: 'BL-2026-0003', salesOrderId: 'co2', commandeNum: 'CO-2026-0003',
    client: 'Supermarché Avenir', clientId: 'c2', date: '2026-05-27',
    statut: 'PREPARED', transporteur: 'Véhicule interne', refSuivi: null,
    adresseLivraison: 'Av. Bourguiba, Dakar', notes: null,
  },
  {
    id: 'bl2', numero: 'BL-2026-0002', salesOrderId: 'co3', commandeNum: 'CO-2026-0002',
    client: 'ONG Santé Dakar', clientId: 'c3', date: '2026-05-22',
    statut: 'SHIPPED', transporteur: 'DHL Sénégal', refSuivi: 'DHL-SN-2804-007',
    adresseLivraison: 'Route de Rufisque, Dakar', notes: 'Livraison urgente',
  },
  {
    id: 'bl3', numero: 'BL-2026-0001', salesOrderId: 'co4', commandeNum: 'CO-2026-0001',
    client: 'Export Lomé', clientId: 'c4', date: '2026-05-15',
    statut: 'DELIVERED', transporteur: 'Trans Lomé', refSuivi: 'TL-2605-001',
    adresseLivraison: 'Zone Portuaire, Lomé', notes: null,
  },
]

export const MOCK_BL_ITEMS: BonLivraisonItem[] = [
  { id: 'bli1', blId: 'bl1', salesOrderItemId: 'ci3', articleId: 'a2', article: 'Bissap Pourpre Vanille 1L',   itemPosition: 1, quantiteCommandee: 300,  quantiteLivree: 300,  unite: 'btl', lot: 'PF-20260520-0001' },
  { id: 'bli2', blId: 'bl2', salesOrderItemId: 'ci4', articleId: 'a1', article: 'Bissap Pourpre Original 1L',  itemPosition: 1, quantiteCommandee: 1200, quantiteLivree: 1200, unite: 'btl', lot: 'PF-20260521-0002' },
  { id: 'bli3', blId: 'bl3', salesOrderItemId: 'ci5', articleId: 'a1', article: 'Bissap Pourpre Original 1L',  itemPosition: 1, quantiteCommandee: 2000, quantiteLivree: 2000, unite: 'btl', lot: 'PF-20260522-0003' },
  { id: 'bli4', blId: 'bl3', salesOrderItemId: 'ci6', articleId: 'a2', article: 'Bissap Pourpre Vanille 1L',   itemPosition: 2, quantiteCommandee: 1000, quantiteLivree: 1000, unite: 'btl', lot: 'PF-20260522-0003' },
]
