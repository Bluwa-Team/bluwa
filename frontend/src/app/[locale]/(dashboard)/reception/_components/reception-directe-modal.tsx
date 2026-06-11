'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Loader2, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react'
import type { Article } from '@/app/[locale]/(dashboard)/articles/_components/types'
import type { ReceptionHeader, ReceptionItem, QualiteStatut } from './types'
import type { StatutQC } from '@/types/erp'

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemForm = {
  _key:             string
  articleId:        string
  article:          string
  articleType:      string
  gestionLot:       boolean  // articles.gestion_lot → détermine statut QC automatique
  quantite:         string
  unite:            string
  coeffConversion:  number   // coeff_conversion_achat : achat → stock
  puHT:             string
  lotFourn:         string
  dlc:              string
  humidite:         string
  codeBarres:       string
  statutLot:        StatutQC
}

interface Props {
  open:       boolean
  onClose:    () => void
  articles:   Article[]
  onSave: (
    header: Omit<ReceptionHeader, 'id' | 'numero'>,
    items:  Omit<ReceptionItem, 'id' | 'headerId' | 'lot'>[],
    directItems: DirectItemInput[],
  ) => Promise<boolean>
}

export interface DirectItemInput {
  articleId:   string
  articleType: string
  article:     string
  quantite:    number
  unite:       string
  puHT:        number
  lotFourn:    string | null
  dlc:         string | null
  humidite:    number | null
  codeBarres:  string | null
  statutLot:   StatutQC
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function newItemRow(): ItemForm {
  return {
    _key:            Math.random().toString(36).slice(2),
    articleId:       '',
    article:         '',
    articleType:     'MP',
    gestionLot:      true,
    quantite:        '',
    unite:           '',
    coeffConversion: 1,
    puHT:            '',
    lotFourn:        '',
    dlc:             '',
    humidite:        '',
    codeBarres:      '',
    statutLot:       'EnControle',
  }
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function ReceptionDirecteModal({ open, onClose, articles, onSave }: Props) {
  const [fournisseur,  setFournisseur]  = useState('')
  const [typeFourn,    setTypeFourn]    = useState<'Formel' | 'Informel'>('Informel')
  const [blNumber,     setBlNumber]     = useState('')
  const [items,        setItems]        = useState<ItemForm[]>([newItemRow()])
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    if (open) {
      setFournisseur('')
      setTypeFourn('Informel')
      setBlNumber('')
      setItems([newItemRow()])
    }
  }, [open])

  function setI(key: string, field: keyof ItemForm, value: string) {
    setItems((prev) => prev.map((i) => i._key === key ? { ...i, [field]: value } : i))
  }

  function selectArticle(key: string, articleId: string) {
    const art = articles.find((a) => a.id === articleId)
    if (!art) return
    setItems((prev) => prev.map((i) =>
      i._key === key
        ? {
            ...i,
            articleId:       art.id,
            article:         `${art.designation} (${art.code})`,
            articleType:     art.type,
            gestionLot:      art.gestionLot,
            unite:           art.uniteAchat || art.uniteStock,
            coeffConversion: art.coeffConversionAchat || 1,
            statutLot:       art.gestionLot ? 'EnControle' : 'Libere',
          }
        : i
    ))
  }

  const globalQualite: QualiteStatut = (() => {
    if (items.some((i) => i.statutLot === 'Bloque')) return 'Bloque'
    if (items.every((i) => i.statutLot === 'Libere')) return 'Libere'
    return 'EnControle'
  })()

  function isValid() {
    if (!fournisseur.trim()) return false
    return items.length > 0 && items.every((i) =>
      i.articleId !== '' &&
      i.quantite !== '' && !isNaN(parseFloat(i.quantite)) && parseFloat(i.quantite) > 0 &&
      i.puHT !== '' && !isNaN(parseFloat(i.puHT))
    )
  }

