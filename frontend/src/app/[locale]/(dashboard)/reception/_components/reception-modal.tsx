'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Loader2, Barcode, Clock, CheckCircle2, AlertTriangle, Camera, ShieldCheck } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Reception, StatutReception } from './types'
import { CommandeFournisseur } from '../../approvisionnement/_components/types'

interface Props {
  open: boolean
  onClose: () => void
  commandes: CommandeFournisseur[]
  onSave: (r: Omit<Reception, 'id' | 'itemId' | 'numero' | 'lot'>) => Promise<boolean>
}

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

const STATUT_OPTIONS: { value: StatutReception; label: string; icon: React.ElementType; iconClass: string }[] = [
  { value: 'Attente',  label: 'En attente', icon: Clock,         iconClass: 'text-amber-500'   },
  { value: 'Conforme', label: 'Conforme',   icon: CheckCircle2,  iconClass: 'text-emerald-600' },
  { value: 'Reserve',  label: 'Réserve',    icon: AlertTriangle, iconClass: 'text-orange-500'  },
]

const EMPTY = {
  commandeId: '',
  qteRecue: '',
  humidite: '0',
  lotFourn: '',
  dlc: '',
  codeBarres: '',
  statut: 'Attente' as StatutReception,
}

export function ReceptionModal({ open, onClose, commandes, onSave }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(EMPTY)
  }, [open])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function selectCommande(id: string) {
    const c = commandes.find((cmd) => cmd.id === id) ?? null
    const reste = c ? c.quantite - c.quantiteRecue : 0

    // Auto-calcul DLC = aujourd'hui + dureeVie si le fournisseur n'impose pas de DLC sur le lot
    let dlcAuto = form.dlc
    if (!dlcAuto && c?.dureeVie) {
      const d = new Date()
      d.setDate(d.getDate() + c.dureeVie)
      dlcAuto = d.toISOString().split('T')[0]
    }

    setForm((prev) => ({
      ...prev,
      commandeId: id,
      qteRecue: c ? String(reste > 0 ? reste : c.quantite) : '',
      dlc: dlcAuto,
    }))
  }

  const commande = commandes.find((c) => c.id === form.commandeId) ?? null

  function isValid() {
    return !!form.commandeId && !!form.qteRecue && !!form.lotFourn.trim()
  }

  async function handleSave() {
    if (!commande) return
    setSaving(true)
    const statutLotMap = { Attente: 'EnControle', Conforme: 'Libere', Reserve: 'Bloque' } as const
    const ok = await onSave({
      date:            new Date().toISOString().split('T')[0],
      numeroBon:       commande.numero,
      fournisseur:     commande.fournisseur,
      typeFournisseur: commande.type === 'BC' ? 'Formel' : 'Informel',
      article:         commande.article,
      quantite:        parseFloat(form.qteRecue),
      unite:           commande.unite,
      lotFourn:        form.lotFourn.trim() || null,
      dlc:             form.dlc || null,
      humidite:        form.humidite !== '' ? parseFloat(form.humidite) : null,
      codeBarres:      form.codeBarres.trim() || null,
      statut:          form.statut,
      statutLot:       statutLotMap[form.statut],
      cloturee:        false,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const commandesOuvertes = commandes.filter(
    (c) => c.statut === 'EnCours' || c.statut === 'Partielle',
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(640px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b shrink-0">
              <div>
                <p className="font-semibold">Nouvelle réception</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Réception d'une commande fournisseur
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 overflow-y-auto">

              {/* Commande select */}
              <Field label="Commande à réceptionner" required>
                <select
                  value={form.commandeId}
                  onChange={(e) => selectCommande(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner une commande…</option>
                  {commandesOuvertes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numero} · {c.fournisseur} · {c.article} · {c.quantite - c.quantiteRecue} {c.unite} restant(s)
                    </option>
                  ))}
                </select>
              </Field>

              {/* Info card */}
              {commande && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm space-y-1">
                  <p>
                    <span className="font-semibold text-blue-700">Fournisseur : </span>
                    <span className="text-blue-600">
                      {commande.fournisseur} ({commande.type === 'BC' ? 'formel' : 'informel'})
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-blue-700">Article : </span>
                    <span className="text-blue-600">{commande.article}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-blue-700">Commande : </span>
                    <span className="text-blue-600">
                      {commande.quantite} {commande.unite} · déjà reçu {commande.quantiteRecue}
                    </span>
                  </p>
                </div>
              )}

              {/* Qté + Humidité */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Field label="Qté reçue" required>
                  <Input
                    type="number"
                    min="0"
                    value={form.qteRecue}
                    onChange={(e) => set('qteRecue', e.target.value)}
                    placeholder="0"
                    disabled={!commande}
                  />
                </Field>

                <Field label="Humidité (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.humidite}
                    onChange={(e) => set('humidite', e.target.value)}
                    placeholder="0"
                    disabled={!commande}
                  />
                </Field>

                {/* N° lot + DLC */}
                <Field label="N° lot fournisseur" required>
                  <Input
                    value={form.lotFourn}
                    onChange={(e) => set('lotFourn', e.target.value)}
                    placeholder="ex: BATCH-A23-08"
                    disabled={!commande}
                  />
                </Field>

                <Field label="DLC fournisseur">
                  <Input
                    type="date"
                    value={form.dlc}
                    onChange={(e) => set('dlc', e.target.value)}
                    disabled={!commande}
                  />
                  {commande?.dureeVie && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Calculée auto. : J+{commande.dureeVie} j · Modifiable si DLC imposée par le fournisseur
                    </p>
                  )}
                </Field>
              </div>

              {/* Scan code-barres */}
              <Field label="Scan code-barres / DataMatrix">
                <div className="flex gap-2">
                  <Input
                    value={form.codeBarres}
                    onChange={(e) => set('codeBarres', e.target.value)}
                    placeholder="EAN-13 / GS1 DataMatrix"
                    disabled={!commande}
                    className="flex-1"
                  />
                  <Button type="button" disabled={!commande} className="gap-2 shrink-0">
                    <Barcode className="size-4" />
                    Scanner
                  </Button>
                </div>
              </Field>

              {/* Statut visuel */}
              <Field label="Statut visuel">
                <Select
                  value={form.statut}
                  onValueChange={(v) => { if (v !== null) set('statut', v) }}
                  disabled={!commande}
                >
                  <SelectTrigger className="w-full">
                    {(() => {
                      const opt = STATUT_OPTIONS.find((s) => s.value === form.statut)
                      return opt
                        ? <span className="flex items-center gap-2">
                            <opt.icon className={`size-4 ${opt.iconClass}`} />
                            {opt.label}
                          </span>
                        : <SelectValue placeholder="Sélectionner…" />
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          <s.icon className={`size-4 ${s.iconClass}`} />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Photos */}
              <div className={`rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                commande
                  ? 'border-muted-foreground/30 hover:border-muted-foreground/50 cursor-pointer'
                  : 'border-muted/30 opacity-40 pointer-events-none'
              }`}>
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="size-5" />
                  <p className="text-sm">Photos de la marchandise (preuve qualité)</p>
                </div>
              </div>

              {/* Footer info */}
              <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                <ShieldCheck className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span>
                  À la validation, le lot entre en stock avec statut{' '}
                  <strong className="text-foreground">"En contrôle"</strong> (bloqué MRP/OF). Libération
                  dans <strong className="text-foreground">Assurance Qualité</strong>.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={!isValid() || saving}>
                {saving
                  ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</>
                  : 'Enregistrer la réception'
                }
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
