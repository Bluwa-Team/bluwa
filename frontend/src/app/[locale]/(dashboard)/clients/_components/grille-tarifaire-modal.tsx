'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Tag } from 'lucide-react'
import { GrilleTarifaire } from './types'
import { upsertGrilleTarifaire, getArticlesLite, ArticleLite } from '@/lib/actions/clients'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  open:      boolean
  onClose:   () => void
  clientId:  string
  existing:  GrilleTarifaire[]          // pour détecter les doublons côté UI
  onSave:    (entry: GrilleTarifaire) => void
}

const DEVISES = ['XOF', 'USD', 'EUR', 'GHS', 'GNF', 'MAD']

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
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

// ── Modal ─────────────────────────────────────────────────────────────────────

export function GrilleTarifaireModal({ open, onClose, clientId, existing, onSave }: Props) {
  const [articles, setArticles]         = useState<ArticleLite[]>([])
  const [articleCode, setArticleCode]   = useState('')
  const [designation, setDesignation]   = useState('')
  const [prixNegecie, setPrixNegecie]   = useState('')
  const [devise, setDevise]             = useState('XOF')
  const [saving, setSaving]             = useState(false)
  const [errors, setErrors]             = useState<Record<string, string>>({})

  // Charger les articles actifs au montage
  useEffect(() => {
    getArticlesLite().then(setArticles)
  }, [])

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setArticleCode('')
      setDesignation('')
      setPrixNegecie('')
      setDevise('XOF')
      setErrors({})
    }
  }, [open])

  // Quand l'utilisateur sélectionne un article connu → pré-remplir designation + prix
  function handleArticleChange(code: string) {
    setArticleCode(code)
    setErrors((e) => ({ ...e, articleCode: '' }))
    const found = articles.find((a) => a.code === code)
    if (found) {
      setDesignation(found.designation)
      if (found.prixVente) setPrixNegecie(String(found.prixVente))
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!articleCode.trim())       e.articleCode  = 'Obligatoire'
    if (!designation.trim())       e.designation  = 'Obligatoire'
    const prix = parseFloat(prixNegecie)
    if (!prixNegecie || isNaN(prix) || prix <= 0)
                                   e.prixNegecie  = 'Doit être > 0'
    if (existing.some((g) => g.articleCode === articleCode.trim()))
                                   e.articleCode  = 'Cet article a déjà un tarif — il sera mis à jour (upsert)'
    setErrors(e)
    // L'upsert sur doublon est autorisé : on filtre uniquement les erreurs bloquantes
    return !e.articleCode?.startsWith('Obligatoire') && !e.designation && !e.prixNegecie
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const saved = await upsertGrilleTarifaire(clientId, {
      articleCode: articleCode.trim(),
      designation: designation.trim(),
      prixNegecie: parseFloat(prixNegecie),
      devise,
    })
    setSaving(false)
    if (!saved) return
    onSave(saved)
    onClose()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(520px,92vw)] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Tag className="size-[18px] text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-base">Tarif négocié</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ajouter ou mettre à jour un prix négocié par article
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* ── Body ────────────────────────────────────────────── */}
            <div className="px-6 py-5 space-y-4">

              {/* Article */}
              <Field label="Article (code)" required>
                <input
                  list="grille-articles-list"
                  value={articleCode}
                  onChange={(e) => handleArticleChange(e.target.value)}
                  placeholder="PF-BIS-001"
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    errors.articleCode ? 'border-red-400' : 'border-input'
                  }`}
                />
                <datalist id="grille-articles-list">
                  {articles.map((a) => (
                    <option key={a.code} value={a.code}>{a.code} · {a.designation}</option>
                  ))}
                </datalist>
                {errors.articleCode && (
                  <p className={`text-xs mt-1 ${errors.articleCode.startsWith('Cet') ? 'text-amber-600' : 'text-red-500'}`}>
                    {errors.articleCode}
                  </p>
                )}
              </Field>

              {/* Désignation */}
              <Field label="Désignation" required>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Ex : Bissap Pourpre Original 1L"
                  className={errors.designation ? 'border-red-400' : ''}
                />
                {errors.designation && <p className="text-xs text-red-500 mt-1">{errors.designation}</p>}
              </Field>

              {/* Prix + Devise */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Prix négocié" required>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={prixNegecie}
                    onChange={(e) => { setPrixNegecie(e.target.value); setErrors((err) => ({ ...err, prixNegecie: '' })) }}
                    placeholder="0"
                    className={`text-right font-mono ${errors.prixNegecie ? 'border-red-400' : ''}`}
                  />
                  {errors.prixNegecie && <p className="text-xs text-red-500 mt-1">{errors.prixNegecie}</p>}
                </Field>
                <Field label="Devise">
                  <select
                    value={devise}
                    onChange={(e) => setDevise(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {DEVISES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>

              <p className="text-xs text-muted-foreground">
                Si un tarif existe déjà pour cet article, il sera <strong>mis à jour</strong> (upsert).
              </p>
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20 shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer le tarif'}
              </Button>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