  async function handleSave() {
    if (!isValid()) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    const headerData: Omit<ReceptionHeader, 'id' | 'numero'> = {
      date:               today,
      deliveryNoteNumber: blNumber.trim() || null,
      numeroBon:          null,
      fournisseur:        fournisseur.trim(),
      typeFournisseur:    typeFourn,
      statut:             'VALIDATED',
      qualiteStatut:      globalQualite,
    }

    const directItems: DirectItemInput[] = items.map((i) => ({
      articleId:   i.articleId,
      articleType: i.articleType,
      article:     i.article,
      quantite:    parseFloat(i.quantite) * (i.coeffConversion || 1),
      unite:       i.unite,
      puHT:        parseFloat(i.puHT),
      lotFourn:    i.lotFourn.trim() || null,
      dlc:         i.dlc || null,
      humidite:    i.humidite !== '' ? parseFloat(i.humidite) : null,
      codeBarres:  i.codeBarres.trim() || null,
      statutLot:   i.statutLot,
    }))

    const ok = await onSave(headerData, [], directItems)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background shadow-xl border focus:outline-none"
          aria-label="Réception directe"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-base">Réception directe</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sans bon de commande — collecte terrain ou achat spot</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="size-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">

            {/* ① Fournisseur */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-foreground text-[10px] font-bold">1</span>
                Fournisseur
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nom fournisseur" required>
                  <Input
                    placeholder="Ex : Marché Sandaga, Coop. locale…"
                    value={fournisseur}
                    onChange={(e) => setFournisseur(e.target.value)}
                  />
                </Field>
                <Field label="Type">
                  <div className="flex gap-2">
                    {(['Informel', 'Formel'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFourn(t)}
                        className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
                          typeFourn === t
                            ? t === 'Informel'
                              ? 'bg-orange-50 border-orange-300 text-orange-700'
                              : 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'border-input text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="N° BL / Reçu fournisseur">
                <Input
                  placeholder="Facultatif"
                  value={blNumber}
                  onChange={(e) => setBlNumber(e.target.value)}
                />
              </Field>
            </div>

            {/* ② Lignes articles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-foreground text-[10px] font-bold">2</span>
                  Articles reçus
                  <span className="px-1.5 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-bold">{items.length}</span>
                </h3>
                <button
                  onClick={() => setItems((prev) => [...prev, newItemRow()])}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="size-3.5" />Ajouter une ligne
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={item._key} className="border rounded-xl p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Ligne {idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => setItems((prev) => prev.filter((i) => i._key !== item._key))}
                        className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Article + Qté + PU */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <Field label="Article" required>
                        <select
                          value={item.articleId}
                          onChange={(e) => selectArticle(item._key, e.target.value)}
                          className="w-full h-9 px-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Sélectionner…</option>
                          {articles.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.designation} ({a.code})
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Quantité" required>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={item.quantite}
                        onChange={(e) => setI(item._key, 'quantite', e.target.value)}
                      />
                    </Field>
                    <Field label="PU HT">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={item.puHT}
                        onChange={(e) => setI(item._key, 'puHT', e.target.value)}
                      />
                    </Field>
                  </div>

                  {/* Lot + DLC + Humidité */}
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Lot fournisseur">
                      <Input
                        placeholder="Ex : LOT-240501"
                        value={item.lotFourn}
                        onChange={(e) => setI(item._key, 'lotFourn', e.target.value)}
                      />
                    </Field>
                    <Field label="DLC">
                      <Input
                        type="date"
                        value={item.dlc}
                        onChange={(e) => setI(item._key, 'dlc', e.target.value)}
                      />
                    </Field>
                    <Field label="Humidité (%)">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="—"
                        value={item.humidite}
                        onChange={(e) => setI(item._key, 'humidite', e.target.value)}
                      />
                    </Field>
                  </div>

                  {/* Statut lot — automatique selon gestion_lot de l'article */}
                  <Field label="Statut qualité lot">
                    {item.gestionLot ? (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-700 text-sm font-medium">
                        <Clock className="size-3.5 text-amber-500 shrink-0" />
                        En contrôle — automatique à la réception
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 text-sm font-medium">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        Disponible immédiatement — sans gestion de lot
                      </div>
                    )}
                  </Field>
                </div>
              ))}
            </div>

          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!isValid() || saving}>
              {saving
                ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</>
                : <><CheckCircle2 className="size-4 mr-1.5" />Valider la réception</>}
            </Button>
          </div>

        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
