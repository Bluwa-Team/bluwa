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
  {
    id: '1', sku: 'PF-BIS-001', designation: 'Bissap Pourpre Original 1L',
    stockPF: 380, ofPlanif: 200, cmdFerme: 480, prevision: 600,
    stockSec: 200, tailleLot: 200, unite: 'btl',
  },
  {
    id: '2', sku: 'PF-BIS-002', designation: 'Bissap Pourpre Vanille 1L',
    stockPF: 120, ofPlanif: 150, cmdFerme: 260, prevision: 320,
    stockSec: 100, tailleLot: 150, unite: 'btl',
  },
  {
    id: '3', sku: 'PF-BIS-003', designation: 'Bissap Pourpre Gingembre 1L',
    stockPF: 90, ofPlanif: 180, cmdFerme: 0, prevision: 280,
    stockSec: 100, tailleLot: 180, unite: 'btl',
  },
  {
    id: '4', sku: 'PF-BIS-004', designation: 'Bissap Pourpre Menthe 1L',
    stockPF: 200, ofPlanif: 100, cmdFerme: 150, prevision: 180,
    stockSec: 80, tailleLot: 100, unite: 'btl',
  },
  {
    id: '5', sku: 'PF-BIS-005', designation: 'Bissap Pourpre Nature 1L',
    stockPF: 60, ofPlanif: 120, cmdFerme: 0, prevision: 350,
    stockSec: 120, tailleLot: 200, unite: 'btl',
  },
]
