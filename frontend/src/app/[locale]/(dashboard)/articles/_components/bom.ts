// ── Types ─────────────────────────────────────────────────────────────────────

export interface BillOfMaterial {
  id: string
  articleCode: string          // code de l'article PF (ex: PF-BIS-001)
  articleDesignation: string
  version: string              // ex: v1.0
  batchSize: number            // volume de référence du lot (ex: 100)
  batchUnit: string            // unité du lot (ex: 'btl', 'L', 'kg')
  isActive: boolean
  createdAt: string            // YYYY-MM-DD
}

export interface BOMIngredient {
  id: string
  bomId: string
  ingredientCode: string       // code de l'article composant (MP-0001…)
  designation: string
  unite: string                // kg, g, L, mL, u
  qtyPerUnit: number           // quantité par 1 unité de PF (1 bouteille 1L)
  tolerance: number            // tolérance de variance autorisée, en %
}

// ── In-memory mutable store ───────────────────────────────────────────────────
// All getBOMByArticleCode() / updateBOM() calls share this state within the session.

let _boms: BillOfMaterial[] = [
  { id: 'bom-001', articleCode: 'PF-BIS-001', articleDesignation: 'Bissap Pourpre Original 1L',    version: 'v1.0', batchSize: 100, batchUnit: 'btl', isActive: true, createdAt: '2026-01-15' },
  { id: 'bom-002', articleCode: 'PF-BIS-002', articleDesignation: 'Bissap Pourpre Vanille 1L',     version: 'v1.0', batchSize: 100, batchUnit: 'btl', isActive: true, createdAt: '2026-01-15' },
  { id: 'bom-003', articleCode: 'PF-BIS-003', articleDesignation: 'Bissap Pourpre Gingembre 1L',   version: 'v1.0', batchSize: 100, batchUnit: 'btl', isActive: true, createdAt: '2026-01-15' },
  { id: 'bom-004', articleCode: 'PF-BIS-004', articleDesignation: 'Bissap Pourpre Menthe 1L',      version: 'v1.0', batchSize: 100, batchUnit: 'btl', isActive: true, createdAt: '2026-01-15' },
  { id: 'bom-005', articleCode: 'PF-BIS-005', articleDesignation: 'Bissap Pourpre Citronnelle 1L', version: 'v1.0', batchSize: 100, batchUnit: 'btl', isActive: true, createdAt: '2026-01-15' },
]

