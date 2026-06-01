'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseWithOrg } from './helpers'
import { getWeekStarts } from '@/lib/planning-utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ForecastRow {
  articleId:    string
  articleCode:  string
  articleLabel: string
  unite:        string
  weeks:        Record<string, number>   // weekStart ISO → quantité
}

// ── Lecture des prévisions ────────────────────────────────────────────────────

export async function getForecasts(weeksCount = 6): Promise<ForecastRow[]> {
  const { supabase, orgId, factoryId } = await getSupabaseWithOrg()
  const weeks = getWeekStarts(weeksCount)

  const { data: articles } = await supabase
    .from('articles')
    .select('id, code, designation, unite_stock')
    .eq('organization_id', orgId)
    .in('type_article', ['PF', 'PSF'])
    .eq('statut', 'actif')
    .order('code')

  if (!articles?.length) return []

  const articleIds = articles.map((a: any) => a.id)

  let query = supabase
    .from('demand_forecasts')
    .select('article_id, week_start, quantity')
    .in('article_id', articleIds)
    .in('week_start', weeks)
    .eq('organization_id', orgId)

  if (factoryId) query = query.eq('factory_id', factoryId)

  const { data: forecasts } = await query

  const map: Record<string, Record<string, number>> = {}
  forecasts?.forEach((f: any) => {
    const w = f.week_start.split('T')[0]
    if (!map[f.article_id]) map[f.article_id] = {}
    map[f.article_id][w] = Number(f.quantity)
  })

  return articles.map((a: any) => ({
    articleId:    a.id,
    articleCode:  a.code,
    articleLabel: a.designation,
    unite:        a.unite_stock ?? 'u',
    weeks:        Object.fromEntries(weeks.map(w => [w, map[a.id]?.[w] ?? 0])),
  }))
}

// ── Upsert d'une prévision ────────────────────────────────────────────────────

export async function upsertForecast(articleId: string, weekStart: string, quantity: number) {
  const { supabase, orgId, factoryId } = await getSupabaseWithOrg()

  if (!factoryId) {
    return { error: 'Aucune usine active. Sélectionnez un site dans Paramètres.' }
  }

  const supabaseClient = await createClient()
  const { data: { user } } = await supabaseClient.auth.getUser()

  const { error } = await supabase
    .from('demand_forecasts')
    .upsert(
      {
        organization_id: orgId,
        factory_id:      factoryId,
        article_id:      articleId,
        week_start:      weekStart,
        quantity,
        created_by:      user?.id ?? null,
      },
      { onConflict: 'factory_id,article_id,week_start' },
    )

  if (error) return { error: error.message }

  revalidatePath('/previsions')
  revalidatePath('/supply-planning')
  return { success: true }
}
