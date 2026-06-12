'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function getOrgId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) throw new Error('No organization')
  return profile.organization_id
}

export async function getSupabaseWithOrg() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const cookieStore = await cookies()
  let factoryId = cookieStore.get('active_factory_id')?.value ?? null

  // Fallback : premier site de l'org si le cookie n'est pas positionné
  if (!factoryId) {
    const { data: factory } = await supabase
      .from('factories')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)
      .maybeSingle()
    factoryId = (factory as any)?.id ?? null
  }

  return { supabase, orgId, factoryId }
}

export async function getOrgName(): Promise<string> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()
    return (data as any)?.name ?? ''
  } catch {
    return ''
  }
}
