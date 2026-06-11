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

function generateFactoryCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 5)
    || name.slice(0, 3).toUpperCase()
}

export async function completeOnboardingAction(input: {
  orgName: string
  factoryName: string
  factoryCity?: string
  factoryCountry?: string
}): Promise<ActionResult> {
  const { orgName, factoryName, factoryCity, factoryCountry } = input

  if (!orgName || !factoryName) {
    return { ok: false, error: "Nom de l'organisation et de l'usine requis." }
  }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Session invalide.' }
  }

  const slug = generateSlug(orgName)

  // 1. Organisation
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({ name: orgName, slug, country_headquarters: factoryCountry ?? null })
    .select()
    .single()

  if (orgError) {
    const message = orgError.code === '23505'
      ? "Ce nom d'organisation est déjà pris."
      : orgError.message
    return { ok: false, error: message }
  }

  // 2. Factory (code généré depuis le nom, country obligatoire)
  const factoryCode = generateFactoryCode(factoryName)
  const { data: factory, error: factoryError } = await supabaseAdmin
    .from('factories')
    .insert({
      organization_id: org.id,
      name: factoryName,
      code: factoryCode,
      country: factoryCountry || 'Sénégal',
      city: factoryCity || null,
      location_country: factoryCountry || 'Sénégal',
      location_city: factoryCity || null,
    })
    .select()
    .single()

  if (factoryError) {
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    return { ok: false, error: factoryError.message }
  }

  // 3. Profil (owner de l'organisation)
  const fullName = user.user_metadata?.full_name || user.email || ''
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      organization_id: org.id,
      full_name: fullName,
      role: 'owner',
    })

  if (profileError) {
    await supabaseAdmin.from('factories').delete().eq('id', factory.id)
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    return { ok: false, error: profileError.message }
  }

  // 4. Accès au site avec rôle owner (rôle porté par user_site_access depuis migration 024)
  const { error: accessError } = await supabaseAdmin
    .from('user_site_access')
    .insert({ user_id: user.id, factory_id: factory.id, role: 'owner' })

  if (accessError) {
    await supabaseAdmin.from('profiles').delete().eq('id', user.id)
    await supabaseAdmin.from('factories').delete().eq('id', factory.id)
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    return { ok: false, error: accessError.message }
  }

  return { ok: true }
}
