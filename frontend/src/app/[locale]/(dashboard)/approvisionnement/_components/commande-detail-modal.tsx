'use client'

import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import {
  X, Building2, Leaf, FileDown, CheckCheck, Clock,
  FileText, Lock, Link2,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import {
  BCHeader, BCItem,
  STATUT_COMMANDE_COLORS, STATUT_COMMANDE_LABELS,
} from './types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  header:  BCHeader | null
  items:   BCItem[]
}

// ── Sous-composant : champ de métadonnée ──────────────────────────────────────

function MetaField({
  label, value, mono = false,
}: {
  label:   string
  value:   React.ReactNode
  mono?:   boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
        {label}
      </p>
      <div className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function CommandeDetailModal({ open, onClose, header, items }: Props) {
  const locale = useLocale()

  if (!header) return null

  const isBC    = header.type === 'BC'
  const totalHT = items.reduce((sum, i) => sum + i.quantite * i.puHT, 0)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(880px,96vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* ── Header modal ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {isBC
                    ? <Building2 className="size-[18px] text-foreground" />
                    : <Leaf      className="size-[18px] text-emerald-600" />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="font-semibold text-base font-mono tracking-tight">
                      {header.numero}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUT_COMMANDE_COLORS[header.statut]}`}>
                      {header.statut === 'CLOSED'
                        ? <CheckCheck className="size-3 shrink-0" />
                        : <Clock      className="size-3 shrink-0" />}
                      {STATUT_COMMANDE_LABELS[header.statut]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{header.fournisseur}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* ① Métadonnées en-tête */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 rounded-lg bg-muted/30 border px-5 py-4">
                <MetaField
                  label="Type"
                  value={
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${isBC ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {isBC
                        ? <FileText className="size-3 shrink-0" />
                        : <Leaf     className="size-3 shrink-0" />}
                      {header.type === 'BC' ? 'Bon de Commande' : "Bon d'Achat"}
                    </span>
                  }
                />
                <MetaField label="Date"    value={header.date}     mono />
                <MetaField label="Devise"  value={header.currency} />
                <MetaField
                  label="Contrat cadre"
                  value={
                    header.contrat
                      ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <Lock className="size-3 shrink-0" />
                          {header.contrat}
                        </span>
                      )
                      : <span className="text-muted-foreground">—</span>
                  }
                  mono
                />
                {header.reception && (
                  <MetaField label="N° Réception" value={header.reception} mono />
                )}
              </div>

              {/* ② Table des lignes articles */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Lignes articles · {items.length} ligne{items.length > 1 ? 's' : ''}
                </p>

                <div className="rounded-lg border overflow-hidden">
                  {/* En-têtes */}
                  <div
                    className="grid bg-muted/50 border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    style={{ gridTemplateColumns: '32px 1fr 80px 50px 110px 120px 120px 68px' }}
                  >
                    <span>Pos.</span>
                    <span>Article</span>
                    <span className="text-right">Quantité</span>
                    <span className="pl-1">Unité</span>
                    <span className="text-right">PU HT</span>
                    <span className="text-right">Montant HT</span>
                    <span className="pl-2">Livraison</span>
                    <span className="text-right">Durée vie</span>
                  </div>

                  {/* Lignes */}
                  <div className="divide-y">
                    {items.map((item) => {
                      const montant = item.quantite * item.puHT
                      return (
                        <div
                          key={item.id}
                          className="grid items-center gap-1.5 px-3 py-2.5 text-sm hover:bg-muted/20"
                          style={{ gridTemplateColumns: '32px 1fr 80px 50px 110px 120px 120px 68px' }}
                        >
                          <span className="text-muted-foreground text-xs font-mono">
                            {item.itemPosition}
                          </span>

                          <div className="min-w-0">
                            <span className="truncate block font-medium text-sm" title={item.article}>
                              {item.article}
                            </span>
                            {/* Badge DA si la ligne vient du MRP */}
                            {item.purchaseRequisitionId && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-600 font-medium mt-0.5">
                                <Link2 className="size-2.5 shrink-0" />
                                DA · MRP
                              </span>
                            )}
                          </div>

                          <span className="text-right font-mono text-sm">
                            {formatNumber(item.quantite, locale)}
                          </span>

                          <span className="pl-1 text-muted-foreground text-xs">
                            {item.unite}
                          </span>

                          <span className="text-right font-mono text-sm">
                            {formatNumber(item.puHT, locale)}
                          </span>

                          <span className="text-right font-mono text-sm font-medium">
                            {formatNumber(montant, locale)}
                          </span>

                          <span className="pl-2 font-mono text-xs text-muted-foreground">
                            {item.livraisonPrevue}
                          </span>

                          <span className="text-right text-xs text-muted-foreground">
                            {item.dureeVie != null ? `${item.dureeVie} j` : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Ligne total */}
                  <div
                    className="grid items-center px-3 py-2.5 border-t bg-muted/30"
                    style={{ gridTemplateColumns: '32px 1fr 80px 50px 110px 120px 120px 68px' }}
                  >
                    <span />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Total HT
                    </span>
                    <span />
                    <span />
                    <span />
                    <span className="text-right font-mono font-bold text-sm">
                      {formatNumber(totalHT, locale)}
                    </span>
                    <span className="pl-2 text-xs text-muted-foreground font-medium">
                      {header.currency}
                    </span>
                    <span />
                  </div>
                </div>
              </div>

            </div>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-2 p-4 border-t shrink-0">
              <span className="text-xs text-muted-foreground">
                {items.length} ligne{items.length > 1 ? 's' : ''} · Total{' '}
                <span className="font-mono font-semibold text-foreground">
                  {formatNumber(totalHT, locale)} {header.currency}
                </span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  title={`Télécharger le ${header.type}`}
                >
                  <FileDown className="size-3.5" />
                  {header.type}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
              </div>
            </div>

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
