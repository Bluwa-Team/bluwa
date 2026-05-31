'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const fullName    = formData.get('full_name') as string
  const email       = formData.get('email') as string
  const password    = formData.get('password') as string
  const organisation = formData.get('organisation') as string

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error || !data.user) {
    return { error: error?.message ?? 'Erreur lors de la création du compte.' }
  }

  // Créer le profil apprenant
  await supabase.from('academy_profiles').insert({
    id:           data.user.id,
    full_name:    fullName,
    email,
    organisation: organisation || null,
  })

  revalidatePath('/', 'layout')
  redirect('/profil')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou mot de passe incorrect.' }
  }

  revalidatePath('/', 'layout')
  redirect('/profil')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('academy_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}
