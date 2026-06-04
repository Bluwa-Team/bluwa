'use client'

import { useState, useMemo } from 'react'
import {
  ShieldCheck, AlertOctagon, ThermometerSun, Microscope,
  Magnet, ChevronRight, Info, Calendar, User, CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import {
  MOCK_PROCESS_STEPS, MOCK_HAZARD_ANALYSIS, MOCK_CCP, HACCP_PLAN_META,
  HAZARD_TYPE_LABELS, HAZARD_TYPE_COLORS,
  riskScore, riskColor, riskLabel,
  type HazardType,
} from '../_components/haccp-types'
import { HelpPopover } from '@/components/ui/help-popover'

// ── Constants ──────────────────────────────────────────────────────────────────

type Tab = 'pcc' | 'dangers' | 'flux'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'pcc',     label: 'Tableau des PCC'      },
  { id: 'dangers', label: 'Analyse des dangers'  },
  { id: 'flux',    label: 'Flux de process'      },
]

const HAZARD_ICONS: Record<HazardType, React.ElementType> = {
  B: Microscope,
  C: ThermometerSun,
  P: Magnet,
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function HazardBadge({ type }: { type: HazardType }) {
  const Icon = HAZARD_ICONS[type]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${HAZARD_TYPE_COLORS[type]}`}>
      <Icon className="size-3" />
      {type} — {HAZARD_TYPE_LABELS[type]}
    </span>
  )
}

function RiskBadge({ score }: { score: number }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums ${riskColor(score)}`}>
      {score} — {riskLabel(score)}
    </span>
  )
}

// ── Tab: Tableau des PCC ───────────────────────────────────────────────────────

