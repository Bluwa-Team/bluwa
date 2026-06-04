// ── Types DB-alignés (migration 004) ─────────────────────────────────────────
//
// Correspondance SAP : production_orders → AUFK + AFKO
//
// Ces types reflètent exactement le schéma Supabase.
// Les types mock (OrdreFabrication, StatutOF…) restent en place
// pour la compatibilité des composants existants.

export type StatutOFDB =
  | 'PLANNED'      // Planifié  — créé par le planificateur ou le MRP
  | 'RELEASED'     // Lancé     — matières vérifiées, OF remis à l'atelier
  | 'IN_PROGRESS'  // En cours  — quantité_produite > 0
  | 'COMPLETED'    // Terminé   — quantité cible atteinte, OF clôturé
  | 'CANCELLED'    // Annulé    — OF abandonné

export interface ProductionOrder {
  id:               string
  organizationId:   string
  factoryId:        string
  articleId:        string
  orderNumber:      string          // ex. 'OF-2026-0099'
  quantityTarget:   number
  quantityProduced: number          // mis à jour à chaque déclaration
  status:           StatutOFDB
  startDate:        string          // ISO date — début planifié
  endDate:          string          // ISO date — fin planifiée
  createdBy:        string | null   // profiles.id
  createdAt:        string
  updatedAt:        string
}

export const STATUT_OF_DB_LABELS: Record<StatutOFDB, string> = {
  PLANNED:     'Planifié',
  RELEASED:    'Lancé',
  IN_PROGRESS: 'En cours',
  COMPLETED:   'Terminé',
  CANCELLED:   'Annulé',
}

export const STATUT_OF_DB_COLORS: Record<StatutOFDB, string> = {
  PLANNED:     'bg-blue-100 text-blue-700 border border-blue-200',
  RELEASED:    'bg-violet-100 text-violet-700 border border-violet-200',
  IN_PROGRESS: 'bg-rose-100 text-rose-700 border border-rose-200',
  COMPLETED:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
  CANCELLED:   'bg-gray-100 text-gray-500 border border-gray-200',
}

// Cycle de vie autorisé : seules certaines transitions sont valides
//   PLANNED     → RELEASED | CANCELLED
//   RELEASED    → IN_PROGRESS | CANCELLED
//   IN_PROGRESS → COMPLETED | CANCELLED
export const STATUT_OF_DB_NEXT: Partial<Record<StatutOFDB, StatutOFDB>> = {
  PLANNED:     'RELEASED',
  RELEASED:    'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
}

export const STATUT_OF_DB_TRANSITION: Partial<Record<StatutOFDB, string>> = {
  PLANNED:     'Lancer',
  RELEASED:    'Démarrer',
  IN_PROGRESS: 'Terminer',
}


// ── Référentiel produits / opérateurs ────────────────────────────────────────
// Les recettes (BOM) sont désormais dans articles/_components/bom.ts

export const PRODUIT_OF_OPTIONS = [
  { sku: 'PF-BIS-001', designation: 'Bissap Pourpre Original 1L'      },
  { sku: 'PF-BIS-002', designation: 'Bissap Pourpre Vanille 1L'       },
  { sku: 'PF-BIS-003', designation: 'Bissap Pourpre Gingembre 1L'     },
  { sku: 'PF-BIS-004', designation: 'Bissap Pourpre Menthe 1L'        },
  { sku: 'PF-BIS-005', designation: 'Bissap Pourpre Citronnelle 1L'   },
]

export const LIGNE_OPTIONS = [
  { value: 'L1+L2', label: 'Lignes A+B+C (complète)' },
  { value: 'L1',    label: 'L1 (ligne principale)'   },
  { value: 'L2',    label: 'L2 (ligne secondaire)'   },
]

export const OPERATEUR_OPTIONS = [
  'M. Diop',
  'Mamadou D.',
  'Fatou N.',
  'Ousmane B.',
]

