'use server'

import { getSupabaseWithOrg } from './helpers'

// Valeurs de repli si la factory n'a pas encore été paramétrée (migration 021).
const OH_RATE_DEFAULT      = 0.08
const ENERGIE_UNIT_DEFAULT = 50

// ── Output types ───────────────────────────────────────────────────────────

export interface MarginLigneBOM {
  code:        string
  designation: string
  unite:       string
  qte:         number   // quantité par unité de PF
  pmp:         number   // XOF/unité — depuis articles.pmp
  cout:        number   // qte × pmp
}

export interface MarginLigneGamme {
  operation:   string
  poste:       string       // nom du poste de charge
  codePoste:   string | null
  dureeMin:    number       // durée totale (réglage + run) en minutes par lot
  tauxHoraire: number       // XOF/h depuis work_centers.rate_per_hour
  cout:        number       // coût par unité de PF
}

export interface MarginLine {
  articleId:   string
  sku:         string
  label:       string
  batchSize:   number
  // Composantes du coût standard
  coutMatiere: number   // ① BOM × PMP
  coutGamme:   number   // ② Gamme × taux poste
  coutFG:      number   // ③ Frais généraux
  coutEnergie: number   // ④ Énergie (forfait)
  coutTotal:   number   // Coût de revient standard
  prixVente:   number
  margeGross:  number
  taux:        number   // taux de marge brute %
  // Détails pour drill-down
  lignesBOM:   MarginLigneBOM[]
  lignesGamme: MarginLigneGamme[]
}

// ── Server action ──────────────────────────────────────────────────────────

/**
 * Calcule le coût standard pour tous les articles de type PF.
 *
 * Optimisé : 5 requêtes Supabase en tout (pas de N+1).
 *
 * Données sources :
 *   - articles.pmp           → coût matière composants
 *   - articles.prix_vente    → prix de vente HT
 *   - work_centers.rate_per_hour → taux MOD/Machine par poste
 *   - bom_headers + bom_items
 *   - routing_headers + routing_steps
 */