function TabPCC() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {MOCK_CCP.map(ccp => {
        const isOpen = expandedId === ccp.id
        return (
          <div key={ccp.id} className="rounded-xl border bg-card overflow-hidden">
            {/* Header row */}
            <button
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setExpandedId(isOpen ? null : ccp.id)}
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertOctagon className="size-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{ccp.pccNumber}</span>
                  <span className="text-muted-foreground text-sm">·</span>
                  <span className="text-sm font-medium truncate">{ccp.stepName}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {ccp.hazardDescription}
                </p>
              </div>
              <HazardBadge type={ccp.hazardType} />
              <ChevronRight className={`size-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Expanded body */}
            {isOpen && (
              <div className="border-t px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 bg-muted/10">
                <DetailField label="Limite critique" icon={AlertOctagon} iconColor="text-red-500">
                  {ccp.criticalLimit}
                </DetailField>
                <DetailField label="Méthode de surveillance" icon={Microscope} iconColor="text-blue-500">
                  {ccp.monitoringMethod}
                </DetailField>
                <DetailField label="Fréquence" icon={Calendar} iconColor="text-violet-500">
                  {ccp.monitoringFrequency}
                </DetailField>
                <DetailField label="Responsable" icon={User} iconColor="text-slate-500">
                  {ccp.responsible}
                </DetailField>
                <DetailField label="Action corrective" icon={ShieldCheck} iconColor="text-amber-500" colSpan>
                  {ccp.correctiveAction}
                </DetailField>
                <DetailField label="Méthode de vérification" icon={CheckCircle2} iconColor="text-emerald-500" colSpan>
                  {ccp.verificationMethod}
                </DetailField>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DetailField({ label, icon: Icon, iconColor, children, colSpan }: {
  label: string
  icon: React.ElementType
  iconColor: string
  children: React.ReactNode
  colSpan?: boolean
}) {
  return (
    <div className={colSpan ? 'sm:col-span-2' : ''}>
      <p className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-1`}>
        <Icon className={`size-3.5 ${iconColor}`} />
        {label}
      </p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  )
}

// ── Tab: Analyse des dangers ───────────────────────────────────────────────────

function TabDangers() {
  const [typeFilter, setTypeFilter] = useState<HazardType | 'Tous'>('Tous')

  const filtered = useMemo(() => (
    typeFilter === 'Tous'
      ? MOCK_HAZARD_ANALYSIS
      : MOCK_HAZARD_ANALYSIS.filter(h => h.hazardType === typeFilter)
  ), [typeFilter])

  const TYPE_OPTIONS: Array<HazardType | 'Tous'> = ['Tous', 'B', 'C', 'P']

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-lg border bg-background p-1 gap-0.5">
          {TYPE_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === t
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'Tous' ? 'Tous' : `${t} — ${HAZARD_TYPE_LABELS[t]}`}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} danger{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Étape</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide w-[130px]">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide">Danger identifié</th>
              <th className="text-center px-4 py-3 text-xs font-semibold tracking-wide w-[70px]">G</th>
              <th className="text-center px-4 py-3 text-xs font-semibold tracking-wide w-[70px]">P</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide w-[130px]">Score G×P</th>
              <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide w-[60px]">PCC?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(h => {
              const score = riskScore(h)
              return (
                <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20 align-top">
                  <td className="px-4 py-3 font-medium text-sm">{h.stepName}</td>
                  <td className="px-4 py-3">
                    <HazardBadge type={h.hazardType} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
                    <p className="font-medium text-foreground">{h.hazardDescription}</p>
                    <p className="text-xs mt-1">{h.controlMeasure}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-xs font-bold tabular-nums">
                      {h.gravity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-xs font-bold tabular-nums">
                      {h.probability}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge score={score} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {h.isCcp
                      ? <CheckCircle2 className="size-4 text-red-500 mx-auto" />
                      : <span className="text-muted-foreground text-xs">—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <Info className="size-4 shrink-0 mt-0.5" />
        <span>
          <strong className="text-foreground">G</strong> = Gravité (1 faible → 3 élevée) ·{' '}
          <strong className="text-foreground">P</strong> = Probabilité (1 faible → 3 élevée) ·{' '}
          <strong className="text-foreground">Score G×P</strong> :{' '}
          <span className="text-emerald-600 font-medium">≤ 3 acceptable</span>,{' '}
          <span className="text-amber-600 font-medium">4–6 modéré</span>,{' '}
          <span className="text-red-600 font-medium">≥ 7 critique → PCC</span>
        </span>
      </div>
    </div>
  )
}

// ── Tab: Flux de process ───────────────────────────────────────────────────────

function TabFlux() {
  return (
    <div className="space-y-2">
      {MOCK_PROCESS_STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-stretch gap-3">
          {/* Connector column */}
          <div className="flex flex-col items-center w-8 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              step.hasCcp
                ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
                : 'bg-muted text-muted-foreground'
            }`}>
              {step.order}
            </div>
            {idx < MOCK_PROCESS_STEPS.length - 1 && (
              <div className="flex-1 flex justify-center py-1">
                <ArrowRight className="size-3 text-muted-foreground rotate-90" />
              </div>
            )}
          </div>

          {/* Step card */}
          <div className={`flex-1 mb-2 rounded-lg border px-4 py-3 ${
            step.hasCcp ? 'border-red-200 bg-red-50/40' : 'bg-card'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{step.name}</span>
              {step.hasCcp && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                  <AlertOctagon className="size-3" />
                  PCC
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HaccpPlanPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pcc')

  const stats = {
    etapes:  MOCK_PROCESS_STEPS.length,
    pcc:     MOCK_CCP.length,
    dangers: MOCK_HAZARD_ANALYSIS.length,
    critiques: MOCK_HAZARD_ANALYSIS.filter(h => riskScore(h) >= 7).length,
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5 text-red-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Plan HACCP</h1>
              <HelpPopover section="qualite" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Hazard Analysis and Critical Control Points — référentiel qualité
            </p>
          </div>
        </div>

        {/* Plan metadata */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          <span>
            Version <strong className="text-foreground">{HACCP_PLAN_META.version}</strong>
            {' '}· Révisé le <strong className="text-foreground">{HACCP_PLAN_META.revisedAt}</strong>
            {' '}par <strong className="text-foreground">{HACCP_PLAN_META.revisedBy}</strong>
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Étapes process"
          value={stats.etapes}
          icon={ArrowRight}
          bgClass="bg-slate-50"
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          label="Points Critiques (PCC)"
          value={stats.pcc}
          icon={AlertOctagon}
          bgClass="bg-red-50"
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          label="Dangers identifiés"
          value={stats.dangers}
          icon={Microscope}
          bgClass="bg-amber-50"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Dangers critiques"
          value={stats.critiques}
          icon={ShieldCheck}
          bgClass="bg-blue-50"
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pcc'     && <TabPCC />}
      {activeTab === 'dangers' && <TabDangers />}
      {activeTab === 'flux'    && <TabFlux />}
    </div>
  )
}
