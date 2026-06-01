'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface Factory {
  id:        string
  name:      string
  code:      string
  country:   string
  city:      string | null
  is_active: boolean
}

// ── Changer d'usine active ────────────────────────────────────────────────────
export async function switchFactory(factoryId: string) {
  const cookieStore = await cookies()
  cookieStore.set('active_factory_id', factoryId, {
    path:    '/',
    maxAge:  60 * 60 * 24 * 365, // 1 an
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}

// ── Liste des usines accessibles par l'utilisateur ───────────────────────────
export async function getUserFactories(): Promise<Factory[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return []

  const isAdmin = ['owner', 'admin'].includes(profile.role)

  if (isAdmin) {
    // Owner / admin → toutes les usines de l'organisation
    const { data } = await supabase
      .from('factories')
      .select('id, name, code, country, city, is_active')
      .eq('organization_id', profile.organization_id)
      .order('name')
    return (data ?? []) as Factory[]
  }

  // Autres rôles → uniquement les usines assignées
  const { data } = await supabase
    .from('user_site_access')
    .select('factories(id, name, code, country, city, is_active)')
    .eq('user_id', user.id)

  return data?.flatMap(r => r.factories ? [r.factories as unknown as Factory] : []) ?? []
}
