'use server'

import { getSupabaseWithOrg } from './helpers'
import { BillOfMaterial, BOMIngredient } from '@/app/[locale]/(dashboard)/articles/_components/bom'
import { GammeFabrication, GammeEtape } from '@/app/[locale]/(dashboard)/articles/_components/gamme'

// ── Mappers ───────────────────────────────────────────────────────────────────

function toBomHeader(
  row: Record<string, unknown>,
  articleCode = '',
  articleDesignation = '',
): BillOfMaterial {
  return {
    id:                 row.id as string,
    articleCode,
    articleDesignation,
    version:            (row.version as string)      ?? 'v1.0',
    versionName:        (row.version_name as string) ?? '',
    batchSize:          parseFloat(String(row.batch_size  ?? 1)),
    baseQuantity:       parseFloat(String(row.base_quantity ?? row.batch_size ?? 1)),
    batchUnit:          (row.batch_unit as string) ?? '',
    isActive:           (row.is_active as boolean) ?? true,
    createdAt:          ((row.created_at as string) ?? '').split('T')[0],
  }
}

function toBomIngredient(
  row: Record<string, unknown>,
  ingredientCode: string,
  batchSize: number,
): BOMIngredient {
  const quantity = parseFloat(String(row.quantity ?? 0))
  return {
    id:                    row.id as string,
    bomId:                 row.bom_header_id as string,
    ingredientCode,
    designation:           (row.component_label as string) ?? '',
    unite:                 (row.unit as string) ?? 'kg',
    qtyPerUnit:            batchSize > 0 ? quantity / batchSize : quantity,
    tolerance:             parseFloat(String(row.tolerance_pct ?? 0)),
    scrapFactorPercentage: parseFloat(String(row.scrap_pct ?? 0)),
  }
}

function toRoutingHeader(
  row: Record<string, unknown>,
  articleCode = '',
  articleDesignation = '',
): GammeFabrication {
  return {
    id:                 row.id as string,
    articleCode,
    articleDesignation,
    version:            (row.version as string) ?? 'v1.0',
    isActive:           (row.is_active as boolean) ?? true,
    createdAt:          ((row.created_at as string) ?? '').split('T')[0],
  }
}

function toRoutingStep(row: Record<string, unknown>): GammeEtape {
  return {
    id:                    row.id as string,
    gammeId:               row.routing_header_id as string,
    ordre:                 (row.step_order as number) ?? 1,
    operation:             (row.operation as string) ?? '',
    duree:                 (row.duration_min as number) ?? 0,
    setupTimeMinutes:      parseFloat(String(row.setup_time_minutes ?? 0)),
    runTimeMinutesPerUnit: parseFloat(String(row.run_time_minutes_per_unit ?? 0)),
    temperature:           row.temperature_c != null ? parseFloat(String(row.temperature_c)) : undefined,
    equipement:            (row.equipment as string) ?? '',
    pointControle:         (row.control_point as string | undefined) ?? undefined,
  }
}

// ── BOM — Read ────────────────────────────────────────────────────────────────

export async function getBomByArticleId(articleId: string): Promise<{
  bom: BillOfMaterial | null
  ingredients: BOMIngredient[]
}> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data: header, error: headerError } = await supabase
      .from('bom_headers')
      .select('*, articles!article_id(code, designation)')
      .eq('organization_id', orgId)
      .eq('article_id', articleId)
      .eq('is_active', true)
      .maybeSingle()

    if (headerError) throw headerError
    if (!header) return { bom: null, ingredients: [] }

    const articleRef = header.articles as { code: string; designation: string } | null
    const bom = toBomHeader(
      header as unknown as Record<string, unknown>,
      articleRef?.code ?? '',
      articleRef?.designation ?? '',
    )

    const { data: items, error: itemsError } = await supabase
      .from('bom_items')
      .select('*, articles!component_id(code)')
      .eq('bom_header_id', header.id)
      .order('item_position')

    if (itemsError) throw itemsError

    const ingredients = (items ?? []).map((item) => {
      const comp = (item as unknown as { articles: { code: string } | null }).articles
      return toBomIngredient(
        item as unknown as Record<string, unknown>,
        comp?.code ?? '',
        bom.batchSize,
      )
    })

    return { bom, ingredients }
  } catch (e) {
    console.error('[bom action] getBomByArticleId:', e)
    return { bom: null, ingredients: [] }
  }
}

// ── BOM — Write ───────────────────────────────────────────────────────────────

