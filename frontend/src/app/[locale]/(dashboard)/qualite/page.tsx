'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  FlaskConical, CheckCircle2, XCircle, Clock, ShieldCheck,
  Search, X, Check, Loader2, Shield, Microscope, Magnet,
  ThermometerSun, AlertTriangle, ShoppingBag,
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
  QualityInspectionLot, LaboratoryResults, ResultatsMicrobiologiques,
  STATUT_INSPECTION_LABELS, STATUT_INSPECTION_COLORS,
  TYPE_ANALYSE_LABELS, TYPE_ANALYSE_COLORS,
  MICROBIO_COLORS,
  FLUX_LOT_LABELS, TYPE_ARTICLE_COLORS,
  StatutInspectionLot, FluxLot, TypeAnalyse,
} from './_components/types'
import { HelpPopover } from '@/components/ui/help-popover'
import { getQualityInspectionLots, saveQualityDecision } from '@/lib/actions/qualite'

// ── Constants ──────────────────────────────────────────────────────────────────

const ANALYSTES = ['Fatou Diallo', 'Moussa Koné', 'Aminata Sow', 'Ousmane Ba', 'Ibrahim Diop']

const LOT_COLUMNS: ResizableColumn[] = [
  { id: 'codeLot',  defaultWidth: 175, minWidth: 140 },
  { id: 'flux',     defaultWidth: 110, minWidth: 90  },
  { id: 'type',     defaultWidth: 72,  minWidth: 55  },
  { id: 'article',  defaultWidth: 190, minWidth: 140 },
  { id: 'origine',  defaultWidth: 140, minWidth: 100 },
  { id: 'tests',    defaultWidth: 200, minWidth: 160 },
  { id: 'statut',   defaultWidth: 150, minWidth: 120 },
  { id: 'action',   defaultWidth: 95,  minWidth: 75  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_ANALYSE_ICONS: Record<TypeAnalyse, React.ElementType> = {
  PHYSIQUE:         Magnet,
  PHYSICO_CHIMIQUE: ThermometerSun,
  CHIMIQUE:         FlaskConical,
  MICROBIOLOGIQUE:  Microscope,
}

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

function StatCard({ label, value, icon: Icon, bgClass, iconBg, iconColor }: {
  label: string; value: string | number
  icon: React.ElementType; bgClass: string; iconBg: string; iconColor: string
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

export default function CentreLiberationPage() {
  const [lots, setLots]               = useState<QualityInspectionLot[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutInspectionLot | 'Tous'>('Tous')
  const [fluxFilter, setFluxFilter]   = useState<FluxLot | 'Tous'>('Tous')
  const [modalLotId, setModalLotId]   = useState<string | null>(null)
  const [caFile, setCaFile]           = useState<File | null>(null)
  const [savingDecision, setSavingDecision] = useState<'usage_interne' | 'marche' | 'rejeter' | null>(null)
  const [labInputs, setLabInputs]         = useState<Record<string, Record<string, string>>>({})
  const [savingLotId, setSavingLotId]     = useState<string | null>(null)

  // Formulaire d'analyse
  const [physique, setPhysique]       = useState({ corps_etrangers: '', aspect: '' })
  const [physicochem, setPhysicochem] = useState({ ph: '', brix: '', humidite: '', temperature: '' })
  const [microbioForm, setMicrobioForm] = useState({
    salmonella: '', listeria: '', ecoli: '', levures: '', flore_totale: '',
    laboratoire: '', delaiJours: '5',
  })
  const [analyste, setAnalyste]       = useState(ANALYSTES[0])
  const [commentaire, setCommentaire] = useState('')

  const loadLots = useCallback(async () => {
    setLoading(true)
    const data = await getQualityInspectionLots()
    setLots(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadLots() }, [loadLots])

  const { widths, startResize } = useResizableColumns('bluwa:cols:qualite-lots', LOT_COLUMNS)
  const tableMinWidth = LOT_COLUMNS.reduce((s, c) => s + (widths[c.id] ?? c.defaultWidth ?? 0), 0)

  const stats = useMemo(() => {
    const enControle    = lots.filter(l => l.status === 'En contrôle').length
    const usageInterne  = lots.filter(l => l.status === 'Libéré — Usage interne').length
    const marche        = lots.filter(l => l.status === 'Libéré — Marché').length
    const rejetes       = lots.filter(l => l.status === 'Rejeté').length
    const decided = marche + rejetes
    return { enControle, usageInterne, marche, rejetes, taux: decided > 0 ? Math.round((marche / decided) * 100) : 100 }
  }, [lots])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return lots.filter(l => {
      if (statutFilter !== 'Tous' && l.status !== statutFilter) return false
      if (fluxFilter !== 'Tous' && l.flux !== fluxFilter) return false
      if (q) return (
        l.batchNumber.toLowerCase().includes(q) ||
        l.articleDesignation.toLowerCase().includes(q) ||
        l.origine.toLowerCase().includes(q)
      )
      return true
    })
  }, [lots, statutFilter, fluxFilter, search])

  const modalLot = lots.find(l => l.id === modalLotId) ?? null

  function openAnalyse(id: string) {
    setModalLotId(id)
    setPhysique({ corps_etrangers: '', aspect: '' })
    setPhysicochem({ ph: '', brix: '', humidite: '', temperature: '' })
    setMicrobioForm({ salmonella:'', listeria:'', ecoli:'', levures:'', flore_totale:'', laboratoire:'', delaiJours:'5' })
    setAnalyste(ANALYSTES[0])
    setCommentaire('')
    setCaFile(null)
  }

  const hasPhysicochem = Object.values(physicochem).some(v => v.trim())
  const isValid = hasPhysicochem && analyste

  async function handleDecision(decision: 'usage_interne' | 'marche' | 'rejeter') {
    if (!modalLot) return
    setSavingDecision(decision)

    const labResults: LaboratoryResults = {}
    if (physicochem.ph)          labResults.ph            = parseFloat(physicochem.ph)
    if (physicochem.brix)        labResults.brix_degree   = parseFloat(physicochem.brix)
    if (physicochem.humidite)    labResults.humidity_pct  = parseFloat(physicochem.humidite)
    if (physicochem.temperature) labResults.temperature_c = parseFloat(physicochem.temperature)

    const microbioResultats: ResultatsMicrobiologiques | null =
      decision === 'marche' ? {
        salmonella:   microbioForm.salmonella as 'absent' | 'présent' || undefined,
        listeria:     microbioForm.listeria as 'absent' | 'présent' || undefined,
        ecoli:        microbioForm.ecoli ? parseFloat(microbioForm.ecoli) : undefined,
        levures:      microbioForm.levures ? parseFloat(microbioForm.levures) : undefined,
        flore_totale: microbioForm.flore_totale ? parseFloat(microbioForm.flore_totale) : undefined,
        laboratoire:  microbioForm.laboratoire || undefined,
      } : null

    await saveQualityDecision({
      lotId:             modalLot.id,
      decision,
      laboratoryResults: labResults,
      microbioResultats,
      microbioStatus:    decision === 'marche' ? 'CONFORME' : null,
      typesAnalyse:      modalLot.typesAnalyse,
      analyste,
      commentaire,
    })

    setSavingDecision(null)
    setModalLotId(null)
    await loadLots()
  }

  async function handleSaveLabResult(
    lot:          QualityInspectionLot,
    targetStatus: 'Libéré — Marché' | 'Rejeté',
  ) {
    setSavingLotId(lot.id)
    const inputs  = labInputs[lot.id] ?? {}
    const decision: 'marche' | 'rejeter' = targetStatus === 'Libéré — Marché' ? 'marche' : 'rejeter'

    // Construit LaboratoryResults depuis les inputs inline
    const labResults: LaboratoryResults = {}
    for (const [name, val] of Object.entries(inputs)) {
      const num = val !== '' ? parseFloat(val) : NaN
      if (isNaN(num)) continue
      const k = name.toLowerCase()
      if      (k === 'ph' || k === 'acidité')                        labResults.ph            = num
      else if (k.includes('brix') || k.includes('sucre'))           labResults.brix_degree   = num
      else if (k.includes('humid'))                                  labResults.humidity_pct  = num
      else if (k.includes('temp'))                                   labResults.temperature_c = num
    }

    await saveQualityDecision({
      lotId:             lot.id,
      decision,
      laboratoryResults: labResults,
      microbioResultats: null,
      microbioStatus:    decision === 'marche' ? 'CONFORME' : null,
      typesAnalyse:      lot.typesAnalyse,
      analyste:          '',
      commentaire:       '',
    })

    setSavingLotId(null)
    await loadLots()
  }

  const STATUT_FILTER_OPTIONS: Array<StatutInspectionLot | 'Tous'> = [
    'Tous', 'En contrôle', 'Libéré — Usage interne', 'Libéré — Marché', 'Rejeté',
  ]

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <FlaskConical className="size-5 text-blue-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Centre de Libération</h1>
            <HelpPopover section="qualite" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Validation multi-tests · Libération usage interne et mise sur marché
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="En contrôle"      value={stats.enControle}   icon={Clock}       bgClass="bg-amber-50"   iconBg="bg-amber-100"   iconColor="text-amber-600" />
        <StatCard label="Usage interne"    value={stats.usageInterne} icon={Shield}      bgClass="bg-blue-50"    iconBg="bg-blue-100"    iconColor="text-blue-600" />
        <StatCard label="Libérés — Marché" value={stats.marche}       icon={ShoppingBag} bgClass="bg-emerald-50" iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard label="Taux conformité"  value={`${stats.taux}%`}   icon={ShieldCheck} bgClass="bg-violet-50"  iconBg="bg-violet-100"  iconColor="text-violet-600" />
      </div>

      {/* Légende niveaux */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Usage interne</span>
          Physico-chimique ✓ · Microbio en attente — utilisable en production, <strong className="text-foreground ml-1">non commercialisable</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Libéré Marché</span>
          Tous tests conformes — <strong className="text-foreground ml-1">commercialisable</strong>
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="N° lot, article, origine…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5 flex-wrap">
          {STATUT_FILTER_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatutFilter(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statutFilter === s ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'Tous' ? 'Tous' : STATUT_INSPECTION_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5">
          {(['Tous', 'Reception', 'Production'] as Array<FluxLot | 'Tous'>).map(f => (
            <button
              key={f}
              onClick={() => setFluxFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                fluxFilter === f ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'Tous' ? 'Tous flux' : FLUX_LOT_LABELS[f]}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? '…' : `${filtered.length} lot${filtered.length !== 1 ? 's' : ''}`}
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
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">N° lot<ColumnResizer columnId="codeLot" onStart={startResize} /></th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">Flux<ColumnResizer columnId="flux" onStart={startResize} /></th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">Type<ColumnResizer columnId="type" onStart={startResize} /></th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">Article<ColumnResizer columnId="article" onStart={startResize} /></th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">Origine<ColumnResizer columnId="origine" onStart={startResize} /></th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">Tests requis<ColumnResizer columnId="tests" onStart={startResize} /></th>
              <th className="relative text-left px-4 py-3 text-xs font-semibold tracking-wide">Statut<ColumnResizer columnId="statut" onStart={startResize} /></th>
              <th className="relative text-right px-4 py-3 text-xs font-semibold tracking-wide">Action<ColumnResizer columnId="action" onStart={startResize} /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin inline-block mr-2" />Connexion au laboratoire en cours…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">Aucun lot en attente de validation.</td></tr>
            ) : filtered.map(lot => {
              const isSaving = savingLotId === lot.id
              const tests = Array.isArray(lot.laboratoryResults)
                ? (lot.laboratoryResults as any[])
                : lot.typesAnalyse.map(t => ({ test_name: TYPE_ANALYSE_LABELS[t], min_value: null, max_value: null }))

              return (
                <tr key={lot.id} className="border-b last:border-0 hover:bg-muted/20 text-xs">

                  <td className="px-4 py-3 font-mono font-semibold truncate">{lot.batchNumber}</td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      lot.flux === 'Reception' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {FLUX_LOT_LABELS[lot.flux]}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold ${TYPE_ARTICLE_COLORS[lot.articleType]}`}>
                      {lot.articleType}
                    </span>
                  </td>

                  <td className="px-4 py-3 truncate">[{lot.articleCode}] {lot.articleDesignation}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate">{lot.origine}</td>

                  {/* Saisie inline des tests */}
                  <td className="px-4 py-3 space-y-1.5 min-w-[200px]">
                    {tests.map((test: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-muted/30 px-1.5 py-1 rounded border">
                        <span className="font-medium text-muted-foreground text-[11px] truncate max-w-[100px]">
                          {test.test_name}
                        </span>
                        <input
                          type="number"
                          placeholder={test.min_value != null ? `[${test.min_value}–${test.max_value ?? '∞'}]` : '—'}
                          value={labInputs[lot.id]?.[test.test_name] ?? ''}
                          disabled={lot.status !== 'En contrôle'}
                          onChange={e => setLabInputs(prev => ({
                            ...prev,
                            [lot.id]: { ...prev[lot.id], [test.test_name]: e.target.value },
                          }))}
                          className="w-20 px-1.5 py-0.5 text-right border font-mono text-[11px] rounded bg-background outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                      </div>
                    ))}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${STATUT_INSPECTION_COLORS[lot.status]}`}>
                      {STATUT_INSPECTION_LABELS[lot.status]}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin ml-auto text-muted-foreground" />
                    ) : lot.status === 'En contrôle' ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSaveLabResult(lot, 'Libéré — Marché')}
                          title="Libérer — Marché"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleSaveLabResult(lot, 'Rejeté')}
                          title="Rejeter / Bloquer"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Arbitré</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal analyse */}
      <Dialog open={!!modalLotId} onOpenChange={v => !v && !savingDecision && setModalLotId(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="w-[min(620px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

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
                        {modalLot.batchNumber} · {modalLot.articleDesignation}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setModalLotId(null)} disabled={!!savingDecision}>
                  <X className="size-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">

                {/* Types de tests requis */}
                {modalLot && (
                  <div className="flex flex-wrap gap-1.5">
                    {modalLot.typesAnalyse.map(t => {
                      const Icon = TYPE_ANALYSE_ICONS[t]
                      return (
                        <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${TYPE_ANALYSE_COLORS[t]}`}>
                          <Icon className="size-3" />
                          {TYPE_ANALYSE_LABELS[t]}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* ── Section 1 : Physico-chimique ──────────────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ThermometerSun className="size-4 text-blue-600" />
                    <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Contrôles physico-chimiques <span className="text-destructive">*</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="pH">
                      <Input type="number" step="0.01" min="0" max="14"
                        value={physicochem.ph}
                        onChange={e => setPhysicochem(p => ({ ...p, ph: e.target.value }))}
                        placeholder="ex : 3.7" />
                    </Field>
                    <Field label="Brix (°Bx)">
                      <Input type="number" step="0.1" min="0"
                        value={physicochem.brix}
                        onChange={e => setPhysicochem(p => ({ ...p, brix: e.target.value }))}
                        placeholder="ex : 12.2" />
                    </Field>
                    <Field label="Humidité (%)">
                      <Input type="number" step="0.1" min="0" max="100"
                        value={physicochem.humidite}
                        onChange={e => setPhysicochem(p => ({ ...p, humidite: e.target.value }))}
                        placeholder="ex : 12.5" />
                    </Field>
                    <Field label="Température (°C)">
                      <Input type="number" step="0.1"
                        value={physicochem.temperature}
                        onChange={e => setPhysicochem(p => ({ ...p, temperature: e.target.value }))}
                        placeholder="ex : 4.0" />
                    </Field>
                  </div>
                </div>

                {/* ── Section 2 : Microbiologique ────────────────────────────── */}
                {modalLot?.typesAnalyse.includes('MICROBIOLOGIQUE') && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Microscope className="size-4 text-purple-600" />
                      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                        Résultats microbiologiques
                      </p>
                      <span className="text-xs text-purple-600 font-medium">(conditionne la mise sur marché)</span>
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                      {/* Statut */}
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-muted-foreground">Résultats disponibles ?</p>
                        <div className="flex gap-2">
                          {(['oui', 'non'] as const).map(v => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setMicrobioForm(p => ({ ...p, disponibles: v }))}
                              className="px-3 py-1 text-xs font-medium rounded-md border transition-colors bg-background hover:bg-muted"
                            >
                              {v === 'oui' ? 'Oui — saisir les résultats' : 'Non — en attente labo'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Salmonella (absent/présent)">
                          <select
                            value={microbioForm.salmonella}
                            onChange={e => setMicrobioForm(p => ({ ...p, salmonella: e.target.value }))}
                            className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">— Non renseigné —</option>
                            <option value="absent">Absent ✓</option>
                            <option value="présent">Présent ✗</option>
                          </select>
                        </Field>
                        <Field label="Listeria (absent/présent)">
                          <select
                            value={microbioForm.listeria}
                            onChange={e => setMicrobioForm(p => ({ ...p, listeria: e.target.value }))}
                            className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">— Non renseigné —</option>
                            <option value="absent">Absent ✓</option>
                            <option value="présent">Présent ✗</option>
                          </select>
                        </Field>
                        <Field label="E. coli (UFC/g)">
                          <Input type="number" step="1" min="0"
                            value={microbioForm.ecoli}
                            onChange={e => setMicrobioForm(p => ({ ...p, ecoli: e.target.value }))}
                            placeholder="ex : 0 (norme : < 10)" />
                        </Field>
                        <Field label="Levures/Moisissures (UFC/g)">
                          <Input type="number" step="1" min="0"
                            value={microbioForm.levures}
                            onChange={e => setMicrobioForm(p => ({ ...p, levures: e.target.value }))}
                            placeholder="ex : 12 (norme : < 100)" />
                        </Field>
                        <Field label="Flore totale (UFC/g ou mL)">
                          <Input type="number" step="1" min="0"
                            value={microbioForm.flore_totale}
                            onChange={e => setMicrobioForm(p => ({ ...p, flore_totale: e.target.value }))}
                            placeholder="ex : 8" />
                        </Field>
                        <Field label="Laboratoire">
                          <Input
                            value={microbioForm.laboratoire}
                            onChange={e => setMicrobioForm(p => ({ ...p, laboratoire: e.target.value }))}
                            placeholder="ex : Labo INH Lomé" />
                        </Field>
                      </div>

                      <div className="flex items-start gap-2 rounded-md bg-purple-100/60 px-3 py-2 text-xs text-purple-800">
                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                        <span>La mise sur marché est conditionnée aux résultats microbiologiques.
                        Sans résultats microbio conformes, seule la libération <strong>Usage interne</strong> est possible.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Certificat d'Analyse ──────────────────────────────────── */}
                <Field label="Certificat d'Analyse (CA)">
                  <DragDrop label="Glisser le certificat PDF ici" file={caFile} onFile={setCaFile} />
                </Field>

                {/* ── Analyste + Commentaire ────────────────────────────────── */}
                <Field label="Analyste responsable" required>
                  <select
                    value={analyste}
                    onChange={e => setAnalyste(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {ANALYSTES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>

                <Field label="Commentaire / Observations">
                  <textarea
                    value={commentaire}
                    onChange={e => setCommentaire(e.target.value)}
                    placeholder="Résultats, remarques, observations..."
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </Field>
              </div>

              {/* Footer — 3 actions */}
              <div className="flex items-center gap-2 p-4 border-t shrink-0 flex-wrap">
                <Button variant="outline" onClick={() => setModalLotId(null)} disabled={!!savingDecision}>
                  Annuler
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={() => handleDecision('rejeter')}
                  disabled={!isValid || !!savingDecision}
                  variant="destructive"
                  className="gap-1.5"
                >
                  {savingDecision === 'rejeter'
                    ? <><Loader2 className="size-4 animate-spin" />Traitement…</>
                    : <><XCircle className="size-4" />Rejeter</>}
                </Button>
                <Button
                  onClick={() => handleDecision('usage_interne')}
                  disabled={!isValid || !!savingDecision}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingDecision === 'usage_interne'
                    ? <><Loader2 className="size-4 animate-spin" />Libération…</>
                    : <><Shield className="size-4" />Libérer — Usage interne</>}
                </Button>
                <Button
                  onClick={() => handleDecision('marche')}
                  disabled={!isValid || !!savingDecision}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {savingDecision === 'marche'
                    ? <><Loader2 className="size-4 animate-spin" />Libération…</>
                    : <><CheckCircle2 className="size-4" />Libérer — Marché</>}
                </Button>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
