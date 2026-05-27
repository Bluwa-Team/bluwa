// ═══════════════════════════════════════════════════════════════════════════════
// Types ERP partagés — source de vérité unique
// Aligné sur la base de données Supabase (migrations 002–006).
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
