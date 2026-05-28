'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  InventoryDocument,
  InventoryDocumentItem,
  InventoryStatus,
} from '@/types/erp'

// ── Mappers ───────────────────────────────────────────────────────────────────

function toDocument(row: Record<string, unknown>): InventoryDocument {
  return {
    id:             row.id as string,
    organizationId: row.organization_id as string,
    factoryId:      row.factory_id as string,
    documentNumber: row.document_number as string,
    status:         (row.status as InventoryStatus) ?? 'PROPOSED',
    createdBy:      (row.created_by as string | null) ?? null,
    createdAt:      row.created_at as string,
    postedAt:       (row.posted_at as string | null) ?? null,
  }
}

function toItem(
  row: Record<string, unknown>,
  article?: { code: string; designation: string; unite_stock: string } | null,
): InventoryDocumentItem {
  // Le JOIN articles!article_id peut arriver emboîté dans row.articles
  const art = article ?? (row.articles as typeof article) ?? null
  return {
    id:                   row.id as string,
    inventoryDocumentId:  row.inventory_document_id as string,
    articleId:            row.article_id as string,
    articleCode:          art?.code           ?? '',
    articleDesignation:   art?.designation    ?? '',
    unite:                art?.unite_stock    ?? '',
    batchNumber:          (row.batch_number as string | null) ?? null,
    bookQuantity:         parseFloat(String(row.book_quantity    ?? 0)),
    countedQuantity:      row.counted_quantity != null
                            ? parseFloat(String(row.counted_quantity))
                            : null,
    // difference_quantity est GENERATED ALWAYS AS dans la DB — on la lit, on ne l'écrit jamais
    differenceQuantity:   row.difference_quantity != null
                            ? parseFloat(String(row.difference_quantity))
                            : null,
  }
}

// ── Helpers internes ──────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseWithOrg>>['supabase']

async function resolveFactoryId(supabase: SupabaseClient, orgId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('factory_id')
    .eq('organization_id', orgId)
    .maybeSingle()
  if (profile?.factory_id) return profile.factory_id as string

  const { data: factory } = await supabase
    .from('factories')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle()
  if (factory?.id) return factory.id as string
  throw new Error('Aucune usine trouvée pour cette organisation')
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** Tous les documents d'inventaire, du plus récent au plus ancien. */
export async function getInventoryDocuments(): Promise<InventoryDocument[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('inventory_documents')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => toDocument(r as unknown as Record<string, unknown>))
  } catch (e) {
    console.error('[inventaire] getInventoryDocuments:', e)
    return []
  }
}

/** Lignes de comptage d'un document, enrichies avec les infos article. */
export async function getInventoryDocumentItems(
  docId: string,
): Promise<InventoryDocumentItem[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('inventory_document_items')
      .select('*, articles!article_id(code, designation, unite_stock)')
      .eq('inventory_document_id', docId)
      // Vérification RLS indirecte : on vérifie que le doc appartient à l'org
      .order('id', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => toItem(r as unknown as Record<string, unknown>))
  } catch (e) {
    console.error('[inventaire] getInventoryDocumentItems:', e)
    return []
  }
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Crée un document d'inventaire en statut PROPOSED.
 * Génère N° INV-YYYY-NNNN et prend un snapshot de tous les articles actifs
 * avec book_quantity = 0 (sera mis à jour une fois le module stocks câblé sur Supabase).
 */
