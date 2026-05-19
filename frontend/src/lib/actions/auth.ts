'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

export async function signupAction(input: {
  fullName: string
  email: string
  password: string
}): Promise<ActionResult> {
  const { fullName, email, password } = input

  if (!fullName || !email || !password) {
    return { ok: false, error: 'Tous les champs sont requis.' }
  }
  if (password.length < 8) {
    return { ok: false, error: 'Le mot de passe doit faire au moins 8 caractères.' }
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) {
    const message = error.message.includes('already')
      ? 'Cet email est déjà utilisé.'
      : error.message
    return { ok: false, error: message }
  }

  return { ok: true }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function completeOnboardingAction(input: {
  orgName: string
  factoryName: string
  factoryLocation?: string
}): Promise<ActionResult<{ slug: string }>> {
  const { orgName, factoryName, factoryLocation } = input

  if (!orgName || !factoryName) {
    return { ok: false, error: "Nom de l'organisation et de l'usine requis." }
  }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Session invalide.' }
  }

  const slug = generateSlug(orgName)

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({ name: orgName, slug })
    .select()
    .single()

  if (orgError) {
    const message = orgError.code === '23505'
      ? "Ce nom d'organisation est déjà pris."
      : orgError.message
    return { ok: false, error: message }
  }

  const { data: factory, error: factoryError } = await supabaseAdmin
    .from('factories')
    .insert({
      organization_id: org.id,
      name: factoryName,
      location: factoryLocation || null,
    })
    .select()
    .single()

  if (factoryError) {
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    return { ok: false, error: factoryError.message }
  }

  const fullName = user.user_metadata?.full_name || user.email || ''
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      organization_id: org.id,
      factory_id: null,
      role: 'org_admin',
      full_name: fullName,
    })

  if (profileError) {
    await supabaseAdmin.from('factories').delete().eq('id', factory.id)
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    return { ok: false, error: profileError.message }
  }

  return { ok: true, data: { slug: org.slug } }
}
