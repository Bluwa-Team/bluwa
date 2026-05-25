'use client'

import { useState } from 'react'
import { GitBranch, Search, FileDown, Package, Box, CornerDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MOCK_GENEALOGIE, GenealogiePF, GenealogieLien,
  STATUT_LOT_LABELS, STATUT_LOT_COLORS, TYPE_ARTICLE_COLORS,
} from '../_components/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchResult =
  | { mode: 'pf'; entry: GenealogiePF }
  | { mode: 'mp'; codeLot: string; article: string; usages: Array<{ pf: GenealogiePF; lien: GenealogieLien }> }

// ── Helpers ───────────────────────────────────────────────────────────────────

function doSearch(query: string): SearchResult | null {
  const q = query.trim().toLowerCase()
  if (!q) return null

  // PF lot search
  const pfMatch = MOCK_GENEALOGIE.find(g => g.codeLotPF.toLowerCase().includes(q))
  if (pfMatch) return { mode: 'pf', entry: pfMatch }

  // MP/AC lot search (reverse)
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
    lines.push(`LOT PRODUIT FINI   : ${entry.codeLotPF}`)
    lines.push(`Article            : ${entry.articlePF}`)
    lines.push(`Ordre de fabrication : ${entry.numeroOF}`)
    lines.push(`Date de production : ${entry.dateProduction}`)
    lines.push(`Quantité produite  : ${entry.quantiteProduite} ${entry.unite}`)
    lines.push(`Statut             : ${STATUT_LOT_LABELS[entry.statut]}`)
    lines.push('')
    lines.push(`MATIÈRES PREMIÈRES ET CONDITIONNEMENT (${entry.ingredients.length} lots) :`)
    lines.push('─'.repeat(54))
    for (const ing of entry.ingredients) {
      lines.push(`  [${ing.typeArticle}] ${ing.codeLot}`)
      lines.push(`       ${ing.article} · ${ing.qteUtilisee} ${ing.unite}`)
      lines.push(`       Fournisseur : ${ing.fournisseur} (réception ${ing.dateReception})`)
      lines.push(`       Statut lot  : ${STATUT_LOT_LABELS[ing.statut]}`)
      lines.push('')
    }
  } else {
    lines.push(`LOT AMONT          : ${result.codeLot}`)
    lines.push(`Article            : ${result.article}`)
    lines.push('')
    lines.push(`TRAÇABILITÉ AVAL — ${result.usages.length} LOT(S) PF UTILISANT CE LOT :`)
    lines.push('─'.repeat(54))
    for (const { pf, lien } of result.usages) {
      lines.push(`  ${pf.codeLotPF} — ${pf.articlePF}`)
      lines.push(`    OF : ${pf.numeroOF} · Production : ${pf.dateProduction}`)
      lines.push(`    Quantité consommée : ${lien.qteUtilisee} ${lien.unite}`)
      lines.push(`    Statut PF : ${STATUT_LOT_LABELS[pf.statut]}`)
      lines.push('')
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
  { label: 'Lot PF', code: 'LOT-PF-2025-0041' },
  { label: 'Lot PF (Vanille)', code: 'LOT-PF-2025-0042' },
  { label: 'Lot MP (Hibiscus)', code: 'LOT-MP-2025-0031' },
  { label: 'Lot AC (Bouteilles)', code: 'LOT-AC-2025-0018' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GenealogiePage() {
  const [query, setQuery] = useState('LOT-PF-2025-0041')
  const [result, setResult] = useState<SearchResult | null>(() => doSearch('LOT-PF-2025-0041'))

  function handleSearch() {
    setResult(doSearch(query))
  }

  function loadExample(code: string) {
    setQuery(code)
    setResult(doSearch(code))
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <GitBranch className="size-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Généalogie & Traçabilité</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recherche bidirectionnelle : lot PF → ingrédients · lot MP → produits finis
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
            placeholder="Ex : LOT-PF-2025-0041 ou LOT-MP-2025-0031"
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

      {/* Results */}
      {result === null && query.trim() && (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Aucun lot trouvé pour &quot;{query}&quot;. Vérifiez le code lot.
        </div>
      )}

      {result?.mode === 'pf' && (
        <PFResult entry={result.entry} onExport={() => downloadDossierPDF(result)} />
      )}

      {result?.mode === 'mp' && (
        <MPResult
          codeLot={result.codeLot}
          article={result.article}
          usages={result.usages}
          onExport={() => downloadDossierPDF(result)}
        />
      )}
    </div>
  )
}

// ── PF Result ─────────────────────────────────────────────────────────────────

function PFResult({
  entry,
  onExport,
}: {
  entry: GenealogiePF
  onExport: () => void
}) {
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
              <p className="font-semibold text-sm">Lot produit fini trouvé</p>
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
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_LOT_COLORS[entry.statut]}`}>
              {STATUT_LOT_LABELS[entry.statut]}
            </span>
            <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5 h-8">
              <FileDown className="size-3.5" />
              Exporter PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Ingredients list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">
            Ingrédients utilisés
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {entry.ingredients.length} lot{entry.ingredients.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="divide-y">
          {entry.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/10">
              <CornerDownRight className="size-3.5 text-muted-foreground/50 shrink-0" />
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 ${TYPE_ARTICLE_COLORS[ing.typeArticle]}`}>
                {ing.typeArticle}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{ing.codeLot}</p>
                <p className="text-sm font-medium truncate">{ing.article}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">
                  {ing.qteUtilisee} {ing.unite}
                </p>
                <p className="text-xs text-muted-foreground">{ing.fournisseur}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUT_LOT_COLORS[ing.statut]}`}>
                {STATUT_LOT_LABELS[ing.statut]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── MP Result ─────────────────────────────────────────────────────────────────

function MPResult({
  codeLot,
  article,
  usages,
  onExport,
}: {
  codeLot: string
  article: string
  usages: Array<{ pf: GenealogiePF; lien: GenealogieLien }>
  onExport: () => void
}) {
  const typeArticle = usages[0]?.lien.typeArticle
  const fournisseur = usages[0]?.lien.fournisseur
  const statut = usages[0]?.lien.statut

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
                  {fournisseur && (
                    <span className="text-xs text-muted-foreground">{fournisseur}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statut && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_LOT_COLORS[statut]}`}>
                {STATUT_LOT_LABELS[statut]}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5 h-8">
              <FileDown className="size-3.5" />
              Exporter PDF
            </Button>
          </div>
        </div>
      </div>

      {/* PF lots that used this ingredient */}
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
                <p className="text-sm font-semibold tabular-nums">
                  {lien.qteUtilisee} {lien.unite}
                </p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUT_LOT_COLORS[pf.statut]}`}>
                {STATUT_LOT_LABELS[pf.statut]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
