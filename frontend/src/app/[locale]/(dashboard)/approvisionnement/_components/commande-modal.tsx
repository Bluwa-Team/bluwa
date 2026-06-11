'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  X, Loader2, Building2, Leaf, Check, Plus, Trash2, Printer, Lock, Link2,
} from 'lucide-react'
import { BCHeader, BCItem, TypeCommande } from './types'
import { printBcDoc } from './bc-print'
import type { Fournisseur } from '@/app/[locale]/(dashboard)/fournisseurs/_components/types'
import type { Article, ArticleType } from '@/app/[locale]/(dashboard)/articles/_components/types'
import { TYPE_LABELS } from '@/app/[locale]/(dashboard)/articles/_components/types'
import type { PurchaseRequisitionRow } from '@/app/[locale]/(dashboard)/mrp/_components/types'
import { DEVISES } from '@/config'
import { getFournisseurs } from '@/lib/actions/fournisseurs'
import { getArticles }     from '@/lib/actions/articles'
import { getContratActifByFournisseur } from '@/lib/actions/approvisionnement'

// ── Types locaux du formulaire ────────────────────────────────────────────────

type HeaderForm = {
  type:            TypeCommande
  fournisseurId:   string   // ID pour la requête contrat — non transmis à BCHeader
  fournisseur:     string   // Raison sociale → stockée dans BCHeader
  contrat:         string
  currency:        string   // ISO 4217 — 'XOF' par défaut
  livraisonDefaut: string
}

