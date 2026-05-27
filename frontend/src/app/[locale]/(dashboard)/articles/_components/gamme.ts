// ── Types ─────────────────────────────────────────────────────────────────────
import type { WorkCenter } from '@/types/erp'
export type { WorkCenter }

export interface GammeFabrication {
  id: string
  articleCode: string
  articleDesignation: string
  version: string
  isActive: boolean
  createdAt: string
}

export interface GammeEtape {
  id: string
  gammeId: string
  ordre: number
  operation: string
  duree: number                   // durée standard pour le lot (minutes) — = duration_min SAP PLPO
  setupTimeMinutes: number        // temps de réglage machine avant démarrage (= Rüstzeit / VGZ01) — migration 008
  runTimeMinutesPerUnit: number   // temps machine par unité de PF (= duree / batchSize) — migration 008
  temperature?: number            // °C — undefined = pas de contrainte thermique
  equipement: string              // note texte libre (legacy — remplacé fonctionnellement par le poste)
  pointControle?: string
  // ── Work center (dénormalisé depuis routing_steps JOIN work_centers) ──────
  workCenterId?:          string | null
  workCenterName?:        string
  workCenterCode?:        string | null
  workCenterRatePerHour?: number
}


// ── In-memory mutable store ───────────────────────────────────────────────────

let _gammes: GammeFabrication[] = [
  { id: 'gam-001', articleCode: 'PF-BIS-001', articleDesignation: 'Bissap Pourpre Original 1L',    version: 'v1.0', isActive: true, createdAt: '2026-01-15' },
  { id: 'gam-002', articleCode: 'PF-BIS-002', articleDesignation: 'Bissap Pourpre Vanille 1L',     version: 'v1.0', isActive: true, createdAt: '2026-01-15' },
  { id: 'gam-003', articleCode: 'PF-BIS-003', articleDesignation: 'Bissap Pourpre Gingembre 1L',   version: 'v1.0', isActive: true, createdAt: '2026-01-15' },
  { id: 'gam-004', articleCode: 'PF-BIS-004', articleDesignation: 'Bissap Pourpre Menthe 1L',      version: 'v1.0', isActive: true, createdAt: '2026-01-15' },
  { id: 'gam-005', articleCode: 'PF-BIS-005', articleDesignation: 'Bissap Pourpre Citronnelle 1L', version: 'v1.0', isActive: true, createdAt: '2026-01-15' },
]