export async function getMarginAnalysis(): Promise<MarginLine[]> {
  try {
    const { supabase, orgId, factoryId } = await getSupabaseWithOrg()

    // ── 0. Paramètres coûts usine (migration 021) ─────────────────────────
    let ohRate         = OH_RATE_DEFAULT
    let energieUnit    = ENERGIE_UNIT_DEFAULT
    if (factoryId) {
      const { data: fac } = await supabase
        .from('factories')
        .select('oh_rate, energie_unit_cost')
        .eq('id', factoryId)
        .maybeSingle()
      if (fac) {
        ohRate      = parseFloat(String(fac.oh_rate      ?? OH_RATE_DEFAULT))
        energieUnit = parseFloat(String(fac.energie_unit_cost ?? ENERGIE_UNIT_DEFAULT))
      }
    }

    // ── 1. Articles PF ────────────────────────────────────────────────────
    const { data: articles, error: artErr } = await supabase
      .from('articles')
      .select('id, code, designation, pmp, prix_vente')
      .eq('organization_id', orgId)
      .eq('type', 'PF')
      .order('code')

    if (artErr) throw artErr
    if (!articles?.length) return []

    const articleIds = articles.map((a) => a.id)

    // ── 2. BOM headers actifs ─────────────────────────────────────────────
    const { data: bomHeaders } = await supabase
      .from('bom_headers')
      .select('id, article_id, batch_size')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .in('article_id', articleIds)

    const bomHeaderIds = (bomHeaders ?? []).map((h) => h.id)

    // ── 3. BOM items avec PMP des composants ──────────────────────────────
    const { data: bomItemsRaw } = bomHeaderIds.length
      ? await supabase
          .from('bom_items')
          .select('bom_header_id, quantity, unit, component_label, articles!component_id(code, designation, pmp)')
          .in('bom_header_id', bomHeaderIds)
          .order('item_position')
      : { data: [] as unknown[] }

    // ── 4. Routing headers actifs ─────────────────────────────────────────
    const { data: routingHeaders } = await supabase
      .from('routing_headers')
      .select('id, article_id')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .in('article_id', articleIds)

    const routingHeaderIds = (routingHeaders ?? []).map((h) => h.id)

    // ── 5. Routing steps avec taux poste ──────────────────────────────────
    const { data: routingStepsRaw } = routingHeaderIds.length
      ? await supabase
          .from('routing_steps')
          .select('routing_header_id, operation, duration_min, setup_time_minutes, equipment, work_centers(name, code, rate_per_hour)')
          .in('routing_header_id', routingHeaderIds)
          .order('step_order')
      : { data: [] as unknown[] }

    // ── Index lookup maps ─────────────────────────────────────────────────

    type BomHeaderInfo = { id: string; batchSize: number }
    const bomByArticle = new Map<string, BomHeaderInfo>()
    for (const h of bomHeaders ?? []) {
      bomByArticle.set(h.article_id, { id: h.id, batchSize: parseFloat(String(h.batch_size ?? 1)) })
    }

    type RawBomItem = {
      bom_header_id: string
      quantity: number
      unit: string
      component_label: string | null
      articles: { code: string; designation: string; pmp: number | null } | null
    }
    const itemsByBom = new Map<string, RawBomItem[]>()
    for (const item of (bomItemsRaw ?? []) as RawBomItem[]) {
      const list = itemsByBom.get(item.bom_header_id) ?? []
      list.push(item)
      itemsByBom.set(item.bom_header_id, list)
    }

    const routingByArticle = new Map<string, string>() // articleId → routingHeaderId
    for (const h of routingHeaders ?? []) {
      routingByArticle.set(h.article_id, h.id)
    }

    type RawStep = {
      routing_header_id: string
      operation: string | null
      duration_min: number | null
      setup_time_minutes: number | null
      equipment: string | null
      work_centers: { name: string; code: string | null; rate_per_hour: number } | null
    }
    const stepsByRouting = new Map<string, RawStep[]>()
    for (const step of (routingStepsRaw ?? []) as RawStep[]) {
      const list = stepsByRouting.get(step.routing_header_id) ?? []
      list.push(step)
      stepsByRouting.set(step.routing_header_id, list)
    }

    // ── Assemble MarginLine per article ───────────────────────────────────

    const results: MarginLine[] = []

    for (const article of articles) {
      const bom      = bomByArticle.get(article.id)
      const batchSize = bom?.batchSize ?? 1

      // ① Matières
      const rawItems  = bom ? (itemsByBom.get(bom.id) ?? []) : []
      const lignesBOM: MarginLigneBOM[] = rawItems.map((item) => {
        const comp      = item.articles
        const qty       = parseFloat(String(item.quantity ?? 0))
        const pmp       = parseFloat(String(comp?.pmp ?? 0))
        const qtePerUnit = batchSize > 0 ? qty / batchSize : qty
        return {
          code:        comp?.code ?? '',
          designation: comp?.designation ?? item.component_label ?? '',
          unite:       item.unit ?? '',
          qte:         qtePerUnit,
          pmp,
          cout:        qtePerUnit * pmp,
        }
      })
      const coutMatiere = lignesBOM.reduce((s, l) => s + l.cout, 0)

      // ② MOD/Machine
      const routingId  = routingByArticle.get(article.id)
      const rawSteps   = routingId ? (stepsByRouting.get(routingId) ?? []) : []
      const lignesGamme: MarginLigneGamme[] = rawSteps.map((step) => {
        const wc          = step.work_centers
        const dureeRun    = parseFloat(String(step.duration_min    ?? 0))
        const dureeSetup  = parseFloat(String(step.setup_time_minutes ?? 0))
        const dureeMin    = dureeRun + dureeSetup
        const tauxHoraire = wc ? parseFloat(String(wc.rate_per_hour ?? 0)) : 0
        // coût par unité = (durée lot en h) / taille lot × taux
        const cout = batchSize > 0 ? (dureeMin / 60 / batchSize) * tauxHoraire : 0
        return {
          operation:   step.operation ?? '',
          poste:       wc?.name ?? step.equipment ?? '',
          codePoste:   wc?.code ?? null,
          dureeMin,
          tauxHoraire,
          cout,
        }
      })
      const coutGamme = lignesGamme.reduce((s, l) => s + l.cout, 0)

      // ③④ FG + Énergie — taux lus depuis factories (migration 021)
      const coutFG      = (coutMatiere + coutGamme) * ohRate
      const coutEnergie = energieUnit
      const coutTotal   = coutMatiere + coutGamme + coutFG + coutEnergie
      const prixVente   = parseFloat(String(article.prix_vente ?? 0))
      const margeGross  = prixVente - coutTotal
      const taux        = prixVente > 0 ? (margeGross / prixVente) * 100 : 0

      results.push({
        articleId:   article.id,
        sku:         article.code,
        label:       article.designation,
        batchSize,
        coutMatiere,
        coutGamme,
        coutFG,
        coutEnergie,
        coutTotal,
        prixVente,
        margeGross,
        taux,
        lignesBOM,
        lignesGamme,
      })
    }

    return results
  } catch (e) {
    console.error('[marge] getMarginAnalysis:', e)
    return []
  }
}
