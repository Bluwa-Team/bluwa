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

const STAGES: { key: OnboardingStage; label: string; color: string; bg: string; dot: string }[] = [
  { key: 'prospect',      label: 'Prospect',    color: 'text-gray-600',    bg: 'bg-gray-50',    dot: 'bg-gray-400' },
  { key: 'demo',          label: 'Démo',         color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  { key: 'trial',         label: 'Trial',        color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500' },
  { key: 'configuration', label: 'Config.',      color: 'text-violet-700',  bg: 'bg-violet-50',  dot: 'bg-violet-500' },
  { key: 'formation',     label: 'Formation',    color: 'text-orange-700',  bg: 'bg-orange-50',  dot: 'bg-orange-500' },
  { key: 'golive',        label: 'Go-live ✓',   color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
]

const STAGE_ORDER: OnboardingStage[] = [
  'prospect', 'demo', 'trial', 'configuration', 'formation', 'golive',
]

function daysInStage(dateStr: string): number {
  const entered = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24))
}

function ChecklistBar({ checklist }: { checklist: OnboardingItem['checklist'] }) {
  const done = checklist.filter((c) => c.done).length
  const pct = checklist.length > 0 ? (done / checklist.length) * 100 : 0
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{done}/{checklist.length} étapes</span>
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
  const isStale = days > 14 && item.stage !== 'golive'

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

      <ChecklistBar checklist={item.checklist} />

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

  const total   = items.length
  const blocked = items.filter((o) => o.blocked).length
  const golive  = items.filter((o) => o.stage === 'golive').length

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
    setItems((prev) =>
      prev.map((it) =>
        it.id !== itemId ? it : { ...it, stage: nextStage, stage_entered_at: now }
      )
    )
    setSelected((prev) =>
      !prev || prev.id !== itemId ? prev : { ...prev, stage: nextStage, stage_entered_at: now }
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
              {total} prospects · {golive} go-live
              {blocked > 0 && (
                <span className="text-red-600 font-medium"> · {blocked} bloqué{blocked > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nouveau prospect
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
                    <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
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
            Nombre de jours dans l&apos;étape (rouge si &gt;14j)
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