export async function upsertBom(
  articleId: string,
  header: Pick<BillOfMaterial, 'version' | 'versionName' | 'batchSize' | 'baseQuantity' | 'batchUnit'>,
  ingredients: BOMIngredient[],
  existingBomId?: string,
): Promise<{ bom: BillOfMaterial | null; ingredients: BOMIngredient[] }> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    let bomId: string

    if (existingBomId) {
      const { data, error } = await supabase
        .from('bom_headers')
        .update({
          version:       header.version,
          version_name:  header.versionName,
          batch_size:    header.batchSize,
          base_quantity: header.baseQuantity,
          batch_unit:    header.batchUnit,
        })
        .eq('id', existingBomId)
        .eq('organization_id', orgId)
        .select('id')
        .single()
      if (error) throw error
      bomId = data.id
    } else {
      // Deactivate any existing active BOM before creating a new one
      // (EXCLUDE constraint allows only one active BOM per article)
      await supabase
        .from('bom_headers')
        .update({ is_active: false })
        .eq('organization_id', orgId)
        .eq('article_id', articleId)
        .eq('is_active', true)

      const { data, error } = await supabase
        .from('bom_headers')
        .insert({
          organization_id: orgId,
          article_id:      articleId,
          version:         header.version,
          version_name:    header.versionName,
          batch_size:      header.batchSize,
          base_quantity:   header.baseQuantity,
          batch_unit:      header.batchUnit,
          is_active:       true,
        })
        .select('id')
        .single()
      if (error) throw error
      bomId = data.id
    }

    // Replace items: delete all then re-insert
    await supabase.from('bom_items').delete().eq('bom_header_id', bomId)

    if (ingredients.length > 0) {
      const codes = ingredients.map((i) => i.ingredientCode).filter(Boolean)
      const { data: articleRows } = await supabase
        .from('articles')
        .select('id, code, designation')
        .eq('organization_id', orgId)
        .in('code', codes)

      const codeToArticle: Record<string, { id: string; designation: string }> =
        Object.fromEntries((articleRows ?? []).map((a) => [a.code, a]))

      const itemsToInsert = ingredients
        .filter((i) => i.ingredientCode && codeToArticle[i.ingredientCode])
        .map((i, idx) => ({
          organization_id: orgId,
          bom_header_id:   bomId,
          component_id:    codeToArticle[i.ingredientCode].id,
          component_label: codeToArticle[i.ingredientCode].designation || i.designation,
          item_position:   idx + 1,
          quantity:        i.qtyPerUnit * header.batchSize,
          unit:            i.unite,
          tolerance_pct:   i.tolerance,
          scrap_pct:       i.scrapFactorPercentage,
        }))

      if (itemsToInsert.length > 0) {
        const { error } = await supabase.from('bom_items').insert(itemsToInsert)
        if (error) throw error
      }
    }

    return getBomByArticleId(articleId)
  } catch (e) {
    console.error('[bom action] upsertBom:', e)
    return { bom: null, ingredients: [] }
  }
}

// ── Gamme — Read ──────────────────────────────────────────────────────────────

export async function getGammeByArticleId(articleId: string): Promise<{
  gamme: GammeFabrication | null
  etapes: GammeEtape[]
}> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    const { data: header, error: headerError } = await supabase
      .from('routing_headers')
      .select('*, articles!article_id(code, designation)')
      .eq('organization_id', orgId)
      .eq('article_id', articleId)
      .eq('is_active', true)
      .maybeSingle()

    if (headerError) throw headerError
    if (!header) return { gamme: null, etapes: [] }

    const articleRef = header.articles as { code: string; designation: string } | null
    const gamme = toRoutingHeader(
      header as unknown as Record<string, unknown>,
      articleRef?.code ?? '',
      articleRef?.designation ?? '',
    )

    const { data: steps, error: stepsError } = await supabase
      .from('routing_steps')
      .select('*')
      .eq('routing_header_id', header.id)
      .order('step_order')

    if (stepsError) throw stepsError

    const etapes = (steps ?? []).map((s) =>
      toRoutingStep(s as unknown as Record<string, unknown>),
    )

    return { gamme, etapes }
  } catch (e) {
    console.error('[bom action] getGammeByArticleId:', e)
    return { gamme: null, etapes: [] }
  }
}

// ── Gamme — Write ─────────────────────────────────────────────────────────────

export async function upsertGamme(
  articleId: string,
  header: Pick<GammeFabrication, 'version'>,
  etapes: GammeEtape[],
  existingGammeId?: string,
): Promise<{ gamme: GammeFabrication | null; etapes: GammeEtape[] }> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()

    let gammeId: string

    if (existingGammeId) {
      const { data, error } = await supabase
        .from('routing_headers')
        .update({ version: header.version })
        .eq('id', existingGammeId)
        .eq('organization_id', orgId)
        .select('id')
        .single()
      if (error) throw error
      gammeId = data.id
    } else {
      // Deactivate existing active gamme before creating a new one
      await supabase
        .from('routing_headers')
        .update({ is_active: false })
        .eq('organization_id', orgId)
        .eq('article_id', articleId)
        .eq('is_active', true)

      const { data, error } = await supabase
        .from('routing_headers')
        .insert({
          organization_id: orgId,
          article_id:      articleId,
          version:         header.version,
          is_active:       true,
        })
        .select('id')
        .single()
      if (error) throw error
      gammeId = data.id
    }

    // Replace steps: delete all then re-insert
    await supabase.from('routing_steps').delete().eq('routing_header_id', gammeId)

    if (etapes.length > 0) {
      const stepsToInsert = etapes.map((e, idx) => ({
        organization_id:          orgId,
        routing_header_id:        gammeId,
        step_order:               idx + 1,
        operation:                e.operation,
        duration_min:             e.duree,
        temperature_c:            e.temperature ?? null,
        equipment:                e.equipement || null,
        control_point:            e.pointControle ?? null,
        setup_time_minutes:       e.setupTimeMinutes ?? 0,
        run_time_minutes_per_unit: e.runTimeMinutesPerUnit || (e.duree > 0 ? e.duree / 100 : 0),
      }))

      const { error } = await supabase.from('routing_steps').insert(stepsToInsert)
      if (error) throw error
    }

    return getGammeByArticleId(articleId)
  } catch (e) {
    console.error('[bom action] upsertGamme:', e)
    return { gamme: null, etapes: [] }
  }
}
