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
  pmp: number | null
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

export const ENTREPOTS: Record<string, { nom: string; emplacements: string[] }> = {
  'ENT-MP-01': { nom: 'Entrepôt MP - Dakar', emplacements: ['Zone A', 'Zone B', 'Zone C', 'Zone D'] },
  'ENT-PF-01': { nom: 'Entrepôt PF - Dakar', emplacements: ['Allée 1', 'Allée 2', 'Allée 3'] },
  'ENT-EMB-01': { nom: 'Entrepôt Emballages', emplacements: ['Étagère 1', 'Étagère 2', 'Étagère 3'] },
}

export const STATUT_STOCK_COLORS: Record<StatutStock, string> = {
  OK: 'bg-emerald-100 text-emerald-700',
  Alerte: 'bg-amber-100 text-amber-700',
  Rupture: 'bg-red-100 text-red-600',
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
  OK: 'bg-emerald-100 text-emerald-700',
  Quarantaine: 'bg-amber-100 text-amber-700',
  ProcheExpiration: 'bg-orange-100 text-orange-700',
  Expire: 'bg-red-100 text-red-600',
}

export const STATUT_LOT_LABELS: Record<StatutLot, string> = {
  OK: 'OK',
  Quarantaine: 'Quarantaine',
  ProcheExpiration: 'Proche expiration',
  Expire: 'Expiré',
}

export const MOCK_STOCKS: StockLigne[] = [
  {
    id: '1', articleCode: 'MP-CER-001', articleDesignation: 'Maïs grain sec', articleType: 'MP',
    entrepot: 'ENT-MP-01', emplacement: 'Zone A', lot: 'LOT-2025-0012',
    datePeremption: '2026-01-15', quantite: 12500, unite: 'KG',
    pmp: 190, valeurStock: 2375000, stockSecurite: 5000, pointCommande: 8000, statut: 'OK',
  },
  {
    id: '2', articleCode: 'MP-CER-002', articleDesignation: 'Mil décortiqué', articleType: 'MP',
    entrepot: 'ENT-MP-01', emplacement: 'Zone B', lot: 'LOT-2025-0018',
    datePeremption: '2026-03-20', quantite: 2800, unite: 'KG',
    pmp: 225, valeurStock: 630000, stockSecurite: 3000, pointCommande: 5000, statut: 'Alerte',
  },
  {
    id: '3', articleCode: 'MP-LEG-001', articleDesignation: 'Arachide coque (bloqué)', articleType: 'MP',
    entrepot: 'ENT-MP-01', emplacement: 'Zone C', lot: 'LOT-2024-0091',
    datePeremption: '2025-06-01', quantite: 0, unite: 'KG',
    pmp: 295, valeurStock: 0, stockSecurite: 0, pointCommande: 0, statut: 'Rupture',
  },
  {
    id: '4', articleCode: 'PSF-CER-001', articleDesignation: 'Farine de maïs enrichie (vrac)', articleType: 'PSF',
    entrepot: 'ENT-PF-01', emplacement: 'Allée 1', lot: 'LOT-2025-0040',
    datePeremption: '2025-08-10', quantite: 4200, unite: 'KG',
    pmp: 310, valeurStock: 1302000, stockSecurite: 2000, pointCommande: 3500, statut: 'OK',
  },
  {
    id: '5', articleCode: 'PF-PRO-001', articleDesignation: 'Farine infantile 1kg - Vitasoja', articleType: 'PF',
    entrepot: 'ENT-PF-01', emplacement: 'Allée 2', lot: 'LOT-2025-0042',
    datePeremption: '2025-10-01', quantite: 1850, unite: 'SACHET',
    pmp: 420, valeurStock: 777000, stockSecurite: 500, pointCommande: 800, statut: 'OK',
  },
  {
    id: '6', articleCode: 'PF-PRO-002', articleDesignation: 'Spaghetti 500g - Bluwa Gold', articleType: 'PF',
    entrepot: 'ENT-PF-01', emplacement: 'Allée 3', lot: 'LOT-2025-0039',
    datePeremption: '2027-05-01', quantite: 320, unite: 'SACHET',
    pmp: null, valeurStock: null, stockSecurite: null, pointCommande: null, statut: 'OK',
  },
  {
    id: '7', articleCode: 'AC-EMB-001', articleDesignation: 'Sachet plastique 1kg imprimé', articleType: 'AC',
    entrepot: 'ENT-EMB-01', emplacement: 'Étagère 1', lot: 'LOT-2025-0005',
    datePeremption: null, quantite: 45000, unite: 'UNITE',
    pmp: 47, valeurStock: 2115000, stockSecurite: 10000, pointCommande: 20000, statut: 'Exces',
  },
  {
    id: '8', articleCode: 'CS-EMB-001', articleDesignation: 'Produit nettoyant sol (5L)', articleType: 'CS',
    entrepot: 'ENT-EMB-01', emplacement: 'Étagère 2', lot: 'LOT-2025-0008',
    datePeremption: '2027-01-01', quantite: 3, unite: 'BIDON',
    pmp: 3500, valeurStock: 10500, stockSecurite: 5, pointCommande: 10, statut: 'Alerte',
  },
]

