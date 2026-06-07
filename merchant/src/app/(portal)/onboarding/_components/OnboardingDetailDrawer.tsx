'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { OnboardingItem, OnboardingStage } from '@/types/merchant'
import {
  X, MapPin, User, AlertTriangle, CheckCircle2,
  Circle, ChevronRight, Flag, Send, MessageSquare, Download,
} from 'lucide-react'

const STAGES: { key: OnboardingStage; label: string; sub: string }[] = [
  { key: 'cadrage',          label: 'À Cadrer',         sub: 'Sem. 1' },
  { key: 'configuration_ia', label: 'Config. & IA',     sub: 'Sem. 1–2' },
  { key: 'formation_golive', label: 'Formation & GL',   sub: 'Sem. 3' },
  { key: 'suivi_adoption',   label: 'Suivi & Adoption', sub: 'Sem. 4–10' },
  { key: 'bilan_conversion', label: 'Bilan & Conv.',    sub: 'Sem. 11–12' },
]

const STAGE_INDEX: Record<OnboardingStage, number> = {
  cadrage: 0, configuration_ia: 1, formation_golive: 2, suivi_adoption: 3, bilan_conversion: 4,
}

// Seuils "en retard" par phase (alignés sur les timings Excel)
const STALE_DAYS: Record<OnboardingStage, number> = {
  cadrage:           7,
  configuration_ia:  14,
  formation_golive:  7,
  suivi_adoption:    49,
  bilan_conversion:  9999,
}

function daysAgo(dateStr: string): number {
  const entered = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24))
}

function daysInStage(dateStr: string): number {
  return daysAgo(dateStr)
}

// ── Alertes intelligentes ─────────────────────────────────────────────────────
interface SmartAlert { type: 'warning' | 'danger'; message: string }

function getSmartAlerts(item: OnboardingItem): SmartAlert[] {
  const alerts: SmartAlert[] = []
  const days = daysInStage(item.stage_entered_at)
  const staleThreshold = STALE_DAYS[item.stage]

  // Aucun contact depuis trop longtemps (hors dernière phase)
  const lastCommentDate = item.comments.length > 0
    ? item.comments[item.comments.length - 1].created_at
    : item.stage_entered_at
  const daysSinceContact = daysAgo(lastCommentDate)
  if (daysSinceContact > 14 && item.stage !== 'bilan_conversion') {
    alerts.push({ type: 'danger', message: `Aucun contact depuis ${daysSinceContact} jours — risque d'abandon` })
  }

  // Formation & Go-Live démarré trop rapidement (config IA pas complète)
  if (item.stage === 'formation_golive') {
    const totalDays = daysAgo(item.created_at)
    if (totalDays < 14) {
      alerts.push({ type: 'warning', message: 'Formation démarrée tôt — vérifiez que la configuration IA et QA sont complètes' })
    }
  }

  // Bilan & Conversion : ROI non rédigé après 14 jours
  if (item.stage === 'bilan_conversion' && days > 14) {
    const bilanDone = item.checklist.find(c =>
      c.label.toLowerCase().includes('bilan') || c.label.toLowerCase().includes('roi')
    )?.done
    if (!bilanDone) {
      alerts.push({ type: 'danger', message: `Conversion en cours depuis ${days} jours — Bilan ROI non finalisé` })
    }
  }

  // Retard dans la phase courante
  if (days > staleThreshold && item.stage !== 'bilan_conversion') {
    alerts.push({ type: 'warning', message: `${days} jours dans cette étape — à débloquer ou faire avancer` })
  }

  return alerts
}