let _etapes: GammeEtape[] = [
  // ── PF-BIS-001 : Original ─────────────────────────────────────────────────
  // setupTimeMinutes : réglage avant démarrage | runTimeMinutesPerUnit : duree / 100 btl
  { id: 'g001-e1', gammeId: 'gam-001', ordre: 1, operation: 'Pesée & Préparation',   duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Balance industrielle',  pointControle: 'Vérifier les quantités vs BOM' },
  { id: 'g001-e2', gammeId: 'gam-001', ordre: 2, operation: 'Macération hibiscus',   duree: 45, setupTimeMinutes: 10, runTimeMinutesPerUnit: 0.45, temperature: 90, equipement: 'Cuve inox 500L',         pointControle: 'Couleur pourpre intense, arôme floral' },
  { id: 'g001-e3', gammeId: 'gam-001', ordre: 3, operation: 'Filtration',            duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Filtre presse 0.5µm',   pointControle: 'Turbidité ≤ 1 NTU' },
  { id: 'g001-e4', gammeId: 'gam-001', ordre: 4, operation: 'Sucrage / Dosage',      duree: 10, setupTimeMinutes: 3,  runTimeMinutesPerUnit: 0.10, temperature: 65, equipement: 'Cuve de mélange' },
  { id: 'g001-e5', gammeId: 'gam-001', ordre: 5, operation: 'Refroidissement',       duree: 40, setupTimeMinutes: 0,  runTimeMinutesPerUnit: 0.40, temperature: 20, equipement: 'Échangeur thermique',    pointControle: 'T° ≤ 25°C avant embouteillage' },
  { id: 'g001-e6', gammeId: 'gam-001', ordre: 6, operation: 'Contrôle qualité',      duree: 15, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.15, equipement: 'Lab. qualité',           pointControle: 'pH 2.5–3.2 · Brix 12–15' },
  { id: 'g001-e7', gammeId: 'gam-001', ordre: 7, operation: 'Embouteillage',         duree: 30, setupTimeMinutes: 15, runTimeMinutesPerUnit: 0.30, equipement: 'Ligne embouteillage' },
  { id: 'g001-e8', gammeId: 'gam-001', ordre: 8, operation: 'Capsulage & Étiquetage',duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Ligne embouteillage',   pointControle: 'Intégrité capsule + étiquette centrée' },
  { id: 'g001-e9', gammeId: 'gam-001', ordre: 9, operation: 'Palettisation',         duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Zone palettisation' },

  // ── PF-BIS-002 : Vanille ──────────────────────────────────────────────────
  { id: 'g002-e1', gammeId: 'gam-002', ordre: 1, operation: 'Pesée & Préparation',   duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Balance industrielle',  pointControle: 'Vérifier les quantités vs BOM' },
  { id: 'g002-e2', gammeId: 'gam-002', ordre: 2, operation: 'Macération hibiscus',   duree: 45, setupTimeMinutes: 10, runTimeMinutesPerUnit: 0.45, temperature: 90, equipement: 'Cuve inox 500L',         pointControle: 'Couleur pourpre intense, arôme floral' },
  { id: 'g002-e3', gammeId: 'gam-002', ordre: 3, operation: 'Infusion vanille',      duree: 30, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.30, temperature: 75, equipement: 'Cuve inox 500L',         pointControle: 'Arôme vanille bien intégré' },
  { id: 'g002-e4', gammeId: 'gam-002', ordre: 4, operation: 'Filtration',            duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Filtre presse 0.5µm',   pointControle: 'Turbidité ≤ 1 NTU' },
  { id: 'g002-e5', gammeId: 'gam-002', ordre: 5, operation: 'Sucrage / Dosage',      duree: 10, setupTimeMinutes: 3,  runTimeMinutesPerUnit: 0.10, temperature: 65, equipement: 'Cuve de mélange' },
  { id: 'g002-e6', gammeId: 'gam-002', ordre: 6, operation: 'Refroidissement',       duree: 40, setupTimeMinutes: 0,  runTimeMinutesPerUnit: 0.40, temperature: 20, equipement: 'Échangeur thermique',    pointControle: 'T° ≤ 25°C avant embouteillage' },
  { id: 'g002-e7', gammeId: 'gam-002', ordre: 7, operation: 'Contrôle qualité',      duree: 15, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.15, equipement: 'Lab. qualité',           pointControle: 'pH 2.5–3.2 · Brix 12–15' },
  { id: 'g002-e8', gammeId: 'gam-002', ordre: 8, operation: 'Embouteillage',         duree: 30, setupTimeMinutes: 15, runTimeMinutesPerUnit: 0.30, equipement: 'Ligne embouteillage' },
  { id: 'g002-e9', gammeId: 'gam-002', ordre: 9, operation: 'Capsulage & Étiquetage',duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Ligne embouteillage',   pointControle: 'Intégrité capsule + étiquette centrée' },
  { id: 'g002-e10',gammeId: 'gam-002', ordre:10, operation: 'Palettisation',         duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Zone palettisation' },

  // ── PF-BIS-003 : Gingembre ────────────────────────────────────────────────
  { id: 'g003-e1', gammeId: 'gam-003', ordre: 1, operation: 'Pesée & Préparation',   duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Balance industrielle',  pointControle: 'Vérifier les quantités vs BOM' },
  { id: 'g003-e2', gammeId: 'gam-003', ordre: 2, operation: 'Macération hibiscus',   duree: 45, setupTimeMinutes: 10, runTimeMinutesPerUnit: 0.45, temperature: 90, equipement: 'Cuve inox 500L',         pointControle: 'Couleur pourpre intense, arôme floral' },
  { id: 'g003-e3', gammeId: 'gam-003', ordre: 3, operation: 'Infusion gingembre',    duree: 25, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.25, temperature: 80, equipement: 'Cuve inox 500L',         pointControle: 'Piquant gingembre perceptible sans excès' },
  { id: 'g003-e4', gammeId: 'gam-003', ordre: 4, operation: 'Filtration',            duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Filtre presse 0.5µm',   pointControle: 'Turbidité ≤ 1 NTU' },
  { id: 'g003-e5', gammeId: 'gam-003', ordre: 5, operation: 'Sucrage / Dosage',      duree: 10, setupTimeMinutes: 3,  runTimeMinutesPerUnit: 0.10, temperature: 65, equipement: 'Cuve de mélange' },
  { id: 'g003-e6', gammeId: 'gam-003', ordre: 6, operation: 'Refroidissement',       duree: 40, setupTimeMinutes: 0,  runTimeMinutesPerUnit: 0.40, temperature: 20, equipement: 'Échangeur thermique',    pointControle: 'T° ≤ 25°C avant embouteillage' },
  { id: 'g003-e7', gammeId: 'gam-003', ordre: 7, operation: 'Contrôle qualité',      duree: 15, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.15, equipement: 'Lab. qualité',           pointControle: 'pH 2.5–3.2 · Brix 12–15' },
  { id: 'g003-e8', gammeId: 'gam-003', ordre: 8, operation: 'Embouteillage',         duree: 30, setupTimeMinutes: 15, runTimeMinutesPerUnit: 0.30, equipement: 'Ligne embouteillage' },
  { id: 'g003-e9', gammeId: 'gam-003', ordre: 9, operation: 'Capsulage & Étiquetage',duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Ligne embouteillage',   pointControle: 'Intégrité capsule + étiquette centrée' },
  { id: 'g003-e10',gammeId: 'gam-003', ordre:10, operation: 'Palettisation',         duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Zone palettisation' },

  // ── PF-BIS-004 : Menthe ───────────────────────────────────────────────────
  { id: 'g004-e1', gammeId: 'gam-004', ordre: 1, operation: 'Pesée & Préparation',   duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Balance industrielle',  pointControle: 'Vérifier les quantités vs BOM' },
  { id: 'g004-e2', gammeId: 'gam-004', ordre: 2, operation: 'Macération hibiscus',   duree: 45, setupTimeMinutes: 10, runTimeMinutesPerUnit: 0.45, temperature: 90, equipement: 'Cuve inox 500L',         pointControle: 'Couleur pourpre intense, arôme floral' },
  { id: 'g004-e3', gammeId: 'gam-004', ordre: 3, operation: 'Infusion menthe',       duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, temperature: 60, equipement: 'Cuve inox 500L',         pointControle: 'Fraîcheur mentholée sans amertume' },
  { id: 'g004-e4', gammeId: 'gam-004', ordre: 4, operation: 'Filtration',            duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Filtre presse 0.5µm',   pointControle: 'Turbidité ≤ 1 NTU' },
  { id: 'g004-e5', gammeId: 'gam-004', ordre: 5, operation: 'Sucrage / Dosage',      duree: 10, setupTimeMinutes: 3,  runTimeMinutesPerUnit: 0.10, temperature: 65, equipement: 'Cuve de mélange' },
  { id: 'g004-e6', gammeId: 'gam-004', ordre: 6, operation: 'Refroidissement',       duree: 40, setupTimeMinutes: 0,  runTimeMinutesPerUnit: 0.40, temperature: 20, equipement: 'Échangeur thermique',    pointControle: 'T° ≤ 25°C avant embouteillage' },
  { id: 'g004-e7', gammeId: 'gam-004', ordre: 7, operation: 'Contrôle qualité',      duree: 15, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.15, equipement: 'Lab. qualité',           pointControle: 'pH 2.5–3.2 · Brix 12–15' },
  { id: 'g004-e8', gammeId: 'gam-004', ordre: 8, operation: 'Embouteillage',         duree: 30, setupTimeMinutes: 15, runTimeMinutesPerUnit: 0.30, equipement: 'Ligne embouteillage' },
  { id: 'g004-e9', gammeId: 'gam-004', ordre: 9, operation: 'Capsulage & Étiquetage',duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Ligne embouteillage',   pointControle: 'Intégrité capsule + étiquette centrée' },
  { id: 'g004-e10',gammeId: 'gam-004', ordre:10, operation: 'Palettisation',         duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Zone palettisation' },

  // ── PF-BIS-005 : Citronnelle ──────────────────────────────────────────────
  { id: 'g005-e1', gammeId: 'gam-005', ordre: 1, operation: 'Pesée & Préparation',   duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Balance industrielle',  pointControle: 'Vérifier les quantités vs BOM' },
  { id: 'g005-e2', gammeId: 'gam-005', ordre: 2, operation: 'Macération hibiscus',   duree: 45, setupTimeMinutes: 10, runTimeMinutesPerUnit: 0.45, temperature: 90, equipement: 'Cuve inox 500L',         pointControle: 'Couleur pourpre intense, arôme floral' },
  { id: 'g005-e3', gammeId: 'gam-005', ordre: 3, operation: 'Infusion citronnelle',  duree: 25, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.25, temperature: 70, equipement: 'Cuve inox 500L',         pointControle: 'Notes citronnées légères et persistantes' },
  { id: 'g005-e4', gammeId: 'gam-005', ordre: 4, operation: 'Filtration',            duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Filtre presse 0.5µm',   pointControle: 'Turbidité ≤ 1 NTU' },
  { id: 'g005-e5', gammeId: 'gam-005', ordre: 5, operation: 'Sucrage / Dosage',      duree: 10, setupTimeMinutes: 3,  runTimeMinutesPerUnit: 0.10, temperature: 65, equipement: 'Cuve de mélange' },
  { id: 'g005-e6', gammeId: 'gam-005', ordre: 6, operation: 'Refroidissement',       duree: 40, setupTimeMinutes: 0,  runTimeMinutesPerUnit: 0.40, temperature: 20, equipement: 'Échangeur thermique',    pointControle: 'T° ≤ 25°C avant embouteillage' },
  { id: 'g005-e7', gammeId: 'gam-005', ordre: 7, operation: 'Contrôle qualité',      duree: 15, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.15, equipement: 'Lab. qualité',           pointControle: 'pH 2.5–3.2 · Brix 12–15' },
  { id: 'g005-e8', gammeId: 'gam-005', ordre: 8, operation: 'Embouteillage',         duree: 30, setupTimeMinutes: 15, runTimeMinutesPerUnit: 0.30, equipement: 'Ligne embouteillage' },
  { id: 'g005-e9', gammeId: 'gam-005', ordre: 9, operation: 'Capsulage & Étiquetage',duree: 20, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.20, equipement: 'Ligne embouteillage',   pointControle: 'Intégrité capsule + étiquette centrée' },
  { id: 'g005-e10',gammeId: 'gam-005', ordre:10, operation: 'Palettisation',         duree: 10, setupTimeMinutes: 5,  runTimeMinutesPerUnit: 0.10, equipement: 'Zone palettisation' },
]

// ── Public API ────────────────────────────────────────────────────────────────

export function getGammeByArticleCode(articleCode: string): {
  gamme: GammeFabrication | null
  etapes: GammeEtape[]
} {
  const gamme = _gammes.find((g) => g.articleCode === articleCode && g.isActive) ?? null
  const etapes = gamme
    ? _etapes.filter((e) => e.gammeId === gamme.id).sort((a, b) => a.ordre - b.ordre)
    : []
  return { gamme, etapes }
}

export function updateGamme(
  gammeId: string,
  header: Pick<GammeFabrication, 'version'>,
  newEtapes: GammeEtape[],
): void {
  _gammes = _gammes.map((g) => (g.id === gammeId ? { ...g, ...header } : g))
  _etapes = [
    ..._etapes.filter((e) => e.gammeId !== gammeId),
    ...newEtapes.map((e, i) => ({ ...e, gammeId, ordre: i + 1 })),
  ]
}

export function createGamme(
  articleCode: string,
  articleDesignation: string,
  header: Pick<GammeFabrication, 'version'>,
  newEtapes: GammeEtape[],
): GammeFabrication {
  const id = `gam-${Date.now()}`
  const today = new Date().toISOString().slice(0, 10)
  const newGamme: GammeFabrication = {
    id,
    articleCode,
    articleDesignation,
    ...header,
    isActive: true,
    createdAt: today,
  }
  _gammes = [..._gammes, newGamme]
  _etapes = [
    ..._etapes,
    ...newEtapes.map((e, i) => ({ ...e, gammeId: id, ordre: i + 1 })),
  ]
  return newGamme
}

// ── Catalogues pour l'autocomplete ───────────────────────────────────────────

export const OPERATIONS_PREDEFINIES = [
  'Pesée & Préparation',
  'Macération hibiscus',
  'Infusion vanille',
  'Infusion gingembre',
  'Infusion menthe',
  'Infusion citronnelle',
  'Filtration',
  'Sucrage / Dosage',
  'Mélange',
  'Refroidissement',
  'Pasteurisation',
  'Contrôle qualité',
  'Embouteillage',
  'Capsulage & Étiquetage',
  'Palettisation',
] as const

export const EQUIPEMENTS_PREDEFINIS = [
  'Balance industrielle',
  'Cuve inox 500L',
  'Cuve inox 200L',
  'Cuve de mélange',
  'Filtre presse 0.5µm',
  'Échangeur thermique',
  'Pasteurisateur',
  'Ligne embouteillage',
  'Lab. qualité',
  'Zone palettisation',
] as const
