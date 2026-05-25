'use client'

import { useState, useMemo } from 'react'
import {
  FlaskConical, CheckCircle2, XCircle, Clock, ShieldCheck,
  Search, X, Loader2, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import { DragDrop } from './_components/drag-drop'
import {
  LotControle, NonConformite,
  MOCK_LOTS_CONTROLE, MOCK_NON_CONFORMITES,
  STATUT_LOT_LABELS, STATUT_LOT_COLORS,
  FLUX_LOT_LABELS, TYPE_ARTICLE_COLORS,
  StatutLot, FluxLot,
} from './_components/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const ANALYSTES = ['Fatou Diallo', 'Moussa Koné', 'Aminata Sow', 'Ousmane Ba', 'Ibrahim Diop']

const EMPTY_ANALYSE = {
  pH: '', brix: '', temperature: '', analyste: ANALYSTES[0], commentaire: '',
}

const LOT_COLUMNS: ResizableColumn[] = [
  { id: 'codeLot',  defaultWidth: 155, minWidth: 120 },
  { id: 'flux',     defaultWidth: 110, minWidth: 90  },
  { id: 'type',     defaultWidth: 72,  minWidth: 55  },
  { id: 'article',  defaultWidth: 200, minWidth: 150 },
  { id: 'origine',  defaultWidth: 150, minWidth: 110 },
  { id: 'date',     defaultWidth: 105, minWidth: 85  },
  { id: 'quantite', defaultWidth: 90,  minWidth: 70  },
  { id: 'statut',   defaultWidth: 130, minWidth: 110 },
  { id: 'action',   defaultWidth: 95,  minWidth: 75  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CentreLiberationPage() {
  const [lots, setLots] = useState<LotControle[]>(MOCK_LOTS_CONTROLE)
  const [ncCount, setNcCount] = useState(MOCK_NON_CONFORMITES.length)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutLot | 'Tous'>('Tous')
  const [fluxFilter, setFluxFilter] = useState<FluxLot | 'Tous'>('Tous')
  const [modalLotId, setModalLotId] = useState<string | null>(null)
  const [analyse, setAnalyse] = useState(EMPTY_ANALYSE)
  const [caFile, setCaFile] = useState<File | null>(null)
  const [savingDecision, setSavingDecision] = useState<'Libere' | 'NonConforme' | null>(null)

  const { widths, startResize } = useResizableColumns('bluwa:cols:qualite-lots', LOT_COLUMNS)
  const tableMinWidth = LOT_COLUMNS.reduce(
    (sum, c) => sum + (widths[c.id] ?? c.defaultWidth ?? 0),
    0,
  )

  const stats = useMemo(() => {
    const enControle  = lots.filter(l => l.statut === 'EnControle').length
    const liberes     = lots.filter(l => l.statut === 'Libere').length
    const nonConformes = lots.filter(l => l.statut === 'NonConforme').length
    const decided = liberes + nonConformes
    return { enControle, liberes, nonConformes, taux: decided > 0 ? Math.round((liberes / decided) * 100) : 100 }
  }, [lots])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return lots.filter(l => {
      if (statutFilter !== 'Tous' && l.statut !== statutFilter) return false
      if (fluxFilter !== 'Tous' && l.flux !== fluxFilter) return false
      if (q) return (
        l.codeLot.toLowerCase().includes(q) ||
        l.article.toLowerCase().includes(q) ||
        l.origine.toLowerCase().includes(q)
      )
      return true
    })
  }, [lots, statutFilter, fluxFilter, search])

  const modalLot = lots.find(l => l.id === modalLotId) ?? null

  function openAnalyse(id: string) {
    setModalLotId(id)
    setAnalyse(EMPTY_ANALYSE)
    setCaFile(null)
  }

  const isAnalyseValid = !!analyse.pH.trim() && !!analyse.analyste

  async function handleDecision(decision: 'Libere' | 'NonConforme') {
    if (!modalLot) return
    setSavingDecision(decision)
    await new Promise(r => setTimeout(r, 700))
    setLots(prev => prev.map(l => l.id === modalLot.id ? { ...l, statut: decision } : l))
    if (decision === 'NonConforme') setNcCount(prev => prev + 1)
    setSavingDecision(null)
    setModalLotId(null)
  }

  const STATUT_FILTER_OPTIONS: Array<StatutLot | 'Tous'> = ['Tous', 'EnControle', 'Libere', 'NonConforme']
  const FLUX_FILTER_OPTIONS: Array<FluxLot | 'Tous'> = ['Tous', 'Reception', 'Production']

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <FlaskConical className="size-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Centre de Libération</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Validation et libération des lots en quarantaine
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="En contrôle"
          value={stats.enControle}
          icon={Clock}
          bgClass="bg-amber-50"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Libérés"
          value={stats.liberes}
          icon={CheckCircle2}
          bgClass="bg-emerald-50"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Non-conformes"
          value={stats.nonConformes}
          icon={XCircle}
          bgClass="bg-red-50"
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          label="Taux conformité"
          value={`${stats.taux}%`}
          icon={ShieldCheck}
          bgClass="bg-blue-50"
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Code lot, article, origine…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Statut tabs */}
        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5">
          {STATUT_FILTER_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatutFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statutFilter === s
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'Tous' ? 'Tous' : STATUT_LOT_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Flux tabs */}
        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5">
          {FLUX_FILTER_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => setFluxFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                fluxFilter === f
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'Tous' ? 'Tous flux' : FLUX_LOT_LABELS[f]}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} lot{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
          <colgroup>
            {LOT_COLUMNS.map(c => <col key={c.id} style={{ width: widths[c.id] }} />)}
          </colgroup>
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">
                Code lot
                <ColumnResizer columnId="codeLot" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">
                Flux
                <ColumnResizer columnId="flux" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">
                Type
                <ColumnResizer columnId="type" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">
                Article
                <ColumnResizer columnId="article" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">
                Origine
                <ColumnResizer columnId="origine" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">
                Date entrée
                <ColumnResizer columnId="date" onStart={startResize} />
              </th>
              <th className="relative text-right px-4 py-3 text-xs font-semibold tracking-wide">
                Quantité
                <ColumnResizer columnId="quantite" onStart={startResize} />
              </th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">
                Statut
                <ColumnResizer columnId="statut" onStart={startResize} />
              </th>
              <th className="relative text-right px-4 py-3 text-xs font-semibold tracking-wide">
                Action
                <ColumnResizer columnId="action" onStart={startResize} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucun lot ne correspond aux filtres.
                </td>
              </tr>
            ) : filtered.map(lot => (
              <tr key={lot.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs font-semibold truncate">
                  {lot.codeLot}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    lot.flux === 'Reception'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-violet-100 text-violet-700'
                  }`}>
                    {FLUX_LOT_LABELS[lot.flux]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${TYPE_ARTICLE_COLORS[lot.typeArticle]}`}>
                    {lot.typeArticle}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm truncate">{lot.article}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground truncate">{lot.origine}</td>
                <td className="px-4 py-3 text-sm">{lot.dateEntree}</td>
                <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                  {lot.quantite} {lot.unite}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_LOT_COLORS[lot.statut]}`}>
                    {STATUT_LOT_LABELS[lot.statut]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {lot.statut === 'EnControle' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAnalyse(lot.id)}
                      className="h-7 px-2.5 text-xs gap-1.5"
                    >
                      <FlaskConical className="size-3" />
                      Analyser
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Analyse modal */}
      <Dialog open={!!modalLotId} onOpenChange={v => !v && !savingDecision && setModalLotId(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="w-[min(560px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <FlaskConical className="size-[18px] text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Analyse de lot</p>
                    {modalLot && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {modalLot.codeLot} · {modalLot.article}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setModalLotId(null)}
                  disabled={!!savingDecision}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">

                {/* pH · Brix · Température */}
                <div className="grid grid-cols-3 gap-x-4">
                  <Field label="pH" required>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="14"
                      value={analyse.pH}
                      onChange={e => setAnalyse(p => ({ ...p, pH: e.target.value }))}
                      placeholder="ex : 3.5"
                    />
                  </Field>
                  <Field label="Brix (°Bx)">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={analyse.brix}
                      onChange={e => setAnalyse(p => ({ ...p, brix: e.target.value }))}
                      placeholder="ex : 14.2"
                    />
                  </Field>
                  <Field label="Température (°C)">
                    <Input
                      type="number"
                      step="0.1"
                      value={analyse.temperature}
                      onChange={e => setAnalyse(p => ({ ...p, temperature: e.target.value }))}
                      placeholder="ex : 4.0"
                    />
                  </Field>
                </div>

                {/* Analyste */}
                <Field label="Analyste" required>
                  <select
                    value={analyse.analyste}
                    onChange={e => setAnalyse(p => ({ ...p, analyste: e.target.value }))}
                    className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {ANALYSTES.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </Field>

                {/* Certificat d'Analyse */}
                <Field label="Certificat d'Analyse (CA)">
                  <DragDrop
                    label="Glisser le certificat d'analyse PDF ici"
                    file={caFile}
                    onFile={setCaFile}
                  />
                </Field>

                {/* Commentaire */}
                <Field label="Commentaire / Observations">
                  <textarea
                    value={analyse.commentaire}
                    onChange={e => setAnalyse(p => ({ ...p, commentaire: e.target.value }))}
                    placeholder="Résultats, remarques, observations..."
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </Field>

                {/* Info */}
                <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                  <Shield className="size-4 shrink-0 mt-0.5" />
                  <span>
                    La <strong className="text-foreground">libération</strong> déverrouille le lot pour le MRP et les ordres de fabrication.
                    La <strong className="text-foreground">non-conformité</strong> crée automatiquement une fiche NC dans le registre.
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 p-4 border-t shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setModalLotId(null)}
                  disabled={!!savingDecision}
                >
                  Annuler
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={() => handleDecision('NonConforme')}
                  disabled={!isAnalyseValid || !!savingDecision}
                  variant="destructive"
                  className="gap-1.5"
                >
                  {savingDecision === 'NonConforme'
                    ? <><Loader2 className="size-4 animate-spin" />Traitement…</>
                    : <><XCircle className="size-4" />Non-conforme</>
                  }
                </Button>
                <Button
                  onClick={() => handleDecision('Libere')}
                  disabled={!isAnalyseValid || !!savingDecision}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {savingDecision === 'Libere'
                    ? <><Loader2 className="size-4 animate-spin" />Libération…</>
                    : <><CheckCircle2 className="size-4" />Libérer le lot</>
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
