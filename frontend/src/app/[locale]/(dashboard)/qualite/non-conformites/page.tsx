'use client'

import { useState, useMemo } from 'react'
import {
  AlertTriangle, Trash2, TruckIcon, ShieldAlert,
  FileDown, X, Check, Loader2, Search, Banknote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  QualityNonConformite,
  DEFECT_TYPE_LABELS,
  DISPOSITION_ACTION_LABELS, DISPOSITION_ACTION_COLORS,
  STATUT_QC_NC_LABELS, STATUT_QC_NC_COLORS,
  FLUX_LOT_LABELS, TYPE_ARTICLE_COLORS,
  StatutQualiteNC, DispositionAction,
} from '../_components/types'
import { HelpPopover } from '@/components/ui/help-popover'

// ── PDF Generation ─────────────────────────────────────────────────────────────

function downloadRapportNC(nc: QualityNonConformite) {
  const lines = [
    '══════════════════════════════════════════════════════',
    '  RAPPORT D\'INCIDENT NON-CONFORMITE — BLUWA ERP',
    `  Généré le : ${new Date().toLocaleDateString('fr-FR')}`,
    '══════════════════════════════════════════════════════',
    '',
    `N° NC                : ${nc.ncNumber}`,
    `Date de détection    : ${nc.createdAt.split('T')[0]}`,
    `Lot concerné         : ${nc.batchNumber}`,
    `Article              : ${nc.articleDesignation} (${nc.articleType})`,
    `Flux                 : ${nc.flux === 'Reception' ? 'Réception fournisseur' : 'Production interne'}`,
    `Origine              : ${nc.origine}`,
    `Responsable QA       : ${nc.reportedBy}`,
    '',
    'TYPE DE DEFAUT :',
    `  ${DEFECT_TYPE_LABELS[nc.defectType]}`,
    '',
    'DESCRIPTION :',
    `  ${nc.description}`,
    '',
    `Statut actuel        : ${STATUT_QC_NC_LABELS[nc.status]}`,
    `Action de disposition: ${DISPOSITION_ACTION_LABELS[nc.dispositionAction]}`,
    nc.financialClaimXof
      ? `Montant réclamé      : ${nc.financialClaimXof.toLocaleString('fr-FR')} FCFA`
      : '',
    nc.resolutionNotes
      ? `\nNotes de résolution  : ${nc.resolutionNotes}`
      : '',
    '',
    '──────────────────────────────────────────────────────',
    '  Document généré automatiquement par Bluwa ERP',
    '  Confidentialité : Usage interne uniquement',
  ].filter(l => l !== undefined)
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rapport-nc-${nc.ncNumber}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Disposition options (final decisions only — excludes UNDER_REVIEW) ─────────

const DISPOSITION_OPTIONS: Array<{
  value: DispositionAction
  icon: React.ElementType
  label: string
  description: string
  colorClass: string
  iconClass: string
}> = [
  {
    value: 'DESTROYED',
    icon: Trash2,
    label: 'Rebut / Destruction',
    description: 'Destruction définitive du lot non-conforme. Le stock est annulé.',
    colorClass: 'border-red-200 bg-red-50 hover:border-red-400',
    iconClass: 'text-red-600 bg-red-100',
  },
  {
    value: 'RETURN_TO_SUPPLIER',
    icon: TruckIcon,
    label: 'Retour fournisseur',
    description: 'Renvoi du lot au fournisseur avec réclamation. Applicable pour les réceptions.',
    colorClass: 'border-amber-200 bg-amber-50 hover:border-amber-400',
    iconClass: 'text-amber-600 bg-amber-100',
  },
  {
    value: 'ACCEPTED_WITH_DISCOUNT',
    icon: ShieldAlert,
    label: 'Dérogation',
    description: 'Utilisation autorisée sous conditions, validée par la direction qualité.',
    colorClass: 'border-blue-200 bg-blue-50 hover:border-blue-400',
    iconClass: 'text-blue-600 bg-blue-100',
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, bgClass, iconBg, iconColor }: {
  label: string
  value: string | number
  icon: React.ElementType
  bgClass: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className={`rounded-xl p-4 flex items-start gap-3 ${bgClass}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NonConformitesPage() {
  const [ncs, setNcs] = useState<QualityNonConformite[]>([])
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutQualiteNC | 'Tous'>('Tous')
  const [modalNcId, setModalNcId] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<DispositionAction | null>(null)
  const [financialClaim, setFinancialClaim] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const stats = useMemo(() => ({
    total:   ncs.length,
    ouvert:  ncs.filter(n => n.status === 'OPEN').length,
    enCours: ncs.filter(n => n.status === 'IN_PROGRESS').length,
    tauxResolution: ncs.length > 0
      ? Math.round((ncs.filter(n => n.status === 'CLOSED').length / ncs.length) * 100)
      : 0,
  }), [ncs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ncs.filter(n => {
      if (statutFilter !== 'Tous' && n.status !== statutFilter) return false
      if (q) return (
        n.ncNumber.toLowerCase().includes(q) ||
        n.batchNumber.toLowerCase().includes(q) ||
        n.articleDesignation.toLowerCase().includes(q)
      )
      return true
    })
  }, [ncs, statutFilter, search])

  const modalNc = ncs.find(n => n.id === modalNcId) ?? null

  function openActionModal(id: string) {
    setModalNcId(id)
    setSelectedAction(null)
    setFinancialClaim('')
    setResolutionNotes('')
  }

  async function handleConfirm() {
    if (!modalNc || !selectedAction) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setNcs(prev => prev.map(n =>
      n.id === modalNc.id
        ? {
            ...n,
            status: 'CLOSED',
            dispositionAction: selectedAction,
            financialClaimXof: financialClaim ? parseFloat(financialClaim) : n.financialClaimXof,
            resolutionNotes: resolutionNotes || null,
            resolvedBy: 'Utilisateur courant',
            resolvedAt: new Date().toISOString(),
          }
        : n,
    ))
    setSaving(false)
    setModalNcId(null)
  }

  const STATUT_OPTIONS: Array<StatutQualiteNC | 'Tous'> = ['Tous', 'OPEN', 'IN_PROGRESS', 'CLOSED']

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="size-5 text-red-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Registre des Non-Conformités</h1>
            <HelpPopover section="nonConformites" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Suivi des incidents qualité et actions de disposition
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total NC"
          value={stats.total}
          icon={AlertTriangle}
          bgClass="bg-slate-50"
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          label="Ouvertes"
          value={stats.ouvert}
          icon={AlertTriangle}
          bgClass="bg-red-50"
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          label="En cours"
          value={stats.enCours}
          icon={TruckIcon}
          bgClass="bg-amber-50"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Taux résolution"
          value={`${stats.tauxResolution}%`}
          icon={Check}
          bgClass="bg-emerald-50"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="N° NC, lot, article…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          />
        </div>
        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5">
          {STATUT_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatutFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statutFilter === s
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'Tous' ? 'Tous' : STATUT_QC_NC_LABELS[s]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} NC
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold tracking-wide w-[140px]">N° NC</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide w-[170px]">N° lot</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide w-[80px]">Type</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide w-[150px]">Article</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide">Défaut / Description</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide w-[100px]">Date</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide w-[110px]">Statut</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide w-[140px]">Disposition</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide w-[110px] text-right">Rapport</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Aucune non-conformité ne correspond aux filtres.
                </TableCell>
              </TableRow>
            ) : filtered.map(nc => (
              <TableRow key={nc.id} className="hover:bg-muted/20">
                <TableCell className="font-mono text-xs font-semibold">{nc.ncNumber}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[160px]" title={nc.batchNumber}>
                  {nc.batchNumber}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${TYPE_ARTICLE_COLORS[nc.articleType]}`}>
                    {nc.articleType}
                  </span>
                </TableCell>
                <TableCell className="text-sm truncate max-w-[140px]" title={nc.articleDesignation}>
                  {nc.articleDesignation}
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <p className="text-xs font-medium text-foreground">{DEFECT_TYPE_LABELS[nc.defectType]}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5" title={nc.description}>{nc.description}</p>
                </TableCell>
                <TableCell className="text-sm">{nc.createdAt.split('T')[0]}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_QC_NC_COLORS[nc.status]}`}>
                    {STATUT_QC_NC_LABELS[nc.status]}
                  </span>
                </TableCell>
                <TableCell>
                  {nc.dispositionAction !== 'UNDER_REVIEW' ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${DISPOSITION_ACTION_COLORS[nc.dispositionAction]}`}>
                      {DISPOSITION_ACTION_LABELS[nc.dispositionAction]}
                    </span>
                  ) : nc.status !== 'CLOSED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openActionModal(nc.id)}
                      className="h-6 px-2 text-xs"
                    >
                      Traiter
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadRapportNC(nc)}
                    className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    title="Télécharger le rapport d'incident"
                  >
                    <FileDown className="size-3.5" />
                    Rapport
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Disposition modal */}
      <Dialog open={!!modalNcId} onOpenChange={v => !v && !saving && setModalNcId(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="w-[min(520px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="size-[18px] text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Action de disposition</p>
                    {modalNc && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {modalNc.ncNumber} · {modalNc.articleDesignation}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setModalNcId(null)} disabled={saving}>
                  <X className="size-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                {modalNc && (
                  <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs space-y-1 mb-4">
                    <p><span className="font-semibold">Lot : </span>{modalNc.batchNumber}</p>
                    <p><span className="font-semibold">Défaut : </span>{DEFECT_TYPE_LABELS[modalNc.defectType]}</p>
                    <p className="text-muted-foreground">{modalNc.description}</p>
                    <p><span className="font-semibold">Responsable : </span>{modalNc.reportedBy}</p>
                  </div>
                )}

                <p className="text-sm font-semibold">Choisir la disposition :</p>

                {DISPOSITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedAction(opt.value)}
                    className={`w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                      selectedAction === opt.value
                        ? opt.colorClass.replace('hover:', '')
                        : 'border-input bg-background hover:border-muted-foreground/30'
                    } ${opt.colorClass}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${opt.iconClass}`}>
                      <opt.icon className="size-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                    {selectedAction === opt.value && (
                      <Check className="size-4 ml-auto shrink-0 mt-1 text-foreground" />
                    )}
                  </button>
                ))}

                {/* Réclamation financière */}
                {(selectedAction === 'RETURN_TO_SUPPLIER' || selectedAction === 'DESTROYED') && (
                  <div className="space-y-1.5 mt-1">
                    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
                      <Banknote className="size-3.5" />
                      Montant réclamé (FCFA)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={financialClaim}
                      onChange={e => setFinancialClaim(e.target.value)}
                      placeholder="ex : 120 000"
                    />
                  </div>
                )}

                {/* Notes de résolution */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Notes de résolution
                  </Label>
                  <textarea
                    value={resolutionNotes}
                    onChange={e => setResolutionNotes(e.target.value)}
                    placeholder="Détails de la décision, actions menées..."
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
                <Button variant="outline" onClick={() => setModalNcId(null)} disabled={saving}>
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedAction || saving}
                >
                  {saving
                    ? <><Loader2 className="size-4 animate-spin mr-1.5" />Enregistrement…</>
                    : 'Confirmer la disposition'
                  }
                </Button>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
