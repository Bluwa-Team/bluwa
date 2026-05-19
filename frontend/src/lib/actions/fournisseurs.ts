'use server'

import { getSupabaseWithOrg } from './helpers'
import { Fournisseur, FournisseurStatut, FournisseurQualification } from '@/app/[locale]/(dashboard)/fournisseurs/_components/types'

function toFournisseur(row: Record<string, unknown>): Fournisseur {
  return {
    id: row.id as string,
    code: row.code as string,
    raisonSociale: row.raison_sociale as string,
    statut: row.statut as FournisseurStatut,
    qualification: row.qualification as FournisseurQualification,
    categorie: (row.categorie as string) ?? '',
    devise: (row.devise as string) ?? 'XOF',
    contactPrincipal: (row.contact_principal as string) ?? '',
    telephone: (row.telephone as string) ?? '',
    email: (row.email as string) ?? '',
    ville: (row.ville as string) ?? '',
    pays: (row.pays as string) ?? '',
    modeLogistique: (row.mode_logistique as string) ?? '',
    paiementMobile: (row.paiement_mobile as boolean) ?? false,
    scoreFilabilite: (row.score_fiabilite as number) ?? null,
    createdAt: ((row.created_at as string) ?? '').split('T')[0],
    updatedAt: ((row.updated_at as string) ?? '').split('T')[0],
  }
}

export async function getFournisseurs(): Promise<Fournisseur[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(toFournisseur)
  } catch (e) {
    console.error('[supabase action] error:', e)
    return []
  }
}

export async function getFournisseurById(id: string): Promise<Fournisseur | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()
    if (error) throw error
    return data ? toFournisseur(data) : null
  } catch (e) {
    console.error('[supabase action] error:', e)
    return null
  }
}

export async function createFournisseur(f: Partial<Fournisseur> & { code: string }): Promise<Fournisseur | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('fournisseurs')
      .insert({
        organization_id: orgId,
        code: f.code,
        raison_sociale: f.raisonSociale,
        statut: f.statut ?? 'Formel',
        qualification: f.qualification ?? 'AQualifier',
        categorie: f.categorie,
        devise: f.devise ?? 'XOF',
        contact_principal: f.contactPrincipal,
        telephone: f.telephone,
        email: f.email,
        ville: f.ville,
        pays: f.pays,
        mode_logistique: f.modeLogistique,
        paiement_mobile: f.paiementMobile ?? false,
      })
      .select()
      .single()
    if (error) throw error
    return data ? toFournisseur(data) : null
  } catch (e) {
    console.error('[supabase action] error:', e)
    return null
  }
}

export async function updateFournisseur(id: string, f: Partial<Fournisseur>): Promise<Fournisseur | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('fournisseurs')
      .update({
        raison_sociale: f.raisonSociale,
        statut: f.statut,
        qualification: f.qualification,
        categorie: f.categorie,
        devise: f.devise,
        contact_principal: f.contactPrincipal,
        telephone: f.telephone,
        email: f.email,
        ville: f.ville,
        pays: f.pays,
        mode_logistique: f.modeLogistique,
        paiement_mobile: f.paiementMobile,
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()
    if (error) throw error
    return data ? toFournisseur(data) : null
  } catch (e) {
    console.error('[supabase action] error:', e)
    return null
  }
}
