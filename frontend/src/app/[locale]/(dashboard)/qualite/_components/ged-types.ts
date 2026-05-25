// ── Types ─────────────────────────────────────────────────────────────────────

export type StatutDocument =
  | 'Brouillon'
  | 'EnVerification'
  | 'EnApprobation'
  | 'Publie'
  | 'Archive'

export type TypeDocument = 'Procédure' | 'Instruction' | 'Formulaire'

export interface MembreEquipe {
  nom: string
  role: string
}

export interface DocumentQualite {
  id: string
  code: string
  titre: string
  type: TypeDocument
  version: string          // ex : "1.0", "0.2"
  statut: StatutDocument
  redacteur: string
  verificateur: string     // Expert Technique
  approbateur: string
  description: string
  dateCreation: string     // ISO date
  dateModification: string // ISO date
}

// ── Équipe ────────────────────────────────────────────────────────────────────

export const EQUIPE_QUALITE: MembreEquipe[] = [
  { nom: 'Serge Koné',    role: 'Directeur Qualité'     },
  { nom: 'Régis Mbaye',   role: 'Expert Technique'      },
  { nom: 'Fatou Diallo',  role: 'Responsable QA'        },
  { nom: 'Moussa Traoré', role: 'Technicien Qualité'    },
  { nom: 'Aminata Sow',   role: 'Coordinatrice Qualité' },
]

// ── Labels & Colors ───────────────────────────────────────────────────────────

export const STATUT_DOC_LABELS: Record<StatutDocument, string> = {
  Brouillon:      'Brouillon',
  EnVerification: 'En vérification',
  EnApprobation:  'En approbation',
  Publie:         'Publié',
  Archive:        'Archivé',
}

export const STATUT_DOC_COLORS: Record<StatutDocument, string> = {
  Brouillon:      'bg-slate-100 text-slate-600 border border-slate-200',
  EnVerification: 'bg-blue-100 text-blue-700 border border-blue-200',
  EnApprobation:  'bg-amber-100 text-amber-700 border border-amber-200',
  Publie:         'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Archive:        'bg-red-100 text-red-700 border border-red-200',
}

export const TYPE_DOC_COLORS: Record<TypeDocument, string> = {
  'Procédure':   'bg-violet-100 text-violet-700',
  'Instruction': 'bg-blue-100 text-blue-700',
  'Formulaire':  'bg-orange-100 text-orange-700',
}

export const TYPE_DOC_PREFIXES: Record<TypeDocument, string> = {
  'Procédure':   'PRO',
  'Instruction': 'INS',
  'Formulaire':  'FORM',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Incrémente la version vers le prochain majeur · ex: "0.2" → "1.0" · "1.3" → "2.0" */
export function nextMajorVersion(current: string): string {
  const major = parseInt(current.split('.')[0], 10)
  return `${major + 1}.0`
}

/** Génère un code unique basé sur les documents existants */
export function generateCode(type: TypeDocument, existing: DocumentQualite[]): string {
  const prefix = TYPE_DOC_PREFIXES[type]
  const count = existing.filter((d) => d.code.startsWith(prefix)).length + 1
  return `${prefix}-BLUWA-${String(count).padStart(3, '0')}`
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

export const MOCK_DOCUMENTS_QUALITE: DocumentQualite[] = [
  {
    id: 'd1',
    code: 'PRO-BLUWA-001',
    titre: 'Procédure de fabrication Bissap Pourpre',
    type: 'Procédure',
    version: '2.1',
    statut: 'Publie',
    redacteur: 'Fatou Diallo',
    verificateur: 'Régis Mbaye',
    approbateur: 'Serge Koné',
    description: 'Procédure complète de fabrication des boissons Bissap Pourpre — étapes de macération, filtration, sucrage et embouteillage.',
    dateCreation: '2025-01-15',
    dateModification: '2025-03-10',
  },
  {
    id: 'd2',
    code: 'INS-BLUWA-001',
    titre: 'Instruction de contrôle pH et Brix',
    type: 'Instruction',
    version: '1.3',
    statut: 'Publie',
    redacteur: 'Moussa Traoré',
    verificateur: 'Régis Mbaye',
    approbateur: 'Serge Koné',
    description: 'Méthode de mesure et de contrôle des paramètres physico-chimiques (pH, Brix, température) en cours de production.',
    dateCreation: '2025-02-01',
    dateModification: '2025-04-05',
  },
  {
    id: 'd3',
    code: 'FORM-BLUWA-001',
    titre: 'Formulaire de réception des matières premières',
    type: 'Formulaire',
    version: '0.3',
    statut: 'EnApprobation',
    redacteur: 'Aminata Sow',
    verificateur: 'Régis Mbaye',
    approbateur: 'Serge Koné',
    description: 'Fiche de contrôle à la réception des MP et AC — vérification organoleptique, documentaire et physique.',
    dateCreation: '2026-05-10',
    dateModification: '2026-05-22',
  },
  {
    id: 'd4',
    code: 'INS-BLUWA-002',
    titre: 'Instruction de nettoyage et désinfection des équipements (CIP)',
    type: 'Instruction',
    version: '0.2',
    statut: 'EnVerification',
    redacteur: 'Fatou Diallo',
    verificateur: 'Régis Mbaye',
    approbateur: 'Serge Koné',
    description: 'Protocole CIP (Clean-In-Place) pour les cuves de macération, lignes de filtration et embouteilleuses.',
    dateCreation: '2026-05-18',
    dateModification: '2026-05-24',
  },
  {
    id: 'd5',
    code: 'PRO-BLUWA-002',
    titre: 'Procédure de gestion des non-conformités fournisseurs',
    type: 'Procédure',
    version: '0.1',
    statut: 'Brouillon',
    redacteur: 'Moussa Traoré',
    verificateur: 'Régis Mbaye',
    approbateur: 'Serge Koné',
    description: 'Traitement et suivi des NC fournisseurs : quarantaine, retour, actions correctives et clôture.',
    dateCreation: '2026-05-25',
    dateModification: '2026-05-25',
  },
  {
    id: 'd6',
    code: 'INS-BLUWA-003',
    titre: 'Instruction de calibration des capteurs de température',
    type: 'Instruction',
    version: '0.1',
    statut: 'Brouillon',
    redacteur: 'Fatou Diallo',
    verificateur: 'Régis Mbaye',
    approbateur: 'Serge Koné',
    description: 'Procédure de vérification et d\'étalonnage des sondes de température des fours et réfrigérateurs.',
    dateCreation: '2026-05-26',
    dateModification: '2026-05-26',
  },
  {
    id: 'd7',
    code: 'PRO-BLUWA-000',
    titre: 'Plan HACCP Bissap Pourpre — Édition 2024',
    type: 'Procédure',
    version: '3.0',
    statut: 'Archive',
    redacteur: 'Aminata Sow',
    verificateur: 'Régis Mbaye',
    approbateur: 'Serge Koné',
    description: 'Analyse des dangers et points critiques — version remplacée par le Plan HACCP 2025.',
    dateCreation: '2024-06-01',
    dateModification: '2025-01-10',
  },
]