// Lead time fabrication fixe (mock) — 4h = 0.5j arrondi à 1j ouvré
export const LEAD_TIME_H = 4
export const LEAD_TIME_DAYS = 1

// ── Ordres de Fabrication ─────────────────────────────────────────────────────

export type StatutOF =
  | 'EnAttenteComposants'
  | 'Planifie'
  | 'EnCours'
  | 'ControleQualite'
  | 'Dispo'
  | 'Termine'

export type StatutPicking = 'AValider' | 'Valide'

export interface OrdreFabrication {
  id: string
  numero: string             // OF-2026-042
  produitFini: string
  sku: string
  qty: number                // quantité planifiée
  realise: number            // quantité réalisée
  unite: string
  lotPF: string | null       // lot PF généré en fin de prod
  ligne: string              // L1, L2…
  operateurPrep: string | null
  dateBesoin: string         // YYYY-MM-DD
  debutPlanif: string        // YYYY-MM-DD
  picking: StatutPicking
  statut: StatutOF
  archive: boolean
}

export const STATUT_OF_LABELS: Record<StatutOF, string> = {
  EnAttenteComposants: 'En attente composants',
  Planifie:            'Planifié',
  EnCours:             'En cours',
  ControleQualite:     'Contrôle qualité',
  Dispo:               'Dispo',
  Termine:             'Terminé',
}

export const STATUT_OF_COLORS: Record<StatutOF, string> = {
  EnAttenteComposants: 'bg-orange-100 text-orange-700 border border-orange-200',
  Planifie:            'bg-blue-100 text-blue-700 border border-blue-200',
  EnCours:             'bg-rose-100 text-rose-700 border border-rose-200',
  ControleQualite:     'bg-amber-100 text-amber-700 border border-amber-200',
  Dispo:               'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Termine:             'bg-gray-100 text-gray-500 border border-gray-200',
}

// Transition label shown on the action button for each status
export const STATUT_OF_TRANSITION: Partial<Record<StatutOF, string>> = {
  EnAttenteComposants: 'Planifier',
  Planifie:            'Lancer',
  EnCours:             'Finir prod',
  ControleQualite:     'Libérer',
  Dispo:               'Archiver',
}

// ── MES — Suivi de fabrication ────────────────────────────────────────────────

export type EtatLigne = 'EnProduction' | 'EnPause' | 'Arret' | 'Reglage'

export type MotifArret =
  | 'PanneMachine'
  | 'ManqueComposants'
  | 'PauseOperateur'
  | 'Nettoyage'
  | 'ReglageCalibrage'
  | 'Autre'

export const MOTIF_ARRET_LABELS: Record<MotifArret, string> = {
  PanneMachine:     'Panne machine',
  ManqueComposants: 'Manque composants',
  PauseOperateur:   'Pause opérateur',
  Nettoyage:        'Nettoyage / CIP',
  ReglageCalibrage: 'Réglage / Calibrage',
  Autre:            'Autre',
}

export interface SessionMES {
  ofId: string
  etat: EtatLigne
  debutReel: string   // HH:MM
  derniereDecl: { heure: string; qte: number; operateur: string } | null
}

export type TypeEvenementMES =
  | 'Lancement'
  | 'Declaration'
  | 'Arret'
  | 'Reprise'
  | 'FinProd'
  | 'Rebut'
  | 'ClotureLot'

export interface EvenementMES {
  id: string
  ofId: string
  ofNumero: string
  ligne: string
  type: TypeEvenementMES
  heure: string       // HH:MM
  detail: string
  operateur: string
}

export const MOCK_SESSIONS_MES: Record<string, SessionMES> = {
  '2': {
    ofId: '2',
    etat: 'EnProduction',
    debutReel: '08:15',
    derniereDecl: { heure: '09:30', qte: 80, operateur: 'Ousmane B.' },
  },
}

