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
    dernierPrixAchat: (row.dernier_prix_achat as number) ?? null,
    prixVente: (row.prix_vente as number) ?? null,
    pmp: (row.pmp as number) ?? null,
    poidsUnitaire: (row.poids_unitaire as number) ?? null,
    volumeUnitaire: (row.volume_unitaire as number) ?? null,
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
        dernier_prix_achat: article.dernierPrixAchat,
        prix_vente: article.prixVente,
        poids_unitaire: article.poidsUnitaire,
        volume_unitaire: article.volumeUnitaire,
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
        dernier_prix_achat: article.dernierPrixAchat,
        prix_vente: article.prixVente,
        poids_unitaire: article.poidsUnitaire,
        volume_unitaire: article.volumeUnitaire,
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
