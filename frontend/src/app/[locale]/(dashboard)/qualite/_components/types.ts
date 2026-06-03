// StatutLot = StatutQC unifié depuis @/types/erp
// TypeArticleQA = ArticleType unifié depuis @/types/erp
import type { StatutQC, ArticleType } from '@/types/erp'
export type { StatutQC as StatutLot }
export type { ArticleType as TypeArticleQA }

// ══════════════════════════════════════════════════════════════════════════════
// DB-ALIGNED TYPES — quality_inspection_lots (migration 007)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Résultats de laboratoire stockés en JSONB dans quality_inspection_lots.
 * Champs optionnels — seuls les paramètres mesurés sont renseignés.
 */
export interface LaboratoryResults {
  ph?:           number   // pH mesuré (0–14)
  brix_degree?:  number   // Brix (°Bx)
  temperature_c?: number  // Température (°C)
  humidity_pct?: number   // Humidité (%)
}

/**
 * Statut d'un lot d'inspection — aligné sur quality_inspection_lots.status CHECK.
 * Valeurs DB : PENDING → 'En contrôle' | RELEASED → 'Libéré' | REJECTED → 'Rejeté'
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
  id:                  string
  organizationId:      string
  factoryId:           string
  goodsReceiptItemId:  string | null   // lien vers la ligne de réception déclencheuse
  articleId:           string
  articleCode:         string          // enrichi en frontend
  articleDesignation:  string          // enrichi en frontend
  articleType:         ArticleType     // enrichi en frontend
  batchNumber:         string
  sampleQuantity:      number | null   // NULL = 100 % contrôle
  status:              StatutInspectionLot
  laboratoryResults:   LaboratoryResults | null
  decisionBy:          string | null
  decisionComments:    string | null
  decisionAt:          string | null
  createdAt:           string
  // Champs enrichis UI
  origine:             string          // fournisseur ou n° OF
  flux:                'Reception' | 'Production'
  quantite:            number
  unite:               string
}

export const MOCK_QUALITY_INSPECTION_LOTS: QualityInspectionLot[] = [
  {
    id: 'qil-001', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-031', articleId: 'a-hib',
    articleCode: 'MP-0001', articleDesignation: "Fleurs d'Hibiscus",
    articleType: 'MP', batchNumber: 'MP-20260522-31',
    sampleQuantity: 5, status: 'En contrôle',
    laboratoryResults: null,
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-22T08:00:00Z',
    origine: 'Coopérative de Thiès', flux: 'Reception', quantite: 50, unite: 'kg',
  },
  {
    id: 'qil-002', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-032', articleId: 'a-suc',
    articleCode: 'MP-0002', articleDesignation: 'Sucre cristallisé',
    articleType: 'MP', batchNumber: 'MP-20260522-32',
    sampleQuantity: 10, status: 'En contrôle',
    laboratoryResults: null,
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-22T09:30:00Z',
    origine: 'Sucrivoire SA', flux: 'Reception', quantite: 200, unite: 'kg',
  },
  {
    id: 'qil-003', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-018', articleId: 'a-btl',
    articleCode: 'AC-0001', articleDesignation: 'Bouteille verre 1L',
    articleType: 'AC', batchNumber: 'AC-20260523-18',
    sampleQuantity: 20, status: 'En contrôle',
    laboratoryResults: null,
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-23T10:00:00Z',
    origine: 'PlastiSénégal', flux: 'Reception', quantite: 500, unite: 'u',
  },
  {
    id: 'qil-004', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: null, articleId: 'a-pf1',
    articleCode: 'PF-BIS-001', articleDesignation: 'Bissap Pourpre Original 1L',
    articleType: 'PF', batchNumber: 'PF-20260515-41',
    sampleQuantity: null, status: 'En contrôle',
    laboratoryResults: null,
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-24T14:00:00Z',
    origine: 'OF-2026-041', flux: 'Production', quantite: 200, unite: 'btl',
  },
  {
    id: 'qil-005', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: null, articleId: 'a-pf2',
    articleCode: 'PF-BIS-002', articleDesignation: 'Bissap Pourpre Vanille 1L',
    articleType: 'PF', batchNumber: 'PF-20260522-42',
    sampleQuantity: null, status: 'Libéré',
    laboratoryResults: { ph: 3.7, brix_degree: 12.2 },
    decisionBy: 'Aminata Sow', decisionComments: 'Paramètres conformes — pH 3.7, Brix 12.2',
    decisionAt: '2026-05-24T16:30:00Z',
    createdAt: '2026-05-23T14:00:00Z',
    origine: 'OF-2026-042', flux: 'Production', quantite: 150, unite: 'btl',
  },
  {
    id: 'qil-006', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-029', articleId: 'a-gin',
    articleCode: 'MP-0011', articleDesignation: 'Gingembre frais',
    articleType: 'MP', batchNumber: 'MP-20260510-29',
    sampleQuantity: 3, status: 'Rejeté',
    laboratoryResults: { humidity_pct: 19.2 },
    decisionBy: 'Fatou Diallo', decisionComments: "Taux d'humidité hors norme — mesuré 19.2 % (limite 15 %)",
    decisionAt: '2026-05-21T11:00:00Z',
    createdAt: '2026-05-21T08:00:00Z',
    origine: 'AgriLocal Mali', flux: 'Reception', quantite: 25, unite: 'kg',
  },
  {
    id: 'qil-007', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-041', articleId: 'a-suc2',
    articleCode: 'MP-0003', articleDesignation: 'Sucre de canne',
    articleType: 'MP', batchNumber: 'MP-20260512-30',
    sampleQuantity: 5, status: 'Libéré',
    laboratoryResults: { humidity_pct: 0.8, brix_degree: 99.2 },
    decisionBy: 'Moussa Koné', decisionComments: 'Conformité vérifiée — humidité et Brix OK',
    decisionAt: '2026-05-20T15:00:00Z',
    createdAt: '2026-05-20T08:00:00Z',
    origine: 'Coopérative Bamako', flux: 'Reception', quantite: 150, unite: 'kg',
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// DB-ALIGNED TYPES — quality_non_conformities (migration 007)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Type de défaut — aligné sur quality_non_conformities.defect_type CHECK.
 */
