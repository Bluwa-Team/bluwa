'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  X, Loader2, Settings2, CalendarDays, Package, CheckCircle2, ArrowRight, RotateCcw,
} from 'lucide-react'
import {
  OrdreFabrication,
  LIGNE_OPTIONS,
  OPERATEUR_OPTIONS,
  LEAD_TIME_H,
  LEAD_TIME_DAYS,
  STATUT_OF_LABELS,
  STATUT_OF_COLORS,
} from './types'
import { getPFArticles } from '@/lib/actions/articles'
import { getBomByArticleId } from '@/lib/actions/bom'

// ── Types locaux ──────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  of?:     OrdreFabrication | null
  onSave:  (of: Omit<OrdreFabrication, 'id' | 'numero'>) => Promise<boolean>
}

type PFArticle = { id: string; code: string; designation: string; uniteStock: string }

type BomBase = { ingredientCode: string; designation: string; unite: string; qtyPerUnit: number }

type BomRow = BomBase & { qty: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({
  label, required, helper, children,
}: {
  label: string; required?: boolean; helper?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function NativeSelect({
  value, onChange, disabled, children,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </select>
  )
}

function subtractWorkDays(isoDate: string, days: number): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtBomQty(qtyPerUnit: number, unite: string, nbUnits: number): string {
  const val = qtyPerUnit * nbUnits
  return unite === 'u' ? String(Math.round(val)) : val.toFixed(3)
}

// ── Valeur initiale ───────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]

const EMPTY = {
  sku:        '',
  qty:        '100',
  ligne:      LIGNE_OPTIONS[0].value,
  operateur:  OPERATEUR_OPTIONS[0],
  dateBesoin: TODAY,
  coutEstime: '0',
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function OFModal({ open, onClose, of, onSave }: Props) {
  const [form, setForm]           = useState(EMPTY)
  const [bomBase, setBomBase]     = useState<BomBase[]>([])
  const [bomRows, setBomRows]     = useState<BomRow[]>([])
  const [pfArticles, setPFArticles] = useState<PFArticle[]>([])
  const [loadingBom, setLoadingBom] = useState(false)
  const [saving, setSaving]       = useState(false)

  // Charge les articles PF/PSF actifs à l'ouverture du modal
  useEffect(() => {
    if (!open) return
    getPFArticles().then((articles) => {
      setPFArticles(articles)
      // Initialise le SKU par défaut uniquement en mode création
      if (!of && articles.length > 0) {
        setForm((prev) => ({ ...prev, sku: articles[0].code }))
      }
    })
  }, [open, of])

  // Reset ou pré-remplir à chaque ouverture
  useEffect(() => {
    if (!open) return
    if (of) {
      setForm({
        sku:        of.sku,
        qty:        String(of.qty),
        ligne:      of.ligne,
        operateur:  of.operateurPrep ?? OPERATEUR_OPTIONS[0],
        dateBesoin: of.dateBesoin,
        coutEstime: '0',
      })
    } else {
      setForm((prev) => ({ ...EMPTY, sku: prev.sku }))
    }
  }, [open, of])

  // Charge la BOM Supabase à chaque changement de SKU
  const loadBom = useCallback(async (sku: string) => {
    const article = pfArticles.find((a) => a.code === sku)
    if (!article) { setBomBase([]); setBomRows([]); return }

    setLoadingBom(true)
    const { ingredients } = await getBomByArticleId(article.id)
    const base: BomBase[] = ingredients.map((i) => ({
      ingredientCode: i.ingredientCode,
      designation:    i.designation,
      unite:          i.unite,
      qtyPerUnit:     i.qtyPerUnit,
    }))
    setBomBase(base)
    setLoadingBom(false)
  }, [pfArticles])

  useEffect(() => {
    if (form.sku) loadBom(form.sku)
  }, [form.sku, loadBom])

  // Recalcule les quantités affichées quand bomBase ou qty change
  useEffect(() => {
    const qty = Math.max(0, parseInt(form.qty, 10) || 0)
    setBomRows(bomBase.map((b) => ({ ...b, qty: fmtBomQty(b.qtyPerUnit, b.unite, qty) })))
  }, [bomBase, form.qty])

  function set(key: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateBomRow(index: number, qty: string) {
    setBomRows((prev) => prev.map((r, i) => (i === index ? { ...r, qty } : r)))
  }

  function resetBomRows() {
    const qty = Math.max(0, parseInt(form.qty, 10) || 0)
    setBomRows(bomBase.map((b) => ({ ...b, qty: fmtBomQty(b.qtyPerUnit, b.unite, qty) })))
  }

  const produit   = pfArticles.find((a) => a.code === form.sku)
  const qty       = Math.max(0, parseInt(form.qty, 10) || 0)
  const debutPlanif = subtractWorkDays(form.dateBesoin, LEAD_TIME_DAYS)
  const isValid   = qty > 0 && !!form.dateBesoin && !!form.ligne && !!form.operateur && !!form.sku
  const bomIsCustomized = bomRows.some(
    (r) => r.qty !== fmtBomQty(r.qtyPerUnit, r.unite, qty),
  )

  async function handleSave() {
    if (!isValid) return
    setSaving(true)
    const ok = await onSave({
      produitFini:   produit?.designation ?? form.sku,
      sku:           form.sku,
      qty,
      realise:       of?.realise       ?? 0,
      unite:         of?.unite         ?? produit?.uniteStock ?? 'u',
      lotPF:         of?.lotPF         ?? null,
      ligne:         form.ligne,
      operateurPrep: form.operateur,
      dateBesoin:    form.dateBesoin,
      debutPlanif:   debutPlanif || form.dateBesoin,
      picking:       of?.picking       ?? 'AValider',
      statut:        of?.statut        ?? 'EnAttenteComposants',
      archive:       of?.archive       ?? false,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(700px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Settings2 className="size-[18px] text-foreground" />
                </div>
                <p className="font-semibold text-base">
                  {of ? `Modifier l'OF — ${of.numero}` : 'Nouvel Ordre de Fabrication'}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

              {/* Produit + Quantité */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Field label="Produit Fini" required>
                  <NativeSelect
                    value={form.sku}
                    onChange={(v) => set('sku', v)}
                    disabled={pfArticles.length === 0}
                  >
                    {pfArticles.length === 0 ? (
                      <option value="">Chargement…</option>
                    ) : (
                      pfArticles.map((a) => (
                        <option key={a.id} value={a.code}>
                          {a.designation}
                        </option>
                      ))
                    )}
                  </NativeSelect>
                </Field>

                <Field label="Quantité" required>
                  <Input
                    type="number"
                    min="1"
                    value={form.qty}
                    onChange={(e) => set('qty', e.target.value)}
                    placeholder="100"
                  />
                </Field>
              </div>

              {/* Ligne + Opérateur */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Field label="Ligne / Atelier / Machine" required>
                  <NativeSelect value={form.ligne} onChange={(v) => set('ligne', v)}>
                    {LIGNE_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </NativeSelect>
                </Field>

                <Field
                  label="Opérateur préparation composants"
                  required
                  helper="→ Notification envoyée à l'interface opérateur pour picking &amp; sortie de stock"
                >
                  <NativeSelect value={form.operateur} onChange={(v) => set('operateur', v)}>
                    {OPERATEUR_OPTIONS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              {/* Date besoin + Coût */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Field
                  label="Date de besoin (dispo)"
                  required
                  helper="Date à laquelle le PF doit être disponible"
                >
                  <Input
                    type="date"
                    value={form.dateBesoin}
                    onChange={(e) => set('dateBesoin', e.target.value)}
                  />
                </Field>

                <Field label="Coût estimé (FCFA)">
                  <Input
                    type="number"
                    min="0"
                    value={form.coutEstime}
                    onChange={(e) => set('coutEstime', e.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>

              {/* ── Placement automatique ───────────────────────────────── */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-blue-600 shrink-0" />
                  <p className="text-sm font-semibold text-blue-900">
                    Placement automatique sur planning OF
                  </p>
                </div>
                <ul className="space-y-1 text-sm text-blue-800 pl-6">
                  <li>
                    • Lead time fabrication :{' '}
                    <strong>{LEAD_TIME_H}.0 h</strong>
                    {' '}({LEAD_TIME_DAYS} j ouvré{LEAD_TIME_DAYS > 1 ? 's' : ''} à 8h/j)
                  </li>
                  <li>
                    • Cadence ligne : gamme standardisée pour{' '}
                    <strong>{qty > 0 ? qty : '—'} {produit?.uniteStock ?? 'u'}</strong>
                  </li>
                  <li>
                    • <strong>Début planifié auto :</strong>{' '}
                    {debutPlanif
                      ? <span className="font-medium">{fmtDate(debutPlanif)}</span>
                      : '—'
                    }
                    <span className="text-blue-600/70 ml-1">(date besoin − lead)</span>
                  </li>
                </ul>
              </div>

              {/* ── BOM composants — inputs éditables ──────────────────── */}
              <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-stone-600 shrink-0" />
                    <p className="text-sm font-semibold text-stone-800">
                      Composants à approcher
                    </p>
                    {!loadingBom && bomRows.length > 0 && (
                      <span className="text-[11px] text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded-full">
                        {bomRows.length} ingrédient{bomRows.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {bomIsCustomized && (
                    <button
                      onClick={resetBomRows}
                      className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 hover:underline underline-offset-2"
                    >
                      <RotateCcw className="size-3" />
                      Réinitialiser
                    </button>
                  )}
                </div>

                {loadingBom ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
                    <Loader2 className="size-3.5 animate-spin" />
                    Chargement de la nomenclature…
                  </div>
                ) : qty === 0 ? (
                  <p className="text-sm text-muted-foreground pl-1 italic">
                    Saisissez une quantité pour voir les besoins composants.
                  </p>
                ) : bomRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-1 italic">
                    Aucune nomenclature définie pour ce produit.
                  </p>
                ) : (
                  <>
                    {/* En-tête colonnes */}
                    <div className="flex items-center gap-x-3 px-0.5">
                      <span className="w-[80px] shrink-0 text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Code</span>
                      <span className="flex-1 min-w-0 text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Désignation</span>
                      <span className="w-[86px] shrink-0 text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Quantité</span>
                      <span className="w-[30px] shrink-0 text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Unité</span>
                    </div>

                    {/* Lignes éditables */}
                    <div className="space-y-1.5">
                      {bomRows.map((row, idx) => {
                        const computed = fmtBomQty(row.qtyPerUnit, row.unite, qty)
                        const isEdited = row.qty !== computed
                        return (
                          <div key={row.ingredientCode} className="flex items-center gap-x-3">
                            <span className="w-[80px] shrink-0 font-mono text-[11px] text-stone-500 truncate">
                              {row.ingredientCode}
                            </span>
                            <span className="flex-1 min-w-0 text-sm text-stone-800 truncate" title={row.designation}>
                              {row.designation}
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.001"
                              value={row.qty}
                              onChange={(e) => updateBomRow(idx, e.target.value)}
                              className={`w-[86px] shrink-0 h-8 text-right text-xs font-mono tabular-nums ${
                                isEdited
                                  ? 'border-amber-400 bg-amber-50 focus-visible:ring-amber-300'
                                  : 'bg-card'
                              }`}
                            />
                            <span className="w-[30px] shrink-0 text-xs text-stone-600">{row.unite}</span>
                          </div>
                        )
                      })}
                    </div>

                    <p className="text-[11px] text-stone-500">
                      Valeurs calculées depuis la nomenclature de référence (
                      <span className="font-mono">{form.sku}</span>).
                      {bomIsCustomized
                        ? <span className="text-amber-600 ml-1 font-medium">Quantités modifiées — cliquer Réinitialiser pour recalculer.</span>
                        : ' Modifiables avant envoi à l\'opérateur.'}
                    </p>
                  </>
                )}
              </div>

              {/* ── Statut OF (workflow) ────────────────────────────────── */}
              <div className="rounded-xl bg-muted/50 border border-border px-4 py-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Statut OF
                  </p>
                  {of && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUT_OF_COLORS[of.statut]}`}>
                      {STATUT_OF_LABELS[of.statut]}
                    </span>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                  {[
                    'En attente approche composants',
                    'Planifié',
                    'En cours',
                    'Terminé',
                    'Contrôle qualité (stock en Q)',
                    'Dispo',
                  ].map((s, i, arr) => (
                    <span key={s} className="flex items-center gap-1">
                      <span className={i === 0 && !of ? 'font-medium text-orange-600' : ''}>
                        {s}
                      </span>
                      {i < arr.length - 1 && (
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground/50" />
                      )}
                    </span>
                  ))}
                </div>
                {of && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    ⚠ La modification ne change pas le statut. Utilisez les boutons de transition dans le tableau.
                  </p>
                )}
              </div>

            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20 shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isValid || saving}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {saving ? (
                  <><Loader2 className="size-4 animate-spin" />{of ? 'Enregistrement…' : 'Création…'}</>
                ) : of ? (
                  <><CheckCircle2 className="size-4" />Enregistrer les modifications</>
                ) : (
                  <><CheckCircle2 className="size-4" />Créer OF &amp; envoyer à l&apos;opérateur</>
                )}
              </Button>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