type ItemForm = {
  _key:                  string
  articleId:             string         // → articles.id, transmis à BCItem
  article:               string         // Désignation → stockée dans BCItem
  quantite:              string
  unite:                 string
  puHT:                  string
  livraisonPrevue:       string
  dureeVie:              string
  purchaseRequisitionId: string | null  // traçabilité DA → BC
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:     boolean
  onClose:  () => void
  prefill?: PurchaseRequisitionRow | null
  onSave: (
    header: Omit<BCHeader, 'id' | 'numero' | 'reception' | 'statut'>,
    items:  Omit<BCItem,   'id' | 'headerId'>[],
  ) => Promise<BCHeader | null>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_HEADER: HeaderForm = {
  type:            'BC',
  fournisseurId:   '',
  fournisseur:     '',
  contrat:         '',
  currency:        'XOF',
  livraisonDefaut: '',
}

function newItemRow(livraisonDefaut = ''): ItemForm {
  return {
    _key:                  Math.random().toString(36).slice(2),
    articleId:             '',
    article:               '',
    quantite:              '',
    unite:                 'kg',
    puHT:                  '',
    livraisonPrevue:       livraisonDefaut,
    dureeVie:              '',
    purchaseRequisitionId: null,
  }
}

/** Classes communes pour les <select> natifs — alignées sur le composant Input */
const SELECT_CLS =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm ' +
  'transition-colors outline-none focus-visible:border-ring ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

/** Ordre d'affichage des types d'articles dans les optgroups */
const ARTICLE_TYPE_ORDER: ArticleType[] = ['MP', 'AC', 'CS', 'PSF', 'PF']

// ── Sous-composants utilitaires ───────────────────────────────────────────────

function Field({ label, required, children }: {
  label:     string
  required?: boolean
  children:  React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
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

// ── Composant principal ───────────────────────────────────────────────────────

export function CommandeModal({ open, onClose, prefill, onSave }: Props) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [header, setHeader] = useState<HeaderForm>(EMPTY_HEADER)
  const [items,  setItems]  = useState<ItemForm[]>([newItemRow()])
  const [saving, setSaving] = useState(false)

  // ── Référentiels (Master Data) ──────────────────────────────────────────────
  const [fournisseursRef, setFournisseursRef] = useState<Fournisseur[]>([])
  const [articlesRef,     setArticlesRef]     = useState<Article[]>([])
  const [loadingRef,      setLoadingRef]      = useState(false)

  // ── Contrat cadre ───────────────────────────────────────────────────────────
  const [contratLoading, setContratLoading] = useState(false)
  const [contratLocked,  setContratLocked]  = useState(false)  // auto-rempli depuis la DB

  const isBC = header.type === 'BC'

  // ── Chargement des référentiels à l'ouverture ───────────────────────────────
  useEffect(() => {
    if (!open) return
    setHeader(EMPTY_HEADER)
    setContratLocked(false)

    // Pré-remplissage depuis une DA MRP
    if (prefill) {
      setItems([{
        _key:                  Math.random().toString(36).slice(2),
        articleId:             prefill.articleId ?? '',
        article:               prefill.articleLabel,
        quantite:              String(prefill.quantityRequired),
        unite:                 prefill.unitLabel,
        puHT:                  '',
        livraisonPrevue:       prefill.requestedDeliveryDate,
        dureeVie:              '',
        purchaseRequisitionId: prefill.id,
      }])
    } else {
      setItems([newItemRow()])
    }

    setLoadingRef(true)
    Promise.all([getFournisseurs(), getArticles()]).then(([frs, arts]) => {
      setFournisseursRef(frs)
      // Seuls les articles achetés (MP, AC, CS…) apparaissent dans un bon de commande
      setArticlesRef(arts.filter((a) => a.appro === 'Achete'))
      setLoadingRef(false)
    })
  }, [open])

  // ── Handlers header ─────────────────────────────────────────────────────────

  function setH(key: keyof HeaderForm, value: string) {
    setHeader((prev) => ({ ...prev, [key]: value }))
    // Propage la date défaut aux lignes qui n'ont pas encore de date custom
    if (key === 'livraisonDefaut') {
      setItems((prev) =>
        prev.map((i) =>
          i.livraisonPrevue === '' || i.livraisonPrevue === header.livraisonDefaut
            ? { ...i, livraisonPrevue: value }
            : i,
        ),
      )
    }
  }

  /**
   * Sélection d'un fournisseur :
   *  1. Met à jour header (fournisseurId + raison sociale)
   *  2. Auto-positionne le type BC/BA selon le statut Formel/Informel
   *  3. Si BC → requête en base pour récupérer le contrat cadre actif
   */
  async function handleFournisseurChange(fournisseurId: string) {
    const fourn = fournisseursRef.find((f) => f.id === fournisseurId)

    if (!fourn) {
      setHeader((prev) => ({
        ...prev,
        fournisseurId: '',
        fournisseur:   '',
        type:          'BC',
        contrat:       '',
      }))
      setContratLocked(false)
      return
    }

    const newType: TypeCommande = fourn.statut === 'Formel' ? 'BC' : 'BA'

    setHeader((prev) => ({
      ...prev,
      fournisseurId: fourn.id,
      fournisseur:   fourn.raisonSociale,
      type:          newType,
      contrat:       '',            // reset avant la requête
    }))
    setContratLocked(false)

    if (newType === 'BC') {
      setContratLoading(true)
      const contrat = await getContratActifByFournisseur(fourn.id)
      setContratLoading(false)
      if (contrat) {
        setHeader((prev) => ({ ...prev, contrat: contrat.reference }))
        setContratLocked(true)
      }
    }
  }

  // ── Handlers items ──────────────────────────────────────────────────────────

  function setI(key: string, field: keyof ItemForm, value: string) {
    setItems((prev) => prev.map((i) => (i._key === key ? { ...i, [field]: value } : i)))
  }

  /**
   * Sélection d'un article dans une ligne :
   *  1. Stocke l'ID + la désignation dans la ligne
   *  2. Auto-remplit l'unité (uniteStock) et la durée de vie si définie
   */
  function handleArticleChange(key: string, articleId: string) {
    const art = articlesRef.find((a) => a.id === articleId)
    if (!art) {
      setItems((prev) =>
        prev.map((i) => (i._key === key ? { ...i, articleId: '', article: '' } : i)),
      )
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i._key === key
          ? {
              ...i,
              articleId: art.id,
              article:   art.designation,
              unite:     art.uniteAchat || art.uniteStock || i.unite,
              dureeVie:  art.dureeVie !== null ? String(art.dureeVie) : i.dureeVie,
              puHT:      i.puHT === '' && art.dernierPrixAchat !== null
                           ? String(art.dernierPrixAchat)
                           : i.puHT,
            }
          : i,
      ),
    )
  }

  function addItem() {
    setItems((prev) => [...prev, newItemRow(header.livraisonDefaut)])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function isValid() {
    if (!header.fournisseurId || !header.fournisseur.trim() || items.length === 0) return false
    return items.every(
      (i) =>
        i.articleId !== '' &&        // article obligatoirement sélectionné depuis le référentiel
        i.article.trim() !== '' &&
        i.quantite !== '' &&
        !isNaN(parseFloat(i.quantite)) &&
        i.puHT !== '' &&
        !isNaN(parseFloat(i.puHT)) &&
        i.livraisonPrevue !== '',
    )
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    const printItems = items.map((i) => ({
      article:         i.article.trim(),
      quantite:        parseFloat(i.quantite),
      unite:           i.unite.trim() || 'kg',
      puHT:            parseFloat(i.puHT),
      livraisonPrevue: i.livraisonPrevue,
    }))
    const result = await onSave(
      {
        type:        header.type,
        date:        new Date().toISOString().split('T')[0],
        fournisseur: header.fournisseur.trim(),
        contrat:     isBC && header.contrat.trim() ? header.contrat.trim() : null,
        currency:    header.currency,
      },
      items.map((i, idx) => ({
        itemPosition:          idx + 1,
        articleId:             i.articleId || null,
        article:               i.article.trim(),
        quantite:              parseFloat(i.quantite),
        quantiteRecue:         0,
        unite:                 i.unite.trim() || 'kg',
        puHT:                  parseFloat(i.puHT),
        livraisonPrevue:       i.livraisonPrevue,
        dureeVie:              i.dureeVie !== '' ? parseInt(i.dureeVie, 10) : null,
        purchaseRequisitionId: i.purchaseRequisitionId ?? null,
      })),
    )
    setSaving(false)
    if (result) {
      printBcDoc(result, printItems)
      onClose()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // Articles regroupés par type pour les optgroups
  const articlesByType = ARTICLE_TYPE_ORDER.reduce<Record<ArticleType, Article[]>>(
    (acc, type) => {
      acc[type] = articlesRef.filter((a) => a.type === type)
      return acc
    },
    {} as Record<ArticleType, Article[]>,
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(800px,96vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header modal ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {isBC
                    ? <Building2 className="size-[18px] text-foreground" />
                    : <Leaf      className="size-[18px] text-emerald-600" />}
                </div>
                <div>
                  <p className="font-semibold text-base">Nouvelle commande fournisseur</p>
                  <p className="text-xs text-muted-foreground mt-0.5">En-tête · Lignes articles</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 p-5 space-y-6">

              {/* Bannière conversion DA */}
              {prefill && (
                <div className="flex items-center gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs text-violet-800">
                  <Link2 className="size-3.5 shrink-0 text-violet-600" />
                  <span>
                    Conversion de <strong className="font-mono">{prefill.requisitionNumber}</strong>
                    {' '}· Article et quantité pré-remplis depuis la suggestion MRP.
                    Choisissez le fournisseur pour finaliser.
                  </span>
                </div>
              )}

              {/* ① EN-TÊTE */}
              <section className="space-y-4">
                <SectionTitle num="①" label="En-tête du document" />

                {/* Type BC / BA — auto-positionné selon le fournisseur sélectionné */}
                <Field label="Type fournisseur" required>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'BC' as const, Icon: Building2, label: 'Formel → BC',   sub: 'Bon de Commande', activeClass: 'text-blue-600'    },
                      { value: 'BA' as const, Icon: Leaf,       label: 'Informel → BA', sub: "Bon d'Achat",     activeClass: 'text-emerald-600' },
                    ]).map((opt) => {
                      const active = header.type === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setH('type', opt.value)}
                          className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                            active
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-input bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                          }`}
                        >
                          <opt.Icon className={`size-4 shrink-0 ${active ? opt.activeClass : 'text-muted-foreground'}`} />
                          <span>
                            {opt.label}{' '}
                            <span className="font-normal opacity-60">({opt.sub})</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                {/* Fournisseur (liste déroulante sur le référentiel) + Contrat */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Field label="Fournisseur" required>
                      <select
                        value={header.fournisseurId}
                        onChange={(e) => handleFournisseurChange(e.target.value)}
                        disabled={loadingRef}
                        className={SELECT_CLS}
                      >
                        <option value="">
                          {loadingRef ? 'Chargement du référentiel…' : 'Sélectionner un fournisseur…'}
                        </option>

                        {/* Groupe Formel */}
                        {fournisseursRef.some((f) => f.statut === 'Formel') && (
                          <optgroup label="Formel (→ BC)">
                            {fournisseursRef
                              .filter((f) => f.statut === 'Formel')
                              .map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.raisonSociale}
                                  {f.categorie ? ` — ${f.categorie}` : ''}
                                </option>
                              ))}
                          </optgroup>
                        )}

                        {/* Groupe Informel */}
                        {fournisseursRef.some((f) => f.statut === 'Informel') && (
                          <optgroup label="Informel (→ BA)">
                            {fournisseursRef
                              .filter((f) => f.statut === 'Informel')
                              .map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.raisonSociale}
                                  {f.categorie ? ` — ${f.categorie}` : ''}
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                    </Field>
                  </div>

                  {/* Contrat cadre — auto-rempli si contrat actif trouvé */}
                  <Field label="N° Contrat cadre">
                    <div className="relative">
                      <Input
                        value={header.contrat}
                        onChange={(e) => {
                          if (!contratLocked) setH('contrat', e.target.value)
                        }}
                        placeholder={contratLocked ? '' : 'CT-2026-XXX'}
                        disabled={!isBC || contratLoading}
                        readOnly={contratLocked}
                        className={
                          contratLocked
                            ? 'pr-7 bg-emerald-50 border-emerald-300 text-emerald-800 cursor-default'
                            : ''
                        }
                      />
                      {/* Spinner pendant la recherche */}
                      {contratLoading && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {/* Cadenas si contrat auto-rempli */}
                      {contratLocked && !contratLoading && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className="size-3.5 text-emerald-600" />
                        </div>
                      )}
                    </div>
                    {contratLocked && (
                      <p className="text-[10px] text-emerald-600 mt-1 leading-none">
                        Contrat cadre actif détecté
                      </p>
                    )}
                    {!contratLocked && isBC && header.fournisseurId && !contratLoading && (
                      <p className="text-[10px] text-muted-foreground mt-1 leading-none">
                        Aucun contrat actif — saisie manuelle
                      </p>
                    )}
                  </Field>
                </div>

                {/* Devise + Date de livraison défaut */}
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Devise" required>
                    <select
                      value={header.currency}
                      onChange={(e) => setH('currency', e.target.value)}
                      className={SELECT_CLS}
                    >
                      {DEVISES.map((d) => (
                        <option key={d.code} value={d.code}>{d.label}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Field label="Date de livraison prévue (défaut pour toutes les lignes)">
                      <Input
                        type="date"
                        value={header.livraisonDefaut}
                        onChange={(e) => setH('livraisonDefaut', e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* ② LIGNES ARTICLES */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle num="②" label="Lignes articles" badge={items.length} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={addItem}
                  >
                    <Plus className="size-3.5" />
                    Ajouter une ligne
                  </Button>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  {/* En-têtes colonnes */}
                  <div
                    className="grid bg-muted/50 border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    style={{ gridTemplateColumns: '1fr 80px 60px 96px 124px 68px 32px' }}
                  >
                    <span>Article *</span>
                    <span className="text-right">Quantité *</span>
                    <span className="pl-1">Unité</span>
                    <span className="text-right">PU HT ({header.currency})</span>
                    <span className="pl-1">Livraison prévue *</span>
                    <span className="text-right">Durée vie (j)</span>
                    <span />
                  </div>

                  {/* Lignes */}
                  <div className="divide-y">
                    {items.map((item, idx) => (
                      <div
                        key={item._key}
                        className="grid items-center gap-1.5 px-3 py-2"
                        style={{ gridTemplateColumns: '1fr 80px 60px 96px 124px 68px 32px' }}
                      >
                        {/* Article — liste déroulante sur le référentiel */}
                        <select
                          value={item.articleId}
                          onChange={(e) => handleArticleChange(item._key, e.target.value)}
                          disabled={loadingRef}
                          className={SELECT_CLS}
                        >
                          <option value="">
                            {loadingRef ? '…' : `Article ${idx + 1}`}
                          </option>
                          {ARTICLE_TYPE_ORDER.map((type) => {
                            const group = articlesByType[type]
                            if (!group || group.length === 0) return null
                            return (
                              <optgroup key={type} label={TYPE_LABELS[type]}>
                                {group.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.designation}
                                    {a.code ? ` (${a.code})` : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )
                          })}
                        </select>

                        {/* Quantité */}
                        <Input
                          type="number"
                          min="0"
                          value={item.quantite}
                          onChange={(e) => setI(item._key, 'quantite', e.target.value)}
                          placeholder="0"
                          className="h-8 text-sm text-right"
                        />

                        {/* Unité — auto-remplie depuis l'article, modifiable */}
                        <Input
                          value={item.unite}
                          onChange={(e) => setI(item._key, 'unite', e.target.value)}
                          placeholder="kg"
                          className="h-8 text-sm pl-1.5"
                        />

                        {/* PU HT */}
                        <Input
                          type="number"
                          min="0"
                          value={item.puHT}
                          onChange={(e) => setI(item._key, 'puHT', e.target.value)}
                          placeholder="0"
                          className="h-8 text-sm text-right"
                        />

                        {/* Livraison prévue */}
                        <Input
                          type="date"
                          value={item.livraisonPrevue}
                          onChange={(e) => setI(item._key, 'livraisonPrevue', e.target.value)}
                          className="h-8 text-sm"
                        />

                        {/* Durée de vie — auto-remplie depuis l'article, modifiable */}
                        <Input
                          type="number"
                          min="0"
                          value={item.dureeVie}
                          onChange={(e) => setI(item._key, 'dureeVie', e.target.value)}
                          placeholder="—"
                          className="h-8 text-sm text-right"
                        />

                        {/* Supprimer la ligne */}
                        <button
                          onClick={() => removeItem(item._key)}
                          disabled={items.length === 1}
                          title="Supprimer la ligne"
                          className="flex items-center justify-center p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Info */}
              <div className="flex items-start gap-2.5 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50/60 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                <Printer className="size-4 shrink-0 mt-0.5 text-orange-500" />
                <span>
                  À la création, un{' '}
                  <strong className="text-foreground">
                    {isBC ? 'Bon de Commande (BC)' : "Bon d'Achat (BA)"}
                  </strong>{' '}
                  est numéroté automatiquement. Chaque ligne article génère un suivi de réception
                  indépendant (quantité restante à réceptionner).
                </span>
              </div>
            </div>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-2 p-4 border-t shrink-0">
              <span className="text-xs text-muted-foreground">
                {items.length} ligne{items.length > 1 ? 's' : ''} article{items.length > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={!isValid() || saving}>
                  {saving
                    ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</>
                    : <><Check className="size-4 mr-1.5" />Créer {header.type}</>}
                </Button>
              </div>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
