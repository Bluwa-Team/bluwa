'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Bell, Loader2, CheckCircle2, XCircle, RefreshCw,
  ShoppingBag, Factory, Calculator, AlertTriangle, CircleDot,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  getMrpRecommendations, getLatestMrpRun,
  convertRecommendation, ignoreRecommendation,
} from '@/lib/actions/mrp'
import { runMrpEngine } from '@/lib/actions/mrp-engine'
import type { MrpRecommendationRow, MrpRun, MrpRecommendationStatus } from '@/types/erp'
import {
  MRP_ACTION_LABELS, MRP_ACTION_COLORS,
  MRP_REC_STATUS_LABELS, MRP_REC_STATUS_COLORS,
} from '@/types/erp'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MrpPage() {
  const locale = useLocale()

  const [filter,    setFilter]    = useState<MrpRecommendationStatus | 'ALL'>('NEW')
  const [recs,      setRecs]      = useState<MrpRecommendationRow[]>([])
  const [latestRun, setLatestRun] = useState<MrpRun | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [running,    setRunning]    = useState(false)
  const [runResult,  setRunResult]  = useState<{ count: number; error?: string } | null>(null)
  const [actingId,   setActingId]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [newRecs, run] = await Promise.all([
      getMrpRecommendations(filter),
      getLatestMrpRun(),
    ])
    setRecs(newRecs)
    setLatestRun(run)
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleConvert(rec: MrpRecommendationRow) {
    setActingId(rec.id)
    const updated = await convertRecommendation(rec.id)
    if (updated) setRecs(prev => prev.map(r => r.id === rec.id ? updated : r))
    setActingId(null)
  }

  async function handleRunEngine() {
    setRunning(true)
    setRunResult(null)
    const result = await runMrpEngine()
    setRunResult({ count: result.count, error: result.error })
    setRunning(false)
    await load()
  }

  async function handleIgnore(rec: MrpRecommendationRow) {
    setActingId(rec.id)
    const updated = await ignoreRecommendation(rec.id)
    if (updated) setRecs(prev => prev.map(r => r.id === rec.id ? updated : r))
    setActingId(null)
  }

  const counts = useMemo(() => ({
    NEW:       recs.filter(r => r.status === 'NEW').length,
    CONVERTED: recs.filter(r => r.status === 'CONVERTED').length,
    IGNORED:   recs.filter(r => r.status === 'IGNORED').length,
  }), [recs])

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MRP — Recommandations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Résultat du moteur MRP · Actions à valider pour éviter les ruptures de production.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border shrink-0">
          <CircleDot className="size-3 text-emerald-500" />
          Données réelles
        </div>
      </div>

      {/* ── Barre dernière passe ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
            <Bell className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Moteur MRP</p>
            {latestRun ? (
              <p className="text-xs text-muted-foreground">
                Dernière passe :{' '}
                <span className="font-mono">
                  {new Date(latestRun.executedAt).toLocaleString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {' · '}{latestRun.executedBySystem ? 'Planificateur auto' : 'Manuel'}
                {' · '}
                <span className={latestRun.status === 'SUCCESS' ? 'text-emerald-600' : 'text-red-500'}>
                  {latestRun.status}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Aucune passe MRP effectuée</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {runResult && !runResult.error && (
            <span className="text-xs text-emerald-600 font-medium">
              ✓ {runResult.count} recommandation{runResult.count > 1 ? 's' : ''} générée{runResult.count > 1 ? 's' : ''}
            </span>
          )}
          {runResult?.error && (
            <span className="text-xs text-red-500 font-medium">Erreur : {runResult.error}</span>
          )}
          <Button
            variant="outline" size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={load}
            disabled={loading || running}
          >
            {loading
              ? <Loader2 className="size-3.5 animate-spin" />
              : <RefreshCw className="size-3.5" />
            }
            Actualiser
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleRunEngine}
            disabled={running || loading}
          >
            {running
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Calculator className="size-3.5" />
            }
            {running ? 'Calcul en cours…' : 'Lancer le calcul MRP'}
          </Button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-3 grid-cols-3">
        <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Bell className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Nouvelles</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{counts.NEW}</p>
          <p className="text-xs text-muted-foreground mt-0.5">En attente de traitement</p>
        </div>
        <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Converties</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{counts.CONVERTED}</p>
          <p className="text-xs text-muted-foreground mt-0.5">DA ou OF créé</p>
        </div>
        <div className="rounded-xl border bg-muted/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
              <XCircle className="size-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Ignorées</span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground">{counts.IGNORED}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Rejetées manuellement</p>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Filtre :</span>
        {(['NEW', 'CONVERTED', 'IGNORED', 'ALL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {f === 'NEW' ? 'Nouvelles' : f === 'CONVERTED' ? 'Converties' : f === 'IGNORED' ? 'Ignorées' : 'Toutes'}
            {f === 'NEW' && counts.NEW > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-3.5 min-w-3.5 px-1 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                {counts.NEW}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Table recommandations ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : recs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Bell className="size-8 opacity-30" />
            <p className="text-sm font-medium">Aucune recommandation</p>
            <p className="text-xs">
              {filter === 'NEW'
                ? 'Toutes les recommandations ont été traitées ✓'
                : 'Lancez une passe MRP pour générer des recommandations.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide">Article</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide">Action</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Qté suggérée</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide">Date commande</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide">Date besoin</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs tracking-wide">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide">Décision</th>
                </tr>
              </thead>
              <tbody>
                {recs.map(rec => {
                  const isActing = actingId === rec.id
                  const reqDate  = new Date(rec.requiredDate)
                  const today    = new Date()
                  const daysLeft = Math.ceil((reqDate.getTime() - today.getTime()) / 86_400_000)
                  const urgent   = daysLeft <= 7 && rec.status === 'NEW'

                  return (
                    <tr
                      key={rec.id}
                      className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${
                        urgent ? 'bg-red-50/40 dark:bg-red-950/10' : ''
                      }`}
                    >
                      {/* Article */}
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[200px]" title={rec.articleLabel}>
                          {rec.articleLabel}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">{rec.articleSku}</p>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${MRP_ACTION_COLORS[rec.actionType]}`}>
                          {rec.actionType === 'BUY'
                            ? <ShoppingBag className="size-3 shrink-0" />
                            : rec.actionType === 'PRODUCE'
                              ? <Factory className="size-3 shrink-0" />
                              : <RefreshCw className="size-3 shrink-0" />
                          }
                          {MRP_ACTION_LABELS[rec.actionType]}
                        </span>
                      </td>

                      {/* Quantité */}
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatNumber(rec.suggestedQuantity, locale)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{rec.articleUnit}</span>
                      </td>

                      {/* Date commande */}
                      <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">
                        {new Date(rec.suggestedOrderDate).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>

                      {/* Date besoin */}
                      <td className="px-4 py-3 text-center">
                        <p className="font-mono text-xs">
                          {new Date(rec.requiredDate).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                        {rec.status === 'NEW' && (
                          <p className={`text-[10px] font-medium mt-0.5 ${urgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {daysLeft < 0
                              ? `Dépassé de ${-daysLeft}j`
                              : daysLeft === 0
                                ? "Aujourd'hui"
                                : `J-${daysLeft}`
                            }
                          </p>
                        )}
                        {urgent && <AlertTriangle className="size-3 text-red-500 mx-auto mt-0.5" />}
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${MRP_REC_STATUS_COLORS[rec.status]}`}>
                          {MRP_REC_STATUS_LABELS[rec.status]}
                        </span>
                      </td>

                      {/* Décision */}
                      <td className="px-4 py-3">
                        {rec.status === 'NEW' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleConvert(rec)}
                              disabled={isActing}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isActing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3 shrink-0" />}
                              Valider
                            </button>
                            <button
                              onClick={() => handleIgnore(rec)}
                              disabled={isActing}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 border transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isActing ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3 shrink-0" />}
                              Ignorer
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground text-right block">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer explicatif */}
        <div className="px-5 py-3 border-t bg-muted/10 flex items-start gap-2">
          <Calculator className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium">Valider</span> crée une DA (BUY) ou un OF (PRODUCE) et verrouille la recommandation ·{' '}
            <span className="font-medium">Ignorer</span> rejette sans créer de document ·{' '}
            Les décisions sont immuables (audit trail complet).
          </p>
        </div>
      </div>

    </div>
  )
}
