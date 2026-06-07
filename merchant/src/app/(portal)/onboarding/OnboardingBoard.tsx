'use client'

import { useState } from 'react'
import { OnboardingItem, OnboardingStage } from '@/types/merchant'
import { AlertTriangle, CheckCircle2, Circle, MapPin, User } from 'lucide-react'
import { NewProspectModal } from './_components/NewProspectModal'
import { OnboardingDetailDrawer } from './_components/OnboardingDetailDrawer'
import {
  updateChecklistItem,
  advancePipelineStage,
  togglePipelineBlocked,
  addPipelineComment,
} from '@/lib/db-client'

// ── Checklists par phase — Kanban Roadmap Bluwa (25 tâches / 5 phases) ────────
export const STAGE_CHECKLISTS: Record<OnboardingStage, string[]> = {
  cadrage: [
    'Signature de la LOI et du NDA',
    'Envoi notification de lancement & fiche onboarding',
    'Fixation de la date de démarrage officielle du pilote',
    'Désignation du référent interne (Key User)',
    'Call de cadrage : isolation de 3 douleurs majeures',
    'Validation des modules ERP prioritaires à activer',
  ],
  configuration_ia: [
    "Réception des fichiers Excel bruts de l'usine",
    "Ingestion & traitement des fichiers via l'IA Bluwa",
    'Validation de la cohérence des données injectées (QA)',
    "Configuration de l'environnement cloud du site",
    'Création des comptes utilisateurs & envoi des accès',
  ],
  formation_golive: [
    'Formation initiale des utilisateurs clés (Key Users)',
    'Mise à disposition des capsules Bluwa Academy',
    'Signature conjointe de la Fiche de Cadrage (PV)',
    "Go-Live : premier flux réel saisi dans l'application",
  ],
  suivi_adoption: [
    'Sessions hebdomadaires de feedback (30 min)',
    'Centralisation des retours dans la grille QA',
    "Analyse du taux d'utilisation terrain (abandon Excel ?)",
    'Arbitrage produit CTO — traitement des bugs critiques',
  ],
  bilan_conversion: [
    'Extraction & analyse des KPIs depuis le portail Bluwa',
    "Rédaction du Bilan d'Impact et de R.O.I.",
    'Présentation des résultats lors du call de clôture pilote',
    'Envoi du Contrat SaaS Commercial Définitif',
    'Signature, facturation & encaissement Frais Installation',
    'Recueil autorisation logo pour la Case Study Bluwa',
  ],
}

// Nombre de jours dans l'étape au-delà duquel la carte est considérée "en retard"
const STALE_DAYS: Record<OnboardingStage, number> = {
  cadrage:           7,
  configuration_ia:  14,
  formation_golive:  7,
  suivi_adoption:    49,   // Phase 4 dure normalement 7 semaines
  bilan_conversion:  9999, // Dernière phase, pas d'alerte retard
}

