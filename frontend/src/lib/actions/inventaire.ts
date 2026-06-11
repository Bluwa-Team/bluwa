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

    // Snapshot articles → lignes de comptage avec stock réel depuis article_stocks
    const { data: articles } = await supabase
      .from('articles')
      .select('id')
      .eq('organization_id', orgId)

    if (articles && articles.length > 0) {
      const articleIds = articles.map((a: { id: string }) => a.id)
      const stockMap = new Map<string, number>()
      const { data: stocks } = await supabase
        .from('article_stocks')
        .select('article_id, quantity_available')
        .eq('organization_id', orgId)
        .in('article_id', articleIds)
      for (const s of stocks ?? []) {
        stockMap.set(s.article_id as string, Number(s.quantity_available) || 0)
      }

      const items = articles.map((a: { id: string }) => ({
        inventory_document_id: doc.id,
        organization_id:       orgId,
        article_id:            a.id,
        batch_number:          null,
        book_quantity:         stockMap.get(a.id) ?? 0,
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

/** COUNTED → POSTED : valide les écarts, écrit les mouvements, ajuste les stocks. */
export async function postInventoryDocument(
  docId: string,
): Promise<InventoryDocument | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const factoryId = await resolveFactoryId(supabase, orgId)

    const { data, error } = await supabase
      .from('inventory_documents')
      .update({ status: 'POSTED', posted_at: new Date().toISOString() })
      .eq('id', docId)
      .eq('organization_id', orgId)
      .eq('status', 'COUNTED')
      .select()
      .single()
    if (error) throw error
    if (!data) return null

    // Lignes avec écart réel
    const { data: adjItems } = await supabase
      .from('inventory_document_items')
      .select('article_id, batch_number, difference_quantity')
      .eq('inventory_document_id', docId)
    const itemsWithDiff = (adjItems ?? []).filter(
      (i) => i.difference_quantity != null && Number(i.difference_quantity) !== 0,
    )

    if (itemsWithDiff.length > 0) {
      // Journal immuable — un mouvement par ligne en écart
      await supabase.from('stock_movements').insert(
        itemsWithDiff.map((i) => ({
          organization_id: orgId,
          factory_id:      factoryId,
          article_id:      i.article_id as string,
          movement_type:   'AJUSTEMENT_INVENTAIRE',
          quantity:        Number(i.difference_quantity),
          unit_price:      0,
          batch_number:    (i.batch_number as string | null) ?? null,
          reference_type:  'INVENTORY',
          reference_id:    docId,
        })),
      )

      // Mise à jour article_stocks (read-then-write par article)
      const articleIds = itemsWithDiff.map((i) => i.article_id as string)
      const { data: stocks } = await supabase
        .from('article_stocks')
        .select('id, article_id, quantity_available')
        .eq('organization_id', orgId)
        .in('article_id', articleIds)
      const stockByArticle = new Map(
        (stocks ?? []).map((s) => [s.article_id as string, s]),
      )

      for (const item of itemsWithDiff) {
        const artId = item.article_id as string
        const diff  = Number(item.difference_quantity)
        const stock = stockByArticle.get(artId)
        if (stock) {
          await supabase
            .from('article_stocks')
            .update({ quantity_available: Number(stock.quantity_available) + diff })
            .eq('id', stock.id as string)
        } else {
          await supabase.from('article_stocks').insert({
            organization_id:    orgId,
            factory_id:         factoryId,
            article_id:         artId,
            quantity_available: diff,
          })
        }
      }
    }

    return toDocument(data as unknown as Record<string, unknown>)
  } catch (e) {
    console.error('[inventaire] postInventoryDocument:', e)
    return null
  }
}
