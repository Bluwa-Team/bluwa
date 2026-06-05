'use server'

import { getSupabaseWithOrg } from './helpers'
import { Article, ArticleType, ArticleStatut, ArticleAppro } from '@/app/[locale]/(dashboard)/articles/_components/types'

function toArticle(row: Record<string, unknown>): Article {
  return {
    id: row.id as string,
    code: row.code as string,
    designation: row.designation as string,
    type: row.type as ArticleType,
    statut: row.statut as ArticleStatut,
    famille: (row.famille as string) ?? '',
    sousFamille: (row.sous_famille as string) ?? '',
    categorie: (row.categorie as string) ?? '',
    uniteStock: (row.unite_stock as string) ?? '',
    uniteVente: (row.unite_vente as string) ?? '',
    coeffConversion: (row.coeff_conversion as number) ?? 1,
    uniteAchat: (row.unite_achat as string) ?? '',
    coeffConversionAchat: (row.coeff_conversion_achat as number) ?? 1,
    dernierPrixAchat: (row.dernier_prix_achat as number) ?? null,
    prixVente: (row.prix_vente as number) ?? null,
    pmp: (row.pmp as number) ?? null,
    devise: (row.devise as string) ?? 'XOF',
    poidsUnitaire: (row.poids_unitaire as number) ?? null,
    poidsUnite: (row.poids_unite as string) ?? 'kg',
    volumeUnitaire: (row.volume_unitaire as number) ?? null,
    volumeUnite: (row.volume_unite as string) ?? 'L',
    dureeVie: (row.duree_vie as number) ?? null,
    stockSecurite: (row.stock_securite as number) ?? null,
    pointCommande: (row.point_commande as number) ?? null,
    appro: (row.appro as ArticleAppro) ?? 'Achete',
    gestionLot: (row.gestion_lot as boolean) ?? true,
    delaiControle: (row.delai_controle as number) ?? null,
    seuilAlertePeremption: (row.seuil_alerte_peremption as number) ?? null,
    protocoleControle: (row.protocole_controle as string) ?? '',
    codeBarres: (row.code_barres as string) ?? '',
    qrCode: (row.qr_code as string) ?? '',
    createdAt: ((row.created_at as string) ?? '').split('T')[0],
    updatedAt: ((row.updated_at as string) ?? '').split('T')[0],
  }
}

export async function getArticles(): Promise<Article[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(toArticle)
  } catch {
    return []
  }
}

export async function getPFArticles(): Promise<{ id: string; code: string; designation: string; uniteStock: string }[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('articles')
      .select('id, code, designation, unite_stock')
      .eq('organization_id', orgId)
      .in('type', ['PF', 'PSF'])
      .eq('statut', 'Actif')
      .order('code')
    if (error) throw error
    return (data ?? []).map((r) => ({
      id:          r.id as string,
      code:        r.code as string,
      designation: r.designation as string,
      uniteStock:  (r.unite_stock as string) ?? '',
    }))
  } catch {
    return []
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()
    if (error) throw error
    return data ? toArticle(data) : null
  } catch (e) {
    console.error('[articles action] error:', e)
    return null
  }
}

export async function createArticle(article: Partial<Article> & { code: string }): Promise<Article | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('articles')
      .insert({
        organization_id: orgId,
        code: article.code,
        designation: article.designation,
        type: article.type,
        statut: article.statut ?? 'EnCreation',
        famille: article.famille,
        sous_famille: article.sousFamille,
        categorie: article.categorie,
        unite_stock: article.uniteStock,
        unite_vente: article.uniteVente,
        coeff_conversion: article.coeffConversion,
        unite_achat: article.uniteAchat || null,
        coeff_conversion_achat: article.coeffConversionAchat ?? 1,
        dernier_prix_achat: article.dernierPrixAchat,
        prix_vente: article.prixVente,
        devise: article.devise ?? 'XOF',
        poids_unitaire: article.poidsUnitaire,
        poids_unite: article.poidsUnite ?? 'kg',
        volume_unitaire: article.volumeUnitaire,
        volume_unite: article.volumeUnite ?? 'L',
        duree_vie: article.dureeVie,
        stock_securite: article.stockSecurite,
        point_commande: article.pointCommande,
        appro: article.appro,
        gestion_lot: article.gestionLot ?? true,
        delai_controle: article.delaiControle,
        seuil_alerte_peremption: article.seuilAlertePeremption,
        protocole_controle: article.protocoleControle,
      })
      .select()
      .single()
    if (error) throw error
    return data ? toArticle(data) : null
  } catch (e) {
    console.error('[articles action] error:', e)
    return null
  }
}

export async function getComponentArticles(): Promise<{ code: string; designation: string; unite: string }[]> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('articles')
      .select('code, designation, unite_stock')
      .eq('organization_id', orgId)
      .in('type', ['MP', 'AC', 'CS'])
      .eq('statut', 'Actif')
      .order('code')
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => ({
      code:        r.code as string,
      designation: r.designation as string,
      unite:       (r.unite_stock as string) ?? 'kg',
    }))
  } catch {
    return []
  }
}

export async function updateArticle(id: string, article: Partial<Article>): Promise<Article | null> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const { data, error } = await supabase
      .from('articles')
      .update({
        designation: article.designation,
        type: article.type,
        statut: article.statut,
        famille: article.famille,
        sous_famille: article.sousFamille,
        categorie: article.categorie,
        unite_stock: article.uniteStock,
        unite_vente: article.uniteVente,
        coeff_conversion: article.coeffConversion,
        unite_achat: article.uniteAchat || null,
        coeff_conversion_achat: article.coeffConversionAchat ?? 1,
        dernier_prix_achat: article.dernierPrixAchat,
        prix_vente: article.prixVente,
        devise: article.devise,
        poids_unitaire: article.poidsUnitaire,
        poids_unite: article.poidsUnite,
        volume_unitaire: article.volumeUnitaire,
        volume_unite: article.volumeUnite,
        duree_vie: article.dureeVie,
        stock_securite: article.stockSecurite,
        point_commande: article.pointCommande,
        appro: article.appro,
        gestion_lot: article.gestionLot,
        delai_controle: article.delaiControle,
        seuil_alerte_peremption: article.seuilAlertePeremption,
        protocole_controle: article.protocoleControle,
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()
    if (error) throw error
    return data ? toArticle(data) : null
  } catch (e) {
    console.error('[articles action] error:', e)
    return null
  }
}
