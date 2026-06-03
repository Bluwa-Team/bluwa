// ═══════════════════════════════════════════════════════════════════════════════
// Types ERP partagés — source de vérité unique
// Aligné sur la base de données Supabase (migrations 002–012).
// Tous les modules doivent importer depuis ici plutôt que redéfinir localement.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Articles ──────────────────────────────────────────────────────────────────

/**
 * Types d'articles — aligné sur articles.type CHECK (migration 002).
 * MP  = Matière Première     · appro = 'Achete'
 * PSF = Produit Semi-Fini    · appro = 'Fabrique'
 * PF  = Produit Fini         · appro = 'Fabrique'
 * AC  = Article de Conditionnement · appro = 'Achete'
 * CS  = Consommable          · appro = 'Achete'
 */
export type ArticleType = 'MP' | 'PSF' | 'PF' | 'AC' | 'CS'

export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  MP:  'Matière première',
  PSF: 'Produit semi-fini',
  PF:  'Produit fini',
  AC:  'Art. conditionnement',
  CS:  'Consommable',
}

export const ARTICLE_TYPE_COLORS: Record<ArticleType, string> = {
  MP:  'bg-blue-100 text-blue-700',
  PSF: 'bg-purple-100 text-purple-700',
  PF:  'bg-emerald-100 text-emerald-700',
  AC:  'bg-violet-100 text-violet-700',
  CS:  'bg-gray-100 text-gray-600',
}

// ── Work Centers ─────────────────────────────────────────────────────────────

/**
 * Poste de charge / ligne de production (≡ CR03 SAP).
 * Source : table work_centers (migrations 006 + 008).
 */
export interface WorkCenter {
  id:                   string
  name:                 string
  code:                 string | null
  ratePerHour:          number
  currency:             string
  dailyCapacityHours:   number
  efficiencyPercentage: number
  isActive:             boolean
  createdAt:            string
}

// ── Statut QC des lots ────────────────────────────────────────────────────────

/**
 * Statut QC d'un lot — type unifié, couvre Réception + Stocks + Qualité.
 *
 * Correspondance SAP MM (stock types) :
 *   EnControle  → "Quality inspection" stock
 *   Libere      → "Unrestricted use" stock
 *   Bloque      → "Blocked" stock (en attente de décision)
 *   NonConforme → lot rejeté par QA (décision finale → rebut ou retravail)
 *
 * Transitions autorisées :
 *   EnControle → Libere       (lot analysé et accepté)
 *   EnControle → NonConforme  (lot analysé et rejeté → crée une NC)
 *   Libere     → Bloque       (retour en quarantaine — cas exceptionnel)
 *   Bloque     → Libere       (déblocage après investigation)
 *   Bloque     → NonConforme  (confirmation du rejet)
 */
export type StatutQC = 'EnControle' | 'Libere' | 'Bloque' | 'NonConforme'

export const STATUT_QC_LABELS: Record<StatutQC, string> = {
  EnControle:  'En contrôle',
  Libere:      'Libéré',
  Bloque:      'Bloqué',
  NonConforme: 'Non-conforme',
}

export const STATUT_QC_COLORS: Record<StatutQC, string> = {
  EnControle:  'bg-amber-100 text-amber-700 border border-amber-200',
  Libere:      'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Bloque:      'bg-red-100 text-red-700 border border-red-200',
  NonConforme: 'bg-red-600 text-white border border-red-700',
}

// ── MRP Engine (migration 012) ────────────────────────────────────────────────

/**
 * Passe de calcul MRP (≡ SAP MD01 / MDRE).
 * Source : table mrp_runs.
 */
export type MrpRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED'

export interface MrpRun {
  id:               string
  organizationId:   string
  factoryId:        string
  executedAt:       string   // ISO datetime UTC
  executedBySystem: boolean  // true = planificateur auto
  status:           MrpRunStatus
}

/**
 * Recommandation d'action générée par le moteur MRP (≡ SAP MDTB).
 * Source : table mrp_recommendations.
 *
 * actionType :
 *   BUY      → créer une Demande d'Achat (→ BC/BA)
 *   PRODUCE  → créer un Ordre de Fabrication
 *   EXPEDITE → avancer la date de livraison d'un BC existant
 *
 * Transitions status :
 *   NEW → CONVERTED  (gérante valide → DA ou OF créé)
 *   NEW → IGNORED    (gérante rejette)
 *   CONVERTED / IGNORED sont immuables.
 */
export type MrpActionType           = 'BUY' | 'PRODUCE' | 'EXPEDITE'
export type MrpRecommendationStatus = 'NEW' | 'CONVERTED' | 'IGNORED'

export interface MrpRecommendation {
  id:                          string
  organizationId:              string
  factoryId:                   string
  mrpRunId:                    string
  articleId:                   string
  actionType:                  MrpActionType
  suggestedQuantity:           number
  suggestedOrderDate:          string   // ISO date — date limite pour passer la commande
  requiredDate:                string   // ISO date — date impérative de dispo matière
  status:                      MrpRecommendationStatus
  linkedPurchaseRequisitionId: string | null
  linkedProductionOrderId:     string | null
  createdAt:                   string
  updatedAt:                   string
}

/** MrpRecommendation enrichie avec les infos article (pour l'affichage) */
export interface MrpRecommendationRow extends MrpRecommendation {
  articleLabel: string
  articleSku:   string
  articleUnit:  string
}

export const MRP_ACTION_LABELS: Record<MrpActionType, string> = {
  BUY:      'Acheter',
  PRODUCE:  'Produire',
  EXPEDITE: 'Avancer livraison',
}

