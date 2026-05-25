'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Activity, StopCircle, Play, Plus, CheckCircle2, PlayCircle,
  Gauge, Clock, Factory, Package, AlertTriangle, X, MonitorPlay,
  ChevronRight, Hourglass, Trash2, ShieldAlert, FlaskConical,
  PackageSearch, RotateCcw, Loader2, Check, Lock,
} from 'lucide-react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import {
  useResizableColumns, ColumnResizer, type ResizableColumn,
} from '@/hooks/use-resizable-columns'
import {
  OrdreFabrication, MOCK_OFS, STATUT_OF_COLORS, STATUT_OF_LABELS,
  EtatLigne, MotifArret, MOTIF_ARRET_LABELS,
  SessionMES, EvenementMES, TypeEvenementMES, MOCK_SESSIONS_MES,
  MOCK_JOURNAL_MES, LEAD_TIME_H,
} from '../_components/types'

// ── Constantes CCP / HACCP ────────────────────────────────────────────────────

type CCPKey = 'pH' | 'tempPast' | 'brix' | 'tempRefr'
type CCPForm = Record<CCPKey, string>

const EMPTY_CCP: CCPForm = { pH: '', tempPast: '', brix: '', tempRefr: '' }

const CCP_SPECS: Array<{
  key: CCPKey; label: string; unit: string; spec: string; placeholder: string
  validate: (n: number) => boolean
}> = [
  { key: 'pH',       label: 'pH',                      unit: '',   spec: '2.8 – 3.8',    placeholder: '3.2',  validate: (n) => n >= 2.8 && n <= 3.8 },
  { key: 'tempPast', label: 'Temp. pasteurisation',    unit: '°C', spec: '≥ 85 °C',      placeholder: '90',   validate: (n) => n >= 85              },
  { key: 'brix',     label: 'Brix',                    unit: '°Bx',spec: '12.0 – 16.0',  placeholder: '14.5', validate: (n) => n >= 12 && n <= 16   },
  { key: 'tempRefr', label: 'Temp. refroidissement',   unit: '°C', spec: '≤ 25 °C',      placeholder: '20',   validate: (n) => n <= 25              },
]

// ── Constantes Rebuts ─────────────────────────────────────────────────────────

type RebutMotif = 'CasseMecanique' | 'DefautQualite' | 'Deversement' | 'ControlNC' | 'Autre'
type RebutType  = 'bouteilles' | 'liquide'

const REBUT_MOTIFS: Record<RebutMotif, string> = {
  CasseMecanique: 'Casse mécanique (embouteilleuse)',
  DefautQualite:  'Défaut qualité (colmatage / fuite)',
  Deversement:    'Déversement accidentel',
  ControlNC:      'Lot rejeté (CCP non conforme)',
  Autre:          'Autre',
}

const EMPTY_REBUT = {
  type:        'bouteilles' as RebutType,
  quantite:    '',
  motif:       'CasseMecanique' as RebutMotif,
  commentaire: '',
}

// ── Cumul rebuts par OF ───────────────────────────────────────────────────────

interface RebuttCumul { bouteilles: number; litres: number }

// ── Lots en quarantaine créés cette session ───────────────────────────────────

interface LotQuarantaine {
  id: string
  numeroLot: string
  ofNumero: string
  produitFini: string
  sku: string
  quantite: number
  unite: string
  heureCreation: string
}

// ── Colonnes journal ──────────────────────────────────────────────────────────

const JOURNAL_COLUMNS: ResizableColumn[] = [
  { id: 'heure',     defaultWidth: 70,  minWidth: 60  },
  { id: 'ofNumero',  defaultWidth: 140, minWidth: 110 },
  { id: 'ligne',     defaultWidth: 75,  minWidth: 60  },
  { id: 'type',      defaultWidth: 130, minWidth: 110 },
  { id: 'detail',    defaultWidth: 300, minWidth: 180 },
  { id: 'operateur', defaultWidth: 130, minWidth: 100 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDurationH(hours: number): string {
  if (hours <= 0) return '0h00'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h${String(m).padStart(2, '0')}`
}

function validateCCPField(spec: typeof CCP_SPECS[0], value: string): boolean | null {
  if (!value.trim()) return null
  const n = parseFloat(value)
  if (isNaN(n)) return false
  return spec.validate(n)
}

function allCCPValid(form: CCPForm): boolean {
  return CCP_SPECS.every((s) => validateCCPField(s, form[s.key]) === true)
}

function generateLotNumber(of: OrdreFabrication): string {
  const seq = of.numero.split('-').pop() ?? '000'
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  return `LOT-PF-2026-${seq}-${today}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, borderClass, icon: Icon, iconClass,
}: {
  label: string; value: string | number; sub: string
  borderClass: string; icon: React.ElementType; iconClass: string
}) {
  return (
    <div className={`bg-card rounded-xl border border-t-2 ${borderClass} p-4 shadow-sm flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${iconClass}`} />
      </div>
      <div>
        <p className="text-3xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
      </div>
    </div>
  )
}

function EtatBadge({ etat }: { etat: EtatLigne }) {
  const configs: Record<EtatLigne, { label: string; cls: string; icon?: React.ElementType }> = {
    EnProduction: { label: 'En production', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: Activity },
    EnPause:      { label: 'En pause',      cls: 'bg-amber-100  text-amber-700  border border-amber-200'  },
    Arret:        { label: 'ARRÊT',         cls: 'bg-red-100    text-red-700    border border-red-200 font-bold', icon: StopCircle },
    Reglage:      { label: 'Réglage',       cls: 'bg-blue-100   text-blue-700   border border-blue-200'  },
  }
  const { label, cls, icon: Icon } = configs[etat]
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${cls}`}>
      {Icon && <Icon className="size-3" />}
      {label}
    </span>
  )
}

const EVT_STYLES: Record<TypeEvenementMES, string> = {
  Lancement:   'bg-blue-100   text-blue-700',
  Declaration: 'bg-emerald-100 text-emerald-700',
  Arret:       'bg-red-100    text-red-700',
  Reprise:     'bg-orange-100 text-orange-700',
  FinProd:     'bg-violet-100 text-violet-700',
  Rebut:       'bg-red-200    text-red-800',
  ClotureLot:  'bg-violet-200 text-violet-800',
}

const EVT_LABELS: Record<TypeEvenementMES, string> = {
  Lancement:   'Lancement',
  Declaration: 'Déclaration',
  Arret:       'Arrêt',
  Reprise:     'Reprise',
  FinProd:     'Fin prod.',
  Rebut:       'Rebut',
  ClotureLot:  'Clôture lot',
}

function EvtBadge({ type }: { type: TypeEvenementMES }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVT_STYLES[type]}`}>
      {EVT_LABELS[type]}
    </span>
  )
}

