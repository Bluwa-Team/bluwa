'use server'

import { getSupabaseWithOrg } from './helpers'

export type ReferentielKind =
  | 'article_famille'
  | 'article_sous_famille'
  | 'article_categorie'
  | 'unite_stock'
  | 'unite_mesure'

export interface ReferentielValue {
  id: string
  kind: ReferentielKind
  value: string
  parent: string | null
}

function toValue(row: Record<string, unknown>): ReferentielValue {
  return {
    id: row.id as string,
    kind: row.kind as ReferentielKind,
    value: row.value as string,
    parent: (row.parent as string) ?? null,
  }
}

/** Récupère toutes les valeurs de référentiel de l'organisation (tous types). */
export async function getReferentielValues(): Promise<ReferentielValue[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('referentiel_values')
      .select('*')
      .eq('organization_id', orgId)
      .order('value', { ascending: true })
    if (error) throw error
    return (data ?? []).map(toValue)
  } catch (e) {
    console.error('[referentiel] getReferentielValues:', e)
    return []
  }
}

/** Ajoute une valeur de référentiel. Retourne la valeur créée (ou existante). */
export async function addReferentielValue(input: {
  kind: ReferentielKind
  value: string
  parent?: string | null
}): Promise<ReferentielValue | null> {
  try {
    const value = input.value.trim()
    if (!value) return null

    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('referentiel_values')
      .upsert(
        {
          organization_id: orgId,
          kind: input.kind,
          value,
          parent: input.parent ?? null,
        },
        { onConflict: 'organization_id,kind,value,parent', ignoreDuplicates: false },
      )
      .select()
      .single()
    if (error) throw error
    return data ? toValue(data) : null
  } catch (e) {
    console.error('[referentiel] addReferentielValue:', e)
    return null
  }
}

/** Supprime une valeur de référentiel. */
export async function deleteReferentielValue(id: string): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('referentiel_values')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)
    if (error) throw error
    return true
  } catch (e) {
    console.error('[referentiel] deleteReferentielValue:', e)
    return false
  }
}