export const MOCK_MOUVEMENTS: Mouvement[] = [
  {
    id: '1', date: '2026-05-17', type: 'Entree', articleCode: 'MP-CER-001',
    articleDesignation: 'Maïs grain sec', lot: 'LOT-2025-0012', quantite: 5000, unite: 'KG',
    entrepotSource: '', entrepotDest: 'ENT-MP-01', reference: 'CMD-2026-0042',
    motif: 'Réception commande fournisseur', operateur: 'Amadou D.',
  },
  {
    id: '2', date: '2026-05-16', type: 'Sortie', articleCode: 'PSF-CER-001',
    articleDesignation: 'Farine de maïs enrichie (vrac)', lot: 'LOT-2025-0040', quantite: 800, unite: 'KG',
    entrepotSource: 'ENT-PF-01', entrepotDest: '', reference: 'LOT-PROD-2026-018',
    motif: 'Consommation production', operateur: 'Fatou N.',
  },
  {
    id: '3', date: '2026-05-15', type: 'Sortie', articleCode: 'PF-PRO-001',
    articleDesignation: 'Farine infantile 1kg - Vitasoja', lot: 'LOT-2025-0042', quantite: 200, unite: 'SACHET',
    entrepotSource: 'ENT-PF-01', entrepotDest: '', reference: 'VTE-2026-0088',
    motif: 'Expédition client CASINO', operateur: 'Moussa K.',
  },
  {
    id: '4', date: '2026-05-14', type: 'Transfert', articleCode: 'AC-EMB-001',
    articleDesignation: 'Sachet plastique 1kg imprimé', lot: 'LOT-2025-0005', quantite: 5000, unite: 'UNITE',
    entrepotSource: 'ENT-EMB-01', entrepotDest: 'ENT-PF-01', reference: 'TRF-2026-003',
    motif: 'Réapprovisionnement ligne production', operateur: 'Amadou D.',
  },
  {
    id: '5', date: '2026-05-12', type: 'Ajustement', articleCode: 'MP-CER-002',
    articleDesignation: 'Mil décortiqué', lot: 'LOT-2025-0018', quantite: -150, unite: 'KG',
    entrepotSource: 'ENT-MP-01', entrepotDest: '', reference: 'INV-2026-05',
    motif: 'Écart inventaire physique', operateur: 'Chef magasin',
  },
  {
    id: '6', date: '2026-05-10', type: 'Entree', articleCode: 'PF-PRO-001',
    articleDesignation: 'Farine infantile 1kg - Vitasoja', lot: 'LOT-2025-0042', quantite: 500, unite: 'SACHET',
    entrepotSource: '', entrepotDest: 'ENT-PF-01', reference: 'LOT-PROD-2026-015',
    motif: 'Réception depuis production', operateur: 'Fatou N.',
  },
]

export const MOCK_LOTS: Lot[] = [
  {
    id: '1', lotCode: 'LOT-2025-0012', articleCode: 'MP-CER-001', articleDesignation: 'Maïs grain sec',
    entrepot: 'ENT-MP-01', emplacement: 'Zone A', quantite: 12500, unite: 'KG',
    dateReception: '2026-03-10', datePeremption: '2026-01-15', joursRestants: 242, statut: 'OK',
  },
  {
    id: '2', lotCode: 'LOT-2025-0018', articleCode: 'MP-CER-002', articleDesignation: 'Mil décortiqué',
    entrepot: 'ENT-MP-01', emplacement: 'Zone B', quantite: 2800, unite: 'KG',
    dateReception: '2026-04-02', datePeremption: '2026-03-20', joursRestants: 306, statut: 'OK',
  },
  {
    id: '3', lotCode: 'LOT-2025-0040', articleCode: 'PSF-CER-001', articleDesignation: 'Farine de maïs enrichie',
    entrepot: 'ENT-PF-01', emplacement: 'Allée 1', quantite: 4200, unite: 'KG',
    dateReception: '2026-05-01', datePeremption: '2025-08-10', joursRestants: 84, statut: 'ProcheExpiration',
  },
  {
    id: '4', lotCode: 'LOT-2025-0042', articleCode: 'PF-PRO-001', articleDesignation: 'Farine infantile 1kg - Vitasoja',
    entrepot: 'ENT-PF-01', emplacement: 'Allée 2', quantite: 1850, unite: 'SACHET',
    dateReception: '2026-05-10', datePeremption: '2025-10-01', joursRestants: 136, statut: 'OK',
  },
  {
    id: '5', lotCode: 'LOT-2024-0091', articleCode: 'MP-LEG-001', articleDesignation: 'Arachide coque',
    entrepot: 'ENT-MP-01', emplacement: 'Zone C', quantite: 0, unite: 'KG',
    dateReception: '2024-12-01', datePeremption: '2025-06-01', joursRestants: -351, statut: 'Expire',
  },
  {
    id: '6', lotCode: 'LOT-2025-0005', articleCode: 'AC-EMB-001', articleDesignation: 'Sachet plastique 1kg imprimé',
    entrepot: 'ENT-EMB-01', emplacement: 'Étagère 1', quantite: 45000, unite: 'UNITE',
    dateReception: '2026-02-15', datePeremption: null, joursRestants: null, statut: 'OK',
  },
  {
    id: '7', lotCode: 'LOT-2025-0008', articleCode: 'CS-EMB-001', articleDesignation: 'Produit nettoyant sol',
    entrepot: 'ENT-EMB-01', emplacement: 'Étagère 2', quantite: 3, unite: 'BIDON',
    dateReception: '2025-06-01', datePeremption: '2027-01-01', joursRestants: 228, statut: 'Quarantaine',
  },
]