export type DefectType =
  | 'HUMIDITY_TOO_HIGH'
  | 'FOREIGN_BODY'
  | 'DAMAGED_PACKAGING'
  | 'EXPIRED'

/**
 * Action de disposition — alignée sur quality_non_conformities.disposition_action CHECK.
 */
export type DispositionAction =
  | 'UNDER_REVIEW'
  | 'RETURN_TO_SUPPLIER'
  | 'DESTROYED'
  | 'ACCEPTED_WITH_DISCOUNT'

/**
 * Statut d'une non-conformité — aligné sur quality_non_conformities.status CHECK.
 * Valeurs DB : OPEN | IN_PROGRESS | CLOSED
 */
export type StatutQualiteNC = 'OPEN' | 'IN_PROGRESS' | 'CLOSED'

/**
 * Non-conformité qualité — alignée sur quality_non_conformities (migration 007).
 */
export interface QualityNonConformite {
  id:                      string
  ncNumber:                string           // format NC-TOG-2026-XXXX
  qualityInspectionLotId:  string
  organizationId:          string
  factoryId:               string
  articleId:               string
  articleDesignation:      string           // enrichi en frontend
  articleType:             ArticleType      // enrichi en frontend
  batchNumber:             string
  flux:                    FluxLot
  origine:                 string
  defectType:              DefectType
  description:             string
  status:                  StatutQualiteNC
  dispositionAction:       DispositionAction
  financialClaimXof:       number | null
  evidenceUrls:            string[]
  reportedBy:              string           // nom display (UUID en DB)
  resolvedBy:              string | null
  resolutionNotes:         string | null
  resolvedAt:              string | null
  createdAt:               string
}

export const DEFECT_TYPE_LABELS: Record<DefectType, string> = {
  HUMIDITY_TOO_HIGH:  "Humidité excessive",
  FOREIGN_BODY:       "Corps étranger",
  DAMAGED_PACKAGING:  "Emballage endommagé",
  EXPIRED:            "Produit périmé",
}

