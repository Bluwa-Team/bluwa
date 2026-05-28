// StatutLot = StatutQC unifié depuis @/types/erp
// TypeArticleQA = ArticleType unifié depuis @/types/erp
import type { StatutQC, ArticleType } from '@/types/erp'
export type { StatutQC as StatutLot }
export type { ArticleType as TypeArticleQA }

// ── Type DB-aligné — quality_inspection_lots (migration 007) ─────────────────

/**
 * Statut d'un lot d'inspection — aligné sur quality_inspection_lots.status CHECK.
 * Mapping vers StatutQC (frontend) :
 *   'En contrôle' → 'EnControle'
 *   'Libéré'      → 'Libere'
 *   'Rejeté'      → 'NonConforme'
 */
export type StatutInspectionLot = 'En contrôle' | 'Libéré' | 'Rejeté'

export const STATUT_INSPECTION_LABELS: Record<StatutInspectionLot, string> = {
  'En contrôle': 'En contrôle',
  'Libéré':      'Libéré',
  'Rejeté':      'Rejeté',
}

export const STATUT_INSPECTION_COLORS: Record<StatutInspectionLot, string> = {
  'En contrôle': 'bg-amber-100 text-amber-700 border border-amber-200',
  'Libéré':      'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'Rejeté':      'bg-red-100 text-red-700 border border-red-200',
}

/**
 * Lot d'inspection qualité — aligné sur quality_inspection_lots (migration 007).
 * Créé automatiquement à chaque réception d'article soumis à inspection.
 */
export interface QualityInspectionLot {
  id:                 string
  organizationId:     string
  factoryId:          string
  goodsReceiptItemId: string | null   // lien vers la ligne de réception déclencheuse
  articleId:          string
  articleCode:        string          // enrichi en frontend
  articleDesignation: string          // enrichi en frontend
  articleType:        ArticleType     // enrichi en frontend
  batchNumber:        string
  sampleQuantity:     number | null   // NULL = 100% contrôle
  status:             StatutInspectionLot
  decisionBy:         string | null
  decisionComments:   string | null
  decisionAt:         string | null
  createdAt:          string
  // Champs enrichis UI
  origine:            string          // fournisseur ou n° OF
  flux:               'Reception' | 'Production'
  quantite:           number
  unite:              string
}

export const MOCK_QUALITY_INSPECTION_LOTS: QualityInspectionLot[] = [
  {
    id: 'qil-001', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-031', articleId: 'a-hib',
    articleCode: 'MP-0001', articleDesignation: "Fleurs d'Hibiscus",
    articleType: 'MP', batchNumber: 'LOT-MP-2026-0031',
    sampleQuantity: 5, status: 'En contrôle',
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-22T08:00:00Z',
    origine: 'Coopérative de Thiès', flux: 'Reception', quantite: 50, unite: 'kg',
  },
  {
    id: 'qil-002', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-032', articleId: 'a-suc',
    articleCode: 'MP-0002', articleDesignation: 'Sucre cristallisé',
    articleType: 'MP', batchNumber: 'LOT-MP-2026-0032',
    sampleQuantity: 10, status: 'En contrôle',
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-22T09:30:00Z',
    origine: 'Sucrivoire SA', flux: 'Reception', quantite: 200, unite: 'kg',
  },
  {
    id: 'qil-003', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-018', articleId: 'a-btl',
    articleCode: 'AC-0001', articleDesignation: 'Bouteille verre 1L',
    articleType: 'AC', batchNumber: 'LOT-AC-2026-0018',
    sampleQuantity: 20, status: 'En contrôle',
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-23T10:00:00Z',
    origine: 'PlastiSénégal', flux: 'Reception', quantite: 500, unite: 'u',
  },
  {
    id: 'qil-004', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: null, articleId: 'a-pf1',
    articleCode: 'PF-BIS-001', articleDesignation: 'Bissap Pourpre Original 1L',
    articleType: 'PF', batchNumber: 'LOT-PF-2026-0041',
    sampleQuantity: null, status: 'En contrôle',
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-24T14:00:00Z',
    origine: 'OF-2026-041', flux: 'Production', quantite: 200, unite: 'btl',
  },
  {
    id: 'qil-005', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: null, articleId: 'a-pf2',
    articleCode: 'PF-BIS-002', articleDesignation: 'Bissap Pourpre Vanille 1L',
    articleType: 'PF', batchNumber: 'LOT-PF-2026-0042',
    sampleQuantity: null, status: 'Libéré',
    decisionBy: 'user-qa', decisionComments: 'Paramètres conformes — pH 3.7, Brix 12.2',
    decisionAt: '2026-05-24T16:30:00Z',
    createdAt: '2026-05-23T14:00:00Z',
    origine: 'OF-2026-042', flux: 'Production', quantite: 150, unite: 'btl',
  },
  {
    id: 'qil-006', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-029', articleId: 'a-gin',
    articleCode: 'MP-0011', articleDesignation: 'Gingembre frais',
    articleType: 'MP', batchNumber: 'LOT-MP-2026-0029',
    sampleQuantity: 3, status: 'Rejeté',
    decisionBy: 'user-qa', decisionComments: "Taux d'humidité hors norme — mesuré 19.2% (limite 15%)",
    decisionAt: '2026-05-21T11:00:00Z',
    createdAt: '2026-05-21T08:00:00Z',
    origine: 'AgriLocal Mali', flux: 'Reception', quantite: 25, unite: 'kg',
  },
]

