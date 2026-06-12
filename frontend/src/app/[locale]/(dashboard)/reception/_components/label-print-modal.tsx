'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Printer } from 'lucide-react'
import type { ReceptionFlat } from './types'
import { printStorageLabels, LABEL_FORMATS, DEFAULT_FORMAT, type LabelFormat } from '@/lib/storage-unit-label'

// ── Types ─────────────────────────────────────────────────────────────────────

type TypeContenant = 'Carton' | 'Palette' | 'Sac' | 'Caisse' | 'Bidon' | 'Vrac'

const TYPES_CONTENANTS: TypeContenant[] = ['Carton', 'Palette', 'Sac', 'Caisse', 'Bidon', 'Vrac']

interface Props {
  open:     boolean
  row:      ReceptionFlat | null
  onClose:  () => void
  orgName?: string
}

// ── Format card ───────────────────────────────────────────────────────────────

function FormatCard({ fmt, selected, onSelect }: { fmt: LabelFormat; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={[
        'flex flex-col items-center gap-1.5 rounded-lg border p-1.5 text-left transition-all duration-150',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-background hover:border-muted-foreground/40 hover:bg-muted/30',
      ].join(' ')}
    >
      {/* Aperçu A4 */}
      <div
        className={[
          'w-full rounded-[2px] border p-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
          selected ? 'border-primary/50 bg-white' : 'border-border bg-white',
        ].join(' ')}
        style={{ aspectRatio: '210/297' }}
      >
        <div
          className="h-full w-full"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${fmt.cols}, 1fr)`,
            gridAutoRows: '1fr',
            gap: '1px',
          }}
        >
          {Array.from({ length: fmt.rows * fmt.cols }).map((_, i) => (
            <div
              key={i}
              className={[
                'rounded-[1px] border',
                selected ? 'border-primary/25 bg-primary/8' : 'border-border/60 bg-muted/30',
              ].join(' ')}
              style={{ backgroundColor: selected ? 'rgba(10,76,225,0.07)' : undefined }}
            />
          ))}
        </div>
      </div>

      {/* Infos */}
      <span className={['text-[11px] font-bold leading-none', selected ? 'text-primary' : 'text-foreground'].join(' ')}>
        {fmt.code}
      </span>
      <span className={['text-center text-[8.5px] leading-tight', selected ? 'text-primary/80' : 'text-muted-foreground'].join(' ')}>
        {fmt.dims}
      </span>
      <span className={['text-[9px] font-semibold', selected ? 'text-primary' : 'text-muted-foreground'].join(' ')}>
        {fmt.perSheet}/feuille
      </span>
    </button>
  )
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function LabelPrintModal({ open, row, onClose, orgName }: Props) {
  const [type,             setType]             = useState<TypeContenant>('Carton')
  const [qtyParContenant,  setQtyParContenant]  = useState('')
  const [nbContenants,     setNbContenants]     = useState(1)
  const [format,           setFormat]           = useState<LabelFormat>(DEFAULT_FORMAT)

  // Pré-remplir qté par contenant quand la ligne change
  useEffect(() => {
    if (!row) return
    setType('Carton')
    setNbContenants(1)
    setQtyParContenant(String(row.quantite))
    setFormat(DEFAULT_FORMAT)
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
      format,
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
          <div className="flex max-h-[90vh] w-[min(500px,96vw)] flex-col rounded-xl border bg-card shadow-lg">

            {/* Header */}
            <div className="flex items-start justify-between border-b p-5 shrink-0">
              <div>
                <p className="font-semibold">Imprimer étiquettes par contenant</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  1 étiquette est générée par contenant, avec la quantité indiquée dessus.
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* Aperçu article */}
              <div className="mx-5 mt-4 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm">
                <p className="truncate font-semibold">{row.article}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Lot <span className="font-mono">{row.lot ?? '—'}</span>
                  {' · '}{row.quantite} {row.unite} total
                  {row.dlc && <> · DLC <span className="font-semibold text-red-600">{row.dlc}</span></>}
                </p>
              </div>

              {/* Format d'étiquette */}
              <div className="px-5 pt-4 pb-2 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Format de planche
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {LABEL_FORMATS.map((fmt) => (
                    <FormatCard
                      key={fmt.code}
                      fmt={fmt}
                      selected={format.code === fmt.code}
                      onSelect={() => setFormat(fmt)}
                    />
                  ))}
                </div>
              </div>

              {/* Formulaire */}
              <div className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Type de contenant
                  </Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TypeContenant)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {TYPES_CONTENANTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {row.unite}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Nb contenants
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setNbContenants((n) => Math.max(1, n - 1))}
                        className="flex h-10 w-9 items-center justify-center rounded-md border text-lg transition-colors hover:bg-muted"
                      >−</button>
                      <input
                        type="number"
                        min="1"
                        value={nbContenants}
                        onChange={(e) => setNbContenants(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-10 flex-1 rounded-md border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        onClick={() => setNbContenants((n) => n + 1)}
                        className="flex h-10 w-9 items-center justify-center rounded-md border text-lg transition-colors hover:bg-muted"
                      >+</button>
                    </div>
                  </div>
                </div>

                {/* Récapitulatif */}
                {qtyNum > 0 && nbContenants > 0 && (
                  <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    → <strong className="text-foreground">{nbContenants}</strong> étiquette{nbContenants > 1 ? 's' : ''}
                    {' '}de <strong className="text-foreground">{qtyNum} {row.unite}</strong> / {type.toLowerCase()}
                    {' '}= <strong className="text-foreground">{(qtyNum * nbContenants).toLocaleString('fr-FR')} {row.unite}</strong> total
                    {' · '}format <strong className="text-foreground">{format.code}</strong> ({format.perSheet}/feuille)
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button
                onClick={handleGenerate}
                disabled={!qtyNum || nbContenants < 1}
                className="gap-2"
              >
                <Printer className="size-4" />
                Générer · {format.code}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