const STAGES: { key: OnboardingStage; label: string; sub: string; color: string; bg: string; dot: string }[] = [
  { key: 'cadrage',          label: 'À Cadrer',         sub: 'Sem. 1',      color: 'text-gray-700',    bg: 'bg-gray-50',    dot: 'bg-gray-400' },
  { key: 'configuration_ia', label: 'Config. & IA',     sub: 'Sem. 1–2',    color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  { key: 'formation_golive', label: 'Formation & GL',   sub: 'Sem. 3',      color: 'text-violet-700',  bg: 'bg-violet-50',  dot: 'bg-violet-500' },
  { key: 'suivi_adoption',   label: 'Suivi & Adoption', sub: 'Sem. 4–10',   color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500' },
  { key: 'bilan_conversion', label: 'Bilan & Conv. ✓',  sub: 'Sem. 11–12',  color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
]

const STAGE_ORDER: OnboardingStage[] = [
  'cadrage', 'configuration_ia', 'formation_golive', 'suivi_adoption', 'bilan_conversion',
]

function daysInStage(dateStr: string): number {
  const entered = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24))
}

function ChecklistBar({ checklist, stage }: { checklist: OnboardingItem['checklist']; stage: OnboardingStage }) {
  const done = checklist.filter((c) => c.done).length
  const pct = checklist.length > 0 ? (done / checklist.length) * 100 : 0
  const total = STAGE_CHECKLISTS[stage].length
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{done}/{total} tâches</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-1 bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function OrgCard({ item, onClick }: { item: OnboardingItem; onClick: () => void }) {
  const days = daysInStage(item.stage_entered_at)
  const isStale = days > STALE_DAYS[item.stage]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border p-3 space-y-2 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer ${item.blocked ? 'border-red-300' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">{item.org_name}</p>
          {item.country && (
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <MapPin className="w-3 h-3" />{item.country}
            </p>
          )}
        </div>
        {item.plan_target && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
            {item.plan_target}
          </span>
        )}
      </div>

      {item.blocked && (
        <div className="flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-snug">{item.blocked_reason}</p>
        </div>
      )}

      <ChecklistBar checklist={item.checklist} stage={item.stage} />

      {item.notes && (
        <p className="text-xs text-gray-500 leading-snug line-clamp-2">{item.notes}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        {item.assigned_to ? (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <User className="w-3 h-3" />
            {item.assigned_to.split('@')[0]}
          </span>
        ) : (
          <span className="text-xs text-amber-500">Non assigné</span>
        )}
        <span className={`text-xs font-medium ${isStale ? 'text-red-500' : 'text-gray-400'}`}>
          {days}j
        </span>
      </div>
    </button>
  )
}

interface Props {
  initialItems: OnboardingItem[]
}

export function OnboardingBoard({ initialItems }: Props) {
  const [items, setItems] = useState<OnboardingItem[]>(initialItems)
  const [selected, setSelected] = useState<OnboardingItem | null>(null)
  const [showNew, setShowNew] = useState(false)

  const total     = items.length
  const blocked   = items.filter((o) => o.blocked).length
  const converted = items.filter((o) => o.stage === 'bilan_conversion').length

  async function handleToggleCheck(itemId: string, checkId: string) {
    const item = items.find((i) => i.id === itemId)
    const check = item?.checklist.find((c) => c.id === checkId)
    if (!check) return
    const newDone = !check.done
    await updateChecklistItem(checkId, newDone)

    setItems((prev) =>
      prev.map((it) =>
        it.id !== itemId ? it : {
          ...it,
          checklist: it.checklist.map((c) =>
            c.id !== checkId ? c : { ...c, done: newDone }
          ),
        }
      )
    )
    setSelected((prev) =>
      !prev || prev.id !== itemId ? prev : {
        ...prev,
        checklist: prev.checklist.map((c) =>
          c.id !== checkId ? c : { ...c, done: newDone }
        ),
      }
    )
  }

  async function handleAdvanceStage(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const idx = STAGE_ORDER.indexOf(item.stage)
    if (idx >= STAGE_ORDER.length - 1) return
    const nextStage = STAGE_ORDER[idx + 1]
    await advancePipelineStage(itemId, nextStage)

    const now = new Date().toISOString()
    const newChecklist = STAGE_CHECKLISTS[nextStage].map((label, i) => ({
      id: `${itemId}-${nextStage}-${i}`,
      label,
      done: false,
    }))
    setItems((prev) =>
      prev.map((it) =>
        it.id !== itemId ? it : { ...it, stage: nextStage, stage_entered_at: now, checklist: newChecklist }
      )
    )
    setSelected((prev) =>
      !prev || prev.id !== itemId ? prev : { ...prev, stage: nextStage, stage_entered_at: now, checklist: newChecklist }
    )
  }

  async function handleToggleBlocked(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const newBlocked = !item.blocked
    await togglePipelineBlocked(itemId, newBlocked)

    setItems((prev) =>
      prev.map((it) =>
        it.id !== itemId ? it : { ...it, blocked: newBlocked }
      )
    )
    setSelected((prev) =>
      !prev || prev.id !== itemId ? prev : { ...prev, blocked: newBlocked }
    )
  }

  async function handleAddComment(itemId: string, content: string) {
    await addPipelineComment(itemId, 'john@bluwa.io', content)
    const comment = {
      id: `cm-${Date.now()}`,
      author: 'john@bluwa.io',
      content,
      created_at: new Date().toISOString(),
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id !== itemId ? it : { ...it, comments: [...it.comments, comment] }
      )
    )
    setSelected((prev) =>
      !prev || prev.id !== itemId ? prev : { ...prev, comments: [...prev.comments, comment] }
    )
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Onboarding</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total} client{total > 1 ? 's' : ''} · {converted} converti{converted > 1 ? 's' : ''}
              {blocked > 0 && (
                <span className="text-red-600 font-medium"> · {blocked} bloqué{blocked > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nouveau client
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
          {STAGES.map((stage) => {
            const stageItems = items.filter((o) => o.stage === stage.key)
            return (
              <div key={stage.key} className="flex flex-col shrink-0 w-60">
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0 ${stage.bg} border-gray-200`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <div>
                      <span className={`text-xs font-semibold ${stage.color} block`}>{stage.label}</span>
                      <span className="text-[10px] text-gray-400">{stage.sub}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{stageItems.length}</span>
                </div>
                <div className={`flex-1 border border-t-0 border-gray-200 rounded-b-xl p-2 space-y-2 ${stage.bg}`}>
                  {stageItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                      <Circle className="w-6 h-6 mb-1" />
                      <p className="text-xs">Vide</p>
                    </div>
                  ) : (
                    stageItems.map((item) => (
                      <OrgCard
                        key={item.id}
                        item={item}
                        onClick={() => setSelected(item)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded border border-red-300 bg-red-50 inline-block" />
            Bloqué — action requise
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />
            Nombre de jours dans l&apos;étape (rouge si délai dépassé)
          </span>
        </div>
      </div>

      <NewProspectModal open={showNew} onClose={() => setShowNew(false)} />

      <OnboardingDetailDrawer
        item={selected}
        onClose={() => setSelected(null)}
        onToggleCheck={handleToggleCheck}
        onAdvanceStage={handleAdvanceStage}
        onToggleBlocked={handleToggleBlocked}
        onAddComment={handleAddComment}
      />
    </>
  )
}
