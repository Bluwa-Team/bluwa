'use server'

import { getSupabaseWithOrg } from './helpers'
import type {
  QualityInspectionLot, StatutInspectionLot, TypeAnalyse, MicrobioStatus,
  LaboratoryResults, ResultatsMicrobiologiques, FluxLot,
} from '@/app/[locale]/(dashboard)/qualite/_components/types'
import type { ArticleType } from '@/types/erp'

// ── Sélecteurs ────────────────────────────────────────────────────────────────

const QIL_SELECT = `
  id, lot_id, batch_number, article_id, goods_receipt_item_id,
  organization_id, factory_id,
  sample_quantity, status, types_analyse,
  laboratory_results, microbio_status, microbio_delai_jours, microbio_resultats,
  decision_by, decision_comments, decision_at, created_at,
  articles!article_id ( code, designation, type, unite_stock ),
  lots!lot_id (
    quantity_remaining, goods_receipt_id,
    goods_receipts!goods_receipt_id (
      fournisseur_nom, fournisseur_type,
      purchase_orders!purchase_order_id (
        fournisseurs!fournisseur_id ( raison_sociale )
      )
    )
  )
`

const PENDING_LOT_SELECT = `
  id, batch_number, quantity_remaining, statut_qc, created_at,
  goods_receipt_id, organization_id, factory_id, article_id,
  articles!article_id ( code, designation, type, unite_stock ),
  goods_receipts!goods_receipt_id (
    fournisseur_nom, fournisseur_type,
    purchase_orders!purchase_order_id (
      fournisseurs!fournisseur_id ( raison_sociale )
    )
  )
`

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapQILRow(row: Record<string, unknown>): QualityInspectionLot {
  const art        = (row as any).articles
  const lot        = (row as any).lots
  const gr         = lot?.goods_receipts
  const fournisseur = gr?.purchase_orders?.fournisseurs

  const flux: FluxLot = lot?.goods_receipt_id ? 'Reception' : 'Production'
  const origine       = fournisseur?.raison_sociale ?? gr?.fournisseur_nom ?? '—'

  return {
    id:                  row.lot_id as string,
    organizationId:      row.organization_id as string,
    factoryId:           row.factory_id as string,
    goodsReceiptItemId:  (row.goods_receipt_item_id as string | null) ?? null,
    articleId:           row.article_id as string,
    articleCode:         art?.code ?? '',
    articleDesignation:  art?.designation ?? '',
    articleType:         (art?.type ?? 'MP') as ArticleType,
    batchNumber:         row.batch_number as string,
    sampleQuantity:      row.sample_quantity != null ? Number(row.sample_quantity) : null,
    status:              row.status as StatutInspectionLot,
    laboratoryResults:   (row.laboratory_results as LaboratoryResults | null) ?? null,
    microbioStatus:      (row.microbio_status as MicrobioStatus | null) ?? null,
    microbioDelaiJours:  row.microbio_delai_jours != null ? Number(row.microbio_delai_jours) : null,
    microbioResultats:   (row.microbio_resultats as ResultatsMicrobiologiques | null) ?? null,
    typesAnalyse:        (row.types_analyse as TypeAnalyse[]) ?? ['PHYSICO_CHIMIQUE'],
    decisionBy:          (row.decision_by as string | null) ?? null,
    decisionComments:    (row.decision_comments as string | null) ?? null,
    decisionAt:          (row.decision_at as string | null) ?? null,
    createdAt:           row.created_at as string,
    origine,
    flux,
    quantite:            Number(lot?.quantity_remaining ?? 0),
    unite:               art?.unite_stock ?? '',
  }
}

function mapPendingLotRow(row: Record<string, unknown>): QualityInspectionLot {
  const art         = (row as any).articles
  const gr          = (row as any).goods_receipts
  const fournisseur = gr?.purchase_orders?.fournisseurs

  const flux: FluxLot = (row.goods_receipt_id as string | null) ? 'Reception' : 'Production'
  const origine       = fournisseur?.raison_sociale ?? gr?.fournisseur_nom ?? '—'

  return {
    id:                  row.id as string,
    organizationId:      row.organization_id as string,
    factoryId:           row.factory_id as string,
    goodsReceiptItemId:  null,
    articleId:           row.article_id as string,
    articleCode:         art?.code ?? '',
    articleDesignation:  art?.designation ?? '',
    articleType:         (art?.type ?? 'MP') as ArticleType,
    batchNumber:         row.batch_number as string,
    sampleQuantity:      null,
    status:              'En contrôle',
    laboratoryResults:   null,
    microbioStatus:      null,
    microbioDelaiJours:  null,
    microbioResultats:   null,
    typesAnalyse:        ['PHYSICO_CHIMIQUE'],
    decisionBy:          null,
    decisionComments:    null,
    decisionAt:          null,
    createdAt:           row.created_at as string,
    origine,
    flux,
    quantite:            Number(row.quantity_remaining ?? 0),
    unite:               art?.unite_stock ?? '',
  }
}

