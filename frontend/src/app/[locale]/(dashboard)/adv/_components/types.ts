// ── ADV — Administration des Ventes ──────────────────────────────────────────
//
// FactureClient     ≡ customer_invoices      (migration 015)
// FactureClientItem ≡ customer_invoice_items (migration 015)
//
// Re-export des types Ventes pour les vues croisées :
import type { CommandeClientHeader, StatutCommande } from '../../ventes/_components/types'
export type { CommandeClientHeader, StatutCommande }

// ── Factures clients ──────────────────────────────────────────────────────────

export type StatutFacture = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface FactureClient {
  id:             string
  numero:         string              // FAC-2026-NNNN
  salesOrderId:   string | null
  commandeNum:    string | null       // sales_orders.order_number
  client:         string              // clients.raison_sociale
  clientId:       string
  date:           string              // invoice_date (ISO date)
  dateEcheance:   string              // due_date
  statut:         StatutFacture
  currency:       string
  tvaPct:         number              // tva_pct (18 par défaut)
  montantHT:      number              // calculé depuis les items
  montantTTC:     number              // montantHT × (1 + tvaPct/100)
  notes:          string | null
}

export interface FactureClientItem {
  id:                string
  factureId:         string
  salesOrderItemId:  string | null
  articleId:         string
  article:           string
  itemPosition:      number
  quantite:          number
  unite:             string
  puHT:              number
  remisePct:         number
  tvaPct:            number
  montantHT:         number           // quantite × puHT × (1 - remisePct/100)
}

export function montantHTFacture(items: FactureClientItem[]): number {
  return Math.round(items.reduce((s, i) => s + i.montantHT, 0))
}

// ── Couleurs & labels ─────────────────────────────────────────────────────────
export const STATUT_FACTURE_COLORS: Record<StatutFacture, string> = {
  DRAFT:     'bg-gray-100 text-gray-600 border border-gray-200',
  SENT:      'bg-blue-100 text-blue-700 border border-blue-200',
  PAID:      'bg-emerald-100 text-emerald-800 border border-emerald-200',
  OVERDUE:   'bg-red-100 text-red-700 border border-red-200',
  CANCELLED: 'bg-gray-50 text-gray-400 border border-gray-100',
}

export const STATUT_FACTURE_LABELS: Record<StatutFacture, string> = {
  DRAFT:     'Brouillon',
  SENT:      'Envoyée',
  PAID:      'Payée',
  OVERDUE:   'En retard',
  CANCELLED: 'Annulée',
}

// ── Mock data ─────────────────────────────────────────────────────────────────
export const MOCK_FACTURES: FactureClient[] = [
  {
    id: 'fac1', numero: 'FAC-2026-0002', salesOrderId: 'co3', commandeNum: 'CO-2026-0002',
    client: 'ONG Santé Dakar', clientId: 'c3', date: '2026-05-20',
    dateEcheance: '2026-06-20', statut: 'SENT', currency: 'XOF',
    tvaPct: 0, montantHT: 1_620_000, montantTTC: 1_620_000, notes: null,
  },
  {
    id: 'fac2', numero: 'FAC-2026-0001', salesOrderId: 'co4', commandeNum: 'CO-2026-0001',
    client: 'Export Lomé', clientId: 'c4', date: '2026-05-15',
    dateEcheance: '2026-06-15', statut: 'PAID', currency: 'EUR',
    tvaPct: 0, montantHT: 7_800, montantTTC: 7_800, notes: 'Paiement Wire reçu le 14/05',
  },
]
