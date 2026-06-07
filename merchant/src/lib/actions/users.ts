'use server'

/**
 * actions/users.ts — Mutations utilisateurs côté serveur
 * Utilise le client admin (service_role) pour gérer profiles et auth.users
 * Remplace les fonctions db-client.ts qui ciblaient la table `users` (supprimée)
 */

import { createAdminClient } from '@/lib/supabase/admin'

// ── Rôles ERP (profiles.role) ─────────────────────────────────────────────
export type ErpRole = 'owner' | 'admin' | 'manager' | 'operator' | 'viewer'

/**
 * Invite un nouvel utilisateur dans une organisation.
 * - Envoie un email d'invitation Supabase Auth
 * - Le trigger fn_handle_new_user() crée automatiquement le profile
 *   avec organization_id + full_name depuis raw_user_meta_data
 * - Après acceptation, l'utilisateur est ajouté aux sites demandés
 */
export async function inviteOrgUser(
  orgId:    string,
  email:    string,
  fullName: string,
  role:     ErpRole,
  siteIds:  string[],
): Promise<{ id: string }> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: {
      organization_id: orgId,
      full_name:       fullName,
      role,
    },
  })

  if (error || !data.user) {
    throw new Error(error?.message ?? "Erreur lors de l'invitation")
  }

  const userId = data.user.id

  // Accès aux sites dès l'invitation (avant que l'utilisateur accepte)
  if (siteIds.length > 0) {
    await supabase.from('user_site_access').insert(
      siteIds.map((factory_id) => ({ user_id: userId, factory_id })),
    )
  }

  return { id: userId }
}

/**
 * Met à jour le rôle ERP d'un utilisateur dans profiles.
 */
export async function updateOrgUserRole(userId: string, role: ErpRole): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

/**
 * Active ou désactive un utilisateur dans profiles.
 */
export async function toggleOrgUserActive(userId: string, isActive: boolean): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}
