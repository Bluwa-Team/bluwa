'use server'

import { getSupabaseWithOrg } from './helpers'

// ── Contrats cadre ────────────────────────────────────────────────────────────
//
// Schéma Supabase attendu — table `contrats_achat` :
//
//   id              uuid primary key default gen_random_uuid()
//   organization_id uuid not null references organizations(id)
//   fournisseur_id  uuid not null references fournisseurs(id)
//   reference       text not null           -- ex. CT-2026-012
//   article         text not null
//   date_debut      date not null
//   date_fin        date not null
//   prix_unitaire   numeric not null
//   devise          text not null default 'XOF'
//   quantite_min    numeric not null default 0
//   unite           text not null default 'kg'
//   statut          text not null default 'Actif'
//                     check (statut in ('Actif','Expire','EnNegociation'))
//   created_at      timestamptz default now()
//   updated_at      timestamptz default now()
//
// Index suggérés :
//   create index on contrats_achat (organization_id, fournisseur_id, statut);

/**
 * Retourne le contrat cadre actif d'un fournisseur pour la date du jour.
 * Retourne `null` si aucun contrat actif n'existe (ou si la table n'existe
 * pas encore en base — l'erreur est catchée silencieusement).
 */
export async function getContratActifByFournisseur(
  fournisseurId: string,
): Promise<{ reference: string } | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('contrats_achat')
      .select('reference')
      .eq('organization_id', orgId)
      .eq('fournisseur_id', fournisseurId)
      .eq('statut', 'Actif')
      .lte('date_debut', today)
      .gte('date_fin', today)
      .order('date_debut', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ?? null
  } catch {
    // Table absente ou erreur réseau — dégradation silencieuse
    return null
  }
}
