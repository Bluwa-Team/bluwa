// ── Tab ① — Ordres M+0 ───────────────────────────────────────────────────────

export interface ProduitMRP {
  id: string
  sku: string
  designation: string
  stockPF: number
  ofPlanif: number
  cmdFerme: number
  prevision: number
  stockSec: number
  tailleLot: number
  unite: string
}

export type SourceMRP = 'Commandes fermes' | 'Prévisions'

export interface MRPResult {
  demande: number
  besoinNet: number
  nbOP: number
  source: SourceMRP
}

export function calcMRP(p: ProduitMRP): MRPResult {
  const demande = Math.max(p.cmdFerme, p.prevision)
  const besoinNet = Math.max(0, demande - p.stockPF + p.stockSec - p.ofPlanif)
  const nbOP = besoinNet > 0 ? Math.ceil(besoinNet / p.tailleLot) : 0
  const source: SourceMRP = p.cmdFerme > 0 ? 'Commandes fermes' : 'Prévisions'
  return { demande, besoinNet, nbOP, source }
}

export const MOCK_PRODUITS_MRP: ProduitMRP[] = [
  { id: '1', sku: 'PF-BIS-001', designation: 'Bissap Pourpre Original 1L',    stockPF: 380, ofPlanif: 200, cmdFerme: 480, prevision: 600, stockSec: 200, tailleLot: 200, unite: 'btl' },
  { id: '2', sku: 'PF-BIS-002', designation: 'Bissap Pourpre Vanille 1L',     stockPF: 120, ofPlanif: 150, cmdFerme: 260, prevision: 320, stockSec: 100, tailleLot: 150, unite: 'btl' },
  { id: '3', sku: 'PF-BIS-003', designation: 'Bissap Pourpre Gingembre 1L',   stockPF: 90,  ofPlanif: 180, cmdFerme: 0,   prevision: 280, stockSec: 100, tailleLot: 180, unite: 'btl' },
  { id: '4', sku: 'PF-BIS-004', designation: 'Bissap Pourpre Menthe 1L',      stockPF: 200, ofPlanif: 100, cmdFerme: 150, prevision: 180, stockSec: 80,  tailleLot: 100, unite: 'btl' },
  { id: '5', sku: 'PF-BIS-005', designation: 'Bissap Pourpre Citronnelle 1L', stockPF: 60,  ofPlanif: 120, cmdFerme: 0,   prevision: 350, stockSec: 120, tailleLot: 200, unite: 'btl' },
]

// ── Tab ② — Explosion BOM ────────────────────────────────────────────────────

export interface ComposantBOM {
  id: string
  designation: string
  unite: string
  besoinBrut: number
  stock: number
  enCommande: number
  stockSec: number
  leadTime: number
}

export function calcBesoinNetBOM(c: ComposantBOM): number {
  return Math.max(0, c.besoinBrut - c.stock - c.enCommande + c.stockSec)
}

export const MOCK_BOM: ComposantBOM[] = [
  { id: 'b1',  designation: "Fleurs d'hibiscus séchées",  unite: 'kg', besoinBrut: 10.25,  stock: 220,  enCommande: 300,   stockSec: 80,  leadTime: 12 },
  { id: 'b2',  designation: 'Sucre cristallisé',           unite: 'kg', besoinBrut: 16.4,   stock: 320,  enCommande: 500,   stockSec: 120, leadTime: 5  },
  { id: 'b3',  designation: 'Eau potable filtrée',         unite: 'L',  besoinBrut: 410,    stock: 5000, enCommande: 0,     stockSec: 500, leadTime: 1  },
  { id: 'b4',  designation: 'Gingembre frais',             unite: 'kg', besoinBrut: 1.1,    stock: 18,   enCommande: 30,    stockSec: 10,  leadTime: 4  },
  { id: 'b5',  designation: 'Gousses de vanille',          unite: 'kg', besoinBrut: 0.072,  stock: 3,    enCommande: 5,     stockSec: 2,   leadTime: 28 },
  { id: 'b6',  designation: 'Feuilles de menthe fraîche',  unite: 'kg', besoinBrut: 0.3,    stock: 8,    enCommande: 0,     stockSec: 5,   leadTime: 3  },
  { id: 'b7',  designation: 'Citronnelle séchée',          unite: 'kg', besoinBrut: 0.24,   stock: 6,    enCommande: 0,     stockSec: 3,   leadTime: 7  },
  { id: 'b8',  designation: 'Bouteille verre 1L',          unite: 'u',  besoinBrut: 410,    stock: 1800, enCommande: 5000,  stockSec: 800, leadTime: 18 },
  { id: 'b9',  designation: 'Bouchon métal 1L',            unite: 'u',  besoinBrut: 410,    stock: 2200, enCommande: 0,     stockSec: 800, leadTime: 14 },
  { id: 'b10', designation: 'Étiquette Pourpre 1L',        unite: 'u',  besoinBrut: 410,    stock: 4500, enCommande: 10000, stockSec: 2000,leadTime: 16 },
]