export const MOCK_JOURNAL_MES: EvenementMES[] = [
  {
    id: 'e4',
    ofId: '2',
    ofNumero: 'OF-2026-043',
    ligne: 'L1',
    type: 'Declaration',
    heure: '09:30',
    detail: '+80 btl déclarées (cumul 80/180)',
    operateur: 'Ousmane B.',
  },
  {
    id: 'e3',
    ofId: '2',
    ofNumero: 'OF-2026-043',
    ligne: 'L1',
    type: 'Lancement',
    heure: '08:15',
    detail: 'Lancement production — Bissap Pourpre Gingembre 1L',
    operateur: 'Ousmane B.',
  },
  {
    id: 'e2',
    ofId: '1',
    ofNumero: 'OF-2026-042',
    ligne: 'L2',
    type: 'FinProd',
    heure: '07:45',
    detail: 'Production terminée — 150/150 btl · Envoyé en contrôle qualité',
    operateur: 'Fatou N.',
  },
  {
    id: 'e1',
    ofId: '1',
    ofNumero: 'OF-2026-042',
    ligne: 'L2',
    type: 'Lancement',
    heure: '04:00',
    detail: 'Lancement production — Bissap Pourpre Vanille 1L',
    operateur: 'Fatou N.',
  },
]

// Next statut after pressing the transition button
export const STATUT_OF_NEXT: Partial<Record<StatutOF, StatutOF>> = {
  EnAttenteComposants: 'Planifie',
  Planifie:            'EnCours',
  EnCours:             'ControleQualite',
  ControleQualite:     'Dispo',
  Dispo:               'Termine',
}

export const MOCK_OFS: OrdreFabrication[] = [
  {
    id: '1',
    numero: 'OF-2026-042',
    produitFini: 'Bissap Pourpre Vanille 1L',
    sku: 'PF-BIS-002',
    qty: 150,
    realise: 150,
    unite: 'btl',
    lotPF: 'PF-20260524-0042',
    ligne: 'L2',
    operateurPrep: 'Fatou N.',
    dateBesoin: '2026-05-22',
    debutPlanif: '2026-05-05',
    picking: 'Valide',
    statut: 'ControleQualite',
    archive: false,
  },
  {
    id: '2',
    numero: 'OF-2026-043',
    produitFini: 'Bissap Pourpre Gingembre 1L',
    sku: 'PF-BIS-003',
    qty: 180,
    realise: 80,
    unite: 'btl',
    lotPF: null,
    ligne: 'L1',
    operateurPrep: 'Ousmane B.',
    dateBesoin: '2026-05-25',
    debutPlanif: '2026-05-06',
    picking: 'Valide',
    statut: 'EnCours',
    archive: false,
  },
  {
    id: '3',
    numero: 'OF-2026-044',
    produitFini: 'Bissap Pourpre Menthe 1L',
    sku: 'PF-BIS-004',
    qty: 120,
    realise: 0,
    unite: 'btl',
    lotPF: null,
    ligne: 'L2',
    operateurPrep: null,
    dateBesoin: '2026-05-28',
    debutPlanif: '2026-05-07',
    picking: 'AValider',
    statut: 'Planifie',
    archive: false,
  },
  {
    id: '4',
    numero: 'OF-2026-045',
    produitFini: 'Bissap Pourpre Citronnelle 1L',
    sku: 'PF-BIS-005',
    qty: 100,
    realise: 0,
    unite: 'btl',
    lotPF: null,
    ligne: 'L1',
    operateurPrep: null,
    dateBesoin: '2026-05-30',
    debutPlanif: '2026-05-08',
    picking: 'AValider',
    statut: 'EnAttenteComposants',
    archive: false,
  },
  {
    id: '5',
    numero: 'OF-2026-041',
    produitFini: 'Bissap Pourpre Original 1L',
    sku: 'PF-BIS-001',
    qty: 200,
    realise: 200,
    unite: 'btl',
    lotPF: 'PF-20260524-0041',
    ligne: 'L1',
    operateurPrep: 'Mamadou D.',
    dateBesoin: '2026-05-15',
    debutPlanif: '2026-05-01',
    picking: 'Valide',
    statut: 'Termine',
    archive: true,
  },
]
