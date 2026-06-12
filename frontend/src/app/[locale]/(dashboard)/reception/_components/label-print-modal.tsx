'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Printer, Tag } from 'lucide-react'
import type { ReceptionFlat } from './types'
import { printStorageLabels } from '@/lib/storage-unit-label'

// ── Types ─────────────────────────────────────────────────────────────────────

type TypeContenant = 'Carton' | 'Palette' | 'Sac' | 'Caisse' | 'Bidon' | 'Vrac'

const TYPES_CONTENANTS: TypeContenant[] = ['Carton', 'Palette', 'Sac', 'Caisse', 'Bidon', 'Vrac']

interface Props {
  open:     boolean
  row:      ReceptionFlat | null
  onClose:  () => void
  orgName?: string
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function LabelPrintModal({ open, row, onClose, orgName }: Props) {
  const [type,             setType]             = useState<TypeContenant>('Carton')
  const [qtyParContenant,  setQtyParContenant]  = useState('')
  const [nbContenants,     setNbContenants]     = useState(1)

  // Pré-remplir qté par contenant quand la ligne change
  useEffect(() => {
    if (!row) return
    setType('Carton')
    setNbContenants(1)
    setQtyParContenant(String(row.quantite))
  }, [row])

  // Auto-ajuster la qté/contenant quand nbContenants change
  useEffect(() => {
    if (!row || nbContenants < 1) return
    const auto = Math.ceil(row.quantite / nbContenants)
    setQtyParContenant(String(auto))
  }, [nbContenants, row])

  function handleGenerate() {
    if (!row) return
    const qty = parseFloat(qtyParContenant)
    if (!qty || qty <= 0) return
    printStorageLabels(
      {
        lotNumber:   row.lot ?? row.numero,
        articleName: row.article,
        articleSku:  row.article.substring(0, 12).toUpperCase(),
        quantity:    row.quantite,
        unit:        row.unite,
        expiryDate:  row.dlc ?? '',
        sourceType:  'RECEPTION',
        sourceRef:   row.numero,
        sourceDate:  row.date,
        supplier:    row.fournisseur,
        orgName:     orgName,
      },
      nbContenants,
      qty,
    )
  }

  if (!row) return null

  const qtyNum = parseFloat(qtyParContenant) || 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(460px,96vw)] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b shrink-0">
              <div>
                <p className="font-semibold">Imprimer étiquettes par contenant</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  1 étiquette est générée par contenant, avec la quantité indiquée dessus.
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Aperçu article */}
            <div className="mx-5 mt-4 px-3 py-2.5 rounded-lg bg-muted/50 border text-sm">
              <p className="font-semibold truncate">{row.article}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lot <span className="font-mono">{row.lot ?? '—'}</span>
                {' · '}{row.quantite} {row.unite} total
                {row.dlc && <> · DLC <span className="text-red-600 font-semibold">{row.dlc}</span></>}
              </p>
            </div>

            {/* Formulaire */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Type de contenant
                </Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TypeContenant)}
                  className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {TYPES_CONTENANTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Qté / Contenant
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      value={qtyParContenant}
                      onChange={(e) => setQtyParContenant(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {row.unite}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Nb contenants
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNbContenants((n) => Math.max(1, n - 1))}
                      className="w-9 h-10 rounded-md border flex items-center justify-center text-lg hover:bg-muted transition-colors"
                    >−</button>
                    <input
                      type="number"
                      min="1"
                      value={nbContenants}
                      onChange={(e) => setNbContenants(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 h-10 text-center text-sm font-semibold rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => setNbContenants((n) => n + 1)}
                      className="w-9 h-10 rounded-md border flex items-center justify-center text-lg hover:bg-muted transition-colors"
                    >+</button>
                  </div>
                </div>
              </div>

              {/* Récapitulatif */}
              {qtyNum > 0 && nbContenants > 0 && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  → <strong className="text-foreground">{nbContenants}</strong> étiquette{nbContenants > 1 ? 's' : ''}
                  {' '}de <strong className="text-foreground">{qtyNum} {row.unite}</strong> / {type.toLowerCase()}
                  {' '}= <strong className="text-foreground">{(qtyNum * nbContenants).toLocaleString('fr-FR')} {row.unite}</strong> total
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end p-4 border-t shrink-0">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button
                onClick={handleGenerate}
                disabled={!qtyNum || nbContenants < 1}
                className="gap-2"
              >
                <Printer className="size-4" />
                Générer
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