export const DISPOSITION_ACTION_LABELS: Record<DispositionAction, string> = {
  UNDER_REVIEW:           "En attente",
  RETURN_TO_SUPPLIER:     "Retour fournisseur",
  DESTROYED:              "Rebut / Destruction",
  ACCEPTED_WITH_DISCOUNT: "Dérogation",
}

export const STATUT_QC_NC_LABELS: Record<StatutQualiteNC, string> = {
  OPEN:        'Ouvert',
  IN_PROGRESS: 'En cours',
  CLOSED:      'Clos',
}

export const STATUT_QC_NC_COLORS: Record<StatutQualiteNC, string> = {
  OPEN:        'bg-red-100 text-red-700 border border-red-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border border-amber-200',
  CLOSED:      'bg-slate-100 text-slate-600 border border-slate-200',
}

export const DISPOSITION_ACTION_COLORS: Record<DispositionAction, string> = {
  UNDER_REVIEW:           'bg-slate-50 border-slate-300 text-slate-600',
  RETURN_TO_SUPPLIER:     'bg-amber-50 border-amber-300 text-amber-700',
  DESTROYED:              'bg-red-50 border-red-300 text-red-700',
  ACCEPTED_WITH_DISCOUNT: 'bg-blue-50 border-blue-300 text-blue-700',
}

