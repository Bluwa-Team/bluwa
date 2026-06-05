// ── Config — imports depuis la couche partagée ────────────────────────────────
export { PAYS as PAYS_CLIENTS, SECTEURS, LANGUES } from '@/config'
export { CONDITIONS_PAIEMENT, TRANSPORTS }         from '@/config'
export { INCOTERMS as INCOTERMS_CLIENT }           from '@/config'

// ── Master Data — Client ──────────────────────────────────────────────────────

export type ClientStatut = 'Actif' | 'Inactif'
export type ClientType = 'Grossiste' | 'Detaillant' | 'Institutionnel' | 'ONG' | 'Export' | 'Autre'

export interface GrilleTarifaire {
  articleCode: string
  designation: string
  prixNegecie: number
  devise: string
}

export interface Client {
  id: string
  code: string
  raisonSociale: string
  statut: ClientStatut
  type: ClientType
  secteur: string
  langue: string
  ville: string
  pays: string
  incoterm: string
  transport: string
  limiteCredit: number | null
  devise: string
  conditionPaiement: string
  paiementMobile: boolean
  contactPrincipal: string
  telephone: string
  email: string
  grilleTarifaire: GrilleTarifaire[]
  createdAt: string
  updatedAt: string
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  Grossiste:      'Grossiste',
  Detaillant:     'Détaillant',
  Institutionnel: 'Institutionnel',
  ONG:            'ONG / Humanitaire',
  Export:         'Export',
  Autre:          'Autre',
}

export const CLIENT_TYPE_COLORS: Record<ClientType, string> = {
  Grossiste:      'bg-blue-100 text-blue-700',
  Detaillant:     'bg-purple-100 text-purple-700',
  Institutionnel: 'bg-orange-100 text-orange-700',
  ONG:            'bg-teal-100 text-teal-700',
  Export:         'bg-indigo-100 text-indigo-700',
  Autre:          'bg-gray-100 text-gray-600',
}

export const STATUT_COLORS: Record<ClientStatut, string> = {
  Actif:   'bg-emerald-100 text-emerald-800',
  Inactif: 'bg-gray-200 text-gray-600',
}
