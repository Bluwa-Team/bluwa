'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type UserRole = 'owner' | 'admin' | 'manager' | 'operator' | 'viewer'

export interface OrgUser {
  id:         string
  full_name:  string | null
  email:      string
  role:       UserRole
  is_active:  boolean
  created_at: string
}

// ── Guard : vérifie que le user courant est owner ou admin ────────────────────
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    throw new Error('Droits insuffisants')
  }

  return { userId: user.id, orgId: profile.organization_id }
}

// ── Liste tous les utilisateurs de l'org ─────────────────────────────────────
export async function listOrgUsers(): Promise<OrgUser[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Les profiles sont déjà filtrés par RLS (même org)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true })

  if (!profiles?.length) return []

  // Récupérer les emails via Admin API
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? '']))

  return profiles.map(p => ({
    id:         p.id,
    full_name:  p.full_name,
    email:      emailMap[p.id] ?? '',
    role:       p.role as UserRole,
    is_active:  p.is_active,
    created_at: p.created_at,
  }))
}

// ── Modifier le rôle d'un utilisateur ────────────────────────────────────────
export async function updateUserRole(targetId: string, role: UserRole) {
  const { userId } = await assertAdmin()
  if (targetId === userId) return { error: 'Impossible de modifier votre propre rôle.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', targetId)

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
  await supabaseAdmin.auth.admin.updateUserById(targetId, { ban_duration: active ? 'none' : '876600h' })

  revalidatePath('/settings')
  return { success: true }
}

// ── Inviter un nouvel utilisateur ────────────────────────────────────────────
export async function inviteUser(email: string, role: UserRole) {
  const { orgId } = await assertAdmin()

  // Vérifier si l'email est déjà membre de l'organisation
  const existingUsers = await listOrgUsers()
  const alreadyMember = existingUsers.some(
    u => u.email.toLowerCase() === email.toLowerCase()
  )
  if (alreadyMember) {
    return { error: 'Cet utilisateur est déjà membre de l\'organisation.' }
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { organization_id: orgId, role },
  })

  if (error) {
    // Traduction des erreurs Supabase courantes
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { error: 'Cet email est déjà enregistré dans Supabase. Contactez le support pour le rattacher à votre organisation.' }
    }
    if (error.message.includes('Database error')) {
      return { error: 'Erreur de base de données. Vérifiez que la migration 019 a été appliquée dans Supabase.' }
    }
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true, userId: data.user.id }
}

// ── Envoyer un reset de mot de passe ─────────────────────────────────────────
export async function sendPasswordReset(email: string) {
  await assertAdmin()

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) return { error: error.message }
  return { success: true }
}