// ── Export fiche client ───────────────────────────────────────────────────────
function exportFicheClient(item: OnboardingItem, currentStageLabel: string) {
  const done = item.checklist.filter(c => c.done).length
  const pct = item.checklist.length > 0 ? Math.round((done / item.checklist.length) * 100) : 0
  const lines: string[] = []

  lines.push(`FICHE ONBOARDING — ${item.org_name}`)
  lines.push('='.repeat(50))
  lines.push('')
  lines.push(`Pays          : ${item.country ?? '—'}`)
  lines.push(`Plan visé     : ${item.plan_target ?? '—'}`)
  lines.push(`Assigné à     : ${item.assigned_to ?? '—'}`)
  lines.push(`Phase actuelle: ${currentStageLabel}`)
  lines.push(`Progression   : ${done}/${item.checklist.length} (${pct}%)`)
  lines.push('')

  lines.push('CHECKLIST DE LA PHASE')
  lines.push('-'.repeat(30))
  item.checklist.forEach(c => {
    lines.push(`[${c.done ? 'x' : ' '}] ${c.label}`)
  })
  lines.push('')

  if (item.notes) {
    lines.push('NOTES')
    lines.push('-'.repeat(30))
    lines.push(item.notes)
    lines.push('')
  }

  if (item.comments.length > 0) {
    lines.push('HISTORIQUE COMMENTAIRES')
    lines.push('-'.repeat(30))
    item.comments.forEach(c => {
      const d = new Date(c.created_at).toLocaleDateString('fr-FR')
      lines.push(`[${d}] ${c.author.split('@')[0]} : ${c.content}`)
    })
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bluwa-onboarding-${item.org_name.toLowerCase().replace(/\s+/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function formatCommentDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
    ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  item: OnboardingItem | null
  onClose: () => void
  onToggleCheck: (itemId: string, checkId: string) => void
  onAdvanceStage: (itemId: string) => void
  onToggleBlocked: (itemId: string) => void
  onAddComment: (itemId: string, content: string) => void
}

export function OnboardingDetailDrawer({
  item, onClose, onToggleCheck, onAdvanceStage, onToggleBlocked, onAddComment,
}: Props) {
  const [commentText, setCommentText] = useState('')
  const [mounted, setMounted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [item, onClose])

  // Reset comment input when switching items
  useEffect(() => { setCommentText('') }, [item?.id])

  if (!item || !mounted) return null

  const days = daysInStage(item.stage_entered_at)
  const isStale = days > STALE_DAYS[item.stage]
  const done = item.checklist.filter((c) => c.done).length
  const pct = item.checklist.length > 0 ? (done / item.checklist.length) * 100 : 0
  const currentIdx = STAGE_INDEX[item.stage]
  const canAdvance = item.stage !== 'bilan_conversion' && !item.blocked
  const smartAlerts = getSmartAlerts(item)

  function submitComment() {
    const trimmed = commentText.trim()
    if (!trimmed) return
    onAddComment(item!.id, trimmed)
    setCommentText('')
    textareaRef.current?.focus()
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitComment()
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[440px] bg-white border-l border-gray-200 z-50 flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-semibold text-gray-900">{item.org_name}</p>
            <div className="flex items-center gap-3 mt-1">
              {item.country && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />{item.country}
                </span>
              )}
              {item.assigned_to && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <User className="w-3 h-3" />{item.assigned_to.split('@')[0]}
                </span>
              )}
              {item.plan_target && (
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {item.plan_target}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Pipeline — barre de progression 5 phases */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Phase actuelle</p>
            <div className="flex items-center gap-0.5">
              {STAGES.map((s, idx) => {
                const isActive = idx === currentIdx
                const isPast   = idx < currentIdx
                return (
                  <div key={s.key} className="flex items-center gap-0.5 flex-1 min-w-0">
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${isPast || isActive ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    {idx === STAGES.length - 1 && (
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive || isPast ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <span className="text-sm font-semibold text-blue-700">{STAGES[currentIdx].label}</span>
                <span className="text-xs text-gray-400 ml-2">{STAGES[currentIdx].sub}</span>
              </div>
              <span className={`text-xs font-medium ${isStale ? 'text-red-500' : 'text-gray-400'}`}>
                {days} jour{days > 1 ? 's' : ''} dans cette phase
              </span>
            </div>
          </div>

          {/* Alerte bloqué */}
          {item.blocked && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-red-700 mb-0.5">Bloqué</p>
                <p className="text-xs text-red-600 leading-snug">{item.blocked_reason}</p>
              </div>
            </div>
          )}

          {/* Alertes intelligentes */}
          {smartAlerts.length > 0 && (
            <div className="space-y-2">
              {smartAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2.5 border ${
                    alert.type === 'danger'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <p className={`text-xs leading-snug ${
                    alert.type === 'danger' ? 'text-red-700' : 'text-amber-700'
                  }`}>{alert.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Checklist de la phase</p>
              <span className="text-xs text-gray-400">{done}/{item.checklist.length} · {Math.round(pct)}%</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className="h-1 bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-0.5">
              {item.checklist.map((check) => (
                <button
                  key={check.id}
                  onClick={() => onToggleCheck(item.id, check.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  {check.done
                    ? <CheckCircle2 className="w-[18px] h-[18px] text-blue-500 shrink-0" />
                    : <Circle       className="w-[18px] h-[18px] text-gray-300 shrink-0 group-hover:text-gray-400 transition-colors" />
                  }
                  <span className={`text-sm leading-snug ${check.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {check.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5">{item.notes}</p>
            </div>
          )}

          {/* Commentaires */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Commentaires</p>
              {item.comments.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                  {item.comments.length}
                </span>
              )}
            </div>

            {item.comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-300 bg-gray-50 rounded-xl">
                <MessageSquare className="w-6 h-6 mb-1.5" />
                <p className="text-xs">Aucun commentaire</p>
              </div>
            ) : (
              <div className="space-y-3">
                {item.comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {c.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">{c.author.split('@')[0]}</span>
                        <span className="text-xs text-gray-400">{formatCommentDate(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl rounded-tl-sm px-3 py-2">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}

            {/* Saisie */}
            <div className="mt-3 flex gap-2 items-end">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-300 focus-within:bg-white transition-colors">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ajouter un commentaire… (Entrée pour envoyer)"
                  rows={2}
                  className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none bg-transparent outline-none leading-relaxed"
                />
              </div>
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 pl-1">Shift+Entrée pour un saut de ligne</p>
          </div>

        </div>

        {/* Actions footer */}
        <div className="border-t border-gray-100 px-5 py-4 space-y-2 shrink-0">
          {canAdvance && (
            <button
              onClick={() => onAdvanceStage(item.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Passer à : {STAGES[currentIdx + 1]?.label}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onToggleBlocked(item.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors border ${
                item.blocked
                  ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              <Flag className="w-4 h-4" />
              {item.blocked ? 'Débloquer' : 'Bloqué'}
            </button>
            <button
              onClick={() => exportFicheClient(item, STAGES[currentIdx].label)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Exporter la fiche client"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
