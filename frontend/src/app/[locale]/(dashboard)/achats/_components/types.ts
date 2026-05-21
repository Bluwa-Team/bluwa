export type TypeFournisseur = 'Formel' | 'Informel'

export interface BonAchat {
  id: string
  numero: string
  date: string
  fournisseur: string
  typeFournisseur: TypeFournisseur
  article: string
  quantite: number
  unite: string
  prixUnitaire: number
  total: number
  lotCree: string | null
}

export const TYPE_FOURN_COLORS: Record<TypeFournisseur, string> = {
  Formel: 'bg-blue-50 text-blue-700 border border-blue-200',
  Informel: 'bg-orange-50 text-orange-700 border border-orange-200',
}

export const MOCK_BONS_ACHAT: BonAchat[] = [
  {
    id: '1',
    numero: 'BA-2026-022',
    date: '2026-05-04',
    fournisseur: 'Coop. Bissap Kaolack',
    typeFournisseur: 'Formel',
    article: "Fleurs d'hibiscus séchées",
    quantite: 200,
    unite: 'kg',
    prixUnitaire: 2200,
    total: 440000,
    lotCree: 'LOT-HIB-022',
  },
  {
    id: '2',
    numero: 'BA-2026-021',
    date: '2026-05-02',
    fournisseur: 'Sucrerie Niari',
    typeFournisseur: 'Formel',
    article: 'Sucre cristallisé',
    quantite: 300,
    unite: 'kg',
    prixUnitaire: 650,
    total: 195000,
    lotCree: 'LOT-SUC-021',
  },
  {
    id: '3',
    numero: 'BA-2026-020',
    date: '2026-04-29',
    fournisseur: 'Verrerie Dakar',
    typeFournisseur: 'Formel',
    article: 'Bouteille verre 1L',
    quantite: 2400,
    unite: 'u',
    prixUnitaire: 180,
    total: 432000,
    lotCree: 'LOT-BOU-020',
  },
  {
    id: '4',
    numero: 'BA-2026-019',
    date: '2026-04-26',
    fournisseur: 'Maraîcher Pikine',
    typeFournisseur: 'Informel',
    article: 'Gingembre frais',
    quantite: 40,
    unite: 'kg',
    prixUnitaire: 1200,
    total: 48000,
    lotCree: 'LOT-GIN-019',
  },
  {
    id: '5',
    numero: 'BA-2026-018',
    date: '2026-04-22',
    fournisseur: 'Vanille Madagascar',
    typeFournisseur: 'Formel',
    article: 'Gousses de vanille',
    quantite: 1.5,
    unite: 'kg',
    prixUnitaire: 85000,
    total: 127500,
    lotCree: 'LOT-VAN-018',
  },
]
