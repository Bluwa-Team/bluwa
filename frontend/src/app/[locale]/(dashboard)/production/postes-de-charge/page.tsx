'use client'

import { useState, useEffect } from 'react'
import { Factory, Plus, Pencil, Power, Clock, Zap, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkCenter } from '@/types/erp'
import type { WorkCenterInput } from '@/lib/actions/work-centers'
import {
  getAllWorkCenters,
  createWorkCenter,
  updateWorkCenter,
} from '@/lib/actions/work-centers'
import { WorkCenterModal } from './_components/work-center-modal'
import { HelpPopover }     from '@/components/ui/help-popover'

// ── Helpers ───────────────────────────────────────────────────────────────────

function CapacityBar({ efficiency }: { efficiency: number }) {
  const color =
    efficiency >= 90 ? 'bg-emerald-500' :
    efficiency >= 70 ? 'bg-amber-400' :
    'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(efficiency, 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-muted-foreground">
        {efficiency}%
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PostesDeChargePage() {
  const [workCenters, setWorkCenters]     = useState<WorkCenter[]>([])
  const [loading, setLoading]             = useState(true)
  const [modalOpen, setModalOpen]         = useState(false)
  const [selected, setSelected]           = useState<WorkCenter | null>(null)
  const [togglingId, setTogglingId]       = useState<string | null>(null)

  useEffect(() => {
    getAllWorkCenters().then((data) => {
      setWorkCenters(data)
      setLoading(false)
    })
  }, [])

  async function handleSave(data: WorkCenterInput) {
    if (selected) {
      const updated = await updateWorkCenter(selected.id, data)
      if (!updated) throw new Error('update failed')
      setWorkCenters((prev) => prev.map((w) => w.id === updated.id ? updated : w))
    } else {
      const created = await createWorkCenter(data)
      if (!created) throw new Error('create failed')
      setWorkCenters((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    }
  }

  async function handleToggleActive(wc: WorkCenter) {
    setTogglingId(wc.id)
    const updated = await updateWorkCenter(wc.id, { isActive: !wc.isActive })
    if (updated) {
      setWorkCenters((prev) => prev.map((w) => w.id === updated.id ? updated : w))
    }
    setTogglingId(null)
  }

  function openCreate() { setSelected(null); setModalOpen(true) }
  function openEdit(wc: WorkCenter) { setSelected(wc); setModalOpen(true) }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const active = workCenters.filter((w) => w.isActive)
  const totalCapacityH = active.reduce((s, w) => s + w.dailyCapacityHours * w.efficiencyPercentage / 100, 0)
  const avgEfficiency  = active.length > 0
    ? active.reduce((s, w) => s + w.efficiencyPercentage, 0) / active.length
    : 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Postes de charge</h1>
            <HelpPopover section="postesDeCharge" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lignes de production, équipements et coûts horaires
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="size-4" />
          Nouveau poste
        </Button>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Factory className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Postes actifs</p>
            <p className="text-2xl font-bold tabular-nums">{active.length}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Clock className="size-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Capacité effective / jour</p>
            <p className="text-2xl font-bold tabular-nums">{totalCapacityH.toFixed(1)} <span className="text-base font-normal text-muted-foreground">h</span></p>
          </div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Zap className="size-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">TRS moyen</p>
            <p className="text-2xl font-bold tabular-nums">{avgEfficiency.toFixed(0)} <span className="text-base font-normal text-muted-foreground">%</span></p>
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Chargement…
        </div>
      ) : workCenters.length === 0 ? (
        <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-20 gap-3">
          <Factory className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun poste de charge défini.</p>
          <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="size-3.5" />
            Créer le premier poste
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide text-muted-foreground w-[120px]">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide text-muted-foreground">Nom</th>
                <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide text-muted-foreground w-[140px]">Taux horaire</th>
                <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide text-muted-foreground w-[110px]">Capacité (h/j)</th>
                <th className="px-4 py-3 font-semibold text-xs tracking-wide text-muted-foreground w-[160px]">TRS</th>
                <th className="text-right px-4 py-3 font-semibold text-xs tracking-wide text-muted-foreground w-[140px]">Cap. effective</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wide text-muted-foreground w-[90px]">Statut</th>
                <th className="px-4 py-3 w-[80px]" />
              </tr>
            </thead>
            <tbody>
              {workCenters.map((wc) => {
                const capEff   = (wc.dailyCapacityHours * wc.efficiencyPercentage / 100).toFixed(1)
                const isToggling = togglingId === wc.id
                return (
                  <tr key={wc.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${!wc.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      {wc.code ? (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono bg-slate-100 text-slate-700">
                          {wc.code}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Factory className="size-3.5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{wc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-sm">
                      {wc.ratePerHour > 0 ? (
                        <span>
                          <strong>{wc.ratePerHour.toLocaleString('fr-FR')}</strong>
                          <span className="text-xs text-muted-foreground ml-1">XOF/h</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-sm">
                      {wc.dailyCapacityHours} h
                    </td>
                    <td className="px-4 py-3">
                      <CapacityBar efficiency={wc.efficiencyPercentage} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold tabular-nums text-sm">
                        {capEff} h
                      </span>
                      {wc.ratePerHour > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          ≈ {Math.round(parseFloat(capEff) * wc.ratePerHour).toLocaleString('fr-FR')} XOF/j
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        wc.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {wc.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(wc)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(wc)}
                          disabled={isToggling}
                          className={`p-1.5 rounded transition-colors ${
                            wc.isActive
                              ? 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50'
                              : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={wc.isActive ? 'Désactiver' : 'Activer'}
                        >
                          <Power className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <WorkCenterModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelected(null) }}
        workCenter={selected}
        onSave={handleSave}
      />
    </div>
  )
}
