'use server'

import { getSupabaseWithOrg } from './helpers'
import {
  ContratAchat,
  ContratStatut,
} from '@/app/[locale]/(dashboard)/fournisseurs/_components/types'

// ── Mapper DB → Frontend ──────────────────────────────────────────────────────

function toContrat(row: Record<string, unknown>): ContratAchat {
  return {
    id:            row.id            as string,
    fournisseurId: row.fournisseur_id as string,
    reference:     row.reference      as string,
    article:       row.article        as string,
    dateDebut:     row.date_debut     as string,
    dateFin:       row.date_fin       as string,
    prixUnitaire:  row.prix_unitaire  as number,
    devise:        row.devise         as string,
    quantiteMin:   row.quantite_min   as number,
    unite:         row.unite          as string,
    statut:        row.statut         as ContratStatut,
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getContratsByFournisseur(fournisseurId: string): Promise<ContratAchat[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('contrats_achat')
      .select('*')
      .eq('organization_id', orgId)
      .eq('fournisseur_id', fournisseurId)
      .order('date_debut', { ascending: false })
    if (error) throw error
    return (data ?? []).map(toContrat)
  } catch (e) {
    console.error('[contrats] getContratsByFournisseur:', e)
    return []
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createContrat(
  contrat: Omit<ContratAchat, 'id'>,
): Promise<ContratAchat | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('contrats_achat')
      .insert({
        organization_id: orgId,
        fournisseur_id:  contrat.fournisseurId,
        reference:       contrat.reference,
        article:         contrat.article,
        date_debut:      contrat.dateDebut,
        date_fin:        contrat.dateFin,
        prix_unitaire:   contrat.prixUnitaire,
        devise:          contrat.devise,
        quantite_min:    contrat.quantiteMin,
        unite:           contrat.unite,
        statut:          contrat.statut,
      })
      .select()
      .single()
    if (error) throw error
    return data ? toContrat(data) : null
  } catch (e) {
    console.error('[contrats] createContrat:', e)
    return null
  }
}

export async function updateContrat(
  id: string,
  patch: Partial<Omit<ContratAchat, 'id' | 'fournisseurId'>>,
): Promise<ContratAchat | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('contrats_achat')
      .update({
        ...(patch.reference    !== undefined && { reference:     patch.reference    }),
        ...(patch.article      !== undefined && { article:       patch.article      }),
        ...(patch.dateDebut    !== undefined && { date_debut:    patch.dateDebut    }),
        ...(patch.dateFin      !== undefined && { date_fin:      patch.dateFin      }),
        ...(patch.prixUnitaire !== undefined && { prix_unitaire: patch.prixUnitaire }),
        ...(patch.devise       !== undefined && { devise:        patch.devise       }),
        ...(patch.quantiteMin  !== undefined && { quantite_min:  patch.quantiteMin  }),
        ...(patch.unite        !== undefined && { unite:         patch.unite        }),
        ...(patch.statut       !== undefined && { statut:        patch.statut       }),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()
    if (error) throw error
    return data ? toContrat(data) : null
  } catch (e) {
    console.error('[contrats] updateContrat:', e)
    return null
  }
}

export async function deleteContrat(id: string): Promise<boolean> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { error } = await supabase
      .from('contrats_achat')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)
    if (error) throw error
    return true
  } catch (e) {
    console.error('[contrats] deleteContrat:', e)
    return false
  }
}