export type FluxLot = 'Reception' | 'Production'

// Alias locaux pour backward-compat avec le reste du module
type StatutLot = StatutQC
type TypeArticleQA = ArticleType
export type StatutNC = 'Ouvert' | 'EnCours' | 'Clos'
export type ActionNC = 'Rebut' | 'Retravail' | 'Derogation'

export interface LotControle {
  id: string
  codeLot: string
  flux: FluxLot
  typeArticle: TypeArticleQA
  article: string
  origine: string
  dateEntree: string
  quantite: number
  unite: string
  statut: StatutLot
}

export interface NonConformite {
  id: string
  numero: string
  codeLot: string
  article: string
  typeArticle: TypeArticleQA
  flux: FluxLot
  origine: string
  cause: string
  date: string
  statut: StatutNC
  actionCorrective: ActionNC | null
  dateAction: string | null
  responsable: string
}

export interface GenealogieLien {
  codeLot: string
  article: string
  typeArticle: TypeArticleQA
  qteUtilisee: number
  unite: string
  fournisseur: string
  dateReception: string
  statut: StatutLot
}

export interface ControleCCP {
  nom: string
  valeur: string        // valeur mesurée affichée (ex : "82°C / 25s")
  spec: string          // plage de conformité (ex : "≥ 82°C / ≥ 20s")
  conforme: boolean
}

export interface DestinationAval {
  destination: string
  dateLivraison: string | null  // null = stock non encore expédié
  quantite: number
  unite: string
}

export interface GenealogiePF {
  codeLotPF: string
  articlePF: string
  numeroOF: string
  dateProduction: string
  quantiteProduite: number
  unite: string
  statut: StatutLot
  ingredients: GenealogieLien[]
  ccps?: ControleCCP[]
  destinations?: DestinationAval[]
}

// ── Labels & Colors ───────────────────────────────────────────────────────────

export const STATUT_LOT_LABELS: Record<StatutLot, string> = {
  EnControle:  'En contrôle',
  Libere:      'Libéré',
  Bloque:      'Bloqué',
  NonConforme: 'Non-conforme',
}

export const STATUT_LOT_COLORS: Record<StatutLot, string> = {
  EnControle:  'bg-amber-100 text-amber-700 border border-amber-200',
  Libere:      'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Bloque:      'bg-red-100 text-red-700 border border-red-200',
  NonConforme: 'bg-red-600 text-white border border-red-700',
}

export const FLUX_LOT_LABELS: Record<FluxLot, string> = {
  Reception:  'Réception',
  Production: 'Production',
}

export const TYPE_ARTICLE_COLORS: Record<TypeArticleQA, string> = {
  MP:  'bg-blue-100 text-blue-700',
  PSF: 'bg-purple-100 text-purple-700',
  PF:  'bg-emerald-100 text-emerald-700',
  AC:  'bg-violet-100 text-violet-700',
  CS:  'bg-gray-100 text-gray-600',
}

export const STATUT_NC_LABELS: Record<StatutNC, string> = {
  Ouvert:  'Ouvert',
  EnCours: 'En cours',
  Clos:    'Clos',
}

export const STATUT_NC_COLORS: Record<StatutNC, string> = {
  Ouvert:  'bg-red-100 text-red-700 border border-red-200',
  EnCours: 'bg-amber-100 text-amber-700 border border-amber-200',
  Clos:    'bg-slate-100 text-slate-600 border border-slate-200',
}

export const ACTION_NC_LABELS: Record<ActionNC, string> = {
  Rebut:     'Rebut',
  Retravail: 'Retravail',
  Derogation: 'Dérogation',
}

