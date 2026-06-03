'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, Package, Factory, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createProductionOutput,
  getProductionOrdersForDeclaration,
} from '@/lib/actions/production-outputs'
import type { ProductionOrderForDeclaration } from '@/lib/actions/production-outputs'
import type { ProductionOutputRow } from '@/types/erp'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  onSave:  (output: ProductionOutputRow) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

// Format : TYPE-YYYYMMDD-XX (ex. PF-20260603-01)
function suggestBatchNumber(articleType = 'PF') {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${articleType}-${d}-01`
}

function calcDlc(shelfLifeDays: number | null): string {
  const days = shelfLifeDays ?? 365
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function DeclareOutputModal({ onClose, onSave }: Props) {
  const [ofs, setOfs]           = useState<ProductionOrderForDeclaration[]>([])
  const [ofsLoading, setOfsLoading] = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Champs du formulaire
  const [ofId,         setOfId]         = useState('')
  const [selectedOf,   setSelectedOf]   = useState<ProductionOrderForDeclaration | null>(null)
  const [qtyProduced,  setQtyProduced]  = useState('')
  const [qtyScrap,     setQtyScrap]     = useState('0')
  const [batchNumber,  setBatchNumber]  = useState(suggestBatchNumber)
  const [expiryDate,   setExpiryDate]   = useState(calcDlc(null))
  const [notes,        setNotes]        = useState('')

  // Chargement des OFs disponibles
  useEffect(() => {
    getProductionOrdersForDeclaration().then((data) => {
      setOfs(data)
      setOfsLoading(false)
    })
  }, [])

  // Quand un OF est sélectionné → auto-fill DLC + numéro de lot
  function handleSelectOf(id: string) {
    setOfId(id)
    const of = ofs.find((o) => o.id === id) ?? null
    setSelectedOf(of)
    if (of) {
      setExpiryDate(calcDlc(of.articleShelfLifeDays))
      setBatchNumber(suggestBatchNumber(of.articleType))
    }
  }

  // Quantité restante à produire (pour info)
  const remaining = selectedOf
    ? Math.max(0, selectedOf.quantityTarget - selectedOf.quantityProduced)
    : null

  // Taux rebut en temps réel
  const prod   = parseFloat(qtyProduced) || 0
  const scrap  = parseFloat(qtyScrap)    || 0
  const tauxRebut = prod + scrap > 0
    ? Math.round((scrap / (prod + scrap)) * 10000) / 100
    : 0

  // Validation
  const isValid =
    ofId !== '' &&
    prod > 0 &&
    scrap >= 0 &&
    batchNumber.trim() !== '' &&
    expiryDate !== '' &&
    expiryDate > todayIso()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !selectedOf) return
    setSaving(true)
    setError(null)

    const result = await createProductionOutput({
      productionOrderId:  ofId,
      articleId:          selectedOf.articleId,
      quantityProduced:   prod,
      quantityScrap:      scrap,
      productBatchNumber: batchNumber.trim(),
      expiryDate,
      notes: notes.trim() || undefined,
    })

    setSaving(false)
    if (!result) {
      setError('Échec de la sauvegarde — vérifiez que le lot PF n\'existe pas déjà.')
      return
    }
    onSave(result)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="size-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Nouvelle déclaration de fin de production</h2>
              <p className="text-xs text-muted-foreground">N° DP généré automatiquement à la sauvegarde</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ① Sélection OF */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0">①</span>
              <span className="text-sm font-semibold">Ordre de fabrication</span>
            </div>

            {ofsLoading ? (
              <div className="flex items-center gap-2 py-3 px-4 rounded-lg border bg-muted/20 text-muted-foreground text-sm">
                <Loader2 className="size-3.5 animate-spin" />
                Chargement des OFs disponibles…
              </div>
            ) : ofs.length === 0 ? (
              <div className="flex items-center gap-2 py-3 px-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm">
                <AlertTriangle className="size-3.5 shrink-0" />
                Aucun OF en cours (RELEASED / IN_PROGRESS)
              </div>
            ) : (
              <select
                value={ofId}
                onChange={(e) => handleSelectOf(e.target.value)}
                required
                className="w-full h-9 px-3 text-sm rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— Sélectionner un OF —</option>
                {ofs.map((of) => (
                  <option key={of.id} value={of.id}>
                    {of.orderNumber} · {of.articleLabel} ({of.articleSku})
                  </option>
                ))}
              </select>
            )}

            {selectedOf && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                <Factory className="size-3.5 text-blue-500 mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <span className="font-medium text-blue-800">{selectedOf.articleLabel}</span>
                  <span className="text-blue-600 ml-1">· {selectedOf.articleSku}</span>
                  <div className="text-xs text-blue-600 mt-0.5">
                    Planifié : <span className="font-mono font-semibold">{selectedOf.quantityTarget}</span> {selectedOf.articleUnit}
                    {' · '}Déjà produit : <span className="font-mono">{selectedOf.quantityProduced}</span>
                    {remaining !== null && remaining > 0 && (
                      <span className="font-mono text-blue-800 font-medium"> · Reste : {remaining}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ② Quantités */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0">②</span>
              <span className="text-sm font-semibold">Quantités</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Qté produite (bonne) *
                </label>
                <div className="relative">
                  <input
                    type="number" min="0.0001" step="any"
                    value={qtyProduced}
                    onChange={(e) => setQtyProduced(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full h-9 px-3 pr-12 text-sm rounded-lg border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {selectedOf && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {selectedOf.articleUnit}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Qté rebuts / déchets
                </label>
                <div className="relative">
                  <input
                    type="number" min="0" step="any"
                    value={qtyScrap}
                    onChange={(e) => setQtyScrap(e.target.value)}
                    className="w-full h-9 px-3 pr-12 text-sm rounded-lg border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {selectedOf && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {selectedOf.articleUnit}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {(prod > 0 || scrap > 0) && (
              <div className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                tauxRebut > 5
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : tauxRebut > 2
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                Taux de rebut : <span className="font-mono">{tauxRebut.toFixed(2)}%</span>
                {tauxRebut > 5 && ' · Élevé — à signaler en qualité'}
              </div>
            )}
          </div>

          {/* ③ Lot & DLC */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0">③</span>
              <span className="text-sm font-semibold">Lot & Date limite de consommation</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  N° Lot PF *
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  required
                  placeholder="PF-YYYYMMDD-01"
                  className="w-full h-9 px-3 text-sm rounded-lg border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  DLC *
                  {selectedOf?.articleShelfLifeDays && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      (durée de vie : {selectedOf.articleShelfLifeDays}j)
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={todayIso()}
                  required
                  className="w-full h-9 px-3 text-sm rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* ④ Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Notes (optionnel) — incidents, écarts, observations de fin de ligne
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex : Ligne arrêtée 20 min pour remplacement joint…"
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-muted-foreground">
            Statut initial : <span className="font-medium">Brouillon</span> — à confirmer par le chef d&apos;équipe
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isValid || saving}
              onClick={handleSubmit}
              className="gap-1.5"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Créer la déclaration
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
