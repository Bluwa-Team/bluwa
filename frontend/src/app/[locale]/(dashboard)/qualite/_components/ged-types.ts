// ── GED Qualité — version simplifiée ──────────────────────────────────────────
// Liens vers documents externes (Google Drive, Dropbox, OneDrive…)
// Pas de workflow d'approbation — trop lourd pour les PME agro Phase 1.

export type TypeDocument = 'Procédure' | 'Instruction' | 'Formulaire' | 'Enregistrement'

export type StatutDocument = 'Actif' | 'Archivé'

export interface DocumentQualite {
  id:          string
  code:        string          // ex: PRO-BLUWA-001
  titre:       string
  type:        TypeDocument
  statut:      StatutDocument
  version:     string          // ex: "2.1"
  lienExterne: string          // URL Google Drive / Dropbox / OneDrive
  description: string
  dateRevision: string         // ISO date — prochaine révision
  createdAt:   string
  updatedAt:   string
}

// ── Labels & Colors ───────────────────────────────────────────────────────────

export const TYPE_DOC_LABELS: Record<TypeDocument, string> = {
  'Procédure':      'Procédure',
  'Instruction':    'Instruction',
  'Formulaire':     'Formulaire',
  'Enregistrement': 'Enregistrement',
}

export const TYPE_DOC_COLORS: Record<TypeDocument, string> = {
  'Procédure':      'bg-violet-100 text-violet-700',
  'Instruction':    'bg-blue-100 text-blue-700',
  'Formulaire':     'bg-orange-100 text-orange-700',
  'Enregistrement': 'bg-teal-100 text-teal-700',
}

export const TYPE_DOC_PREFIXES: Record<TypeDocument, string> = {
  'Procédure':      'PRO',
  'Instruction':    'INS',
  'Formulaire':     'FORM',
  'Enregistrement': 'ENR',
}

export const STATUT_DOC_COLORS: Record<StatutDocument, string> = {
  'Actif':   'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'Archivé': 'bg-slate-100 text-slate-500 border border-slate-200',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function generateCode(type: TypeDocument, existing: DocumentQualite[]): string {
  const prefix = TYPE_DOC_PREFIXES[type]
  const count  = existing.filter(d => d.code.startsWith(prefix)).length + 1
  return `${prefix}-BLUWA-${String(count).padStart(3, '0')}`
}

/** Retourne true si la révision approche dans moins de 30 jours */
export function revisionUrgente(dateRevision: string): boolean {
  const diff = Math.ceil(
    (new Date(dateRevision).getTime() - Date.now()) / 86_400_000,
  )
  return diff >= 0 && diff <= 30
}

/** Retourne true si la révision est dépassée */
export function revisionDepassee(dateRevision: string): boolean {
  return new Date(dateRevision).getTime() < Date.now()
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

export const MOCK_DOCUMENTS_QUALITE: DocumentQualite[] = [
  {
    id: 'd1', code: 'PRO-BLUWA-001',
    titre: 'Procédure de fabrication Bissap Pourpre',
    type: 'Procédure', statut: 'Actif', version: '2.1',
    lienExterne: 'https://drive.google.com/file/d/exemple-pro-001',
    description: 'Procédure complète : macération, filtration, sucrage, embouteillage.',
    dateRevision: '2026-11-15',
    createdAt: '2025-01-15', updatedAt: '2025-03-10',
  },
  {
    id: 'd2', code: 'INS-BLUWA-001',
    titre: 'Instruction de contrôle pH et Brix',
    type: 'Instruction', statut: 'Actif', version: '1.3',
    lienExterne: 'https://drive.google.com/file/d/exemple-ins-001',
    description: 'Méthode de mesure pH, Brix et température en cours de production.',
    dateRevision: '2026-10-01',
    createdAt: '2025-02-01', updatedAt: '2025-04-05',
  },
  {
    id: 'd3', code: 'FORM-BLUWA-001',
    titre: 'Formulaire de réception des matières premières',
    type: 'Formulaire', statut: 'Actif', version: '1.0',
    lienExterne: 'https://drive.google.com/file/d/exemple-form-001',
    description: 'Fiche de contrôle à la réception : organoleptique, documentaire, physique.',
    dateRevision: '2026-06-20',
    createdAt: '2026-05-10', updatedAt: '2026-05-22',
  },
  {
    id: 'd4', code: 'INS-BLUWA-002',
    titre: 'Instruction nettoyage & désinfection (CIP)',
    type: 'Instruction', statut: 'Actif', version: '0.9',
    lienExterne: 'https://drive.google.com/file/d/exemple-ins-002',
    description: 'Protocole CIP pour cuves, lignes de filtration et embouteilleuses.',
    dateRevision: '2026-09-01',
    createdAt: '2026-05-18', updatedAt: '2026-05-24',
  },
  {
    id: 'd5', code: 'ENR-BLUWA-001',
    titre: 'Registre de surveillance PCC — Pasteurisation',
    type: 'Enregistrement', statut: 'Actif', version: '1.0',
    lienExterne: 'https://drive.google.com/file/d/exemple-enr-001',
    description: 'Fiche journalière d\'enregistrement des températures de pasteurisation (PCC 2).',
    dateRevision: '2026-12-31',
    createdAt: '2026-01-01', updatedAt: '2026-06-01',
  },
  {
    id: 'd6', code: 'PRO-BLUWA-000',
    titre: 'Plan HACCP Bissap Pourpre — Édition 2024',
    type: 'Procédure', statut: 'Archivé', version: '3.0',
    lienExterne: 'https://drive.google.com/file/d/exemple-pro-000',
    description: 'Analyse des dangers et PCC — version remplacée par l\'édition 2025.',
    dateRevision: '2024-12-31',
    createdAt: '2024-06-01', updatedAt: '2025-01-10',
  },
]
