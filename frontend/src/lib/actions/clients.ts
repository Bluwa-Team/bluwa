'use server'

import { getSupabaseWithOrg } from './helpers'
import { Client, ClientStatut, ClientType, GrilleTarifaire } from '@/app/[locale]/(dashboard)/clients/_components/types'

function toClient(row: Record<string, unknown>, grille: GrilleTarifaire[] = []): Client {
  return {
    id: row.id as string,
    code: row.code as string,
    raisonSociale: row.raison_sociale as string,
    statut: row.statut as ClientStatut,
    type: row.type as ClientType,
    secteur: (row.secteur as string) ?? '',
    langue: (row.langue as string) ?? 'Français',
    ville: (row.ville as string) ?? '',
    pays: (row.pays as string) ?? '',
    incoterm: (row.incoterm as string) ?? '',
    transport: (row.transport as string) ?? '',
    limiteCredit: (row.limite_credit as number) ?? null,
    conditionPaiement: (row.condition_paiement as string) ?? '',
    paiementMobile: (row.paiement_mobile as boolean) ?? false,
    contactPrincipal: (row.contact_principal as string) ?? '',
    telephone: (row.telephone as string) ?? '',
    email: (row.email as string) ?? '',
    grilleTarifaire: grille,
    createdAt: ((row.created_at as string) ?? '').split('T')[0],
    updatedAt: ((row.updated_at as string) ?? '').split('T')[0],
  }
}

export async function getClients(): Promise<Client[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => toClient(r))
  } catch (e) {
    console.error('[supabase action] error:', e)
    return []
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const [{ data: clientData }, { data: grilleData }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).eq('organization_id', orgId).single(),
      supabase.from('grilles_tarifaires').select('*').eq('client_id', id),
    ])
    if (!clientData) return null
    const grille: GrilleTarifaire[] = (grilleData ?? []).map((g: Record<string, unknown>) => ({
      articleCode: g.article_code as string,
      designation: (g.designation as string) ?? '',
      prixNegecie: g.prix_negocie as number,
      devise: (g.devise as string) ?? 'XOF',
    }))
    return toClient(clientData, grille)
  } catch (e) {
    console.error('[supabase action] error:', e)
    return null
  }
}

export async function createClient(c: Partial<Client> & { code: string }): Promise<Client | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('clients')
      .insert({
        organization_id: orgId,
        code: c.code,
        raison_sociale: c.raisonSociale,
        statut: c.statut ?? 'Actif',
        type: c.type,
        secteur: c.secteur,
        langue: c.langue ?? 'Français',
        ville: c.ville,
        pays: c.pays,
        incoterm: c.incoterm,
        transport: c.transport,
        limite_credit: c.limiteCredit,
        condition_paiement: c.conditionPaiement,
        paiement_mobile: c.paiementMobile ?? false,
        contact_principal: c.contactPrincipal,
        telephone: c.telephone,
        email: c.email,
      })
      .select()
      .single()
    if (error) throw error
    return data ? toClient(data) : null
  } catch (e) {
    console.error('[supabase action] error:', e)
    return null
  }
}

export async function updateClient(id: string, c: Partial<Client>): Promise<Client | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('clients')
      .update({
        raison_sociale: c.raisonSociale,
        statut: c.statut,
        type: c.type,
        secteur: c.secteur,
        langue: c.langue,
        ville: c.ville,
        pays: c.pays,
        incoterm: c.incoterm,
        transport: c.transport,
        limite_credit: c.limiteCredit,
        condition_paiement: c.conditionPaiement,
        paiement_mobile: c.paiementMobile,
        contact_principal: c.contactPrincipal,
        telephone: c.telephone,
        email: c.email,
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()
    if (error) throw error
    return data ? toClient(data) : null
  } catch (e) {
    console.error('[supabase action] error:', e)
    return null
  }
}
