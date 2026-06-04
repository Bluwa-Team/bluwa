// ══════════════════════════════════════════════════════════════════════════════
// HACCP — Hazard Analysis and Critical Control Points
// Plan HACCP (référentiel statique — défini par le responsable qualité)
// ══════════════════════════════════════════════════════════════════════════════

export type HazardType = 'B' | 'C' | 'P'
export type RiskLevel = 1 | 2 | 3

export const HAZARD_TYPE_LABELS: Record<HazardType, string> = {
  B: 'Biologique',
  C: 'Chimique',
  P: 'Physique',
}

export const HAZARD_TYPE_COLORS: Record<HazardType, string> = {
  B: 'bg-purple-100 text-purple-700 border-purple-200',
  C: 'bg-orange-100 text-orange-700 border-orange-200',
  P: 'bg-slate-100 text-slate-700 border-slate-200',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  1: 'Faible',
  2: 'Moyen',
  3: 'Élevé',
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProcessStep {
  id: string
  order: number
  name: string
  description: string
  hasCcp: boolean
}

export interface HazardAnalysis {
  id: string
  stepId: string
  stepName: string
  hazardType: HazardType
  hazardDescription: string
  gravity: RiskLevel
  probability: RiskLevel
  controlMeasure: string
  isCcp: boolean
}

export interface CriticalControlPoint {
  id: string
  pccNumber: string
  stepId: string
  stepName: string
  hazardType: HazardType
  hazardDescription: string
  criticalLimit: string
  monitoringMethod: string
  monitoringFrequency: string
  responsible: string
  correctiveAction: string
  verificationMethod: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function riskScore(h: HazardAnalysis): number {
  return h.gravity * h.probability
}

export function riskColor(score: number): string {
  if (score >= 7) return 'bg-red-100 text-red-700 border-red-200'
  if (score >= 4) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

export function riskLabel(score: number): string {
  if (score >= 7) return 'Critique'
  if (score >= 4) return 'Modéré'
  return 'Acceptable'
}

// ── Mock data ──────────────────────────────────────────────────────────────────

export const MOCK_PROCESS_STEPS: ProcessStep[] = [
  { id: 'ps1',  order: 1,  name: 'Réception matières premières',    description: 'Réception et déchargement des fruits, sucre, eau traitée et additifs alimentaires.',    hasCcp: true  },
  { id: 'ps2',  order: 2,  name: 'Tri et inspection visuelle',       description: 'Élimination des fruits abîmés, corps étrangers visibles et lots hors calibre.',           hasCcp: false },
  { id: 'ps3',  order: 3,  name: 'Lavage et désinfection',           description: 'Lavage à l\'eau courante + rinçage solution chlorée (50–100 ppm).',                       hasCcp: false },
  { id: 'ps4',  order: 4,  name: 'Broyage / Pressage',               description: 'Extraction du jus par presse mécanique ou broyeur. Température ambiante ≤ 28 °C.',       hasCcp: false },
  { id: 'ps5',  order: 5,  name: 'Pasteurisation',                   description: 'Traitement thermique du jus brut pour élimination des pathogènes.',                       hasCcp: true  },
  { id: 'ps6',  order: 6,  name: 'Filtration / Centrifugation',      description: 'Clarification du jus pasteurisé. Retrait des particules > 0,2 mm.',                       hasCcp: false },
  { id: 'ps7',  order: 7,  name: 'Formulation / Dosage',             description: 'Ajout de sucre, correcteurs de pH, arômes et conservateurs selon recette.',               hasCcp: false },
  { id: 'ps8',  order: 8,  name: 'Conditionnement aseptique',        description: 'Remplissage en bouteilles stérilisées ou briques Tetra Pak en zone propre.',              hasCcp: true  },
  { id: 'ps9',  order: 9,  name: 'Détection corps étrangers',        description: 'Passage au détecteur de métaux en ligne avant capsulage.',                                hasCcp: true  },
  { id: 'ps10', order: 10, name: 'Emballage et étiquetage',          description: 'Mise en carton, étiquetage DLC/lot, filmage palette.',                                    hasCcp: false },
  { id: 'ps11', order: 11, name: 'Stockage produits finis',          description: 'Entrepôt à température contrôlée (≤ 25 °C, hygrométrie < 70 %).',                         hasCcp: false },
  { id: 'ps12', order: 12, name: 'Expédition',                       description: 'Chargement, vérification intégrité emballages et remise des documents de traçabilité.', hasCcp: false },
]

export const MOCK_HAZARD_ANALYSIS: HazardAnalysis[] = [
  // Réception MP
  { id: 'h1',  stepId: 'ps1', stepName: 'Réception matières premières', hazardType: 'B', hazardDescription: 'Contamination microbienne des fruits (Salmonella, E. coli, moisissures)', gravity: 3, probability: 2, controlMeasure: 'Contrôle à réception : inspection visuelle + analyses pH et activité eau. Refus si hors spec.', isCcp: true  },
  { id: 'h2',  stepId: 'ps1', stepName: 'Réception matières premières', hazardType: 'C', hazardDescription: 'Résidus de pesticides et mycotoxines (aflatoxines) sur fruits',             gravity: 3, probability: 2, controlMeasure: 'Certificat d\'analyse fournisseur + contrôle périodique en laboratoire externe.', isCcp: true  },
  { id: 'h3',  stepId: 'ps1', stepName: 'Réception matières premières', hazardType: 'P', hazardDescription: 'Corps étrangers dans les colis (verre, ficelles, cailloux)',                 gravity: 2, probability: 1, controlMeasure: 'Inspection visuelle à réception. Tamisage avant entrée en process.', isCcp: false },
  // Lavage
  { id: 'h4',  stepId: 'ps3', stepName: 'Lavage et désinfection',        hazardType: 'C', hazardDescription: 'Concentration excessive de chlore résiduel (> 5 ppm) dans le produit',    gravity: 2, probability: 1, controlMeasure: 'Contrôle concentration solution de lavage. Rinçage final à l\'eau potable.', isCcp: false },
  // Pasteurisation
  { id: 'h5',  stepId: 'ps5', stepName: 'Pasteurisation',                hazardType: 'B', hazardDescription: 'Survie de pathogènes (Listeria, Salmonella) en cas de sous-traitement',   gravity: 3, probability: 3, controlMeasure: 'Maintien T° ≥ 85 °C pendant ≥ 15 s. Enregistrement continu pasteurisateur.', isCcp: true  },
  // Conditionnement
  { id: 'h6',  stepId: 'ps8', stepName: 'Conditionnement aseptique',     hazardType: 'B', hazardDescription: 'Recontamination post-pasteurisation (air, surfaces, personnel)',           gravity: 3, probability: 2, controlMeasure: 'Zone conditionnement à pression positive. BPH strictes. Température produit ≤ 10 °C.', isCcp: true  },
  // Détection corps étrangers
  { id: 'h7',  stepId: 'ps9', stepName: 'Détection corps étrangers',     hazardType: 'P', hazardDescription: 'Fragments métalliques issus du broyeur ou des convoyeurs',                gravity: 3, probability: 2, controlMeasure: 'Détecteur de métaux en ligne (Fe ≤ 2,5 mm, Inox ≤ 3,5 mm). Test de sensibilité 3× / jour.', isCcp: true  },
  // Stockage
  { id: 'h8',  stepId: 'ps11', stepName: 'Stockage produits finis',      hazardType: 'B', hazardDescription: 'Prolifération microbienne en cas de rupture chaîne froid (produit frais)', gravity: 2, probability: 1, controlMeasure: 'Température entrepôt enregistrée en continu. Alarme si T > 25 °C.', isCcp: false },
]

export const MOCK_CCP: CriticalControlPoint[] = [
  {
    id: 'ccp1',
    pccNumber: 'PCC 1',
    stepId: 'ps1',
    stepName: 'Réception matières premières',
    hazardType: 'C',
    hazardDescription: 'Mycotoxines et résidus de pesticides sur fruits',
    criticalLimit: 'Aflatoxines ≤ 4 µg/kg. Résidus pesticides ≤ LMR Codex Alimentarius.',
    monitoringMethod: 'Certificat d\'analyse du fournisseur (lot par lot). Test rapide aflatoxines sur place (bandelette).',
    monitoringFrequency: 'Chaque livraison',
    responsible: 'Responsable Réception',
    correctiveAction: 'Refus et retour fournisseur. Ouverture d\'une Non-Conformité. Blocage du lot en quarantaine.',
    verificationMethod: 'Audit fournisseur annuel. Analyse laboratoire externe trimestrielle.',
  },
  {
    id: 'ccp2',
    pccNumber: 'PCC 2',
    stepId: 'ps5',
    stepName: 'Pasteurisation',
    hazardType: 'B',
    hazardDescription: 'Survie de pathogènes (Salmonella, Listeria, E. coli) — danger critique',
    criticalLimit: 'Température ≥ 85 °C pendant ≥ 15 secondes en continu.',
    monitoringMethod: 'Enregistreur de température continu sur le pasteurisateur. Vérification sondes calibrées.',
    monitoringFrequency: 'En continu — alarme automatique si déviation',
    responsible: 'Opérateur Pasteurisation',
    correctiveAction: 'Arrêt process immédiat. Repasteurisation ou destruction du lot. Maintenance préventive équipement.',
    verificationMethod: 'Calibration sondes mensuelle. Audit microbiologique trimestriel sur produit fini.',
  },
  {
    id: 'ccp3',
    pccNumber: 'PCC 3',
    stepId: 'ps8',
    stepName: 'Conditionnement aseptique',
    hazardType: 'B',
    hazardDescription: 'Recontamination microbienne post-pasteurisation',
    criticalLimit: 'Température produit au remplissage ≤ 10 °C. Pression zone propre > pression extérieure.',
    monitoringMethod: 'Thermomètre de ligne enregistré. Manomètre pression différentielle zone propre.',
    monitoringFrequency: 'Toutes les 30 minutes',
    responsible: 'Responsable Conditionnement',
    correctiveAction: 'Arrêt conditionnement. Remise en température. Désinfection zone avant reprise.',
    verificationMethod: 'Analyses microbiologiques sur surfaces (prélèvements mensuels). Bilan hygiène hebdomadaire.',
  },
  {
    id: 'ccp4',
    pccNumber: 'PCC 4',
    stepId: 'ps9',
    stepName: 'Détection corps étrangers',
    hazardType: 'P',
    hazardDescription: 'Fragments métalliques issus du broyeur ou convoyeurs',
    criticalLimit: 'Détection : Fer ≤ 2,5 mm / Inox ≤ 3,5 mm / Aluminium ≤ 3,5 mm.',
    monitoringMethod: 'Test de sensibilité au détecteur de métaux avec sphères étalons certifiées.',
    monitoringFrequency: '3 fois par poste (début, mi-production, fin)',
    responsible: 'Opérateur Ligne',
    correctiveAction: 'Arrêt ligne. Isolement de toute la production depuis le dernier test OK. Inspection manuelle.',
    verificationMethod: 'Étalonnage annuel du détecteur par organisme certifié. Registre des éjections hebdomadaire.',
  },
]

export const HACCP_PLAN_META = {
  version: '2.1',
  revisedAt: '2026-05-15',
  revisedBy: 'Aminata Sow',
  approvedBy: 'Direction Qualité',
  nextRevision: '2026-11-15',
  scope: 'Production de jus de fruits et boissons — ligne principale',
}