// ── Lecture ───────────────────────────────────────────────────────────────────

export async function getQualityInspectionLots(): Promise<QualityInspectionLot[]> {
  try {
    const { supabase, orgId, factoryId } = await getSupabaseWithOrg()

    // 1. Lots déjà décidés (enregistrés dans quality_inspection_lots)
    let qilQuery = supabase
      .from('quality_inspection_lots')
      .select(QIL_SELECT)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (factoryId) qilQuery = qilQuery.eq('factory_id', factoryId)

    const { data: qilData, error: qilErr } = await qilQuery
    if (qilErr) throw qilErr

    const decidedLotIds = (qilData ?? []).map((r: any) => r.lot_id as string)

    // 2. Lots en attente (statut_qc = EnControle, sans QIL existant)
    let pendingQuery = supabase
      .from('lots')
      .select(PENDING_LOT_SELECT)
      .eq('organization_id', orgId)
      .eq('statut_qc', 'EnControle')
      .order('created_at', { ascending: false })
    if (factoryId) pendingQuery = pendingQuery.eq('factory_id', factoryId)
    if (decidedLotIds.length > 0) {
      pendingQuery = pendingQuery.not('id', 'in', `(${decidedLotIds.join(',')})`)
    }

    const { data: pendingData, error: pendingErr } = await pendingQuery
    if (pendingErr) throw pendingErr

    const pending = (pendingData ?? []).map(mapPendingLotRow)
    const decided = (qilData ?? []).map(mapQILRow)

    return [...pending, ...decided]
  } catch (e) {
    console.error('[getQualityInspectionLots]', e)
    return []
  }
}

// ── Décision ──────────────────────────────────────────────────────────────────

export async function saveQualityDecision(input: {
  lotId:             string
  decision:          'usage_interne' | 'marche' | 'rejeter'
  laboratoryResults: LaboratoryResults
  microbioResultats: ResultatsMicrobiologiques | null
  microbioStatus:    MicrobioStatus | null
  typesAnalyse:      TypeAnalyse[]
  analyste:          string
  commentaire:       string
}): Promise<{ error: string | null }> {
  try {
    const { supabase, orgId } = await getSupabaseWithOrg()
    const {
      lotId, decision, laboratoryResults, microbioResultats,
      microbioStatus, typesAnalyse, analyste, commentaire,
    } = input

    const { data: lot, error: lotErr } = await supabase
      .from('lots')
      .select('id, batch_number, article_id, factory_id')
      .eq('organization_id', orgId)
      .eq('id', lotId)
      .single()
    if (lotErr || !lot) throw new Error('Lot introuvable')

    const qilStatus: StatutInspectionLot =
      decision === 'rejeter'       ? 'Rejeté'                  :
      decision === 'usage_interne' ? 'Libéré — Usage interne'  :
                                     'Libéré — Marché'

    const lotStatutQC =
      decision === 'rejeter'       ? 'Bloque'              :
      decision === 'usage_interne' ? 'LibereUsageInterne'  :
                                     'Libere'

    const labPayload = Object.keys(laboratoryResults).length > 0 ? laboratoryResults : null
    const now        = new Date().toISOString()

    const { error: upsertErr } = await supabase
      .from('quality_inspection_lots')
      .upsert({
        organization_id:    orgId,
        factory_id:         (lot as any).factory_id,
        lot_id:             lotId,
        batch_number:       (lot as any).batch_number,
        article_id:         (lot as any).article_id,
        status:             qilStatus,
        types_analyse:      typesAnalyse,
        laboratory_results: labPayload,
        microbio_status:    microbioStatus,
        microbio_resultats: microbioResultats,
        decision_by:        analyste || null,
        decision_comments:  commentaire || null,
        decision_at:        now,
        updated_at:         now,
      }, { onConflict: 'lot_id' })
    if (upsertErr) throw upsertErr

    const { error: updateErr } = await supabase
      .from('lots')
      .update({ statut_qc: lotStatutQC, updated_at: now })
      .eq('organization_id', orgId)
      .eq('id', lotId)
    if (updateErr) throw updateErr

    return { error: null }
  } catch (e) {
    console.error('[saveQualityDecision]', e)
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
