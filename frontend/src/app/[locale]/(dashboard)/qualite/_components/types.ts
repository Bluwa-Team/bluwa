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
// ── Types de tests qualité (retour INH Lomé 04/06/2026) ──────────────────────

export type TypeAnalyse = 'PHYSIQUE' | 'PHYSICO_CHIMIQUE' | 'CHIMIQUE' | 'MICROBIOLOGIQUE'

export const TYPE_ANALYSE_LABELS: Record<TypeAnalyse, string> = {
  PHYSIQUE:        'Physique',
  PHYSICO_CHIMIQUE:'Physico-chimique',
  CHIMIQUE:        'Chimique',
  MICROBIOLOGIQUE: 'Microbiologique',
}

export const TYPE_ANALYSE_COLORS: Record<TypeAnalyse, string> = {
  PHYSIQUE:        'bg-slate-100 text-slate-700 border border-slate-200',
  PHYSICO_CHIMIQUE:'bg-blue-100 text-blue-700 border border-blue-200',
  CHIMIQUE:        'bg-orange-100 text-orange-700 border border-orange-200',
  MICROBIOLOGIQUE: 'bg-purple-100 text-purple-700 border border-purple-200',
}

/**
 * Statut microbiologique — conditionne la mise sur marché.
 * PENDING = résultats labo non encore disponibles (délai 3-7 jours)
 * Un lot avec microbioStatus = PENDING ne peut PAS être vendu.
 */
export type MicrobioStatus = 'PENDING' | 'CONFORME' | 'NON_CONFORME'

export const MICROBIO_LABELS: Record<MicrobioStatus, string> = {
  PENDING:       'Microbio en attente',
  CONFORME:      'Microbio conforme',
  NON_CONFORME:  'Microbio non-conforme',
}

export const MICROBIO_COLORS: Record<MicrobioStatus, string> = {
  PENDING:       'bg-purple-100 text-purple-700 border border-purple-200',
  CONFORME:      'bg-emerald-100 text-emerald-700 border border-emerald-200',
  NON_CONFORME:  'bg-red-600 text-white border border-red-700',
}

export interface ResultatsMicrobiologiques {
  salmonella?:    'absent' | 'présent'   // norme : absent/25g
  ecoli?:         number                  // UFC/g — norme : < 10
  listeria?:      'absent' | 'présent'   // norme : absent/25g
  levures?:       number                  // UFC/g — norme : < 100
  flore_totale?:  number                  // UFC/g ou mL
  laboratoire?:   string
  datePrelevement?: string
  dateResultats?:   string
}

export interface LaboratoryResults {
  ph?:            number   // pH mesuré (0–14)
  brix_degree?:   number   // Brix (°Bx)
  temperature_c?: number   // Température (°C)
  humidity_pct?:  number   // Humidité (%)
  // Corps étrangers & physique
  corps_etrangers?: boolean
  aspect_visuel?:   'conforme' | 'non_conforme'
}

/**
 * Statut d'un lot d'inspection.
 * Deux niveaux de libération (retour INH Lomé) :
 *   - Libéré Usage Interne : physico-chimique OK, microbio en attente → utilisable en production
 *   - Libéré Marché        : TOUS les tests OK → peut être vendu
 */
export type StatutInspectionLot =
  | 'En contrôle'
  | 'Libéré — Usage interne'
  | 'Libéré — Marché'
  | 'Rejeté'

export const STATUT_INSPECTION_LABELS: Record<StatutInspectionLot, string> = {
  'En contrôle':          'En contrôle',
  'Libéré — Usage interne':'Usage interne',
  'Libéré — Marché':      'Libéré marché',
  'Rejeté':               'Rejeté',
}

export const STATUT_INSPECTION_COLORS: Record<StatutInspectionLot, string> = {
  'En contrôle':           'bg-amber-100 text-amber-700 border border-amber-200',
  'Libéré — Usage interne':'bg-blue-100 text-blue-700 border border-blue-200',
  'Libéré — Marché':       'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'Rejeté':                'bg-red-100 text-red-700 border border-red-200',
}

