'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import { DEVISES } from '@/config'
import { getClients }      from '@/lib/actions/clients'
import { getArticlesLite } from '@/lib/actions/clients'
import type { Client }      from '@/app/[locale]/(dashboard)/clients/_components/types'
import type { ArticleLite } from '@/lib/actions/clients'
import type { CreateSalesOrderInput } from '@/lib/actions/ventes'

// ── Types locaux ──────────────────────────────────────────────────────────────

type ItemForm = {
  _key:         string
  articleId:    string
  article:      string
  quantite:     string
  unite:        string
  puHT:         string
  remisePct:    string
}

const EMPTY_ITEM = (): ItemForm => ({
  _key:      crypto.randomUUID(),
  articleId: '',
  article:   '',
  quantite:  '',
  unite:     '',
  puHT:      '',
  remisePct: '0',
})

// ── Helper ────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  onSave:  (input: CreateSalesOrderInput) => Promise<boolean>
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function CommandeModal({ open, onClose, onSave }: Props) {
  const [clients,  setClients]  = useState<Client[]>([])
  const [articles, setArticles] = useState<ArticleLite[]>([])
  const [saving,   setSaving]   = useState(false)

  // Header form
  const today = new Date().toISOString().split('T')[0]
  const [clientId,   setClientId]   = useState('')
  const [orderDate,  setOrderDate]  = useState(today)
  const [livraison,  setLivraison]  = useState('')
  const [currency,   setCurrency]   = useState('XOF')
  const [notes,      setNotes]      = useState('')
  const [itemForms,  setItemForms]  = useState<ItemForm[]>([EMPTY_ITEM()])

  useEffect(() => {
    if (!open) return
    // Reset
    setClientId(''); setOrderDate(today); setLivraison(''); setCurrency('XOF')
    setNotes(''); setItemForms([EMPTY_ITEM()])
    // Charger clients + articles
    getClients().then(setClients)
    getArticlesLite().then(setArticles)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function addItem() { setItemForms((p) => [...p, EMPTY_ITEM()]) }
  function removeItem(key: string) { setItemForms((p) => p.filter((i) => i._key !== key)) }
  function setField(key: string, field: keyof ItemForm, value: string) {
    setItemForms((p) => p.map((i) => i._key === key ? { ...i, [field]: value } : i))
  }
  function selectArticle(key: string, code: string) {
    const art = articles.find((a) => a.code === code)
    if (!art) return
    setItemForms((p) => p.map((i) =>
      i._key === key
        ? { ...i, articleId: art.code, article: art.designation, unite: art.unite, puHT: art.prixVente != null ? String(art.prixVente) : i.puHT }
        : i,
    ))
  }

  function isValid() {
    if (!clientId || !orderDate || !livraison) return false
    return itemForms.length > 0 && itemForms.every(
      (f) => f.articleId && f.quantite && !isNaN(parseFloat(f.quantite)) && f.puHT && !isNaN(parseFloat(f.puHT)),
    )
  }

  async function handleSave() {
    if (!isValid()) return
    setSaving(true)
    const ok = await onSave({
      clientId,
      orderDate,
      requestedDeliveryDate: livraison,
      currency,
      notes: notes.trim() || null,
      items: itemForms.map((f) => ({
        articleId:    f.articleId,
        articleLabel: f.article,
        quantity:     parseFloat(f.quantite),
        unitPriceHT:  parseFloat(f.puHT),
        discountPct:  parseFloat(f.remisePct) || 0,
      })),
    })
    setSaving(false)
    if (ok) onClose()
  }

  // Calcul CA prévisionnel
  const caTotal = itemForms.reduce((s, f) => {
    const q  = parseFloat(f.quantite) || 0
    const p  = parseFloat(f.puHT)     || 0
    const r  = parseFloat(f.remisePct) || 0
    return s + q * p * (1 - r / 100)
  }, 0)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(820px,96vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b shrink-0">
              <div>
                <p className="font-semibold">Nouvelle commande client</p>
                <p className="text-sm text-muted-foreground mt-0.5">Sélectionner un client · Ajouter les articles commandés</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="size-4" /></Button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-6 overflow-y-auto">

              {/* ① En-tête */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">① Informations générales</h3>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Client" required>
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Sélectionner un client…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.raisonSociale}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Devise">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {DEVISES.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.label}</option>)}
                    </select>
                  </Field>

                  <Field label="Date de commande" required>
                    <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                  </Field>

                  <Field label="Date de livraison souhaitée" required>
                    <Input type="date" value={livraison} onChange={(e) => setLivraison(e.target.value)} min={orderDate} />
                  </Field>

                  <Field label="Notes">
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instructions particulières…" className="col-span-2" />
                  </Field>
                </div>
              </section>

              {/* ② Articles */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    ② Articles commandés
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-bold">{itemForms.length}</span>
                  </h3>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={addItem}>
                    <Plus className="size-3.5" /> Ajouter une ligne
                  </Button>
                </div>

                <div className="rounded-lg border overflow-hidden divide-y">
                  {itemForms.map((f, idx) => (
                    <div key={f._key} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded bg-muted">Ligne {idx + 1}</span>
                        {itemForms.length > 1 && (
                          <button onClick={() => removeItem(f._key)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50">
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-3">
                          <Field label="Article" required>
                            <select
                              value={f.articleId}
                              onChange={(e) => selectArticle(f._key, e.target.value)}
                              className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="">Sélectionner…</option>
                              {articles.map((a) => (
                                <option key={a.code} value={a.code}>{a.designation}</option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <Field label="Qté" required>
                          <Input type="number" min="0" value={f.quantite} onChange={(e) => setField(f._key, 'quantite', e.target.value)} placeholder="0" />
                        </Field>
                        <Field label="Unité">
                          <Input value={f.unite} onChange={(e) => setField(f._key, 'unite', e.target.value)} placeholder="btl" />
                        </Field>
                        <Field label="PU HT" required>
                          <Input type="number" min="0" value={f.puHT} onChange={(e) => setField(f._key, 'puHT', e.target.value)} placeholder="0" />
                        </Field>
                        <div className="col-span-2">
                          <Field label="Remise (%)">
                            <Input type="number" min="0" max="100" value={f.remisePct} onChange={(e) => setField(f._key, 'remisePct', e.target.value)} placeholder="0" />
                          </Field>
                        </div>
                        <div className="col-span-2 flex items-end">
                          <p className="text-xs text-muted-foreground pb-2.5">
                            Montant : <strong className="text-foreground">
                              {Math.round((parseFloat(f.quantite) || 0) * (parseFloat(f.puHT) || 0) * (1 - (parseFloat(f.remisePct) || 0) / 100)).toLocaleString('fr-FR')} {currency}
                            </strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-4 border-t shrink-0">
              <div className="text-sm text-muted-foreground">
                CA HT prévisionnel : <strong className="text-foreground text-base">{Math.round(caTotal).toLocaleString('fr-FR')} {currency}</strong>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
                <Button onClick={handleSave} disabled={!isValid() || saving}>
                  {saving ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</> : 'Créer la commande'}
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
