'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type UserRole = 'owner' | 'admin' | 'manager' | 'operator' | 'viewer'

export interface OrgUser {
  id:         string
  full_name:  string | null
  email:      string
  role:       UserRole | null  // null = aucun accès au site actif
  is_active:  boolean
  created_at: string
}

// ── Helper : factory active (cookie) ─────────────────────────────────────────
async function getActiveFactoryId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('active_factory_id')?.value ?? null
}

// ── Guard : vérifie que le user courant est owner ou admin sur le site actif ──
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const factoryId = await getActiveFactoryId()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) throw new Error('Profil introuvable')

  // Vérifier le rôle sur le site actif (ou sur n'importe quel site si pas de factory active)
  const query = supabase
    .from('user_site_access')
    .select('role')
    .eq('user_id', user.id)

  if (factoryId) query.eq('factory_id', factoryId)

  const { data: accesses } = await query
  const isAdmin = accesses?.some(a => ['owner', 'admin'].includes(a.role))

  if (!isAdmin) throw new Error('Droits insuffisants')

  return { userId: user.id, orgId: profile.organization_id, factoryId }
}

// ── Liste tous les utilisateurs de l'org avec leur rôle sur le site actif ────
export async function listOrgUsers(overrideFactoryId?: string | null): Promise<OrgUser[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Priorité : paramètre explicite > cookie (permet fallback factories[0] depuis page.tsx)
  const factoryId = overrideFactoryId ?? await getActiveFactoryId()

  // Profils de la même org (filtrés par RLS) — role inclus pour fallback owner/admin
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true })

  if (!profiles?.length) return []

  // Rôles sur le site actif
  let roleMap: Record<string, UserRole> = {}
  if (factoryId) {
    const { data: accesses } = await supabase
      .from('user_site_access')
      .select('user_id, role')
      .eq('factory_id', factoryId)

    roleMap = Object.fromEntries((accesses ?? []).map(a => [a.user_id, a.role as UserRole]))
  }

  // Emails via Admin API
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? '']))

  return profiles.map(p => ({
    id:         p.id,
    full_name:  p.full_name,
    email:      emailMap[p.id] ?? '',
    // Priorité : rôle sur le site actif (user_site_access)
    // Fallback : rôle org (profiles.role) pour owner/admin sans entrée site
    role:       roleMap[p.id] ?? (['owner', 'admin'].includes(p.role) ? p.role as UserRole : null),
    is_active:  p.is_active,
    created_at: p.created_at,
  }))
}

// ── Modifier le rôle d'un utilisateur sur le site actif ──────────────────────
export async function updateUserRole(targetId: string, role: UserRole) {
  const { userId, factoryId } = await assertAdmin()
  if (targetId === userId) return { error: 'Impossible de modifier votre propre rôle.' }
  if (!factoryId) return { error: 'Aucun site sélectionné.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('user_site_access')
    .update({ role })
    .eq('user_id', targetId)
    .eq('factory_id', factoryId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// ── Activer / désactiver un utilisateur ──────────────────────────────────────
export async function toggleUserActive(targetId: string, active: boolean) {
  const { userId } = await assertAdmin()
  if (targetId === userId) return { error: 'Impossible de modifier votre propre statut.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: active })
    .eq('id', targetId)

  if (error) return { error: error.message }

  // Bloquer ou débloquer l'accès Supabase Auth
  await supabaseAdmin.auth.admin.updateUserById(targetId, {
    ban_duration: active ? 'none' : '876600h',
  })

  revalidatePath('/settings')
  return { success: true }
}

// ── Inviter un nouvel utilisateur sur le site actif ──────────────────────────
export async function inviteUser(email: string, role: UserRole) {
  const { orgId, factoryId } = await assertAdmin()
  if (!factoryId) return { error: 'Aucun site sélectionné.' }

  // Vérifier si l'email est déjà membre de l'organisation
  const existingUsers = await listOrgUsers()
  const alreadyMember = existingUsers.some(
    u => u.email.toLowerCase() === email.toLowerCase()
  )
  if (alreadyMember) {
    return { error: 'Cet utilisateur est déjà membre de l\'organisation.' }
  }

  // Inviter via Supabase Auth (le trigger fn_handle_new_user crée le profil)
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { organization_id: orgId, role },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { error: 'Cet email est déjà enregistré dans Supabase. Contactez le support pour le rattacher à votre organisation.' }
    }
    if (error.message.includes('Database error')) {
      return { error: 'Erreur de base de données. Vérifiez que les migrations ont été appliquées dans Supabase.' }
    }
    return { error: error.message }
  }

  // Assigner l'accès au site actif avec le rôle choisi
  await supabaseAdmin
    .from('user_site_access')
    .insert({ user_id: data.user.id, factory_id: factoryId, role })

  revalidatePath('/settings')
  return { success: true, userId: data.user.id }
}

// ── Supprimer un utilisateur ──────────────────────────────────────────────────
export async function deleteUser(targetId: string) {
  const { userId } = await assertAdmin()
  if (targetId === userId) return { error: 'Impossible de supprimer votre propre compte.' }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetId)
  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

// ── Envoyer un reset de mot de passe ─────────────────────────────────────────
export async function sendPasswordReset(email: string) {
  await assertAdmin()

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) return { error: error.message }
  return { success: true }
}
