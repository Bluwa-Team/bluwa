'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Loader2, Barcode, Camera, ShieldCheck, CheckCircle2, Clock, Wand2 } from 'lucide-react'
import { BCHeader, BCItem } from '../../approvisionnement/_components/types'
import { ReceptionHeader, ReceptionItem, StatutLot, StatutReception, QualiteStatut } from './types'
import { generateBatchNumber } from '@/lib/batch-number'
import type { CreateGoodsReceiptItemInput } from '@/lib/actions/reception'

// ── Types locaux du formulaire ────────────────────────────────────────────────

type ItemForm = {
  bcItemId: string
  article: string       // lecture seule — vient du BC
  quantiteCmd: number   // info — quantité commandée dans le BC
  reste: number         // info — quantité restant à recevoir
  uniteCmd: string
  qteRecue: string
  lotFourn: string
  dlc: string
  humidite: string
  codeBarres: string
  statutLot: StatutLot | null   // null si article sans gestion de lot
  gestionLot: boolean           // articles.gestion_lot
  articleType: string           // articles.type — pour auto-génération du lot
  coeffConversion: number       // articles.coeff_conversion (ex: 1000 pour kg→g)
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  bcHeaders: BCHeader[]           // commandes ouvertes (EnCours | Partielle)
  bcItems: BCItem[]               // toutes les lignes articles des BC ouverts
  onSave: (
    header: Omit<ReceptionHeader, 'id' | 'numero'>,
    items: CreateGoodsReceiptItemInput[],
  ) => Promise<{ ok: boolean; error: string | null }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function SectionTitle({ num, label, badge }: { num: string; label: string; badge?: number }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-foreground text-[10px] font-bold shrink-0">
        {num}
      </span>
      {label}
      {badge !== undefined && (
        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-bold">
          {badge}
        </span>
      )}
    </h3>
  )
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function ReceptionModal({ open, onClose, bcHeaders, bcItems, onSave }: Props) {
  const [selectedHeaderId, setSelectedHeaderId] = useState('')
  const [itemForms, setItemForms]               = useState<ItemForm[]>([])
  const [saving, setSaving]                     = useState(false)
  const [saveError, setSaveError]               = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelectedHeaderId('')
      setItemForms([])
      setSaveError(null)
    }
  }, [open])

  const selectedHeader = useMemo(
    () => bcHeaders.find((h) => h.id === selectedHeaderId) ?? null,
    [bcHeaders, selectedHeaderId],
  )

  function selectHeader(id: string) {
    setSelectedHeaderId(id)
    const hItems = bcItems.filter((i) => i.headerId === id)
    const today = new Date()
    setItemForms(
      hItems.map((bcItem, idx) => {
        const gestionLot       = bcItem.gestionLot       ?? true
        const articleType      = bcItem.articleType      ?? 'MP'
        const coeffConversion  = bcItem.coeffConversion  ?? 1
        // DLC auto = aujourd'hui + dureeVie si disponible
        let dlcAuto = ''
        if (bcItem.dureeVie) {
          const d = new Date()
          d.setDate(d.getDate() + bcItem.dureeVie)
          dlcAuto = d.toISOString().split('T')[0]
        }
        const reste = Math.max(0, bcItem.quantite - bcItem.quantiteRecue)
        // Lot fournisseur : auto-proposé si l'article n'a pas de gestion de lot (format LF = distinct du lot interne)
        const datePart = today.toISOString().slice(0, 10).replace(/-/g, '')
        const lotFournAuto = gestionLot ? '' : `LF-${datePart}-${String(idx + 1).padStart(4, '0')}`
        return {
          bcItemId:     bcItem.id,
          article:      bcItem.article,
          quantiteCmd:  bcItem.quantite,
          reste,
          uniteCmd:     bcItem.unite,
          qteRecue:     String(reste > 0 ? reste : bcItem.quantite),
          lotFourn:     lotFournAuto,
          dlc:          dlcAuto,
          humidite:     '',
          codeBarres:   '',
          statutLot:       gestionLot ? 'EnControle' : null,
          gestionLot,
          articleType,
          coeffConversion,
        }
      }),
    )
  }

  function autoGenerateLot(bcItemId: string, idx: number) {
    const d = new Date()
    const datePart = d.toISOString().slice(0, 10).replace(/-/g, '')
    const lot = `LF-${datePart}-${String(idx + 1).padStart(4, '0')}`
    setItemForms((prev) =>
      prev.map((f) => (f.bcItemId === bcItemId ? { ...f, lotFourn: lot } : f)),
    )
  }

  function setIF(bcItemId: string, field: keyof ItemForm, value: string) {
    setItemForms((prev) =>
      prev.map((f) => (f.bcItemId === bcItemId ? { ...f, [field]: value } : f)),
    )
  }

  // Lignes actives = celles où l'opérateur a saisi une quantité > 0
  const activeLines = useMemo(
    () => itemForms.filter((f) => { const q = parseFloat(f.qteRecue); return !isNaN(q) && q > 0 }),
    [itemForms],
  )

  // Statut workflow : VALIDATED dès qu'au moins une ligne active existe
  const globalStatut = useMemo((): StatutReception => {
    return activeLines.length > 0 ? 'VALIDATED' : 'DRAFT'
  }, [activeLines])

  // Appréciation qualité dérivée des statuts de lots des lignes actives uniquement
  // null = article sans gestion de lot → traité comme Libéré
  const globalQualite = useMemo((): QualiteStatut => {
    if (activeLines.length === 0) return 'EnControle'
    if (activeLines.some((f) => f.statutLot === 'Bloque')) return 'Bloque'
    if (activeLines.every((f) => f.statutLot === 'Libere' || f.statutLot === null)) return 'Libere'
    return 'EnControle'
  }, [activeLines])

  function isValid() {
    if (selectedHeader === null || activeLines.length === 0) return false
    // Chaque ligne active doit avoir un lot fournisseur (sauf si gestionLot=false → déjà auto-rempli)
    return activeLines.every((f) => f.lotFourn.trim() !== '')
  }

  async function handleSave() {
    if (!selectedHeader) return
    setSaving(true)
    setSaveError(null)
    const { ok, error } = await onSave(
      {
        date:               new Date().toISOString().split('T')[0],
        deliveryNoteNumber: null,
        numeroBon:          selectedHeader.numero,
        fournisseur:        selectedHeader.fournisseur,
        typeFournisseur:    selectedHeader.type === 'BC' ? 'Formel' : 'Informel',
        statut:             globalStatut,
        qualiteStatut:      globalQualite,
      },
      activeLines.map((f) => ({
        purchaseOrderItemId: f.bcItemId,
        article:         f.article,
        quantite:        parseFloat(f.qteRecue),
        coeffConversion: f.coeffConversion,
        unite:           f.uniteCmd,
        lotFourn:        f.lotFourn.trim() || null,
        dlc:             f.dlc || null,
        humidite:        f.humidite !== '' ? parseFloat(f.humidite) : null,
        codeBarres:      f.codeBarres.trim() || null,
        statutLot:       f.statutLot,
      })),
    )
    setSaving(false)
    if (ok) onClose()
    else if (error) setSaveError(error)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(800px,96vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header modal ──────────────────────────────────────────── */}
            <div className="flex items-start justify-between p-5 border-b shrink-0">
              <div>
                <p className="font-semibold">Nouvelle réception</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sélectionner une commande · Saisir les quantités reçues par ligne
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div className="p-5 space-y-6 overflow-y-auto">

              {/* ① COMMANDE */}
              <section className="space-y-3">
                <SectionTitle num="①" label="Commande à réceptionner" />

                <Field label="Bon de commande / Bon d'achat" required>
                  <select
                    value={selectedHeaderId}
                    onChange={(e) => selectHeader(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Sélectionner une commande ouverte…</option>
                    {bcHeaders.map((h) => {
                      const hItems = bcItems.filter((i) => i.headerId === h.id)
                      const totalReste = hItems.reduce(
                        (s, i) => s + Math.max(0, i.quantite - i.quantiteRecue),
                        0,
                      )
                      return (
                        <option key={h.id} value={h.id}>
                          {h.numero} · {h.fournisseur} · {hItems.length} article{hItems.length > 1 ? 's' : ''} · {totalReste} à réceptionner
                        </option>
                      )
                    })}
                  </select>
                </Field>

                {selectedHeader && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm grid grid-cols-3 gap-2">
                    <p>
                      <span className="font-semibold text-blue-700">Document : </span>
                      <span className="text-blue-600">
                        {selectedHeader.numero}{' '}
                        <span className="opacity-70">({selectedHeader.type === 'BC' ? 'Formel' : 'Informel'})</span>
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-blue-700">Fournisseur : </span>
                      <span className="text-blue-600">{selectedHeader.fournisseur}</span>
                    </p>
                    {selectedHeader.contrat && (
                      <p>
                        <span className="font-semibold text-blue-700">Contrat : </span>
                        <span className="text-blue-600">{selectedHeader.contrat}</span>
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* ② LIGNES ARTICLES */}
              {itemForms.length > 0 && (
                <section className="space-y-3">
                  <SectionTitle
                    num="②"
                    label="Lignes articles — saisie de réception"
                    badge={itemForms.length}
                  />

                  <div className="rounded-lg border overflow-hidden divide-y">
                    {itemForms.map((f, idx) => {
                      const bcItem   = bcItems.find((i) => i.id === f.bcItemId)
                      const qty      = parseFloat(f.qteRecue)
                      const isSkipped = isNaN(qty) || qty === 0
                      return (
                        <div key={f.bcItemId} className={`p-4 space-y-3 transition-opacity ${isSkipped ? 'opacity-40' : ''}`}>

                          {/* Ligne info */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded bg-muted">
                                Ligne {idx + 1}
                              </span>
                              <span className="text-sm font-semibold">{f.article}</span>
                              {isSkipped && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                                  Ignorée ce jour
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              Commandé : <strong>{f.quantiteCmd}</strong>{' '}
                              {f.uniteCmd}
                              {f.reste > 0 && (
                                <> · Restant : <strong className="text-orange-600">{f.reste}</strong></>
                              )}
                            </span>
                          </div>

                          {/* Champs de saisie */}
                          <div className="grid grid-cols-2 gap-x-5 gap-y-3">

                            <Field label="Qté reçue" required>
                              <Input
                                type="number"
                                min="0"
                                value={f.qteRecue}
                                onChange={(e) => setIF(f.bcItemId, 'qteRecue', e.target.value)}
                                placeholder="0"
                              />
                            </Field>

                            <Field label="N° lot fournisseur" required={f.gestionLot && !isSkipped}>
                              <div className="flex gap-2">
                                <Input
                                  value={f.lotFourn}
                                  onChange={(e) => setIF(f.bcItemId, 'lotFourn', e.target.value)}
                                  placeholder={f.gestionLot ? 'ex: BATCH-A23-08' : 'Auto-généré'}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0 gap-1.5 text-xs px-2.5"
                                  title="Générer un numéro de lot automatique"
                                  onClick={() => autoGenerateLot(f.bcItemId, idx)}
                                >
                                  <Wand2 className="size-3.5" />
                                  Auto
                                </Button>
                              </div>
                              {!f.gestionLot && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Article sans gestion de lot — lot proposé automatiquement
                                </p>
                              )}
                            </Field>

                            <Field label="DLC fournisseur">
                              <Input
                                type="date"
                                value={f.dlc}
                                onChange={(e) => setIF(f.bcItemId, 'dlc', e.target.value)}
                              />
                              {bcItem?.dureeVie && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Calculée auto. : J+{bcItem.dureeVie} j — modifiable si DLC imposée
                                </p>
                              )}
                            </Field>

                            <Field label="Humidité (%)">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={f.humidite}
                                onChange={(e) => setIF(f.bcItemId, 'humidite', e.target.value)}
                                placeholder="0"
                              />
                            </Field>

                            <Field label="Scan code-barres / DataMatrix">
                              <div className="flex gap-2">
                                <Input
                                  value={f.codeBarres}
                                  onChange={(e) => setIF(f.bcItemId, 'codeBarres', e.target.value)}
                                  placeholder="EAN-13 / GS1 DataMatrix"
                                  className="flex-1"
                                />
                                <Button type="button" variant="outline" className="gap-2 shrink-0">
                                  <Barcode className="size-4" />
                                  Scanner
                                </Button>
                              </div>
                            </Field>

                            <Field label="Statut QC du lot">
                              {f.gestionLot ? (
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
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Photos (si commande sélectionnée) */}
              {selectedHeader && (
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 cursor-pointer px-6 py-8 text-center transition-colors">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Camera className="size-5" />
                    <p className="text-sm">Photos de la marchandise (preuve qualité)</p>
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                <ShieldCheck className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span>
                  Articles avec gestion de lot → statut{' '}
                  <strong className="text-foreground">"En contrôle"</strong> (bloqué MRP/OF) · libération dans{' '}
                  <strong className="text-foreground">Assurance Qualité</strong>.
                  Articles sans gestion de lot → directement{' '}
                  <strong className="text-foreground">disponibles</strong> en stock.
                </span>
              </div>
            </div>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-2 p-4 border-t shrink-0">

              {/* Statut global calculé */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {selectedHeader && (
                  <>
                    {activeLines.length > 0 && (
                      <span className="text-foreground font-medium">
                        {activeLines.length} ligne{activeLines.length > 1 ? 's' : ''} à réceptionner
                        {activeLines.length < itemForms.length && (
                          <span className="text-muted-foreground font-normal">
                            {' '}· {itemForms.length - activeLines.length} ignorée{itemForms.length - activeLines.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    )}
                    {activeLines.length > 0 && <span>·</span>}
                    <span>Qualité :</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium border ${
                      globalQualite === 'Libere'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : globalQualite === 'Bloque'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {globalQualite === 'Libere' ? 'Libéré' : globalQualite === 'Bloque' ? 'Bloqué' : 'En contrôle'}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2 items-end">
                {saveError && (
                  <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 w-full">
                    Erreur : {saveError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} disabled={saving}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={!isValid() || saving}>
                    {saving
                      ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</>
                      : 'Enregistrer la réception'}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
