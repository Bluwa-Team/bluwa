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
  const factoryId = cookieStore.get('active_factory_id')?.value ?? null

  return { supabase, orgId, factoryId }
}
