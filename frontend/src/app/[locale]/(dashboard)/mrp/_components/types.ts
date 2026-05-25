// ── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ── Tab ① — Ordres M+0 · ATP ─────────────────────────────────────────────────

export interface ProduitMRP {
  id: string
  sku: string
  designation: string
  unite: string
  // ATP components
  stockLibere: number
  stockEnControle: number
  dateReceptionEnControle: string | null  // ISO date
  delaiControleJours: number
  ofEnCours: number
  cmdFournAttendue: number
  expeditionsClient: number
  dateOP: string  // ISO date — horizon cible de l'OP
  // PDP inputs
  cmdFerme: number
  prevision: number
  stockSec: number
  tailleLot: number
}

export type SourceMRP = 'Commandes fermes' | 'Prévisions'

export interface MRPResult {
  demande: number
  atp: number
  enControleEligible: boolean
  dateLiberation: string | null
  besoinNet: number
  ofPlanifQte: number
  nbOP: number
  source: SourceMRP
}

export function calcMRP(p: ProduitMRP): MRPResult {
  // Jalonnement à rebours : date de libération du lot "En contrôle"
  const dateLiberation = p.dateReceptionEnControle
    ? addDays(p.dateReceptionEnControle, p.delaiControleJours)
    : null

  // Stock "En contrôle" éligible si libéré AVANT la date de l'OP
  const enControleEligible =
    dateLiberation !== null && dateLiberation < p.dateOP

  // ATP = Stock libéré + (En contrôle si éligible) + OF en cours + Cmd fournisseur attendue − Expéditions client
  const atp =
    p.stockLibere +
    (enControleEligible ? p.stockEnControle : 0) +
    p.ofEnCours +
    p.cmdFournAttendue -
    p.expeditionsClient

  const demande = Math.max(p.cmdFerme, p.prevision)
  const besoinNet = Math.max(0, demande - atp + p.stockSec)
  const nbOP = besoinNet > 0 ? Math.ceil(besoinNet / p.tailleLot) : 0
  const ofPlanifQte = nbOP * p.tailleLot
  const source: SourceMRP = p.cmdFerme > 0 ? 'Commandes fermes' : 'Prévisions'

  return { demande, atp, enControleEligible, dateLiberation, besoinNet, ofPlanifQte, nbOP, source }
}

// dateOP = 28 mai 2026 (horizon M+0 courant)
const DATE_OP = '2026-05-28'

export const MOCK_PRODUITS_MRP: ProduitMRP[] = [
  // PF-BIS-001 : lib=2026-05-23 < OP → ELIGIBLE → ATP=580, besoin=220, 2OP×200=400
  {
    id: '1', sku: 'PF-BIS-001', designation: 'Bissap Pourpre Original 1L', unite: 'btl',
    stockLibere: 250, stockEnControle: 130,
    dateReceptionEnControle: '2026-05-20', delaiControleJours: 3,
    ofEnCours: 200, cmdFournAttendue: 0, expeditionsClient: 0,
    dateOP: DATE_OP,
    cmdFerme: 480, prevision: 600, stockSec: 200, tailleLot: 200,
  },
  // PF-BIS-002 : lib=2026-05-30 > OP → NON ELIGIBLE → ATP=120, besoin=300, 2OP×150=300
  {
    id: '2', sku: 'PF-BIS-002', designation: 'Bissap Pourpre Vanille 1L', unite: 'btl',
    stockLibere: 120, stockEnControle: 80,
    dateReceptionEnControle: '2026-05-25', delaiControleJours: 5,
    ofEnCours: 0, cmdFournAttendue: 0, expeditionsClient: 0,
    dateOP: DATE_OP,
    cmdFerme: 260, prevision: 320, stockSec: 100, tailleLot: 150,
  },
  // PF-BIS-003 : pas de lot en contrôle → ATP=270, besoin=110, 1OP×180=180
  {
    id: '3', sku: 'PF-BIS-003', designation: 'Bissap Pourpre Gingembre 1L', unite: 'btl',
    stockLibere: 90, stockEnControle: 0,
    dateReceptionEnControle: null, delaiControleJours: 3,
    ofEnCours: 180, cmdFournAttendue: 0, expeditionsClient: 0,
    dateOP: DATE_OP,
    cmdFerme: 0, prevision: 280, stockSec: 100, tailleLot: 180,
  },
  // PF-BIS-004 : expéditions client → ATP=280, besoin=0
  {
    id: '4', sku: 'PF-BIS-004', designation: 'Bissap Pourpre Menthe 1L', unite: 'btl',
    stockLibere: 200, stockEnControle: 0,
    dateReceptionEnControle: null, delaiControleJours: 3,
    ofEnCours: 100, cmdFournAttendue: 0, expeditionsClient: 20,
    dateOP: DATE_OP,
    cmdFerme: 150, prevision: 180, stockSec: 80, tailleLot: 100,
  },
  // PF-BIS-005 : ATP=180, besoin=290, 2OP×200=400
  {
    id: '5', sku: 'PF-BIS-005', designation: 'Bissap Pourpre Citronnelle 1L', unite: 'btl',
    stockLibere: 60, stockEnControle: 0,
    dateReceptionEnControle: null, delaiControleJours: 3,
    ofEnCours: 120, cmdFournAttendue: 0, expeditionsClient: 0,
    dateOP: DATE_OP,
    cmdFerme: 0, prevision: 350, stockSec: 120, tailleLot: 200,
  },
]

