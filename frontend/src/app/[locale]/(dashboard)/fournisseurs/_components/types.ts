// ── Config — imports depuis la couche partagée ────────────────────────────────
export { PAYS as PAYS_AFRIQUE_OUEST }      from '@/config'
export { DEVISES }                          from '@/config'
export { INCOTERMS as MODES_LOGISTIQUE }   from '@/config'

// ── Master Data — Fournisseur ─────────────────────────────────────────────────

export type FournisseurStatut        = 'Formel' | 'Informel'
export type FournisseurQualification = 'Agree' | 'AQualifier' | 'Suspendu'

export interface Fournisseur {
  id: string
  code: string
  raisonSociale: string
  statut: FournisseurStatut
  qualification: FournisseurQualification
  categorie: string
  devise: string
  contactPrincipal: string
  telephone: string
  email: string
  ville: string
  pays: string
  modeLogistique: string
  paiementMobile: boolean
  scoreFilabilite: number | null
  createdAt: string
  updatedAt: string
}

export const CATEGORIES_FOURNISSEUR = [
  'Matières premières agricoles',
  'Ingrédients & Additifs',
  'Emballages & Conditionnement',
  'Services & Logistique',
  'Autres',
]

export const QUALIFICATION_COLORS: Record<FournisseurQualification, string> = {
  Agree:      'bg-emerald-100 text-emerald-800',
  AQualifier: 'bg-amber-400 text-amber-950',
  Suspendu:   'bg-red-600 text-white',
}

export const QUALIFICATION_LABELS: Record<FournisseurQualification, string> = {
  Agree:      'Agréé',
  AQualifier: 'À qualifier',
  Suspendu:   'Suspendu',
}

export const STATUT_COLORS: Record<FournisseurStatut, string> = {
  Formel:   'bg-blue-100 text-blue-700',
  Informel: 'bg-gray-100 text-gray-600',
}

// ── Transactionnel — Contrat d'achat ─────────────────────────────────────────
// Note : ContratAchat est un document transactionnel (cycle de vie, dates,
// statut évolutif). Il est défini ici par proximité fonctionnelle mais
// sera migré dans approvisionnement/ lors du passage au backend.

export type ContratStatut = 'Actif' | 'Expire' | 'EnNegociation'

export interface ContratAchat {
  id: string
  reference: string
  article: string
  dateDebut: string
  dateFin: string
  prixUnitaire: number
  devise: string
  quantiteMin: number
  unite: string
  statut: ContratStatut
}

export const CONTRAT_STATUT_COLORS: Record<ContratStatut, string> = {
  Actif:         'bg-emerald-100 text-emerald-800',
  Expire:        'bg-red-100 text-red-700',
  EnNegociation: 'bg-amber-100 text-amber-800',
}

export const CONTRAT_STATUT_LABELS: Record<ContratStatut, string> = {
  Actif:         'Actif',
  Expire:        'Expiré',
  EnNegociation: 'En négociation',
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground'
  if (score >= 70)    return 'text-emerald-600'
  if (score >= 40)    return 'text-amber-600'
  return 'text-red-600'
}