/**
 * Lot d'inspection qualité — aligné sur quality_inspection_lots (migration 007).
 * Enrichi avec types d'analyse et statut microbiologique (retour INH Lomé 04/06/2026).
 */
export interface QualityInspectionLot {
  id:                  string
  organizationId:      string
  factoryId:           string
  goodsReceiptItemId:  string | null
  articleId:           string
  articleCode:         string
  articleDesignation:  string
  articleType:         ArticleType
  batchNumber:         string
  sampleQuantity:      number | null
  status:              StatutInspectionLot
  laboratoryResults:   LaboratoryResults | null
  microbioStatus:      MicrobioStatus | null    // null = microbio non requis pour cet article
  microbioDelaiJours:  number | null             // jours avant retour résultats
  microbioResultats:   ResultatsMicrobiologiques | null
  typesAnalyse:        TypeAnalyse[]             // types de tests requis pour cet article
  decisionBy:          string | null
  decisionComments:    string | null
  decisionAt:          string | null
  createdAt:           string
  // Champs enrichis UI
  origine:             string
  flux:                'Reception' | 'Production'
  quantite:            number
  unite:               string
}

/** Un lot peut être vendu seulement si statut = 'Libéré — Marché' */
export function peutEtreVendu(lot: QualityInspectionLot): boolean {
  return lot.status === 'Libéré — Marché'
}