// ── Tabs ③ & ④ — Horizon 6 mois ─────────────────────────────────────────────

export const MOIS_LABELS = ['Mai 26', 'Juin 26', 'Juil. 26', 'Août 26', 'Sept. 26', 'Oct. 26'] as const

export interface HorizonComposant {
  id: string
  designation: string
  unite: string
  leadTime: number
  mois: [number, number, number, number, number, number]
}

export interface HorizonPF {
  id: string
  designation: string
  unite: string
  mois: [{ op: number; vol: number }, { op: number; vol: number }, { op: number; vol: number }, { op: number; vol: number }, { op: number; vol: number }, { op: number; vol: number }]
}

export const MOCK_HORIZON_COMPOSANTS: HorizonComposant[] = [
  { id: 'h1',  designation: "Fleurs d'hibiscus séchées", unite: 'kg', leadTime: 12, mois: [0, 47.9,   49.525, 51.175, 52.8,  54.45  ] },
  { id: 'h2',  designation: 'Sucre cristallisé',          unite: 'kg', leadTime: 5,  mois: [0, 76.64,  79.24,  81.88,  84.48, 87.12  ] },
  { id: 'h3',  designation: 'Eau potable filtrée',        unite: 'L',  leadTime: 1,  mois: [0, 1916,   1981,   2047,   2112,  2178   ] },
  { id: 'h4',  designation: 'Gingembre frais',            unite: 'kg', leadTime: 4,  mois: [0, 3.94,   4.08,   4.22,   4.36,  4.5    ] },
  { id: 'h5',  designation: 'Gousses de vanille',         unite: 'kg', leadTime: 28, mois: [0, 0.298,  0.309,  0.319,  0.33,  0.34   ] },
  { id: 'h6',  designation: 'Feuilles de menthe fraîche', unite: 'kg', leadTime: 3,  mois: [0, 1.428,  1.47,   1.518,  1.56,  1.608  ] },
  { id: 'h7',  designation: 'Citronnelle séchée',         unite: 'kg', leadTime: 7,  mois: [0, 0.828,  0.856,  0.884,  0.912, 0.94   ] },
  { id: 'h8',  designation: 'Bouteille verre 1L',         unite: 'u',  leadTime: 18, mois: [0, 1916,   1981,   2047,   2112,  2178   ] },
  { id: 'h9',  designation: 'Bouchon métal 1L',           unite: 'u',  leadTime: 14, mois: [0, 1916,   1981,   2047,   2112,  2178   ] },
  { id: 'h10', designation: 'Étiquette Pourpre 1L',       unite: 'u',  leadTime: 16, mois: [0, 1916,   1981,   2047,   2112,  2178   ] },
]

export const MOCK_HORIZON_PF: HorizonPF[] = [
  { id: 'p1', designation: 'Bissap Pourpre Original 1L',    unite: 'btl', mois: [{ op: 1, vol: 200 }, { op: 4, vol: 800 }, { op: 4, vol: 800 }, { op: 4, vol: 800 }, { op: 4, vol: 800 }, { op: 4, vol: 800 }] },
  { id: 'p2', designation: 'Bissap Pourpre Vanille 1L',     unite: 'btl', mois: [{ op: 1, vol: 150 }, { op: 3, vol: 450 }, { op: 3, vol: 450 }, { op: 3, vol: 450 }, { op: 3, vol: 450 }, { op: 3, vol: 450 }] },
  { id: 'p3', designation: 'Bissap Pourpre Gingembre 1L',   unite: 'btl', mois: [{ op: 1, vol: 180 }, { op: 3, vol: 540 }, { op: 3, vol: 540 }, { op: 3, vol: 540 }, { op: 3, vol: 540 }, { op: 3, vol: 540 }] },
  { id: 'p4', designation: 'Bissap Pourpre Menthe 1L',      unite: 'btl', mois: [{ op: 1, vol: 120 }, { op: 2, vol: 240 }, { op: 3, vol: 360 }, { op: 3, vol: 360 }, { op: 3, vol: 360 }, { op: 3, vol: 360 }] },
  { id: 'p5', designation: 'Bissap Pourpre Citronnelle 1L', unite: 'btl', mois: [{ op: 1, vol: 100 }, { op: 3, vol: 300 }, { op: 3, vol: 300 }, { op: 3, vol: 300 }, { op: 3, vol: 300 }, { op: 3, vol: 300 }] },
]