function NativeSelect({
  value, onChange, disabled, children,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    >
      {children}
    </select>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MESPage() {
  const locale = useLocale()

  // ── State existant ─────────────────────────────────────────────────────────
  const [ofs, setOfs] = useState<OrdreFabrication[]>(MOCK_OFS)
  const [sessions, setSessions] = useState<Record<string, SessionMES>>(MOCK_SESSIONS_MES)
  const [journal, setJournal] = useState<EvenementMES[]>(MOCK_JOURNAL_MES)
  const [now, setNow] = useState('')

  // Declaration modal
  const [declOfId, setDeclOfId] = useState<string | null>(null)
  const [declQte, setDeclQte] = useState('')

  // Arrêt modal
  const [arretOfId, setArretOfId] = useState<string | null>(null)
  const [arretMotif, setArretMotif] = useState<MotifArret>('PanneMachine')
  const [arretComment, setArretComment] = useState('')

  // ── Nouveau state ─────────────────────────────────────────────────────────

  // Rebuts cumulés par OF id
  const [rebuts, setRebuts] = useState<Record<string, RebuttCumul>>({})

  // Saisie rebut modal
  const [rebutOfId, setRebutOfId] = useState<string | null>(null)
  const [rebutForm, setRebutForm] = useState(EMPTY_REBUT)
  const [savingRebut, setSavingRebut] = useState(false)

  // Clôture OF modal (contient CCP + récap + lot)
  const [clotureOfId, setClotureOfId] = useState<string | null>(null)
  const [clotureForm, setClotureForm] = useState<CCPForm>(EMPTY_CCP)
  const [cloturant, setCloturant] = useState(false)

  // Lots en quarantaine créés cette session
  const [lotsQuarantaine, setLotsQuarantaine] = useState<LotQuarantaine[]>([])

  const { widths, startResize, reset, isCustomized } = useResizableColumns(
    'bluwa:cols:mes-journal', JOURNAL_COLUMNS,
  )
  const journalMinWidth = JOURNAL_COLUMNS.reduce(
    (s, c) => s + (widths[c.id] ?? c.defaultWidth ?? 0), 0,
  )

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    setNow(fmt())
    const t = setInterval(() => setNow(fmt()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeOfs = useMemo(
    () => ofs.filter((o) => !o.archive && o.statut === 'EnCours'),
    [ofs],
  )
  const queueOfs = useMemo(
    () => ofs.filter((o) => !o.archive && o.statut === 'Planifie'),
    [ofs],
  )
  const waitingOfs = useMemo(
    () => ofs.filter((o) => !o.archive && o.statut === 'EnAttenteComposants'),
    [ofs],
  )

  const stats = useMemo(() => {
    const lignesActives = activeOfs.length
    const btlJour = ofs
      .filter((o) => !o.archive && ['EnCours', 'ControleQualite', 'Dispo'].includes(o.statut))
      .reduce((s, o) => s + o.realise, 0)
    const tauxMoyen =
      activeOfs.length > 0
        ? Math.round(
            activeOfs.reduce(
              (s, o) => s + (o.qty > 0 ? (o.realise / o.qty) * 100 : 0), 0,
            ) / activeOfs.length,
          )
        : 0
    const arretsActifs = Object.values(sessions).filter((s) => s.etat === 'Arret').length

    // Taux de rebut
    const totalRebutBtl = Object.values(rebuts).reduce((s, r) => s + r.bouteilles, 0)
    const totalProduit = btlJour + totalRebutBtl
    const tauxRebut = totalProduit > 0
      ? Math.round((totalRebutBtl / totalProduit) * 1000) / 10
      : 0

    return { lignesActives, btlJour, tauxMoyen, arretsActifs, totalRebutBtl, tauxRebut }
  }, [ofs, sessions, activeOfs, rebuts])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function nowTime() {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  function addEvent(evt: Omit<EvenementMES, 'id'>) {
    setJournal((prev) => [{ ...evt, id: String(Date.now()) }, ...prev])
  }

  function getSession(ofId: string): SessionMES {
    return sessions[ofId] ?? { ofId, etat: 'EnProduction', debutReel: '—', derniereDecl: null }
  }

  function getRebutCumul(ofId: string): RebuttCumul {
    return rebuts[ofId] ?? { bouteilles: 0, litres: 0 }
  }

  // ── Actions existantes ─────────────────────────────────────────────────────

  function handleLancer(of: OrdreFabrication) {
    const heure = nowTime()
    setOfs((prev) => prev.map((o) => o.id === of.id ? { ...o, statut: 'EnCours' } : o))
    setSessions((prev) => ({
      ...prev,
      [of.id]: { ofId: of.id, etat: 'EnProduction', debutReel: heure, derniereDecl: null },
    }))
    addEvent({
      ofId: of.id, ofNumero: of.numero, ligne: of.ligne,
      type: 'Lancement', heure,
      detail: `Lancement production — ${of.produitFini}`,
      operateur: of.operateurPrep ?? 'Opérateur',
    })
  }

  function handleDeclarer() {
    if (!declOfId) return
    const qte = parseInt(declQte, 10)
    if (!qte || qte <= 0) return
    const of = ofs.find((o) => o.id === declOfId)
    if (!of) return
    const heure = nowTime()
    const newRealise = of.realise + qte
    setOfs((prev) => prev.map((o) => o.id === of.id ? { ...o, realise: newRealise } : o))
    setSessions((prev) => ({
      ...prev,
      [of.id]: {
        ...getSession(of.id),
        derniereDecl: { heure, qte, operateur: of.operateurPrep ?? 'Opérateur' },
      },
    }))
    addEvent({
      ofId: of.id, ofNumero: of.numero, ligne: of.ligne,
      type: 'Declaration', heure,
      detail: `+${qte} btl déclarées (cumul ${newRealise}/${of.qty})`,
      operateur: of.operateurPrep ?? 'Opérateur',
    })
    setDeclOfId(null)
    setDeclQte('')
  }

  function handleArret() {
    if (!arretOfId) return
    const of = ofs.find((o) => o.id === arretOfId)
    if (!of) return
    const heure = nowTime()
    setSessions((prev) => ({ ...prev, [of.id]: { ...getSession(of.id), etat: 'Arret' } }))
    addEvent({
      ofId: of.id, ofNumero: of.numero, ligne: of.ligne,
      type: 'Arret', heure,
      detail: `Arrêt — ${MOTIF_ARRET_LABELS[arretMotif]}${arretComment ? ` · ${arretComment}` : ''}`,
      operateur: of.operateurPrep ?? 'Opérateur',
    })
    setArretOfId(null)
    setArretComment('')
  }

  function handleReprendre(of: OrdreFabrication) {
    const heure = nowTime()
    setSessions((prev) => ({ ...prev, [of.id]: { ...getSession(of.id), etat: 'EnProduction' } }))
    addEvent({
      ofId: of.id, ofNumero: of.numero, ligne: of.ligne,
      type: 'Reprise', heure, detail: 'Reprise de production',
      operateur: of.operateurPrep ?? 'Opérateur',
    })
  }

  // ── Nouveau : Déclarer rebuts ──────────────────────────────────────────────

  async function handleDeclareRebut() {
    if (!rebutOfId) return
    const qte = parseFloat(rebutForm.quantite)
    if (!qte || qte <= 0) return
    const of = ofs.find((o) => o.id === rebutOfId)
    if (!of) return
    setSavingRebut(true)
    await new Promise((r) => setTimeout(r, 500))
    const isBtl = rebutForm.type === 'bouteilles'
    setRebuts((prev) => {
      const curr = prev[rebutOfId] ?? { bouteilles: 0, litres: 0 }
      return {
        ...prev,
        [rebutOfId]: {
          bouteilles: curr.bouteilles + (isBtl ? qte : 0),
          litres:     curr.litres     + (isBtl ? 0 : qte),
        },
      }
    })
    const heure = nowTime()
    addEvent({
      ofId: of.id, ofNumero: of.numero, ligne: of.ligne,
      type: 'Rebut', heure,
      detail: `${isBtl ? `${qte} btl cassées` : `${qte} L liquide perdu`} — ${REBUT_MOTIFS[rebutForm.motif]}${rebutForm.commentaire ? ` · ${rebutForm.commentaire}` : ''}`,
      operateur: of.operateurPrep ?? 'Opérateur',
    })
    setSavingRebut(false)
    setRebutOfId(null)
    setRebutForm(EMPTY_REBUT)
  }

  // ── Nouveau : Clôturer l'OF (remplace handleFinirProd) ────────────────────

  async function handleCloture() {
    if (!clotureOfId) return
    const of = ofs.find((o) => o.id === clotureOfId)
    if (!of || !allCCPValid(clotureForm)) return
    setCloturant(true)
    await new Promise((r) => setTimeout(r, 800))
    const heure = nowTime()
    const numeroLot = generateLotNumber(of)

    // Mettre à jour l'OF
    setOfs((prev) =>
      prev.map((o) =>
        o.id === of.id
          ? { ...o, statut: 'ControleQualite', lotPF: numeroLot }
          : o,
      ),
    )

    // Supprimer la session MES
    setSessions((prev) => {
      const next = { ...prev }
      delete next[of.id]
      return next
    })

    // Créer le lot en quarantaine
    const newLot: LotQuarantaine = {
      id: String(Date.now()),
      numeroLot,
      ofNumero: of.numero,
      produitFini: of.produitFini,
      sku: of.sku,
      quantite: of.realise,
      unite: of.unite,
      heureCreation: heure,
    }
    setLotsQuarantaine((prev) => [newLot, ...prev])

    // Journal
    const cumul = getRebutCumul(of.id)
    const rendement = of.qty > 0 ? Math.round((of.realise / of.qty) * 100) : 0
    addEvent({
      ofId: of.id, ofNumero: of.numero, ligne: of.ligne,
      type: 'ClotureLot', heure,
      detail: `Lot ${numeroLot} créé · ${of.realise} btl · Rendement ${rendement}% · Rebuts : ${cumul.bouteilles} btl, ${cumul.litres} L · Statut : Quarantaine`,
      operateur: of.operateurPrep ?? 'Opérateur',
    })

    setCloturant(false)
    setClotureOfId(null)
    setClotureForm(EMPTY_CCP)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Suivi de fabrication (MES)</h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En direct
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Déclarations · Rebuts · Contrôles CCP/HACCP · Clôture &amp; Lot Quarantaine
          </p>
        </div>
        {now && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 border border-border rounded-lg px-3 py-1.5">
            <Clock className="size-3.5" />
            <span className="font-mono font-medium">{now}</span>
          </div>
        )}
      </div>

      {/* ── Cartes stats ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Lignes actives"
          value={stats.lignesActives}
          sub={stats.lignesActives === 0 ? 'Aucune ligne en cours' : `${stats.lignesActives} ligne${stats.lignesActives > 1 ? 's' : ''} en production`}
          borderClass="border-t-emerald-500"
          icon={Factory}
          iconClass="text-emerald-500"
        />
        <StatCard
          label="Btl produites · session"
          value={`${formatNumber(stats.btlJour, locale)} btl`}
          sub="OFs actifs + terminés (hors rebuts)"
          borderClass="border-t-blue-500"
          icon={Package}
          iconClass="text-blue-500"
        />
        <StatCard
          label="Taux de rebut"
          value={`${stats.tauxRebut.toFixed(1)} %`}
          sub={`${stats.totalRebutBtl} btl rebutées · session en cours`}
          borderClass={stats.tauxRebut > 3 ? 'border-t-red-500' : 'border-t-muted-foreground/30'}
          icon={Trash2}
          iconClass={stats.tauxRebut > 3 ? 'text-red-500' : 'text-muted-foreground'}
        />
        <StatCard
          label="Arrêts actifs"
          value={stats.arretsActifs}
          sub={stats.arretsActifs === 0 ? 'Aucun arrêt signalé' : `${stats.arretsActifs} ligne${stats.arretsActifs > 1 ? 's' : ''} à l'arrêt`}
          borderClass={stats.arretsActifs > 0 ? 'border-t-red-500' : 'border-t-muted-foreground/30'}
          icon={AlertTriangle}
          iconClass={stats.arretsActifs > 0 ? 'text-red-500' : 'text-muted-foreground'}
        />
      </div>

      {/* ── Lots en quarantaine créés ─────────────────────────────────────── */}
      {lotsQuarantaine.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-200">
            <PackageSearch className="size-4 text-amber-600 shrink-0" />
            <p className="font-semibold text-sm text-amber-900">
              Lots créés en quarantaine · session en cours
            </p>
            <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
              {lotsQuarantaine.length}
            </span>
          </div>
          <div className="divide-y divide-amber-100">
            {lotsQuarantaine.map((lot) => (
              <div key={lot.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-amber-800">{lot.numeroLot}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-800 border border-amber-300">
                      <Lock className="size-3" />
                      Quarantaine · En attente contrôle qualité
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lot.produitFini}
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    <span className="font-medium text-foreground">{formatNumber(lot.quantite, locale)} {lot.unite}</span>
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    OF {lot.ofNumero}
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    Créé à {lot.heureCreation}
                  </p>
                </div>
                <span className="text-xs text-amber-600/70 italic shrink-0">
                  → Centre de Libération
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lignes en production ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MonitorPlay className="size-4 text-foreground" />
          <h2 className="font-semibold text-base">Lignes en production</h2>
          {activeOfs.length > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {activeOfs.length} OF actif{activeOfs.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {activeOfs.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
            Aucun OF en cours de production.
            {queueOfs.length > 0 && (
              <span className="block mt-1">
                {queueOfs.length} OF planifié{queueOfs.length > 1 ? 's' : ''} prêt{queueOfs.length > 1 ? 's' : ''} à lancer ci-dessous.
              </span>
            )}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
            {activeOfs.map((of) => {
              const session = getSession(of.id)
              const pct = of.qty > 0 ? Math.round((of.realise / of.qty) * 100) : 0
              const cadence = Math.round(of.qty / LEAD_TIME_H)
              const remaining = Math.max(0, of.qty - of.realise)
              const remainingH = cadence > 0 ? remaining / cadence : 0
              const isArret = session.etat === 'Arret'
              const cumul = getRebutCumul(of.id)
              const hasRebuts = cumul.bouteilles > 0 || cumul.litres > 0
              const rendement = of.qty > 0 ? Math.round((of.realise / of.qty) * 100) : 0

              return (
                <div
                  key={of.id}
                  className={`bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden border-l-4 ${
                    isArret ? 'border-l-red-500 border-red-100' : 'border-l-emerald-500'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {of.numero}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                          {of.ligne}
                        </span>
                        <EtatBadge etat={session.etat} />
                      </div>
                      <p className="font-semibold text-base leading-snug truncate">{of.produitFini}</p>
                      <p className="text-xs text-muted-foreground">
                        {of.operateurPrep ?? 'Opérateur non assigné'}
                        <span className="mx-1.5 text-muted-foreground/40">·</span>
                        Démarré à {session.debutReel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-bold tabular-nums leading-none">{pct} %</p>
                      <p className="text-xs text-muted-foreground mt-1">avancement</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="px-5 pb-3 space-y-1.5">
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="tabular-nums font-medium text-foreground">
                        {formatNumber(of.realise, locale)}
                        <span className="text-muted-foreground font-normal">
                          {' '}/ {formatNumber(of.qty, locale)} {of.unite}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Gauge className="size-3" />
                          {cadence} btl/h
                        </span>
                        {remaining > 0 && (
                          <span className="flex items-center gap-1">
                            <Hourglass className="size-3" />
                            ~{fmtDurationH(remainingH)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* ── Bandeaux Rebuts + CCP ── */}
                  <div className="mx-5 mb-3 grid grid-cols-2 gap-2">
                    {/* Rebuts */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                      hasRebuts
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-muted/30 border-border/40 text-muted-foreground'
                    }`}>
                      <Trash2 className={`size-3.5 shrink-0 ${hasRebuts ? 'text-red-500' : 'text-muted-foreground/50'}`} />
                      <span>
                        {hasRebuts
                          ? `${cumul.bouteilles > 0 ? `${cumul.bouteilles} btl` : ''}${cumul.bouteilles > 0 && cumul.litres > 0 ? ' · ' : ''}${cumul.litres > 0 ? `${cumul.litres} L` : ''} rebuté${cumul.bouteilles > 1 || cumul.litres > 1 ? 's' : ''}`
                          : 'Aucun rebut déclaré'
                        }
                      </span>
                    </div>

                    {/* CCP */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 border-border/40 text-xs text-muted-foreground">
                      <ShieldAlert className="size-3.5 shrink-0 text-amber-500" />
                      <span>CCP HACCP · requis à la clôture</span>
                    </div>
                  </div>

                  {/* Dernière déclaration */}
                  {session.derniereDecl ? (
                    <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      Dernière décl. :
                      <span className="font-medium text-foreground tabular-nums">+{session.derniereDecl.qte} btl</span>
                      à {session.derniereDecl.heure}
                      <span className="mx-1 text-muted-foreground/40">·</span>
                      {session.derniereDecl.operateur}
                    </div>
                  ) : (
                    <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground italic">
                      Aucune déclaration pour cet OF.
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-muted/20 flex-wrap">
                    {/* Déclarer production */}
                    <Button
                      size="sm"
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => { setDeclOfId(of.id); setDeclQte('') }}
                    >
                      <Plus className="size-3.5" />
                      Déclarer production
                    </Button>

                    {/* Saisie rebuts */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => { setRebutOfId(of.id); setRebutForm(EMPTY_REBUT) }}
                    >
                      <Trash2 className="size-3.5" />
                      Saisie rebuts
                    </Button>

                    {/* Arrêt / Reprendre */}
                    {isArret ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => handleReprendre(of)}
                      >
                        <PlayCircle className="size-3.5" />
                        Reprendre
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={() => { setArretOfId(of.id); setArretMotif('PanneMachine'); setArretComment('') }}
                      >
                        <StopCircle className="size-3.5" />
                        Signaler arrêt
                      </Button>
                    )}

                    {/* Clôturer l'OF */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 ml-auto border-violet-200 text-violet-700 hover:bg-violet-50"
                      onClick={() => { setClotureOfId(of.id); setClotureForm(EMPTY_CCP) }}
                    >
                      <PackageSearch className="size-3.5" />
                      Clôturer l&apos;OF
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── File de lancement ─────────────────────────────────────────────── */}
      {queueOfs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Play className="size-4 text-foreground" />
            <h2 className="font-semibold text-base">File de lancement</h2>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {queueOfs.length} OF planifié{queueOfs.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {queueOfs.map((of) => (
              <div key={of.id} className="bg-card rounded-xl border shadow-sm p-4 flex flex-col gap-3 border-l-4 border-l-blue-400">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{of.numero}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{of.ligne}</span>
                  </div>
                  <p className="font-medium text-sm leading-snug">{of.produitFini}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(of.qty, locale)} btl
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    {of.operateurPrep ?? <span className="italic">Opérateur non assigné</span>}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUT_OF_COLORS[of.statut]}`}>
                    {STATUT_OF_LABELS[of.statut]}
                  </span>
                  <Button
                    size="sm"
                    className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleLancer(of)}
                  >
                    <Play className="size-3" />
                    Lancer
                    <ChevronRight className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── En attente composants ─────────────────────────────────────────── */}
      {waitingOfs.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-orange-600 shrink-0" />
            <p className="text-sm font-semibold text-orange-900">En attente composants ({waitingOfs.length})</p>
          </div>
          <ul className="space-y-1 pl-6">
            {waitingOfs.map((of) => (
              <li key={of.id} className="text-sm text-orange-800 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{of.numero}</span>
                <span>{of.produitFini}</span>
                <span className="text-orange-500/60">—</span>
                <span className="text-xs">Picking {of.picking === 'Valide' ? 'validé' : 'à valider'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Journal MES ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-foreground" />
          <h2 className="font-semibold text-base">Journal MES</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {journal.length} événement{journal.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {isCustomized && (
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Colonnes personnalisées</span>
              <button onClick={reset} className="text-xs text-blue-600 hover:underline">Réinitialiser</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ minWidth: journalMinWidth }}>
              <colgroup>
                {JOURNAL_COLUMNS.map((c) => <col key={c.id} style={{ width: widths[c.id] }} />)}
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Heure<ColumnResizer columnId="heure" onStart={startResize} />
                  </th>
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    N° OF<ColumnResizer columnId="ofNumero" onStart={startResize} />
                  </th>
                  <th className="relative text-center text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Ligne<ColumnResizer columnId="ligne" onStart={startResize} />
                  </th>
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Événement<ColumnResizer columnId="type" onStart={startResize} />
                  </th>
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Détail<ColumnResizer columnId="detail" onStart={startResize} />
                  </th>
                  <th className="relative text-left text-xs font-semibold tracking-wide text-muted-foreground px-3 py-2.5">
                    Opérateur<ColumnResizer columnId="operateur" onStart={startResize} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {journal.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucun événement enregistré.
                    </td>
                  </tr>
                ) : journal.map((evt) => (
                  <tr key={evt.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-sm font-medium tabular-nums">{evt.heure}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{evt.ofNumero}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{evt.ligne}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <EvtBadge type={evt.type} />
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground truncate max-w-0">{evt.detail}</td>
                    <td className="px-3 py-2.5 text-sm">{evt.operateur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {journal.length} événement{journal.length > 1 ? 's' : ''} · Du plus récent au plus ancien
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── Modal : Déclarer production ──────────────────────────────────── */}
      {(() => {
        const of = ofs.find((o) => o.id === declOfId)
        const remaining = of ? Math.max(0, of.qty - of.realise) : 0
        const qteNum = parseInt(declQte, 10) || 0
        const isValid = qteNum > 0
        return (
          <Dialog open={!!declOfId} onOpenChange={(v) => !v && setDeclOfId(null)}>
            <DialogPortal>
              <DialogOverlay />
              <DialogPrimitive.Popup
                data-slot="dialog-content"
                className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
              >
                <div className="w-[min(400px,92vw)] rounded-xl border bg-card shadow-lg">
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Plus className="size-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Déclarer production</p>
                        {of && <p className="text-xs text-muted-foreground font-mono">{of.numero}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeclOfId(null)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    {of && (
                      <div className="rounded-lg bg-muted/50 border px-3 py-2.5 text-sm space-y-0.5">
                        <p className="font-medium">{of.produitFini}</p>
                        <p className="text-xs text-muted-foreground">
                          Déclaré : <strong>{formatNumber(of.realise, locale)} btl</strong>
                          <span className="mx-1.5">/</span>
                          Planifié : <strong>{formatNumber(of.qty, locale)} btl</strong>
                          <span className="mx-1.5">·</span>
                          Reste : <strong>{formatNumber(remaining, locale)} btl</strong>
                        </p>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Quantité produite (btl)<span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Input
                        type="number" min="1" value={declQte}
                        onChange={(e) => setDeclQte(e.target.value)}
                        placeholder="Saisir la quantité" autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && isValid && handleDeclarer()}
                      />
                      {qteNum > 0 && of && qteNum + of.realise > of.qty && (
                        <p className="text-xs text-amber-600">
                          La quantité totale ({formatNumber(qteNum + of.realise, locale)} btl) dépasse le planifié.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t bg-muted/20">
                    <Button variant="outline" onClick={() => setDeclOfId(null)}>Annuler</Button>
                    <Button onClick={handleDeclarer} disabled={!isValid} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                      <CheckCircle2 className="size-4" />
                      Déclarer
                    </Button>
                  </div>
                </div>
              </DialogPrimitive.Popup>
            </DialogPortal>
          </Dialog>
        )
      })()}

      {/* ── Modal : Signaler arrêt ────────────────────────────────────────── */}
      {(() => {
        const of = ofs.find((o) => o.id === arretOfId)
        return (
          <Dialog open={!!arretOfId} onOpenChange={(v) => !v && setArretOfId(null)}>
            <DialogPortal>
              <DialogOverlay />
              <DialogPrimitive.Popup
                data-slot="dialog-content"
                className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
              >
                <div className="w-[min(460px,92vw)] rounded-xl border bg-card shadow-lg">
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <StopCircle className="size-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Signaler un arrêt</p>
                        {of && <p className="text-xs text-muted-foreground font-mono">{of.numero} · {of.ligne}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => setArretOfId(null)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Motif d&apos;arrêt<span className="text-destructive ml-0.5">*</span></Label>
                      <NativeSelect value={arretMotif} onChange={(v) => setArretMotif(v as MotifArret)}>
                        {(Object.keys(MOTIF_ARRET_LABELS) as MotifArret[]).map((k) => (
                          <option key={k} value={k}>{MOTIF_ARRET_LABELS[k]}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Commentaire<span className="text-xs text-muted-foreground ml-1">(optionnel)</span>
                      </Label>
                      <Input value={arretComment} onChange={(e) => setArretComment(e.target.value)} placeholder="Précisions…" />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t bg-muted/20">
                    <Button variant="outline" onClick={() => setArretOfId(null)}>Annuler</Button>
                    <Button onClick={handleArret} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                      <StopCircle className="size-4" />
                      Confirmer arrêt
                    </Button>
                  </div>
                </div>
              </DialogPrimitive.Popup>
            </DialogPortal>
          </Dialog>
        )
      })()}

      {/* ── Modal : Saisie des Rebuts ────────────────────────────────────── */}
      {(() => {
        const of = ofs.find((o) => o.id === rebutOfId)
        const cumul = of ? getRebutCumul(of.id) : null
        const qteNum = parseFloat(rebutForm.quantite) || 0
        const isValid = qteNum > 0
        return (
          <Dialog open={!!rebutOfId} onOpenChange={(v) => { if (!v && !savingRebut) { setRebutOfId(null); setRebutForm(EMPTY_REBUT) } }}>
            <DialogPortal>
              <DialogOverlay />
              <DialogPrimitive.Popup
                data-slot="dialog-content"
                className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
              >
                <div className="w-[min(500px,92vw)] rounded-xl border bg-card shadow-lg">

                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <Trash2 className="size-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Saisie des Rebuts</p>
                        {of && <p className="text-xs text-muted-foreground font-mono">{of.numero} · {of.produitFini}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => { setRebutOfId(null); setRebutForm(EMPTY_REBUT) }} disabled={savingRebut}>
                      <X className="size-4" />
                    </Button>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4 space-y-4">

                    {/* Cumul existant */}
                    {cumul && (cumul.bouteilles > 0 || cumul.litres > 0) && (
                      <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                        <span>
                          Rebuts déjà déclarés sur cet OF : <strong>{cumul.bouteilles} btl cassées</strong>
                          {cumul.litres > 0 && <> · <strong>{cumul.litres} L liquide perdu</strong></>}
                        </span>
                      </div>
                    )}

                    {/* Type de rebut */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Type de rebut<span className="text-destructive ml-0.5">*</span></Label>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { val: 'bouteilles' as const, label: 'Bouteilles cassées', unit: 'btl' },
                          { val: 'liquide'    as const, label: 'Liquide perdu',      unit: 'L'   },
                        ]).map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => setRebutForm((p) => ({ ...p, type: opt.val }))}
                            className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-xs font-semibold transition-colors ${
                              rebutForm.type === opt.val
                                ? 'border-red-400 bg-red-50 text-red-700'
                                : 'border-input bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                            }`}
                          >
                            <Trash2 className={`size-4 ${rebutForm.type === opt.val ? 'text-red-500' : ''}`} />
                            {opt.label}
                            <span className="font-normal text-[10px]">({opt.unit})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantité */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Quantité ({rebutForm.type === 'bouteilles' ? 'btl' : 'L'})<span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Input
                        type="number" min="0" step={rebutForm.type === 'liquide' ? '0.1' : '1'}
                        value={rebutForm.quantite}
                        onChange={(e) => setRebutForm((p) => ({ ...p, quantite: e.target.value }))}
                        placeholder={rebutForm.type === 'bouteilles' ? 'Nombre de btl' : 'Litres perdus'}
                      />
                    </div>

                    {/* Motif */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Motif<span className="text-destructive ml-0.5">*</span></Label>
                      <NativeSelect value={rebutForm.motif} onChange={(v) => setRebutForm((p) => ({ ...p, motif: v as RebutMotif }))}>
                        {(Object.entries(REBUT_MOTIFS) as [RebutMotif, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </NativeSelect>
                    </div>

                    {/* Commentaire */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Commentaire<span className="text-xs text-muted-foreground ml-1">(optionnel)</span>
                      </Label>
                      <textarea
                        value={rebutForm.commentaire}
                        onChange={(e) => setRebutForm((p) => ({ ...p, commentaire: e.target.value }))}
                        placeholder="Observations, numéro d'équipement…"
                        rows={2}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      />
                    </div>

                    {/* Impact taux rebut */}
                    {qteNum > 0 && (
                      <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <span>
                          Ce rebut sera comptabilisé dans le <strong className="text-foreground">Taux de rebut</strong> et tracé dans le Journal MES.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t bg-muted/20">
                    <Button variant="outline" onClick={() => { setRebutOfId(null); setRebutForm(EMPTY_REBUT) }} disabled={savingRebut}>
                      Annuler
                    </Button>
                    <Button
                      onClick={handleDeclareRebut}
                      disabled={!isValid || savingRebut}
                      className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                    >
                      {savingRebut
                        ? <><Loader2 className="size-4 animate-spin" />Enregistrement…</>
                        : <><Trash2 className="size-4" />Déclarer le rebut</>
                      }
                    </Button>
                  </div>
                </div>
              </DialogPrimitive.Popup>
            </DialogPortal>
          </Dialog>
        )
      })()}

      {/* ── Modal : Clôturer l'OF ─────────────────────────────────────────── */}
      {(() => {
        const of = ofs.find((o) => o.id === clotureOfId)
        if (!of) return null
        const cumul = getRebutCumul(of.id)
        const rendement = of.qty > 0 ? Math.round((of.realise / of.qty) * 100) : 0
        const lotPreview = generateLotNumber(of)
        const ccpOk = allCCPValid(clotureForm)

        return (
          <Dialog open={!!clotureOfId} onOpenChange={(v) => { if (!v && !cloturant) { setClotureOfId(null); setClotureForm(EMPTY_CCP) } }}>
            <DialogPortal>
              <DialogOverlay />
              <DialogPrimitive.Popup
                data-slot="dialog-content"
                className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
              >
                <div className="w-[min(600px,92vw)] max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-lg">

                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <PackageSearch className="size-[18px] text-violet-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-base">Clôturer l&apos;OF</p>
                        <p className="text-xs text-muted-foreground font-mono">{of.numero} · {of.produitFini}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => { setClotureOfId(null); setClotureForm(EMPTY_CCP) }} disabled={cloturant}>
                      <X className="size-4" />
                    </Button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                    {/* ① CCP / HACCP */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">①</span>
                        <p className="font-semibold text-sm flex items-center gap-2">
                          Contrôles CCP / HACCP
                          <span className="text-[11px] font-normal text-destructive">— Obligatoire</span>
                        </p>
                        {ccpOk && (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Check className="size-3" />
                            Validés
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {CCP_SPECS.map((spec) => {
                          const val = clotureForm[spec.key]
                          const status = validateCCPField(spec, val)
                          return (
                            <div key={spec.key} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  {spec.label}{spec.unit && ` (${spec.unit})`}
                                  <span className="text-destructive ml-0.5">*</span>
                                </label>
                                {status === true  && <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5"><Check className="size-3" />OK</span>}
                                {status === false && <span className="text-xs font-semibold text-red-600 flex items-center gap-0.5"><X className="size-3" />Hors spec</span>}
                                {status === null  && <span className="text-xs text-muted-foreground">{spec.spec}</span>}
                              </div>
                              <div className="relative">
                                <Input
                                  type="number" step="0.01"
                                  value={val}
                                  onChange={(e) => setClotureForm((p) => ({ ...p, [spec.key]: e.target.value }))}
                                  placeholder={spec.placeholder}
                                  className={
                                    status === true  ? 'border-emerald-400 focus-visible:ring-emerald-300' :
                                    status === false ? 'border-red-400 focus-visible:ring-red-300' : ''
                                  }
                                />
                                {status !== null && (
                                  <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-sm ${status ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {status ? '✓' : '✗'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">Spec : {spec.spec}</p>
                            </div>
                          )
                        })}
                      </div>

                      {!ccpOk && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                          <ShieldAlert className="size-3.5 shrink-0 mt-0.5" />
                          Tous les contrôles CCP doivent être dans les spécifications avant de pouvoir clôturer l&apos;OF.
                        </div>
                      )}
                    </div>

                    {/* ② Rebuts */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">②</span>
                        <p className="font-semibold text-sm">Rebuts déclarés sur cet OF</p>
                      </div>
                      {(cumul.bouteilles > 0 || cumul.litres > 0) ? (
                        <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                          <Trash2 className="size-4 text-red-500 shrink-0" />
                          <span className="text-red-700 font-medium">
                            {cumul.bouteilles > 0 && `${cumul.bouteilles} bouteille${cumul.bouteilles > 1 ? 's' : ''} cassée${cumul.bouteilles > 1 ? 's' : ''}`}
                            {cumul.bouteilles > 0 && cumul.litres > 0 && ' · '}
                            {cumul.litres > 0 && `${cumul.litres} L liquide perdu`}
                          </span>
                          <span className="ml-auto text-xs text-red-500">
                            Taux rebut : {of.qty > 0 ? ((cumul.bouteilles / (of.realise + cumul.bouteilles)) * 100).toFixed(1) : 0} %
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-muted/30 border text-sm text-muted-foreground">
                          <Check className="size-4 text-emerald-500" />
                          Aucun rebut déclaré sur cet OF
                        </div>
                      )}
                    </div>

                    {/* ③ Récapitulatif & Lot */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">③</span>
                        <p className="font-semibold text-sm">Récapitulatif &amp; Lot généré</p>
                      </div>

                      <div className="rounded-xl border bg-muted/20 overflow-hidden">
                        {/* Données OF */}
                        <div className="grid grid-cols-3 divide-x text-sm">
                          {[
                            { label: 'Qté planifiée', value: `${formatNumber(of.qty, locale)} ${of.unite}` },
                            { label: 'Qté réalisée',  value: `${formatNumber(of.realise, locale)} ${of.unite}` },
                            { label: 'Rendement',     value: `${rendement} %` },
                          ].map((item) => (
                            <div key={item.label} className="px-4 py-3 text-center">
                              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                              <p className="font-bold tabular-nums">{item.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Lot créé */}
                        <div className="border-t px-4 py-4 space-y-2">
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Lot PF généré à la clôture</p>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono text-base font-bold tracking-wide ${ccpOk ? 'text-violet-700' : 'text-muted-foreground/50'}`}>
                              {lotPreview}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              ccpOk
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}>
                              <Lock className="size-3" />
                              {ccpOk ? 'Quarantaine · En attente contrôle qualité' : 'En attente validation CCP'}
                            </span>
                          </div>
                          {ccpOk && (
                            <p className="text-xs text-muted-foreground">
                              Ce lot sera automatiquement transféré vers le <strong className="text-foreground">Centre de Libération</strong> pour analyse qualité avant mise en stock disponible.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-2 px-5 py-4 border-t shrink-0 bg-muted/10">
                    <Button variant="outline" onClick={() => { setClotureOfId(null); setClotureForm(EMPTY_CCP) }} disabled={cloturant}>
                      Annuler
                    </Button>
                    {!ccpOk && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-2">
                        <Lock className="size-3.5 text-amber-500" />
                        Complétez les contrôles CCP pour débloquer la clôture
                      </span>
                    )}
                    <Button
                      onClick={handleCloture}
                      disabled={!ccpOk || cloturant}
                      className="ml-auto gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {cloturant
                        ? <><Loader2 className="size-4 animate-spin" />Clôture en cours…</>
                        : <><PackageSearch className="size-4" />Clôturer &amp; Créer lot quarantaine</>
                      }
                    </Button>
                  </div>
                </div>
              </DialogPrimitive.Popup>
            </DialogPortal>
          </Dialog>
        )
      })()}

    </div>
  )
}
