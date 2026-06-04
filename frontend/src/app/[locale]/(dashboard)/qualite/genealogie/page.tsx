'use client'

import { useState } from 'react'
import {
  GitBranch, Search, FileDown, Package, Box, CornerDownRight,
  TruckIcon, FlaskConical, CheckCircle2, XCircle, Clock, AlertTriangle,
} from 'lucide-react'
import { HelpPopover } from '@/components/ui/help-popover'
import { Button } from '@/components/ui/button'
import {
  MOCK_GENEALOGIE, GenealogiePF, GenealogieLien, ControleProduction,
  STATUT_LOT_LABELS, STATUT_LOT_COLORS, TYPE_ARTICLE_COLORS,
  DestinationAval,
} from '../_components/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchResult =
  | { mode: 'pf'; entry: GenealogiePF }
  | { mode: 'mp'; codeLot: string; article: string; usages: Array<{ pf: GenealogiePF; lien: GenealogieLien }> }

// ── Helpers ───────────────────────────────────────────────────────────────────

function doSearch(query: string): SearchResult | null {
  const q = query.trim().toLowerCase()
  if (!q) return null

  const pfMatch = MOCK_GENEALOGIE.find(g => g.codeLotPF.toLowerCase().includes(q))
  if (pfMatch) return { mode: 'pf', entry: pfMatch }

  const usages: Array<{ pf: GenealogiePF; lien: GenealogieLien }> = []
  for (const pf of MOCK_GENEALOGIE) {
    for (const lien of pf.ingredients) {
      if (lien.codeLot.toLowerCase().includes(q) || lien.article.toLowerCase().includes(q)) {
        usages.push({ pf, lien })
      }
    }
  }
  if (usages.length > 0) {
    const { codeLot, article } = usages[0].lien
    return { mode: 'mp', codeLot, article, usages }
  }

  return null
}

function downloadDossierPDF(result: SearchResult) {
  const lines: string[] = [
    '══════════════════════════════════════════════════════',
    '  DOSSIER DE LOT — TRAÇABILITÉ COMPLÈTE',
    '  Bluwa ERP · ' + new Date().toLocaleDateString('fr-FR'),
    '══════════════════════════════════════════════════════',
    '',
  ]

  if (result.mode === 'pf') {
    const { entry } = result
    lines.push(`LOT PRODUIT FINI     : ${entry.codeLotPF}`)
    lines.push(`Article              : ${entry.articlePF}`)
    lines.push(`Ordre de fabrication : ${entry.numeroOF}`)
    lines.push(`Date de production   : ${entry.dateProduction}`)
    lines.push(`Quantité produite    : ${entry.quantiteProduite} ${entry.unite}`)
    lines.push(`Statut               : ${STATUT_LOT_LABELS[entry.statut]}`)

    if (entry.controlesProduction?.length) {
      lines.push(''); lines.push('CONTRÔLES DE PRODUCTION :')
      lines.push('─'.repeat(54))
      for (const c of entry.controlesProduction) {
        const ico = c.ok ? '✓' : '✗'
        const pcc = c.pcc ? ` [${c.pcc}]` : ''
        lines.push(`  ${ico} ${c.parametre.padEnd(32)} ${c.valeur.padEnd(10)} Limite: ${c.limite}${pcc}`)
      }
    }

    lines.push(''); lines.push(`MATIÈRES PREMIÈRES ET CONDITIONNEMENT (${entry.ingredients.length} lots) :`)
    lines.push('─'.repeat(54))
    for (const ing of entry.ingredients) {
      lines.push(`  [${ing.typeArticle}] ${ing.codeLot}`)
      lines.push(`       ${ing.article} · ${ing.qteUtilisee} ${ing.unite}`)
      lines.push(`       Fournisseur : ${ing.fournisseur} (réception ${ing.dateReception})`)
      lines.push(`       Statut lot  : ${STATUT_LOT_LABELS[ing.statut]}`)
      if (ing.qcResultats) {
        const r = ing.qcResultats
        const vals = [
          r.ph         != null ? `pH ${r.ph}` : null,
          r.brix       != null ? `Brix ${r.brix}°` : null,
          r.humidite   != null ? `Humidité ${r.humidite}%` : null,
          r.temperature != null ? `T° ${r.temperature}°C` : null,
        ].filter(Boolean).join(' · ')
        if (vals) lines.push(`       Résultats   : ${vals}`)
      }
      if (ing.qcDecisionPar) lines.push(`       Libéré par  : ${ing.qcDecisionPar} le ${ing.qcDecisionAt?.split('T')[0]}`)
      if (ing.qcCommentaires) lines.push(`       Commentaire : ${ing.qcCommentaires}`)
      if (ing.ncNumero) lines.push(`       ⚠ NC ouverte : ${ing.ncNumero}`)
      lines.push('')
    }
    if (entry.destinations?.length) {
      lines.push('AVAL — DESTINATIONS :'); lines.push('─'.repeat(54))
      for (const dest of entry.destinations) {
        lines.push(`  ${dest.destination.padEnd(30)} ${dest.dateLivraison ?? 'Stock'}   ${dest.quantite} ${dest.unite}`)
      }
    }
  } else {
    lines.push(`LOT AMONT : ${result.codeLot}`)
    lines.push(`Article   : ${result.article}`)
    lines.push(''); lines.push(`TRAÇABILITÉ AVAL — ${result.usages.length} LOT(S) PF :`)
    lines.push('─'.repeat(54))
    for (const { pf, lien } of result.usages) {
      lines.push(`  ${pf.codeLotPF} — ${pf.articlePF}`)
      lines.push(`    OF : ${pf.numeroOF} · Production : ${pf.dateProduction}`)
      lines.push(`    Quantité consommée : ${lien.qteUtilisee} ${lien.unite}`)
    }
  }

  lines.push('──────────────────────────────────────────────────────')
  lines.push('  Document généré automatiquement par Bluwa ERP')
  lines.push('  Confidentialité : Usage interne uniquement')

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dossier-lot-${result.mode === 'pf' ? result.entry.codeLotPF : result.codeLot}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const EXAMPLES = [
  { label: 'Lot PF (Original)',  code: 'PF-20260524-0041' },
  { label: 'Lot PF (Vanille)',   code: 'PF-20260524-0042' },
  { label: 'Lot MP (Hibiscus)',  code: 'MP-20260522-0031' },
  { label: 'Lot AC (Bouteilles)',code: 'AC-20260523-0018' },
]

// ── QC Badge ─────────────────────────────────────────────────────────────────

function QcBadge({ statut }: { statut: string }) {
  if (statut === 'EnControle') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
      <Clock className="size-2.5" /> En contrôle
    </span>
  )
  if (statut === 'Libere') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="size-2.5" /> Libéré
    </span>
  )
  if (statut === 'NonConforme') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600 text-white border border-red-700">
      <XCircle className="size-2.5" /> Non-conforme
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle className="size-2.5" /> Bloqué
    </span>
  )
}