export const MOCK_QUALITY_INSPECTION_LOTS: QualityInspectionLot[] = [
  {
    id: 'qil-001', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-031', articleId: 'a-hib',
    articleCode: 'MP-0001', articleDesignation: "Fleurs d'Hibiscus",
    articleType: 'MP', batchNumber: 'MP-20260522-0031',
    sampleQuantity: 5, status: 'En contrôle',
    typesAnalyse: ['PHYSIQUE', 'PHYSICO_CHIMIQUE', 'MICROBIOLOGIQUE'],
    laboratoryResults: null,
    microbioStatus: 'PENDING', microbioDelaiJours: 5,
    microbioResultats: { laboratoire: 'Labo INH Lomé', datePrelevement: '2026-05-22' },
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-22T08:00:00Z',
    origine: 'Coopérative de Thiès', flux: 'Reception', quantite: 50, unite: 'kg',
  },
  {
    id: 'qil-002', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-032', articleId: 'a-suc',
    articleCode: 'MP-0002', articleDesignation: 'Sucre cristallisé',
    articleType: 'MP', batchNumber: 'MP-20260522-0032',
    sampleQuantity: 10, status: 'En contrôle',
    typesAnalyse: ['PHYSICO_CHIMIQUE'],
    laboratoryResults: null,
    microbioStatus: null, microbioDelaiJours: null, microbioResultats: null,
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-22T09:30:00Z',
    origine: 'Sucrivoire SA', flux: 'Reception', quantite: 200, unite: 'kg',
  },
  {
    id: 'qil-003', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-018', articleId: 'a-btl',
    articleCode: 'AC-0001', articleDesignation: 'Bouteille verre 1L',
    articleType: 'AC', batchNumber: 'AC-20260523-0018',
    sampleQuantity: 20, status: 'En contrôle',
    typesAnalyse: ['PHYSIQUE'],
    laboratoryResults: null,
    microbioStatus: null, microbioDelaiJours: null, microbioResultats: null,
    decisionBy: null, decisionComments: null, decisionAt: null,
    createdAt: '2026-05-23T10:00:00Z',
    origine: 'PlastiSénégal', flux: 'Reception', quantite: 500, unite: 'u',
  },
  {
    id: 'qil-004', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: null, articleId: 'a-pf1',
    articleCode: 'PF-BIS-001', articleDesignation: 'Bissap Pourpre Original 1L',
    articleType: 'PF', batchNumber: 'PF-20260524-0041',
    sampleQuantity: null, status: 'Libéré — Usage interne',
    typesAnalyse: ['PHYSICO_CHIMIQUE', 'MICROBIOLOGIQUE'],
    laboratoryResults: { ph: 3.6, brix_degree: 11.8, temperature_c: 8 },
    microbioStatus: 'PENDING', microbioDelaiJours: 3,
    microbioResultats: { laboratoire: 'Labo INH Lomé', datePrelevement: '2026-05-24', dateResultats: '2026-05-27' },
    decisionBy: 'Fatou Diallo', decisionComments: 'Physico-chimique conforme. Microbio envoyé au labo INH — résultats attendus le 27/05.',
    decisionAt: '2026-05-24T16:00:00Z',
    createdAt: '2026-05-24T14:00:00Z',
    origine: 'OF-2026-041', flux: 'Production', quantite: 200, unite: 'btl',
  },
  {
    id: 'qil-005', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: null, articleId: 'a-pf2',
    articleCode: 'PF-BIS-002', articleDesignation: 'Bissap Pourpre Vanille 1L',
    articleType: 'PF', batchNumber: 'PF-20260524-0042',
    sampleQuantity: null, status: 'Libéré — Marché',
    typesAnalyse: ['PHYSICO_CHIMIQUE', 'MICROBIOLOGIQUE'],
    laboratoryResults: { ph: 3.7, brix_degree: 12.2, temperature_c: 9 },
    microbioStatus: 'CONFORME',
    microbioDelaiJours: null,
    microbioResultats: {
      salmonella: 'absent', listeria: 'absent',
      ecoli: 0, levures: 12, flore_totale: 8,
      laboratoire: 'Labo INH Lomé',
      datePrelevement: '2026-05-23', dateResultats: '2026-05-26',
    },
    decisionBy: 'Aminata Sow', decisionComments: 'Tous tests conformes — pH 3.7, Brix 12.2. Microbio : Salmonella absent, Listeria absent, E. coli 0, levures 12 UFC/g.',
    decisionAt: '2026-05-26T10:00:00Z',
    createdAt: '2026-05-23T14:00:00Z',
    origine: 'OF-2026-042', flux: 'Production', quantite: 150, unite: 'btl',
  },
  {
    id: 'qil-006', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-029', articleId: 'a-gin',
    articleCode: 'MP-0011', articleDesignation: 'Gingembre frais',
    articleType: 'MP', batchNumber: 'MP-20260520-0029',
    sampleQuantity: 3, status: 'Rejeté',
    typesAnalyse: ['PHYSIQUE', 'PHYSICO_CHIMIQUE', 'MICROBIOLOGIQUE'],
    laboratoryResults: { humidity_pct: 19.2 },
    microbioStatus: 'PENDING', microbioDelaiJours: null,
    microbioResultats: null,
    decisionBy: 'Fatou Diallo', decisionComments: "Humidité 19.2% — limite 15%. Lot rejeté sans attendre microbio.",
    decisionAt: '2026-05-21T11:00:00Z',
    createdAt: '2026-05-21T08:00:00Z',
    origine: 'AgriLocal Mali', flux: 'Reception', quantite: 25, unite: 'kg',
  },
  {
    id: 'qil-007', organizationId: 'org-1', factoryId: 'fac-1',
    goodsReceiptItemId: 'gri-041', articleId: 'a-suc2',
    articleCode: 'MP-0003', articleDesignation: 'Sucre de canne',
    articleType: 'MP', batchNumber: 'MP-20260521-0030',
    sampleQuantity: 5, status: 'Libéré — Marché',
    typesAnalyse: ['PHYSICO_CHIMIQUE'],
    laboratoryResults: { humidity_pct: 0.8, brix_degree: 99.2 },
    microbioStatus: null, microbioDelaiJours: null, microbioResultats: null,
    decisionBy: 'Moussa Koné', decisionComments: 'Conformité vérifiée — humidité 0.8%, Brix 99.2%. Microbio non requis pour sucre raffiné.',
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
    articleType: 'MP', batchNumber: 'MP-20260520-0029',
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
    articleType: 'AC', batchNumber: 'AC-20260515-0015',
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
    articleType: 'MP', batchNumber: 'MP-20260518-0027',
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
    articleType: 'MP', batchNumber: 'MP-20260516-0025',
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

export interface QcResultats {
  ph?:          number
  brix?:        number
  humidite?:    number
  temperature?: number
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
  // Données qualité à la réception
  qcResultats?:    QcResultats | null
  qcDecisionPar?:  string | null
  qcDecisionAt?:   string | null
  qcCommentaires?: string | null
  ncNumero?:       string | null   // si une NC a été ouverte sur ce lot
}

export interface ControleProduction {
  parametre: string
  valeur: string
  limite: string
  ok: boolean
  pcc?: string   // ex: "PCC 2"
}

export interface DestinationAval {
  destination: string
  dateLivraison: string | null
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
  controlesProduction?: ControleProduction[]
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
    id: '1', codeLot: 'MP-20260522-0031', flux: 'Reception', typeArticle: 'MP',
    article: "Fleurs d'Hibiscus", origine: 'Coopérative de Thiès',
    dateEntree: '2026-05-22', quantite: 50, unite: 'kg', statut: 'EnControle',
  },
  {
    id: '2', codeLot: 'MP-20260522-0032', flux: 'Reception', typeArticle: 'MP',
    article: 'Sucre raffiné', origine: 'Sucrivoire SA',
    dateEntree: '2026-05-22', quantite: 200, unite: 'kg', statut: 'EnControle',
  },
  {
    id: '5', codeLot: 'PF-20260524-0042', flux: 'Production', typeArticle: 'PF',
    article: 'Bissap Pourpre Vanille 1L', origine: 'OF-2026-042',
    dateEntree: '2026-05-23', quantite: 120, unite: 'btl', statut: 'Libere',
  },
  {
    id: '6', codeLot: 'MP-20260520-0029', flux: 'Reception', typeArticle: 'MP',
    article: 'Gingembre frais', origine: 'AgriLocal Mali',
    dateEntree: '2026-05-21', quantite: 25, unite: 'kg', statut: 'NonConforme',
  },
]

export const MOCK_NON_CONFORMITES: NonConformite[] = [
  {
    id: '1', numero: 'NC-2026-001', codeLot: 'MP-20260520-0029',
    article: 'Gingembre frais', typeArticle: 'MP', flux: 'Reception',
    origine: 'AgriLocal Mali', cause: "Taux d'humidité hors norme (>15 % — mesuré à 19.2 %)",
    date: '2026-05-21', statut: 'Ouvert', actionCorrective: null, dateAction: null,
    responsable: 'Fatou Diallo',
  },
  {
    id: '2', numero: 'NC-2026-002', codeLot: 'AC-20260515-0015',
    article: 'Bouteilles 1L PET', typeArticle: 'AC', flux: 'Reception',
    origine: 'PlastiSénégal', cause: 'Déformation col constatée à la mise en ligne (80 unités)',
    date: '2026-05-19', statut: 'Clos', actionCorrective: 'Rebut', dateAction: '2026-05-21',
    responsable: 'Aminata Sow',
  },
]

export const MOCK_GENEALOGIE: GenealogiePF[] = [
  {
    codeLotPF: 'PF-20260524-0041',
    articlePF: 'Bissap Pourpre Original 1L',
    numeroOF: 'OF-2026-041',
    dateProduction: '2026-05-24',
    quantiteProduite: 240,
    unite: 'btl',
    statut: 'EnControle',
    controlesProduction: [
      { parametre: 'Température pasteurisation', valeur: '87 °C',  limite: '≥ 85 °C',   ok: true,  pcc: 'PCC 2' },
      { parametre: 'Durée pasteurisation',        valeur: '18 s',   limite: '≥ 15 s',    ok: true,  pcc: 'PCC 2' },
      { parametre: 'pH à l\'embouteillage',       valeur: '3.6',    limite: '3.2 – 4.0', ok: true              },
      { parametre: 'Brix à l\'embouteillage',     valeur: '11.8',   limite: '10 – 13',   ok: true              },
      { parametre: 'Température conditionnement', valeur: '8 °C',   limite: '≤ 10 °C',   ok: true,  pcc: 'PCC 3' },
      { parametre: 'Détection corps étrangers',   valeur: 'OK',     limite: '0 éjection', ok: true, pcc: 'PCC 4' },
    ],
    ingredients: [
      {
        codeLot: 'MP-20260522-0031', article: "Fleurs d'Hibiscus", typeArticle: 'MP',
        qteUtilisee: 6, unite: 'kg', fournisseur: 'Coopérative de Thiès', dateReception: '2026-05-22',
        statut: 'EnControle',
        qcResultats: null, qcDecisionPar: null, qcDecisionAt: null,
        qcCommentaires: 'Analyse en cours — résultats pH et humidité attendus',
      },
      {
        codeLot: 'MP-20260510-0028', article: 'Sucre raffiné', typeArticle: 'MP',
        qteUtilisee: 9.6, unite: 'kg', fournisseur: 'Sucrivoire SA', dateReception: '2026-05-10',
        statut: 'Libere',
        qcResultats: { humidite: 0.8, brix: 99.2 },
        qcDecisionPar: 'Moussa Koné', qcDecisionAt: '2026-05-10T15:00:00Z',
        qcCommentaires: 'Conformité vérifiée — humidité et Brix OK',
      },
      {
        codeLot: 'MP-20260516-0025', article: 'Eau purifiée', typeArticle: 'MP',
        qteUtilisee: 240, unite: 'L', fournisseur: 'Forage interne', dateReception: '2026-05-24',
        statut: 'Libere',
        qcResultats: { ph: 7.1, temperature: 22 },
        qcDecisionPar: 'Aminata Sow', qcDecisionAt: '2026-05-24T07:30:00Z',
        qcCommentaires: 'pH et turbidité conformes — eau potable certifiée',
      },
      {
        codeLot: 'AC-20260523-0018', article: 'Bouteilles 1L PET', typeArticle: 'AC',
        qteUtilisee: 240, unite: 'u', fournisseur: 'PlastiSénégal', dateReception: '2026-05-23',
        statut: 'EnControle',
        qcResultats: null, qcDecisionPar: null, qcDecisionAt: null,
        qcCommentaires: 'Contrôle visuel en cours — 20 unités sur 500 inspectées',
      },
      {
        codeLot: 'AC-20260515-0016', article: 'Bouchons vissants', typeArticle: 'AC',
        qteUtilisee: 240, unite: 'u', fournisseur: 'PlastiSénégal', dateReception: '2026-05-15',
        statut: 'Libere',
        qcResultats: null,
        qcDecisionPar: 'Fatou Diallo', qcDecisionAt: '2026-05-15T10:00:00Z',
        qcCommentaires: 'Contrôle visuel OK — étanchéité testée sur 30 unités',
      },
      {
        codeLot: 'AC-20260518-0017', article: 'Etiquettes autocollantes', typeArticle: 'AC',
        qteUtilisee: 240, unite: 'u', fournisseur: 'ImpriPrint Dakar', dateReception: '2026-05-18',
        statut: 'Libere',
        qcResultats: null,
        qcDecisionPar: 'Fatou Diallo', qcDecisionAt: '2026-05-18T09:00:00Z',
        qcCommentaires: 'Conformité mentions obligatoires vérifiée — DLC, allergènes, N° lot',
      },
    ],
    destinations: [
      { destination: 'Super Marché Hayat', dateLivraison: '2026-05-28', quantite: 120, unite: 'btl' },
      { destination: 'Boulangerie Etoile', dateLivraison: '2026-05-28', quantite:  60, unite: 'btl' },
      { destination: 'Stock disponible',   dateLivraison: null,          quantite:  60, unite: 'btl' },
    ],
  },
  {
    codeLotPF: 'PF-20260524-0042',
    articlePF: 'Bissap Pourpre Vanille 1L',
    numeroOF: 'OF-2026-042',
    dateProduction: '2026-05-23',
    quantiteProduite: 120,
    unite: 'btl',
    statut: 'Libere',
    controlesProduction: [
      { parametre: 'Température pasteurisation', valeur: '86 °C',  limite: '≥ 85 °C',    ok: true,  pcc: 'PCC 2' },
      { parametre: 'Durée pasteurisation',        valeur: '16 s',   limite: '≥ 15 s',     ok: true,  pcc: 'PCC 2' },
      { parametre: 'pH à l\'embouteillage',       valeur: '3.7',    limite: '3.2 – 4.0',  ok: true              },
      { parametre: 'Brix à l\'embouteillage',     valeur: '12.2',   limite: '10 – 13',    ok: true              },
      { parametre: 'Température conditionnement', valeur: '9 °C',   limite: '≤ 10 °C',    ok: true,  pcc: 'PCC 3' },
      { parametre: 'Détection corps étrangers',   valeur: 'OK',     limite: '0 éjection', ok: true,  pcc: 'PCC 4' },
    ],
    ingredients: [
      {
        codeLot: 'MP-20260522-0031', article: "Fleurs d'Hibiscus", typeArticle: 'MP',
        qteUtilisee: 3, unite: 'kg', fournisseur: 'Coopérative de Thiès', dateReception: '2026-05-22',
        statut: 'EnControle',
        qcResultats: null, qcDecisionPar: null, qcDecisionAt: null,
        qcCommentaires: 'Analyse microbiologique en cours',
      },
      {
        codeLot: 'MP-20260522-0032', article: 'Sucre raffiné', typeArticle: 'MP',
        qteUtilisee: 4.8, unite: 'kg', fournisseur: 'Sucrivoire SA', dateReception: '2026-05-22',
        statut: 'EnControle',
        qcResultats: null, qcDecisionPar: null, qcDecisionAt: null,
        qcCommentaires: 'Certificat fournisseur reçu — analyse interne en attente',
      },
      {
        codeLot: 'MP-20260516-0025', article: 'Eau purifiée', typeArticle: 'MP',
        qteUtilisee: 120, unite: 'L', fournisseur: 'Forage interne', dateReception: '2026-05-23',
        statut: 'Libere',
        qcResultats: { ph: 7.0, temperature: 21 },
        qcDecisionPar: 'Aminata Sow', qcDecisionAt: '2026-05-23T07:00:00Z',
        qcCommentaires: 'Eau conforme — pH et turbidité OK',
      },
      {
        codeLot: 'AC-20260523-0018', article: 'Bouteilles 1L PET', typeArticle: 'AC',
        qteUtilisee: 120, unite: 'u', fournisseur: 'PlastiSénégal', dateReception: '2026-05-23',
        statut: 'EnControle',
        qcResultats: null, qcDecisionPar: null, qcDecisionAt: null,
        qcCommentaires: 'Contrôle en cours',
      },
      {
        codeLot: 'AC-20260515-0016', article: 'Bouchons vissants', typeArticle: 'AC',
        qteUtilisee: 120, unite: 'u', fournisseur: 'PlastiSénégal', dateReception: '2026-05-15',
        statut: 'Libere',
        qcResultats: null,
        qcDecisionPar: 'Fatou Diallo', qcDecisionAt: '2026-05-15T10:00:00Z',
        qcCommentaires: 'Contrôle visuel OK — étanchéité testée sur 30 unités',
      },
    ],
    destinations: [
      { destination: 'Epicerie Centrale Abidjan', dateLivraison: '2026-05-25', quantite: 60, unite: 'btl' },
      { destination: 'Hotel Teranga',             dateLivraison: '2026-05-26', quantite: 48, unite: 'btl' },
      { destination: 'Stock disponible',          dateLivraison: null,          quantite: 12, unite: 'btl' },
    ],
  },
]