export const ACTION_NC_COLORS: Record<ActionNC, string> = {
  Rebut:     'bg-red-50 border-red-300 text-red-700',
  Retravail: 'bg-amber-50 border-amber-300 text-amber-700',
  Derogation: 'bg-blue-50 border-blue-300 text-blue-700',
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

export const MOCK_LOTS_CONTROLE: LotControle[] = [
  {
    id: '1',
    codeLot: 'LOT-MP-2025-0031',
    flux: 'Reception',
    typeArticle: 'MP',
    article: "Fleurs d'Hibiscus",
    origine: 'Coopérative de Thiès',
    dateEntree: '2025-05-22',
    quantite: 50,
    unite: 'kg',
    statut: 'EnControle',
  },
  {
    id: '2',
    codeLot: 'LOT-MP-2025-0032',
    flux: 'Reception',
    typeArticle: 'MP',
    article: 'Sucre raffiné',
    origine: 'Sucrivoire SA',
    dateEntree: '2025-05-22',
    quantite: 200,
    unite: 'kg',
    statut: 'EnControle',
  },
  {
    id: '3',
    codeLot: 'LOT-AC-2025-0018',
    flux: 'Reception',
    typeArticle: 'AC',
    article: 'Bouteilles 1L PET',
    origine: 'PlastiSénégal',
    dateEntree: '2025-05-23',
    quantite: 500,
    unite: 'u',
    statut: 'EnControle',
  },
  {
    id: '4',
    codeLot: 'LOT-PF-2025-0041',
    flux: 'Production',
    typeArticle: 'PF',
    article: 'Bissap Pourpre Original 1L',
    origine: 'OF-2025-041',
    dateEntree: '2025-05-24',
    quantite: 240,
    unite: 'btl',
    statut: 'EnControle',
  },
  {
    id: '5',
    codeLot: 'LOT-PF-2025-0042',
    flux: 'Production',
    typeArticle: 'PF',
    article: 'Bissap Pourpre Vanille 1L',
    origine: 'OF-2025-042',
    dateEntree: '2025-05-23',
    quantite: 120,
    unite: 'btl',
    statut: 'Libere',
  },
  {
    id: '6',
    codeLot: 'LOT-MP-2025-0029',
    flux: 'Reception',
    typeArticle: 'MP',
    article: 'Gingembre frais',
    origine: 'AgriLocal Mali',
    dateEntree: '2025-05-21',
    quantite: 25,
    unite: 'kg',
    statut: 'NonConforme',
  },
  {
    id: '7',
    codeLot: 'LOT-MP-2025-0030',
    flux: 'Reception',
    typeArticle: 'MP',
    article: 'Sucre de canne',
    origine: 'Coopérative Bamako',
    dateEntree: '2025-05-20',
    quantite: 150,
    unite: 'kg',
    statut: 'Libere',
  },
]

export const MOCK_NON_CONFORMITES: NonConformite[] = [
  {
    id: '1',
    numero: 'NC-2025-001',
    codeLot: 'LOT-MP-2025-0029',
    article: 'Gingembre frais',
    typeArticle: 'MP',
    flux: 'Reception',
    origine: 'AgriLocal Mali',
    cause: "Taux d'humidité hors norme (>15% — mesuré à 19.2%)",
    date: '2025-05-21',
    statut: 'Ouvert',
    actionCorrective: null,
    dateAction: null,
    responsable: 'Fatou Diallo',
  },
  {
    id: '2',
    numero: 'NC-2025-002',
    codeLot: 'LOT-PF-2025-0039',
    article: 'Bissap Pourpre Original 1L',
    typeArticle: 'PF',
    flux: 'Production',
    origine: 'OF-2025-039',
    cause: 'pH hors tolérance (mesuré 3.9 — limite 3.8)',
    date: '2025-05-18',
    statut: 'Clos',
    actionCorrective: 'Rebut',
    dateAction: '2025-05-20',
    responsable: 'Moussa Koné',
  },
  {
    id: '3',
    numero: 'NC-2025-003',
    codeLot: 'LOT-AC-2025-0015',
    article: 'Bouteilles 1L PET',
    typeArticle: 'AC',
    flux: 'Reception',
    origine: 'PlastiSénégal',
    cause: 'Déformation col constatée à la mise en ligne (80 unités affectées)',
    date: '2025-05-19',
    statut: 'EnCours',
    actionCorrective: 'Retravail',
    dateAction: '2025-05-21',
    responsable: 'Aminata Sow',
  },
  {
    id: '4',
    numero: 'NC-2025-004',
    codeLot: 'LOT-MP-2025-0027',
    article: 'Eau purifiée',
    typeArticle: 'MP',
    flux: 'Reception',
    origine: 'Forage interne',
    cause: 'Présence de chlorures résiduels (>0.5 mg/L)',
    date: '2025-05-15',
    statut: 'Clos',
    actionCorrective: 'Derogation',
    dateAction: '2025-05-17',
    responsable: 'Ousmane Ba',
  },
]

export const MOCK_GENEALOGIE: GenealogiePF[] = [
  {
    codeLotPF: 'LOT-PF-2025-0041',
    articlePF: 'Bissap Pourpre Original 1L',
    numeroOF: 'OF-2025-041',
    dateProduction: '2025-05-24',
    quantiteProduite: 240,
    unite: 'btl',
    statut: 'EnControle',
    ingredients: [
      { codeLot: 'LOT-MP-2025-0031', article: "Fleurs d'Hibiscus",       typeArticle: 'MP', qteUtilisee: 6,   unite: 'kg', fournisseur: 'Coopérative de Thiès', dateReception: '2025-05-22', statut: 'EnControle' },
      { codeLot: 'LOT-MP-2025-0028', article: 'Sucre raffiné',           typeArticle: 'MP', qteUtilisee: 9.6, unite: 'kg', fournisseur: 'Sucrivoire SA',         dateReception: '2025-05-10', statut: 'Libere'     },
      { codeLot: 'LOT-MP-2025-0025', article: 'Eau purifiée',            typeArticle: 'MP', qteUtilisee: 240, unite: 'L',  fournisseur: 'Forage interne',         dateReception: '2025-05-24', statut: 'Libere'     },
      { codeLot: 'LOT-AC-2025-0018', article: 'Bouteilles 1L PET',       typeArticle: 'AC', qteUtilisee: 240, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2025-05-23', statut: 'EnControle' },
      { codeLot: 'LOT-AC-2025-0016', article: 'Bouchons vissants',       typeArticle: 'AC', qteUtilisee: 240, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2025-05-15', statut: 'Libere'     },
      { codeLot: 'LOT-AC-2025-0017', article: 'Étiquettes autocollantes',typeArticle: 'AC', qteUtilisee: 240, unite: 'u',  fournisseur: 'ImpriPrint Dakar',       dateReception: '2025-05-18', statut: 'Libere'     },
    ],
    ccps: [
      { nom: 'Pasteurisation', valeur: '82°C / 25s', spec: '≥ 82°C / ≥ 20s', conforme: true  },
      { nom: 'pH final',       valeur: '4.7',         spec: '3.5 – 4.5',       conforme: false },
      { nom: 'Brix',           valeur: '12.5°Bx',     spec: '11 – 13°Bx',      conforme: true  },
    ],
    destinations: [
      { destination: 'Super Marché Hayat', dateLivraison: '2025-05-28', quantite: 120, unite: 'btl' },
      { destination: 'Boulangerie Étoile', dateLivraison: '2025-05-28', quantite:  60, unite: 'btl' },
      { destination: 'Stock disponible',   dateLivraison: null,          quantite:  60, unite: 'btl' },
    ],
  },
  {
    codeLotPF: 'LOT-PF-2025-0042',
    articlePF: 'Bissap Pourpre Vanille 1L',
    numeroOF: 'OF-2025-042',
    dateProduction: '2025-05-23',
    quantiteProduite: 120,
    unite: 'btl',
    statut: 'Libere',
    ingredients: [
      { codeLot: 'LOT-MP-2025-0031', article: "Fleurs d'Hibiscus", typeArticle: 'MP', qteUtilisee: 3,   unite: 'kg', fournisseur: 'Coopérative de Thiès', dateReception: '2025-05-22', statut: 'EnControle' },
      { codeLot: 'LOT-MP-2025-0032', article: 'Sucre raffiné',     typeArticle: 'MP', qteUtilisee: 4.8, unite: 'kg', fournisseur: 'Sucrivoire SA',         dateReception: '2025-05-22', statut: 'EnControle' },
      { codeLot: 'LOT-MP-2025-0025', article: 'Eau purifiée',      typeArticle: 'MP', qteUtilisee: 120, unite: 'L',  fournisseur: 'Forage interne',         dateReception: '2025-05-23', statut: 'Libere'     },
      { codeLot: 'LOT-AC-2025-0018', article: 'Bouteilles 1L PET', typeArticle: 'AC', qteUtilisee: 120, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2025-05-23', statut: 'EnControle' },
      { codeLot: 'LOT-AC-2025-0016', article: 'Bouchons vissants', typeArticle: 'AC', qteUtilisee: 120, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2025-05-15', statut: 'Libere'     },
    ],
    ccps: [
      { nom: 'Pasteurisation', valeur: '84°C / 22s', spec: '≥ 82°C / ≥ 20s', conforme: true },
      { nom: 'pH final',       valeur: '3.8',         spec: '3.5 – 4.5',       conforme: true },
      { nom: 'Brix',           valeur: '12.2°Bx',     spec: '11 – 13°Bx',      conforme: true },
    ],
    destinations: [
      { destination: 'Épicerie Centrale Abidjan', dateLivraison: '2025-05-25', quantite: 60, unite: 'btl' },
      { destination: 'Hôtel Teranga',             dateLivraison: '2025-05-26', quantite: 48, unite: 'btl' },
      { destination: 'Stock disponible',          dateLivraison: null,          quantite: 12, unite: 'btl' },
    ],
  },
]