export async function createInventoryDocument(): Promise<InventoryDocument | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data: { user } } = await supabase.auth.getUser()
    const factoryId = await resolveFactoryId(supabase, orgId)

    // Génération N° séquentiel : INV-YYYY-NNNN
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('inventory_documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .like('document_number', `INV-${year}-%`)
    const seq = String((count ?? 0) + 1).padStart(4, '0')
    const documentNumber = `INV-${year}-${seq}`

    // Création du document
    const { data: doc, error: docError } = await supabase
      .from('inventory_documents')
      .insert({
        organization_id: orgId,
        factory_id:      factoryId,
        document_number: documentNumber,
        status:          'PROPOSED',
        created_by:      user?.id ?? null,
      })
      .select()
      .single()
    if (docError) throw docError

    // Snapshot articles → lignes de comptage (book_quantity = 0)
    // TODO: remplacer par le stock réel une fois article_stocks câblé (migration 009)
    const { data: articles } = await supabase
      .from('articles')
      .select('id')
      .eq('organization_id', orgId)

    if (articles && articles.length > 0) {
      const items = articles.map((a: { id: string }) => ({
        inventory_document_id: doc.id,
        article_id:            a.id,
        batch_number:          null,
        book_quantity:         0,
        counted_quantity:      null,
      }))
      const { error: itemsError } = await supabase
        .from('inventory_document_items')
        .insert(items)
      if (itemsError) console.warn('[inventaire] snapshot items partial error:', itemsError)
    }

    return toDocument(doc as unknown as Record<string, unknown>)
  } catch (e) {
    console.error('[inventaire] createInventoryDocument:', e)
    return null
  }
}

/**
 * Met à jour les quantités comptées d'un document.
 * Si toutes les lignes sont remplies après la sauvegarde, passe le doc en COUNTED.
 * Retourne les lignes mises à jour + le nouveau statut du document.
 */
export async function saveInventoryCounts(
  docId: string,
  counts: Record<string, number | null>,
): Promise<{ items: InventoryDocumentItem[]; docStatus: InventoryStatus } | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    // Mise à jour en parallèle de chaque ligne modifiée
    const updates = Object.entries(counts).map(([itemId, qty]) =>
      supabase
        .from('inventory_document_items')
        .update({ counted_quantity: qty })
        .eq('id', itemId)
        // Vérification indirecte que le doc appartient bien à l'org (RLS)
    )
    await Promise.all(updates)

    // Relecture des lignes avec le différentiel calculé par la DB
    const { data: items, error: readError } = await supabase
      .from('inventory_document_items')
      .select('*, articles!article_id(code, designation, unite_stock)')
      .eq('inventory_document_id', docId)
      .order('id', { ascending: true })
    if (readError) throw readError

    const mapped = (items ?? []).map((r) =>
      toItem(r as unknown as Record<string, unknown>),
    )

    // Passage automatique PROPOSED → COUNTED si toutes les lignes sont saisies
    const allCounted = mapped.length > 0 && mapped.every((i) => i.countedQuantity !== null)
    let docStatus: InventoryStatus = 'PROPOSED'

    if (allCounted) {
      const { data: updated } = await supabase
        .from('inventory_documents')
        .update({ status: 'COUNTED' })
        .eq('id', docId)
        .eq('organization_id', orgId)
        .eq('status', 'PROPOSED')   // n'écrase pas un statut déjà avancé
        .select('status')
        .single()
      docStatus = (updated?.status as InventoryStatus) ?? 'COUNTED'
    }

    return { items: mapped, docStatus }
  } catch (e) {
    console.error('[inventaire] saveInventoryCounts:', e)
    return null
  }
}

/**
 * COUNTED → POSTED : valide les écarts comptables.
 * Note : dans une implémentation complète, génère des mouvements INV_ADJ
 * dans stock_movements pour chaque ligne avec difference_quantity ≠ 0.
 * TODO: ajouter les mouvements une fois stock_movements câblé (migration 007).
 */
export async function postInventoryDocument(
  docId: string,
): Promise<InventoryDocument | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('inventory_documents')
      .update({ status: 'POSTED', posted_at: new Date().toISOString() })
      .eq('id', docId)
      .eq('organization_id', orgId)
      .eq('status', 'COUNTED')   // RLS-grade : seuls les COUNTED sont postables
      .select()
      .single()
    if (error) throw error
    return data ? toDocument(data as unknown as Record<string, unknown>) : null
  } catch (e) {
    console.error('[inventaire] postInventoryDocument:', e)
    return null
  }
}