// ── Tab ② — Explosion BOM · 6 mois ───────────────────────────────────────────

export interface ComposantBOM {
  id: string
  designation: string
  unite: string
  // qtyPerPF : quantité du composant par bouteille de chaque PF (sku → qty/btl)
  qtyPerPF: Record<string, number>
  stock: number
  enCommande: number
  stockSec: number
  leadTime: number
}

export function calcBesoinNetBOM(besoinBrut: number, c: ComposantBOM): number {
  return Math.max(0, besoinBrut - c.stock - c.enCommande + c.stockSec)
}

// Ratios BOM par bouteille (1 L)
//   Hibiscus  : 0.025 kg/btl (tous PF)
//   Sucre     : 0.04  kg/btl (tous PF)
//   Eau       : 1.0   L/btl  (tous PF)
//   Gingembre : 0.006 kg/btl (BIS-003 uniquement)
//   Vanille   : 0.00018 kg/btl (BIS-002 uniquement)
//   Menthe    : 0.0035 kg/btl (BIS-004 uniquement)
//   Citronnelle: 0.003 kg/btl (BIS-005 uniquement)
//   Bouteille : 1 u/btl (tous PF)
//   Bouchon   : 1 u/btl (tous PF)
//   Étiquette : 1 u/btl (tous PF)

