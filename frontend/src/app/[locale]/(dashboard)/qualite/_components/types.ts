export type StatutLot = 'EnControle' | 'Libere' | 'NonConforme'
export type FluxLot = 'Reception' | 'Production'
export type TypeArticleQA = 'MP' | 'AC' | 'PF' | 'PSF'
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

export interface GenealogiePF {
  codeLotPF: string
  articlePF: string
  numeroOF: string
  dateProduction: string
  quantiteProduite: number
  unite: string
  statut: StatutLot
  ingredients: GenealogieLien[]
}

// ── Labels & Colors ───────────────────────────────────────────────────────────

export const STATUT_LOT_LABELS: Record<StatutLot, string> = {
  EnControle: 'En contrôle',
  Libere: 'Libéré',
  NonConforme: 'Non-conforme',
}

export const STATUT_LOT_COLORS: Record<StatutLot, string> = {
  EnControle: 'bg-amber-100 text-amber-700 border border-amber-200',
  Libere:     'bg-emerald-100 text-emerald-700 border border-emerald-200',
  NonConforme: 'bg-red-100 text-red-700 border border-red-200',
}

export const FLUX_LOT_LABELS: Record<FluxLot, string> = {
  Reception:  'Réception',
  Production: 'Production',
}

export const TYPE_ARTICLE_COLORS: Record<TypeArticleQA, string> = {
  MP:  'bg-blue-100 text-blue-700',
  AC:  'bg-purple-100 text-purple-700',
  PF:  'bg-emerald-100 text-emerald-700',
  PSF: 'bg-orange-100 text-orange-700',
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
      { codeLot: 'LOT-MP-2025-0031', article: "Fleurs d'Hibiscus",     typeArticle: 'MP', qteUtilisee: 6,   unite: 'kg', fournisseur: 'Coopérative de Thiès', dateReception: '2025-05-22', statut: 'EnControle' },
      { codeLot: 'LOT-MP-2025-0028', article: 'Sucre raffiné',         typeArticle: 'MP', qteUtilisee: 9.6, unite: 'kg', fournisseur: 'Sucrivoire SA',         dateReception: '2025-05-10', statut: 'Libere'     },
      { codeLot: 'LOT-MP-2025-0025', article: 'Eau purifiée',          typeArticle: 'MP', qteUtilisee: 240, unite: 'L',  fournisseur: 'Forage interne',         dateReception: '2025-05-24', statut: 'Libere'     },
      { codeLot: 'LOT-AC-2025-0018', article: 'Bouteilles 1L PET',     typeArticle: 'AC', qteUtilisee: 240, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2025-05-23', statut: 'EnControle' },
      { codeLot: 'LOT-AC-2025-0016', article: 'Bouchons vissants',     typeArticle: 'AC', qteUtilisee: 240, unite: 'u',  fournisseur: 'PlastiSénégal',          dateReception: '2025-05-15', statut: 'Libere'     },
      { codeLot: 'LOT-AC-2025-0017', article: 'Étiquettes autocollantes', typeArticle: 'AC', qteUtilisee: 240, unite: 'u', fournisseur: 'ImpriPrint Dakar',    dateReception: '2025-05-18', statut: 'Libere'     },
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
  },
]