let _ingredients: BOMIngredient[] = [
  // ── PF-BIS-001 : Bissap Pourpre Original 1L ──────────────────────────────
  { id: 'bom-001-i1', bomId: 'bom-001', ingredientCode: 'MP-0001', designation: "Fleurs d'hibiscus séchées",  unite: 'kg', qtyPerUnit: 0.025,       tolerance: 5  },
  { id: 'bom-001-i2', bomId: 'bom-001', ingredientCode: 'MP-0002', designation: 'Sucre cristallisé',            unite: 'kg', qtyPerUnit: 0.040,       tolerance: 3  },
  { id: 'bom-001-i3', bomId: 'bom-001', ingredientCode: 'MP-0003', designation: 'Eau potable filtrée',           unite: 'L',  qtyPerUnit: 1.000,       tolerance: 2  },
  { id: 'bom-001-i4', bomId: 'bom-001', ingredientCode: 'AC-0001', designation: 'Bouteille verre 1L',             unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-001-i5', bomId: 'bom-001', ingredientCode: 'AC-0002', designation: 'Bouchon métal 1L',               unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-001-i6', bomId: 'bom-001', ingredientCode: 'AC-0003', designation: 'Étiquette Pourpre 1L',           unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },

  // ── PF-BIS-002 : Bissap Pourpre Vanille 1L ───────────────────────────────
  { id: 'bom-002-i1', bomId: 'bom-002', ingredientCode: 'MP-0001', designation: "Fleurs d'hibiscus séchées",  unite: 'kg', qtyPerUnit: 0.025,       tolerance: 5  },
  { id: 'bom-002-i2', bomId: 'bom-002', ingredientCode: 'MP-0002', designation: 'Sucre cristallisé',            unite: 'kg', qtyPerUnit: 0.040,       tolerance: 3  },
  { id: 'bom-002-i3', bomId: 'bom-002', ingredientCode: 'MP-0003', designation: 'Eau potable filtrée',           unite: 'L',  qtyPerUnit: 1.000,       tolerance: 2  },
  { id: 'bom-002-i4', bomId: 'bom-002', ingredientCode: 'MP-0010', designation: 'Gousses de vanille',             unite: 'kg', qtyPerUnit: 0.072 / 410, tolerance: 10 },
  { id: 'bom-002-i5', bomId: 'bom-002', ingredientCode: 'AC-0001', designation: 'Bouteille verre 1L',             unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-002-i6', bomId: 'bom-002', ingredientCode: 'AC-0002', designation: 'Bouchon métal 1L',               unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-002-i7', bomId: 'bom-002', ingredientCode: 'AC-0003', designation: 'Étiquette Pourpre 1L',           unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },

  // ── PF-BIS-003 : Bissap Pourpre Gingembre 1L ─────────────────────────────
  { id: 'bom-003-i1', bomId: 'bom-003', ingredientCode: 'MP-0001', designation: "Fleurs d'hibiscus séchées",  unite: 'kg', qtyPerUnit: 0.025,       tolerance: 5  },
  { id: 'bom-003-i2', bomId: 'bom-003', ingredientCode: 'MP-0002', designation: 'Sucre cristallisé',            unite: 'kg', qtyPerUnit: 0.040,       tolerance: 3  },
  { id: 'bom-003-i3', bomId: 'bom-003', ingredientCode: 'MP-0003', designation: 'Eau potable filtrée',           unite: 'L',  qtyPerUnit: 1.000,       tolerance: 2  },
  { id: 'bom-003-i4', bomId: 'bom-003', ingredientCode: 'MP-0011', designation: 'Gingembre frais',               unite: 'kg', qtyPerUnit: 1.1 / 410,   tolerance: 10 },
  { id: 'bom-003-i5', bomId: 'bom-003', ingredientCode: 'AC-0001', designation: 'Bouteille verre 1L',             unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-003-i6', bomId: 'bom-003', ingredientCode: 'AC-0002', designation: 'Bouchon métal 1L',               unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-003-i7', bomId: 'bom-003', ingredientCode: 'AC-0003', designation: 'Étiquette Pourpre 1L',           unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },

  // ── PF-BIS-004 : Bissap Pourpre Menthe 1L ────────────────────────────────
  { id: 'bom-004-i1', bomId: 'bom-004', ingredientCode: 'MP-0001', designation: "Fleurs d'hibiscus séchées",  unite: 'kg', qtyPerUnit: 0.025,       tolerance: 5  },
  { id: 'bom-004-i2', bomId: 'bom-004', ingredientCode: 'MP-0002', designation: 'Sucre cristallisé',            unite: 'kg', qtyPerUnit: 0.040,       tolerance: 3  },
  { id: 'bom-004-i3', bomId: 'bom-004', ingredientCode: 'MP-0003', designation: 'Eau potable filtrée',           unite: 'L',  qtyPerUnit: 1.000,       tolerance: 2  },
  { id: 'bom-004-i4', bomId: 'bom-004', ingredientCode: 'MP-0012', designation: 'Feuilles de menthe fraîche',   unite: 'kg', qtyPerUnit: 0.3 / 410,   tolerance: 10 },
  { id: 'bom-004-i5', bomId: 'bom-004', ingredientCode: 'AC-0001', designation: 'Bouteille verre 1L',             unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-004-i6', bomId: 'bom-004', ingredientCode: 'AC-0002', designation: 'Bouchon métal 1L',               unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-004-i7', bomId: 'bom-004', ingredientCode: 'AC-0003', designation: 'Étiquette Pourpre 1L',           unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },

  // ── PF-BIS-005 : Bissap Pourpre Citronnelle 1L ───────────────────────────
  { id: 'bom-005-i1', bomId: 'bom-005', ingredientCode: 'MP-0001', designation: "Fleurs d'hibiscus séchées",  unite: 'kg', qtyPerUnit: 0.025,       tolerance: 5  },
  { id: 'bom-005-i2', bomId: 'bom-005', ingredientCode: 'MP-0002', designation: 'Sucre cristallisé',            unite: 'kg', qtyPerUnit: 0.040,       tolerance: 3  },
  { id: 'bom-005-i3', bomId: 'bom-005', ingredientCode: 'MP-0003', designation: 'Eau potable filtrée',           unite: 'L',  qtyPerUnit: 1.000,       tolerance: 2  },
  { id: 'bom-005-i4', bomId: 'bom-005', ingredientCode: 'MP-0013', designation: 'Citronnelle séchée',             unite: 'kg', qtyPerUnit: 0.24 / 410,  tolerance: 10 },
  { id: 'bom-005-i5', bomId: 'bom-005', ingredientCode: 'AC-0001', designation: 'Bouteille verre 1L',             unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-005-i6', bomId: 'bom-005', ingredientCode: 'AC-0002', designation: 'Bouchon métal 1L',               unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
  { id: 'bom-005-i7', bomId: 'bom-005', ingredientCode: 'AC-0003', designation: 'Étiquette Pourpre 1L',           unite: 'u',  qtyPerUnit: 1,           tolerance: 0  },
]

// ── Public API ────────────────────────────────────────────────────────────────

// Static snapshot — used by the OF modal product dropdown (list never changes).
export const MOCK_BOMS: BillOfMaterial[] = _boms

/** Reads from live mutable state; reflects any prior updateBOM() call. */
export function getBOMByArticleCode(articleCode: string): {
  bom: BillOfMaterial | null
  ingredients: BOMIngredient[]
} {
  const bom = _boms.find((b) => b.articleCode === articleCode && b.isActive) ?? null
  const ingredients = bom ? _ingredients.filter((i) => i.bomId === bom.id) : []
  return { bom, ingredients }
}

/** Persists BOM header + ingredient changes to the shared in-memory store.
 *  All subsequent getBOMByArticleCode() calls for this article see the new data.
 */
export function updateBOM(
  bomId: string,
  header: Pick<BillOfMaterial, 'version' | 'batchSize' | 'batchUnit'>,
  newIngredients: BOMIngredient[],
): void {
  _boms = _boms.map((b) => (b.id === bomId ? { ...b, ...header } : b))
  _ingredients = [
    ..._ingredients.filter((i) => i.bomId !== bomId),
    ...newIngredients,
  ]
}

/** Creates a brand-new BOM for an article that has none yet. */
export function createBOM(
  articleCode: string,
  articleDesignation: string,
  header: Pick<BillOfMaterial, 'version' | 'batchSize' | 'batchUnit'>,
  newIngredients: BOMIngredient[],
): BillOfMaterial {
  const id = `bom-${Date.now()}`
  const today = new Date().toISOString().slice(0, 10)
  const newBom: BillOfMaterial = {
    id,
    articleCode,
    articleDesignation,
    ...header,
    isActive: true,
    createdAt: today,
  }
  _boms = [..._boms, newBom]
  _ingredients = [
    ..._ingredients,
    ...newIngredients.map((i) => ({ ...i, bomId: id })),
  ]
  return newBom
}

export const UNITE_OPTIONS = ['kg', 'g', 'L', 'mL', 'u', 'pièce'] as const

// Catalogue des matières premières et articles de conditionnement disponibles
// pour le sélecteur dans la modale de configuration de nomenclature.
export const AVAILABLE_COMPONENTS = [
  { code: 'MP-0001', designation: "Fleurs d'hibiscus séchées",      unite: 'kg' },
  { code: 'MP-0002', designation: 'Sucre cristallisé',               unite: 'kg' },
  { code: 'MP-0003', designation: 'Eau potable filtrée',              unite: 'L'  },
  { code: 'MP-0004', designation: 'Colorant naturel (E163)',          unite: 'g'  },
  { code: 'MP-0005', designation: 'Acide citrique alimentaire',       unite: 'g'  },
  { code: 'MP-0006', designation: 'Conservateur E211',                unite: 'g'  },
  { code: 'MP-0010', designation: 'Gousses de vanille',               unite: 'kg' },
  { code: 'MP-0011', designation: 'Gingembre frais',                  unite: 'kg' },
  { code: 'MP-0012', designation: 'Feuilles de menthe fraîche',      unite: 'kg' },
  { code: 'MP-0013', designation: 'Citronnelle séchée',               unite: 'kg' },
  { code: 'AC-0001', designation: 'Bouteille verre 1L',               unite: 'u'  },
  { code: 'AC-0002', designation: 'Bouchon métal 1L',                 unite: 'u'  },
  { code: 'AC-0003', designation: 'Étiquette Pourpre 1L',             unite: 'u'  },
  { code: 'AC-0004', designation: "Carton d'emballage (12 btl)",     unite: 'u'  },
] as const