export const MOCK_BOM: ComposantBOM[] = [
  {
    id: 'b1', designation: "Fleurs d'hibiscus séchées", unite: 'kg',
    qtyPerPF: { 'PF-BIS-001': 0.025, 'PF-BIS-002': 0.025, 'PF-BIS-003': 0.025, 'PF-BIS-004': 0.025, 'PF-BIS-005': 0.025 },
    stock: 220, enCommande: 300, stockSec: 80, leadTime: 12,
  },
  {
    id: 'b2', designation: 'Sucre cristallisé', unite: 'kg',
    qtyPerPF: { 'PF-BIS-001': 0.04, 'PF-BIS-002': 0.04, 'PF-BIS-003': 0.04, 'PF-BIS-004': 0.04, 'PF-BIS-005': 0.04 },
    stock: 320, enCommande: 500, stockSec: 120, leadTime: 5,
  },
  {
    id: 'b3', designation: 'Eau potable filtrée', unite: 'L',
    qtyPerPF: { 'PF-BIS-001': 1.0, 'PF-BIS-002': 1.0, 'PF-BIS-003': 1.0, 'PF-BIS-004': 1.0, 'PF-BIS-005': 1.0 },
    stock: 5000, enCommande: 0, stockSec: 500, leadTime: 1,
  },
  {
    id: 'b4', designation: 'Gingembre frais', unite: 'kg',
    qtyPerPF: { 'PF-BIS-003': 0.006 },
    stock: 18, enCommande: 30, stockSec: 10, leadTime: 4,
  },
  {
    id: 'b5', designation: 'Gousses de vanille', unite: 'kg',
    qtyPerPF: { 'PF-BIS-002': 0.00018 },
    stock: 3, enCommande: 5, stockSec: 2, leadTime: 28,
  },
  {
    id: 'b6', designation: 'Feuilles de menthe fraîche', unite: 'kg',
    qtyPerPF: { 'PF-BIS-004': 0.0035 },
    stock: 8, enCommande: 0, stockSec: 5, leadTime: 3,
  },
  {
    id: 'b7', designation: 'Citronnelle séchée', unite: 'kg',
    qtyPerPF: { 'PF-BIS-005': 0.003 },
    stock: 6, enCommande: 0, stockSec: 3, leadTime: 7,
  },
  {
    id: 'b8', designation: 'Bouteille verre 1L', unite: 'u',
    qtyPerPF: { 'PF-BIS-001': 1, 'PF-BIS-002': 1, 'PF-BIS-003': 1, 'PF-BIS-004': 1, 'PF-BIS-005': 1 },
    stock: 1800, enCommande: 5000, stockSec: 800, leadTime: 18,
  },
  {
    id: 'b9', designation: 'Bouchon métal 1L', unite: 'u',
    qtyPerPF: { 'PF-BIS-001': 1, 'PF-BIS-002': 1, 'PF-BIS-003': 1, 'PF-BIS-004': 1, 'PF-BIS-005': 1 },
    stock: 2200, enCommande: 0, stockSec: 800, leadTime: 14,
  },
  {
    id: 'b10', designation: 'Étiquette Pourpre 1L', unite: 'u',
    qtyPerPF: { 'PF-BIS-001': 1, 'PF-BIS-002': 1, 'PF-BIS-003': 1, 'PF-BIS-004': 1, 'PF-BIS-005': 1 },
    stock: 4500, enCommande: 10000, stockSec: 2000, leadTime: 16,
  },
]

// ── Tabs ③ & ④ — Horizon 6 mois ──────────────────────────────────────────────

export const MOIS_LABELS = ['Mai 26', 'Juin 26', 'Juil. 26', 'Août 26', 'Sept. 26', 'Oct. 26'] as const

// Prévisions M+1 à M+5 par PF (bouteilles). M+0 vient de calcMRP (ofPlanifQte).
export const MOCK_PREVISIONS_6M: Record<string, [number, number, number, number, number]> = {
  'PF-BIS-001': [800, 800, 800, 800, 800],
  'PF-BIS-002': [450, 450, 450, 450, 450],
  'PF-BIS-003': [540, 540, 540, 540, 540],
  'PF-BIS-004': [240, 360, 360, 360, 360],
  'PF-BIS-005': [300, 300, 300, 300, 300],
}

export interface HorizonComposant {
  id: string
  designation: string
  unite: string
  leadTime: number
  stock: number
  enCommande: number
  stockSec: number
  mois: [number, number, number, number, number, number]
}

export interface HorizonPF {
  sku: string
  designation: string
  unite: string
  mois: [number, number, number, number, number, number]  // ofPlanifQte par mois
}

// ── Tab ⑤ — PIC Macro · 12 mois ──────────────────────────────────────────────

export interface PrevisionAnnuellePF {
  sku: string
  designation: string
  unite: string
  previsionAnnuelle: number
}

export const MOCK_PREVISIONS_ANNUELLES: PrevisionAnnuellePF[] = [
  { sku: 'PF-BIS-001', designation: 'Bissap Pourpre Original 1L',    unite: 'btl', previsionAnnuelle: 8000 },
  { sku: 'PF-BIS-002', designation: 'Bissap Pourpre Vanille 1L',     unite: 'btl', previsionAnnuelle: 4800 },
  { sku: 'PF-BIS-003', designation: 'Bissap Pourpre Gingembre 1L',   unite: 'btl', previsionAnnuelle: 5200 },
  { sku: 'PF-BIS-004', designation: 'Bissap Pourpre Menthe 1L',      unite: 'btl', previsionAnnuelle: 3600 },
  { sku: 'PF-BIS-005', designation: 'Bissap Pourpre Citronnelle 1L', unite: 'btl', previsionAnnuelle: 2400 },
]
