'use server'

import { getSupabaseWithOrg } from './helpers'

// ── Contrats cadre ────────────────────────────────────────────────────────────
//
// Table `contrats_achat` — créée en migration 003 :
//
//   id              uuid primary key default gen_random_uuid()
//   organization_id uuid not null references organizations(id)
//   supplier_id     uuid not null references suppliers(id)     ← migration 003
//   reference       text not null           -- ex. CT-2026-012
//   article         text not null
//   date_debut      date not null
//   date_fin        date not null
//   prix_unitaire   decimal(15,4) not null
//   devise          text not null default 'XOF'
//   quantite_min    decimal(15,4) not null default 0
//   unite           text not null default 'kg'
//   statut          text not null default 'Actif'
//                     check (statut in ('Actif','Expire','EnNegociation'))
//   created_at      timestamp with time zone default timezone('utc', now())
//   updated_at      timestamp with time zone default timezone('utc', now())
//
// Index : ca_supplier_statut_dates (organization_id, supplier_id, statut, date_debut, date_fin)

/**
 * Retourne le contrat cadre actif d'un fournisseur pour la date du jour.
 * Retourne `null` si aucun contrat actif n'existe (ou si la table n'existe
 * pas encore en base — l'erreur est catchée silencieusement).
 */
export async function getContratActifByFournisseur(
  supplierId: string,
): Promise<{ reference: string } | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('contrats_achat')
      .select('reference')
      .eq('organization_id', orgId)
      .eq('supplier_id', supplierId)
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