export const MOCK_QUALITY_NON_CONFORMITES: QualityNonConformite[] = [
  {
    id: 'qnc-001',
    ncNumber: 'NC-TOG-2026-0001',
    qualityInspectionLotId: 'qil-006',
    organizationId: 'org-1', factoryId: 'fac-1',
    articleId: 'a-gin', articleDesignation: 'Gingembre frais',
    articleType: 'MP', batchNumber: 'MP-20260510-29',
    flux: 'Reception', origine: 'AgriLocal Mali',
    defectType: 'HUMIDITY_TOO_HIGH',
    description: "Taux d'humidité mesuré à 19.2 % — limite maximale 15 %. Lot non conforme.",
    status: 'OPEN',
    dispositionAction: 'UNDER_REVIEW',
    financialClaimXof: null,
    evidenceUrls: [],
    reportedBy: 'Fatou Diallo',
    resolvedBy: null, resolutionNotes: null, resolvedAt: null,
    createdAt: '2026-05-21T11:00:00Z',
  },
  {
    id: 'qnc-002',
    ncNumber: 'NC-TOG-2026-0002',
    qualityInspectionLotId: 'qil-008',
    organizationId: 'org-1', factoryId: 'fac-1',
    articleId: 'a-btl2', articleDesignation: 'Bouteilles 1L PET',
    articleType: 'AC', batchNumber: 'AC-20260515-15',
    flux: 'Reception', origine: 'PlastiSénégal',
    defectType: 'DAMAGED_PACKAGING',
    description: 'Déformation du col constatée à la mise en ligne — 80 unités affectées sur 500.',
    status: 'IN_PROGRESS',
    dispositionAction: 'RETURN_TO_SUPPLIER',
    financialClaimXof: 45000,
    evidenceUrls: [],
    reportedBy: 'Aminata Sow',
    resolvedBy: null, resolutionNotes: null, resolvedAt: null,
    createdAt: '2026-05-19T14:00:00Z',
  },
  {
    id: 'qnc-003',
    ncNumber: 'NC-TOG-2026-0003',
    qualityInspectionLotId: 'qil-009',
    organizationId: 'org-1', factoryId: 'fac-1',
    articleId: 'a-suc', articleDesignation: 'Sucre cristallisé',
    articleType: 'MP', batchNumber: 'MP-20260510-27',
    flux: 'Reception', origine: 'Sucrivoire SA',
    defectType: 'FOREIGN_BODY',
    description: 'Présence de corps étrangers (particules sombres) détectée lors du contrôle visuel du sac.',
    status: 'CLOSED',
    dispositionAction: 'DESTROYED',
    financialClaimXof: 120000,
    evidenceUrls: [],
    reportedBy: 'Moussa Koné',
    resolvedBy: 'Moussa Koné',
    resolutionNotes: 'Lot détruit. Procédure de rebut appliquée. Fournisseur notifié.',
    resolvedAt: '2026-05-17T10:00:00Z',
    createdAt: '2026-05-15T09:00:00Z',
  },
  {
    id: 'qnc-004',
    ncNumber: 'NC-TOG-2026-0004',
    qualityInspectionLotId: 'qil-010',
    organizationId: 'org-1', factoryId: 'fac-1',
    articleId: 'a-eau', articleDesignation: 'Eau purifiée',
    articleType: 'MP', batchNumber: 'MP-20260510-25',
    flux: 'Reception', origine: 'Forage interne',
    defectType: 'EXPIRED',
    description: 'Date de validité dépassée de 3 jours. Lot bloqué préventivement.',
    status: 'CLOSED',
    dispositionAction: 'ACCEPTED_WITH_DISCOUNT',
    financialClaimXof: null,
    evidenceUrls: [],
    reportedBy: 'Ousmane Ba',
    resolvedBy: 'Ousmane Ba',
    resolutionNotes: 'Dérogation accordée par la direction qualité — utilisation immédiate sous contrôle renforcé.',
    resolvedAt: '2026-05-12T16:00:00Z',
    createdAt: '2026-05-10T08:00:00Z',
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// LEGACY TYPES — conservés pour backward compat (genealogie/page.tsx)
// ══════════════════════════════════════════════════════════════════════════════

export type FluxLot = 'Reception' | 'Production'

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

// ── Mock Data (legacy — used by genealogie/page.tsx) ─────────────────────────

export const MOCK_LOTS_CONTROLE: LotControle[] = [
  {
    id: '1', codeLot: 'MP-20260522-31', flux: 'Reception', typeArticle: 'MP',
    article: "Fleurs d'Hibiscus", origine: 'Coopérative de Thiès',
    dateEntree: '2026-05-22', quantite: 50, unite: 'kg', statut: 'EnControle',
  },
  {
    id: '2', codeLot: 'MP-20260522-32', flux: 'Reception', typeArticle: 'MP',
    article: 'Sucre raffiné', origine: 'Sucrivoire SA',
    dateEntree: '2026-05-22', quantite: 200, unite: 'kg', statut: 'EnControle',
  },
  {
    id: '5', codeLot: 'PF-20260522-42', flux: 'Production', typeArticle: 'PF',
    article: 'Bissap Pourpre Vanille 1L', origine: 'OF-2026-042',
    dateEntree: '2026-05-23', quantite: 120, unite: 'btl', statut: 'Libere',
  },
  {
    id: '6', codeLot: 'MP-20260510-29', flux: 'Reception', typeArticle: 'MP',
    article: 'Gingembre frais', origine: 'AgriLocal Mali',
    dateEntree: '2026-05-21', quantite: 25, unite: 'kg', statut: 'NonConforme',
  },
]

export const MOCK_NON_CONFORMITES: NonConformite[] = [
  {
    id: '1', numero: 'NC-2026-001', codeLot: 'MP-20260510-29',
    article: 'Gingembre frais', typeArticle: 'MP', flux: 'Reception',
    origine: 'AgriLocal Mali', cause: "Taux d'humidité hors norme (>15 % — mesuré à 19.2 %)",
    date: '2026-05-21', statut: 'Ouvert', actionCorrective: null, dateAction: null,
    responsable: 'Fatou Diallo',
  },
  {
    id: '2', numero: 'NC-2026-002', codeLot: 'AC-20260515-15',
    article: 'Bouteilles 1L PET', typeArticle: 'AC', flux: 'Reception',
    origine: 'PlastiSénégal', cause: 'Déformation col constatée à la mise en ligne (80 unités)',
    date: '2026-05-19', statut: 'Clos', actionCorrective: 'Rebut', dateAction: '2026-05-21',
    responsable: 'Aminata Sow',
  },
]

export const MOCK_GENEALOGIE: GenealogiePF[] = [
  {
    codeLotPF: 'PF-20260515-41',
    articlePF: 'Bissap Pourpre Original 1L',
    numeroOF: 'OF-2026-041',
    dateProduction: '2026-05-24',
    quantiteProduite: 240,
    unite: 'btl',
    statut: 'EnControle',
    ingredients: [
      { codeLot: 'MP-20260522-31', article: "Fleurs d'Hibiscus",        typeArticle: 'MP', qteUtilisee: 6,   unite: 'kg', fournisseur: 'Coopérative de Thiès', dateReception: '2026-05-22', statut: 'EnControle' },
      { codeLot: 'MP-20260510-28', article: 'Sucre raffiné',            typeArticle: 'MP', qteUtilisee: 9.6, unite: 'kg', fournisseur: 'Sucrivoire SA',         dateReception: '2026-05-10', statut: 'Libere'     },
      { codeLot: 'MP-20260510-25', article: 'Eau purifiée',             typeArticle: 'MP', qteUtilisee: 240, unite: 'L',  fournisseur: 'Forage interne',         dateReception: '2026-05-24', statut: 'Libere'     },
      { codeLot: 'AC-20260523-18', article: 'Bouteilles 1L PET',        typeArticle: 'AC', qteUtilisee: 240, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2026-05-23', statut: 'EnControle' },
      { codeLot: 'AC-20260515-16', article: 'Bouchons vissants',        typeArticle: 'AC', qteUtilisee: 240, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2026-05-15', statut: 'Libere'     },
      { codeLot: 'AC-20260518-17', article: 'Etiquettes autocollantes', typeArticle: 'AC', qteUtilisee: 240, unite: 'u',  fournisseur: 'ImpriPrint Dakar',       dateReception: '2026-05-18', statut: 'Libere'     },
    ],
    destinations: [
      { destination: 'Super Marché Hayat', dateLivraison: '2026-05-28', quantite: 120, unite: 'btl' },
      { destination: 'Boulangerie Etoile', dateLivraison: '2026-05-28', quantite:  60, unite: 'btl' },
      { destination: 'Stock disponible',   dateLivraison: null,          quantite:  60, unite: 'btl' },
    ],
  },
  {
    codeLotPF: 'PF-20260522-42',
    articlePF: 'Bissap Pourpre Vanille 1L',
    numeroOF: 'OF-2026-042',
    dateProduction: '2026-05-23',
    quantiteProduite: 120,
    unite: 'btl',
    statut: 'Libere',
    ingredients: [
      { codeLot: 'MP-20260522-31', article: "Fleurs d'Hibiscus", typeArticle: 'MP', qteUtilisee: 3,   unite: 'kg', fournisseur: 'Coopérative de Thiès', dateReception: '2026-05-22', statut: 'EnControle' },
      { codeLot: 'MP-20260522-32', article: 'Sucre raffiné',     typeArticle: 'MP', qteUtilisee: 4.8, unite: 'kg', fournisseur: 'Sucrivoire SA',         dateReception: '2026-05-22', statut: 'EnControle' },
      { codeLot: 'MP-20260510-25', article: 'Eau purifiée',      typeArticle: 'MP', qteUtilisee: 120, unite: 'L',  fournisseur: 'Forage interne',         dateReception: '2026-05-23', statut: 'Libere'     },
      { codeLot: 'AC-20260523-18', article: 'Bouteilles 1L PET', typeArticle: 'AC', qteUtilisee: 120, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2026-05-23', statut: 'EnControle' },
      { codeLot: 'AC-20260515-16', article: 'Bouchons vissants', typeArticle: 'AC', qteUtilisee: 120, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2026-05-15', statut: 'Libere'     },
    ],
    destinations: [
      { destination: 'Epicerie Centrale Abidjan', dateLivraison: '2026-05-25', quantite: 60, unite: 'btl' },
      { destination: 'Hotel Teranga',             dateLivraison: '2026-05-26', quantite: 48, unite: 'btl' },
      { destination: 'Stock disponible',          dateLivraison: null,          quantite: 12, unite: 'btl' },
    ],
  },
]
