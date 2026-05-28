// ── Commandes clients — structure Header / Item ───────────────────────────────
//
// CommandeClientHeader ≡ sales_orders       (migration 006)
// CommandeClientItem   ≡ sales_order_items  (migration 006)
//
// Statuts alignés sur la colonne sales_orders.status (CHECK DB) :
//   DRAFT → CONFIRMED → IN_PREPARATION → SHIPPED → INVOICED
//   ou CANCELLED depuis n'importe quel état antérieur à SHIPPED.

export type StatutCommande =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'SHIPPED'
  | 'INVOICED'
  | 'CANCELLED'

// ── En-tête commande (≡ sales_orders) ────────────────────────────────────────
export interface CommandeClientHeader {
  id:                     string
  numero:                 string           // CO-2026-NNNN
  date:                   string           // order_date (ISO date)
  client:                 string           // clients.raison_sociale
  clientId:               string
  currency:               string           // ISO 4217 — 'XOF' par défaut
  dateLivraisonSouhaitee: string           // requested_delivery_date
  statut:                 StatutCommande
  notes:                  string | null
}

// ── Ligne article (≡ sales_order_items) ──────────────────────────────────────
export interface CommandeClientItem {
  id:            string
  headerId:      string                    // → CommandeClientHeader.id
  itemPosition:  number
  article:       string                    // article_label
  articleId:     string
  quantite:      number
  unite:         string
  puHT:          number                    // unit_price_ht
  remisePct:     number                    // discount_pct (0–100)
}

// ── Vue aplatie ───────────────────────────────────────────────────────────────
export interface CommandeClientFlat extends CommandeClientHeader {
  itemId:       string
  itemPosition: number
  article:      string
  articleId:    string
  quantite:     number
  unite:        string
  puHT:         number
  remisePct:    number
  montantLigne: number  // quantite × puHT × (1 - remisePct/100)
  caHT:         number  // total HT de la commande
}

export function flattenCommandes(
  headers: CommandeClientHeader[],
  items:   CommandeClientItem[],
): CommandeClientFlat[] {
  return headers.flatMap((h) => {
    const hItems = items.filter((i) => i.headerId === h.id)
    const caHT   = hItems.reduce(
      (s, i) => s + i.quantite * i.puHT * (1 - i.remisePct / 100),
      0,
    )
    return hItems.map((i) => ({
      ...h,
      itemId:       i.id,
      itemPosition: i.itemPosition,
      article:      i.article,
      articleId:    i.articleId,
      quantite:     i.quantite,
      unite:        i.unite,
      puHT:         i.puHT,
      remisePct:    i.remisePct,
      montantLigne: Math.round(i.quantite * i.puHT * (1 - i.remisePct / 100)),
      caHT:         Math.round(caHT),
    }))
  })
}

/** Calcule le CA HT total d'une commande depuis ses items */
export function caCommande(items: CommandeClientItem[]): number {
  return Math.round(
    items.reduce((s, i) => s + i.quantite * i.puHT * (1 - i.remisePct / 100), 0),
  )
}

// ── Couleurs & labels statut ──────────────────────────────────────────────────
export const STATUT_COMMANDE_COLORS: Record<StatutCommande, string> = {
  DRAFT:          'bg-gray-100 text-gray-600 border border-gray-200',
  CONFIRMED:      'bg-blue-100 text-blue-700 border border-blue-200',
  IN_PREPARATION: 'bg-amber-100 text-amber-700 border border-amber-200',
  SHIPPED:        'bg-violet-100 text-violet-700 border border-violet-200',
  INVOICED:       'bg-emerald-100 text-emerald-800 border border-emerald-200',
  CANCELLED:      'bg-red-50 text-red-500 border border-red-200',
}

export const STATUT_COMMANDE_LABELS: Record<StatutCommande, string> = {
  DRAFT:          'Brouillon',
  CONFIRMED:      'Confirmée',
  IN_PREPARATION: 'En préparation',
  SHIPPED:        'Expédiée',
  INVOICED:       'Facturée',
  CANCELLED:      'Annulée',
}

export const STATUT_COMMANDE_NEXT: Partial<Record<StatutCommande, StatutCommande>> = {
  DRAFT:          'CONFIRMED',
  CONFIRMED:      'IN_PREPARATION',
  IN_PREPARATION: 'SHIPPED',
  SHIPPED:        'INVOICED',
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_CO_HEADERS: CommandeClientHeader[] = [
  { id: 'co1', numero: 'CO-2026-0004', date: '2026-05-26', client: 'Dist. Kaolack',       clientId: 'c1', currency: 'XOF', dateLivraisonSouhaitee: '2026-06-10', statut: 'CONFIRMED',      notes: null },
  { id: 'co2', numero: 'CO-2026-0003', date: '2026-05-20', client: 'Supermarché Avenir',  clientId: 'c2', currency: 'XOF', dateLivraisonSouhaitee: '2026-06-05', statut: 'IN_PREPARATION', notes: null },
  { id: 'co3', numero: 'CO-2026-0002', date: '2026-05-10', client: 'ONG Santé Dakar',     clientId: 'c3', currency: 'XOF', dateLivraisonSouhaitee: '2026-05-28', statut: 'SHIPPED',        notes: 'Livraison urgente' },
  { id: 'co4', numero: 'CO-2026-0001', date: '2026-05-01', client: 'Export Lomé',         clientId: 'c4', currency: 'EUR', dateLivraisonSouhaitee: '2026-05-20', statut: 'INVOICED',       notes: null },
]

export const MOCK_CO_ITEMS: CommandeClientItem[] = [
  { id: 'ci1', headerId: 'co1', itemPosition: 1, article: 'Bissap Pourpre Original 1L',  articleId: 'a1', quantite: 500,  unite: 'btl', puHT: 1500, remisePct: 5  },
  { id: 'ci2', headerId: 'co1', itemPosition: 2, article: 'Bissap Pourpre Gingembre 1L', articleId: 'a3', quantite: 200,  unite: 'btl', puHT: 1600, remisePct: 5  },
  { id: 'ci3', headerId: 'co2', itemPosition: 1, article: 'Bissap Pourpre Vanille 1L',   articleId: 'a2', quantite: 300,  unite: 'btl', puHT: 1650, remisePct: 0  },
  { id: 'ci4', headerId: 'co3', itemPosition: 1, article: 'Bissap Pourpre Original 1L',  articleId: 'a1', quantite: 1200, unite: 'btl', puHT: 1500, remisePct: 10 },
  { id: 'ci5', headerId: 'co4', itemPosition: 1, article: 'Bissap Pourpre Original 1L',  articleId: 'a1', quantite: 2000, unite: 'btl', puHT: 2.50,  remisePct: 0  },
  { id: 'ci6', headerId: 'co4', itemPosition: 2, article: 'Bissap Pourpre Vanille 1L',   articleId: 'a2', quantite: 1000, unite: 'btl', puHT: 2.80,  remisePct: 0  },
]