export const MRP_ACTION_COLORS: Record<MrpActionType, string> = {
  BUY:      'bg-blue-100 text-blue-700 border border-blue-200',
  PRODUCE:  'bg-violet-100 text-violet-700 border border-violet-200',
  EXPEDITE: 'bg-amber-100 text-amber-700 border border-amber-200',
}

export const MRP_REC_STATUS_LABELS: Record<MrpRecommendationStatus, string> = {
  NEW:       'Nouvelle',
  CONVERTED: 'Convertie',
  IGNORED:   'Ignorée',
}

export const MRP_REC_STATUS_COLORS: Record<MrpRecommendationStatus, string> = {
  NEW:       'bg-orange-100 text-orange-700 border border-orange-200',
  CONVERTED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  IGNORED:   'bg-gray-100 text-gray-500 border border-gray-200',
}

// ── Inventaires physiques (migration 007) ────────────────────────────────────

/**
 * Document d'inventaire physique (≡ MI01 SAP MM-IM).
 * Cycle de vie :
 *   PROPOSED → COUNTED → POSTED
 *   POSTED est immuable — les écarts génèrent des mouvements INV_ADJ en stock.
 */
export type InventoryStatus = 'PROPOSED' | 'COUNTED' | 'POSTED'

export interface InventoryDocument {
  id:             string
  organizationId: string
  factoryId:      string
  documentNumber: string   // ex. INV-2026-0001
  status:         InventoryStatus
  createdBy:      string | null
  createdAt:      string
  postedAt:       string | null
}

/**
 * Ligne de comptage (≡ MI04 SAP).
 * `differenceQuantity` est calculée par la DB (GENERATED ALWAYS AS counted − book).
 */
export interface InventoryDocumentItem {
  id:                   string
  inventoryDocumentId:  string
  articleId:            string
  articleCode:          string        // enrichi via JOIN articles
  articleDesignation:   string        // enrichi via JOIN articles
  unite:                string        // enrichi via JOIN articles
  batchNumber:          string | null
  bookQuantity:         number        // stock système au moment de la création (snapshot)
  countedQuantity:      number | null // NULL = ligne non encore saisie
  differenceQuantity:   number | null // counted − book (GENERATED par la DB)
}

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  PROPOSED: 'Proposé',
  COUNTED:  'Compté',
  POSTED:   'Validé',
}

export const INVENTORY_STATUS_COLORS: Record<InventoryStatus, string> = {
  PROPOSED: 'bg-blue-100 text-blue-700 border border-blue-200',
  COUNTED:  'bg-amber-100 text-amber-700 border border-amber-200',
  POSTED:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
}

// ── Production Outputs (migration 013) ───────────────────────────────────────

/**
 * Déclaration de fin de production — lot PF + quantités (≡ SAP CO11N / MB31).
 * Source : table production_outputs.
 *
 * Cycle de vie :
 *   DRAFT     → saisie opérateur (modifiable, supprimable)
 *   CONFIRMED → validé chef d'équipe (verrouillé)
 *   POSTED    → comptabilisé, lot en stock (immuable — audit trail)
 */
export type ProductionOutputStatus = 'DRAFT' | 'CONFIRMED' | 'POSTED'

export interface ProductionOutput {
  id:                  string
  organizationId:      string
  factoryId:           string
  productionOrderId:   string
  articleId:           string
  outputNumber:        string   // DP-YYYY-NNNN
  status:              ProductionOutputStatus
  quantityProduced:    number
  quantityScrap:       number
  productBatchNumber:  string   // TYPE-YYYYMMDD-XX  (ex. PF-20260603-01, PSF-20260603-01)
  expiryDate:          string   // ISO date
  declaredBy:          string   // auth.users.id
  declaredAt:          string   // ISO datetime UTC
  confirmedBy:         string | null
  confirmedAt:         string | null
  postedAt:            string | null
  notes:               string | null
  createdAt:           string
  updatedAt:           string
}

/** ProductionOutput enrichi avec infos article + OF pour l'affichage */
export interface ProductionOutputRow extends ProductionOutput {
  articleLabel: string
  articleSku:   string
  articleUnit:  string
  orderNumber:  string   // N° OF lié
  tauxRebut:    number   // % : scrap / (produced + scrap) × 100
}

export const PRODUCTION_OUTPUT_STATUS_LABELS: Record<ProductionOutputStatus, string> = {
  DRAFT:     'Brouillon',
  CONFIRMED: 'Confirmé',
  POSTED:    'Comptabilisé',
}

export const PRODUCTION_OUTPUT_STATUS_COLORS: Record<ProductionOutputStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-600 border border-gray-200',
  CONFIRMED: 'bg-amber-100 text-amber-700 border border-amber-200',
  POSTED:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Renvoie "X jours" ou "Aujourd'hui" ou "Dépassé de X j" selon la DLC */
export function formatDlcStatus(dlc: string, today: string): {
  label: string
  urgent: boolean
  expired: boolean
} {
  const diff = Math.ceil(
    (new Date(dlc).getTime() - new Date(today).getTime()) / 86_400_000,
  )
  if (diff < 0)  return { label: `Dépassé de ${-diff} j`, urgent: true, expired: true }
  if (diff === 0) return { label: 'Expire aujourd\'hui', urgent: true, expired: false }
  if (diff <= 30) return { label: `${diff} j restants`, urgent: true, expired: false }
  return { label: `${diff} j restants`, urgent: false, expired: false }
}