// ── Contrôles production ──────────────────────────────────────────────────────

function ControlesProduction({ controles }: { controles: ControleProduction[] }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-teal-50 border-b flex items-center gap-2">
        <FlaskConical className="size-3.5 text-teal-600" />
        <p className="text-sm font-semibold text-teal-800">
          Contrôles de production
          <span className="ml-2 text-xs font-normal text-teal-600">enregistrements PCC & paramètres process</span>
        </p>
      </div>
      <div className="divide-y">
        {controles.map((c, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${c.ok ? '' : 'bg-red-50'}`}>
            {c.ok
              ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              : <XCircle     className="size-4 text-red-500 shrink-0" />}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{c.parametre}</span>
              {c.pcc && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                  {c.pcc}
                </span>
              )}
            </div>
            <span className="font-mono text-sm font-bold tabular-nums shrink-0">{c.valeur}</span>
            <span className="text-xs text-muted-foreground shrink-0">Limite : {c.limite}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GenealogiePage() {
  const [query,  setQuery]  = useState('PF-20260524-0041')
  const [result, setResult] = useState<SearchResult | null>(() => doSearch('PF-20260524-0041'))

  function handleSearch() { setResult(doSearch(query)) }
  function loadExample(code: string) { setQuery(code); setResult(doSearch(code)) }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <GitBranch className="size-5 text-violet-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Généalogie & Traçabilité</h1>
            <HelpPopover section="genealogie" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recherche bidirectionnelle : lot PF → ingrédients + contrôles · lot MP → produits finis
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Ex : PF-20260524-0041 ou MP-20260522-0031"
            className="flex-1 h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button onClick={handleSearch} className="gap-2 shrink-0">
            <Search className="size-4" />
            Rechercher
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Exemples :</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex.code}
              onClick={() => loadExample(ex.code)}
              className="text-xs px-2.5 py-1 rounded-md border bg-background hover:bg-muted/50 transition-colors font-mono"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {result === null && query.trim() && (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Aucun lot trouvé pour &quot;{query}&quot;. Vérifiez le code lot.
        </div>
      )}

      {result?.mode === 'pf' && <PFResult entry={result.entry} onExport={() => downloadDossierPDF(result)} />}
      {result?.mode === 'mp' && <MPResult codeLot={result.codeLot} article={result.article} usages={result.usages} onExport={() => downloadDossierPDF(result)} />}
    </div>
  )
}

// ── PF Result ─────────────────────────────────────────────────────────────────

function PFResult({ entry, onExport }: { entry: GenealogiePF; onExport: () => void }) {
  return (
    <div className="space-y-4">

      {/* PF lot card */}
      <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <Box className="size-4 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Lot produit fini</p>
              <p className="font-mono text-base font-bold mt-0.5">{entry.codeLotPF}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{entry.articlePF}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>OF : <strong className="text-foreground">{entry.numeroOF}</strong></span>
                <span>·</span>
                <span>Production : <strong className="text-foreground">{entry.dateProduction}</strong></span>
                <span>·</span>
                <span><strong className="text-foreground">{entry.quantiteProduite} {entry.unite}</strong></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <QcBadge statut={entry.statut} />
            <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5 h-8">
              <FileDown className="size-3.5" />
              Exporter
            </Button>
          </div>
        </div>
      </div>

      {/* Contrôles de production */}
      {entry.controlesProduction && entry.controlesProduction.length > 0 && (
        <ControlesProduction controles={entry.controlesProduction} />
      )}

      {/* Ingrédients */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 border-b flex items-center gap-2">
          <CornerDownRight className="size-3.5 text-muted-foreground" />
          <p className="text-sm font-semibold">
            Ingrédients & contrôles réception
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {entry.ingredients.length} lot{entry.ingredients.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="divide-y">
          {entry.ingredients.map((ing, i) => (
            <div key={i} className="px-4 py-3 hover:bg-muted/10">
              <div className="flex items-center gap-3">
                <CornerDownRight className="size-3.5 text-muted-foreground/50 shrink-0" />
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 ${TYPE_ARTICLE_COLORS[ing.typeArticle]}`}>
                  {ing.typeArticle}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{ing.codeLot}</p>
                  <p className="text-sm font-medium truncate">{ing.article}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{ing.qteUtilisee} {ing.unite}</p>
                  <p className="text-xs text-muted-foreground">{ing.fournisseur}</p>
                </div>
                <QcBadge statut={ing.statut} />
              </div>

              {/* Résultats QC */}
              {(ing.qcResultats || ing.qcDecisionPar || ing.qcCommentaires || ing.ncNumero) && (
                <div className={`mt-2 ml-8 rounded-lg px-3 py-2 text-xs space-y-1 ${
                  ing.statut === 'NonConforme' ? 'bg-red-50 border border-red-100' :
                  ing.statut === 'Libere'      ? 'bg-emerald-50 border border-emerald-100' :
                                                 'bg-amber-50 border border-amber-100'
                }`}>
                  {/* Résultats labo */}
                  {ing.qcResultats && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <FlaskConical className="size-3 text-muted-foreground shrink-0" />
                      {ing.qcResultats.ph         != null && <span><span className="font-semibold">pH</span> {ing.qcResultats.ph}</span>}
                      {ing.qcResultats.brix        != null && <span><span className="font-semibold">Brix</span> {ing.qcResultats.brix}°</span>}
                      {ing.qcResultats.humidite    != null && <span><span className="font-semibold">Humidité</span> {ing.qcResultats.humidite}%</span>}
                      {ing.qcResultats.temperature != null && <span><span className="font-semibold">T°</span> {ing.qcResultats.temperature}°C</span>}
                    </div>
                  )}
                  {/* Décision */}
                  {ing.qcDecisionPar && (
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Décision :</span>{' '}
                      {ing.qcDecisionPar} · {ing.qcDecisionAt?.split('T')[0]}
                    </p>
                  )}
                  {/* Commentaire */}
                  {ing.qcCommentaires && (
                    <p className="text-muted-foreground italic">{ing.qcCommentaires}</p>
                  )}
                  {/* NC */}
                  {ing.ncNumero && (
                    <p className="flex items-center gap-1 text-red-700 font-semibold">
                      <AlertTriangle className="size-3" />
                      NC ouverte : {ing.ncNumero}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Aval destinations */}
      {entry.destinations && entry.destinations.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b flex items-center gap-2">
            <TruckIcon className="size-3.5 text-muted-foreground" />
            <p className="text-sm font-semibold">
              AVAL — Destinations & Distribution
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {entry.destinations.length} ligne{entry.destinations.length !== 1 ? 's' : ''}
              </span>
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-2 text-left text-xs font-semibold tracking-wide uppercase text-muted-foreground">Destination</th>
                <th className="px-4 py-2 text-left text-xs font-semibold tracking-wide uppercase text-muted-foreground">Date livraison</th>
                <th className="px-4 py-2 text-right text-xs font-semibold tracking-wide uppercase text-muted-foreground">Quantité</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entry.destinations.map((dest, i) => (
                <tr key={i} className="hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium">{dest.destination}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {dest.dateLivraison ?? <span className="text-slate-400">Stock disponible</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {dest.quantite} <span className="font-normal text-muted-foreground">{dest.unite}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── MP Result ─────────────────────────────────────────────────────────────────

function MPResult({ codeLot, article, usages, onExport }: {
  codeLot: string
  article: string
  usages: Array<{ pf: GenealogiePF; lien: GenealogieLien }>
  onExport: () => void
}) {
  const typeArticle = usages[0]?.lien.typeArticle
  const fournisseur = usages[0]?.lien.fournisseur
  const statut      = usages[0]?.lien.statut
  const lien0       = usages[0]?.lien

  return (
    <div className="space-y-4">

      {/* MP lot card */}
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <Package className="size-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Lot amont trouvé</p>
              <p className="font-mono text-base font-bold mt-0.5">{codeLot}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{article}</p>
              {typeArticle && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${TYPE_ARTICLE_COLORS[typeArticle]}`}>
                    {typeArticle}
                  </span>
                  {fournisseur && <span className="text-xs text-muted-foreground">{fournisseur}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statut && <QcBadge statut={statut} />}
            <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5 h-8">
              <FileDown className="size-3.5" />
              Exporter
            </Button>
          </div>
        </div>

        {/* QC data du lot amont */}
        {lien0 && (lien0.qcResultats || lien0.qcDecisionPar || lien0.qcCommentaires) && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-xs space-y-1 ${
            statut === 'Libere' ? 'bg-emerald-50 border border-emerald-100' :
            statut === 'NonConforme' ? 'bg-red-50 border border-red-100' :
                                      'bg-amber-50 border border-amber-100'
          }`}>
            {lien0.qcResultats && (
              <div className="flex items-center gap-3 flex-wrap">
                <FlaskConical className="size-3 text-muted-foreground shrink-0" />
                {lien0.qcResultats.ph         != null && <span><span className="font-semibold">pH</span> {lien0.qcResultats.ph}</span>}
                {lien0.qcResultats.brix        != null && <span><span className="font-semibold">Brix</span> {lien0.qcResultats.brix}°</span>}
                {lien0.qcResultats.humidite    != null && <span><span className="font-semibold">Humidité</span> {lien0.qcResultats.humidite}%</span>}
                {lien0.qcResultats.temperature != null && <span><span className="font-semibold">T°</span> {lien0.qcResultats.temperature}°C</span>}
              </div>
            )}
            {lien0.qcDecisionPar && (
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Décision :</span>{' '}
                {lien0.qcDecisionPar} · {lien0.qcDecisionAt?.split('T')[0]}
              </p>
            )}
            {lien0.qcCommentaires && <p className="text-muted-foreground italic">{lien0.qcCommentaires}</p>}
            {lien0.ncNumero && (
              <p className="flex items-center gap-1 text-red-700 font-semibold">
                <AlertTriangle className="size-3" /> NC ouverte : {lien0.ncNumero}
              </p>
            )}
          </div>
        )}
      </div>

      {/* PF lots using this ingredient */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 border-b">
          <p className="text-sm font-semibold">
            Lots PF utilisant ce composant
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {usages.length} lot{usages.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="divide-y">
          {usages.map(({ pf, lien }, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/10">
              <CornerDownRight className="size-3.5 text-muted-foreground/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{pf.codeLotPF}</p>
                <p className="text-sm font-medium truncate">{pf.articlePF}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pf.numeroOF} · {pf.dateProduction} · {pf.quantiteProduite} {pf.unite}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Consommé</p>
                <p className="text-sm font-semibold tabular-nums">{lien.qteUtilisee} {lien.unite}</p>
              </div>
              <QcBadge statut={pf.statut} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
