'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Printer } from 'lucide-react'
import type { ReceptionFlat } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

type TypeContenant = 'Carton' | 'Palette' | 'Sac' | 'Caisse' | 'Bidon' | 'Vrac'

const TYPES_CONTENANTS: TypeContenant[] = ['Carton', 'Palette', 'Sac', 'Caisse', 'Bidon', 'Vrac']

interface Props {
  open:    boolean
  row:     ReceptionFlat | null
  onClose: () => void
}

// ── Génération HTML d'impression ──────────────────────────────────────────────

function buildPrintHtml(
  row:             ReceptionFlat,
  type:            TypeContenant,
  qtyParContenant: number,
  nbContenants:    number,
): string {
  const labels = Array.from({ length: nbContenants }, (_, i) => i + 1)

  const labelHtml = labels.map((num) => `
    <div class="label">
      <div class="label-top">
        <span class="article-code">${row.lot ?? row.article.substring(0, 10).toUpperCase()}</span>
        <span class="container-num">${type} ${num}/${nbContenants}</span>
      </div>
      <div class="article-name">${row.article}</div>
      <table class="info-table">
        <tr>
          <td class="info-key">Lot</td>
          <td class="info-val">${row.lot ?? '—'}</td>
        </tr>
        <tr>
          <td class="info-key">Fab/Récept.</td>
          <td class="info-val">${row.date}</td>
        </tr>
        <tr>
          <td class="info-key">DLC/DLUO</td>
          <td class="info-val highlight">${row.dlc ?? '—'}</td>
        </tr>
        <tr>
          <td class="info-key">Qté ${type}</td>
          <td class="info-val highlight">${qtyParContenant} ${row.unite}</td>
        </tr>
      </table>
      <div class="label-footer">
        ↳ Réception ${row.numero} · ${row.fournisseur} · Total ${row.quantite} ${row.unite}
      </div>
      <svg class="barcode" data-value="${row.lot ?? row.numero}-${num}"></svg>
    </div>
  `).join('\n')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Étiquettes — ${row.article}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; background: white; }

    .label {
      width: 100mm;
      min-height: 72mm;
      padding: 5mm 6mm;
      border: 1.5px dashed #999;
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 4mm auto;
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }

    @media print {
      body { margin: 0; }
      .label { margin: 0 auto; border: 1.5px dashed #bbb; }
    }

    .label-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .article-code {
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .container-num {
      font-size: 9pt;
      color: #555;
      text-align: right;
    }

    .article-name {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 1mm;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    .info-table td { padding: 1mm 0; vertical-align: top; }
    .info-key {
      width: 28mm;
      color: #444;
    }
    .info-val { font-weight: 500; }
    .highlight { color: #cc0000; font-weight: bold; font-size: 10pt; }

    .label-footer {
      font-size: 7pt;
      color: #666;
      border-top: 0.5px solid #ccc;
      padding-top: 2mm;
      margin-top: auto;
    }

    .barcode {
      display: block;
      width: 100%;
      max-height: 14mm;
    }
  </style>
</head>
<body>
  ${labelHtml}
  <script>
    window.addEventListener('load', function () {
      document.querySelectorAll('.barcode').forEach(function (el) {
        try {
          JsBarcode(el, el.dataset.value, {
            format: 'CODE128',
            displayValue: true,
            fontSize: 9,
            height: 36,
            margin: 2,
            textMargin: 2,
          });
        } catch(e) {}
      });
      setTimeout(function () { window.print(); }, 400);
    });
  <\/script>
</body>
</html>`
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function LabelPrintModal({ open, row, onClose }: Props) {
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
    const html = buildPrintHtml(row, type, qty, nbContenants)
    const win  = window.open('', '_blank', 'width=700,height=800')
    if (!win) return
    win.document.write(html)
    win.document.close()
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
