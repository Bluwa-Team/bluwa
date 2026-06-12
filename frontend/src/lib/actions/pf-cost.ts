'use server'

import { getSupabaseWithOrg } from './helpers'

/**
 * Calcule et enregistre le PMP théorique d'un article PF depuis sa nomenclature active.
 *
 * Formule : Σ(qté_composant × PMP_composant) / base_quantity
 *
 * - Ne s'exécute que si articles.type = 'PF' (guard double-clé en JS et en SQL).
 * - Déclenché automatiquement à chaque sauvegarde de nomenclature.
 * - Écrasé par computeRealPmpFromOf() dès qu'un OF est clôturé avec des consommations réelles.
 *
 * @returns PMP calculé (arrondi à 2 décimales) ou null si pas de nomenclature.
 */
export async function computeTheoreticalPmp(
  articleId: string,
): Promise<number | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    // Guard : PF uniquement
    const { data: art } = await supabase
      .from('articles')
      .select('type')
      .eq('id', articleId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if ((art as any)?.type !== 'PF') return null

    // Nomenclature active
    const { data: bomHeader } = await supabase
      .from('bom_headers')
      .select('id, base_quantity, batch_size')
      .eq('organization_id', orgId)
      .eq('article_id', articleId)
      .eq('is_active', true)
      .maybeSingle()
    if (!bomHeader) return null

    const baseQty =
      Number((bomHeader as any).base_quantity) ||
      Number((bomHeader as any).batch_size) ||
      1

    // Lignes de nomenclature avec PMP de chaque composant
    const { data: items } = await supabase
      .from('bom_items')
      .select('quantity, articles!component_id(pmp)')
      .eq('bom_header_id', (bomHeader as any).id)

    if (!items || items.length === 0) return null

    // Σ qté × PMP_composant
    let totalCost = 0
    for (const item of items) {
      const qty          = Number((item as any).quantity)          || 0
      const componentPmp = Number((item as any).articles?.pmp)     || 0
      totalCost += qty * componentPmp
    }

    const pmpTheorique = Math.round((totalCost / baseQty) * 100) / 100

    // Mise à jour — la clause .eq('type', 'PF') est le second verrou côté SQL
    await supabase
      .from('articles')
      .update({ pmp: pmpTheorique, updated_at: new Date().toISOString() })
      .eq('id', articleId)
      .eq('organization_id', orgId)
      .eq('type', 'PF')

    return pmpTheorique
  } catch (e) {
    console.error('[pf-cost] computeTheoreticalPmp:', e)
    return null
  }
}

/**
 * Calcule et enregistre le PMP réel d'un PF d'après les consommations effectives de l'OF.
 *
 * Formule : Σ(|qté_sortie| × prix_unitaire_au_moment_de_la_consommation) / quantité_produite
 *
 * Si aucun mouvement de type SORTIE_PRODUCTION n'est trouvé pour cet OF
 * (flux non encore enregistré), retombe sur computeTheoreticalPmp().
 *
 * Appelé automatiquement lors de la comptabilisation d'une déclaration de production (POSTED).
 */
export async function computeRealPmpFromOf(
  productionOrderId: string,
  articleId: string,
  quantityProduced: number,
): Promise<number | null> {
  try {
    if (quantityProduced <= 0) return null

    const { supabase, orgId } = await getSupabaseWithOrg()

    // Guard : PF uniquement
    const { data: art } = await supabase
      .from('articles')
      .select('type')
      .eq('id', articleId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if ((art as any)?.type !== 'PF') return null

    // Consommations enregistrées pour cet OF
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('quantity, unit_price')
      .eq('organization_id', orgId)
      .eq('reference_type', 'production_order')
      .eq('reference_id', productionOrderId)
      .eq('movement_type', 'SORTIE_PRODUCTION')

    if (!movements || movements.length === 0) {
      // Pas encore de consommations enregistrées → PMP théorique comme approximation
      return computeTheoreticalPmp(articleId)
    }

    // Σ |qté| × prix_unitaire au moment de la consommation
    let totalMaterialCost = 0
    for (const m of movements) {
      const qty       = Math.abs(Number((m as any).quantity))   || 0
      const unitPrice = Number((m as any).unit_price)           || 0
      totalMaterialCost += qty * unitPrice
    }

    const realPmp = Math.round((totalMaterialCost / quantityProduced) * 100) / 100

    await supabase
      .from('articles')
      .update({ pmp: realPmp, updated_at: new Date().toISOString() })
      .eq('id', articleId)
      .eq('organization_id', orgId)
      .eq('type', 'PF')

    return realPmp
  } catch (e) {
    console.error('[pf-cost] computeRealPmpFromOf:', e)
    return null
  }
}
