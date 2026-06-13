'use client'

import { useState, useTransition } from 'react'
import { TrendingUp, Zap, Save, Check, AlertCircle } from 'lucide-react'
import { updateFactoryCostSettings } from '@/lib/actions/factory'

interface Props {
  factoryId:        string
  factoryName:      string
  ohRate:           number
  energieUnitCost:  number
  canEdit:          boolean
}

export function FactoryCostSettings({
  factoryId,
  factoryName,
  ohRate,
  energieUnitCost,
  canEdit,
}: Props) {
  const [pending, startTransition] = useTransition()

  // Affichage en % (0.08 → "8"), stockage interne en décimal
  const [ohInput,       setOhInput]       = useState(String(Math.round(ohRate * 100)))
  const [energieInput,  setEnergieInput]  = useState(String(energieUnitCost))
  const [feedback,      setFeedback]      = useState<{ ok: boolean; msg: string } | null>(null)

  function flash(ok: boolean, msg: string) {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 3500)
  }

  function handleSave() {
    const oh  = parseFloat(ohInput.replace(',', '.'))
    const nrj = parseFloat(energieInput.replace(',', '.'))

    if (isNaN(oh) || oh < 0 || oh > 100) {
      flash(false, 'Taux FG invalide (0 – 100 %)')
      return
    }
    if (isNaN(nrj) || nrj < 0) {
      flash(false, 'Coût énergie invalide (≥ 0)')
      return
    }

    startTransition(async () => {
      const res = await updateFactoryCostSettings(factoryId, oh / 100, nrj)
      if (res.error) flash(false, res.error)
      else            flash(true,  'Paramètres enregistrés')
    })
  }

  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      {/* Entête */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm">Paramètres de marge — {factoryName}</h2>
          <p className="text-xs text-muted-foreground">
            Utilisés dans le calcul du coût de revient standard (Analyse Marges).
          </p>
        </div>
      </div>

      {/* Champs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Taux FG */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3" />
            Taux Frais Généraux (OH)
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={ohInput}
              onChange={e => setOhInput(e.target.value)}
              disabled={!canEdit || pending}
              className="w-full pr-8 pl-3 py-2 text-sm rounded-lg border bg-background
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
              %
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Appliqué sur (coût matière + MOD/machine).
          </p>
        </div>

        {/* Énergie */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Zap className="size-3" />
            Forfait Énergie process
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              step={1}
              value={energieInput}
              onChange={e => setEnergieInput(e.target.value)}
              disabled={!canEdit || pending}
              className="w-full pr-14 pl-3 py-2 text-sm rounded-lg border bg-background
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
              XOF/u
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Vapeur, froid, eau — forfait par unité de PF produite.
          </p>
        </div>
      </div>

      {/* Aperçu formule */}
      <div className="rounded-lg bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground space-y-0.5">
        <p className="font-medium text-foreground/70">Formule coût de revient standard</p>
        <p>Coût total = Matière + MOD/Machine + FG <span className="text-emerald-600 dark:text-emerald-400">({ohInput || '?'} %)</span> + Énergie <span className="text-emerald-600 dark:text-emerald-400">({energieInput || '?'} XOF)</span></p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {feedback ? (
          <span className={`flex items-center gap-1.5 text-xs font-medium ${
            feedback.ok
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-500 dark:text-red-400'
          }`}>
            {feedback.ok
              ? <Check className="size-3.5" />
              : <AlertCircle className="size-3.5" />}
            {feedback.msg}
          </span>
        ) : (
          <span />
        )}

        {canEdit && (
          <button
            onClick={handleSave}
            disabled={pending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700
                       text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="size-3.5" />
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        )}

        {!canEdit && (
          <p className="text-xs text-muted-foreground italic">
            Réservé aux rôles owner / admin.
          </p>
        )}
      </div>
    </section>
  )
}
