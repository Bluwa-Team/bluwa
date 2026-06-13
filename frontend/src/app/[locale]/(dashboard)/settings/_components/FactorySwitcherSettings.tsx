'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Factory, Plus, X, AlertCircle } from 'lucide-react'
import {
  switchFactory,
  createFactory,
  type Factory as FactoryType,
} from '@/lib/actions/factory'

interface Props {
  factories:       FactoryType[]
  activeFactoryId: string | null
  canAdd:          boolean   // true si owner ou admin
}

// Dérive un code court depuis le nom (ex: "Usine Dakar 2" → "USDA")
function nameToCode(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // retire accents
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 5)
}

export function FactorySwitcherSettings({ factories, activeFactoryId, canAdd }: Props) {
  const [switching, startSwitch]   = useTransition()
  const [creating,  startCreate]   = useTransition()
  const router = useRouter()

  // État de la modale
  const [open,        setOpen]        = useState(false)
  const [name,        setName]        = useState('')
  const [code,        setCode]        = useState('')
  const [country,     setCountry]     = useState('Sénégal')
  const [ohInput,     setOhInput]     = useState('8')
  const [nrgInput,    setNrgInput]    = useState('50')
  const [formError,   setFormError]   = useState<string | null>(null)

  function openModal() {
    setName(''); setCode(''); setCountry('Sénégal')
    setOhInput('8'); setNrgInput('50'); setFormError(null)
    setOpen(true)
  }

  function handleNameChange(v: string) {
    setName(v)
    // Auto-dérive le code seulement si l'utilisateur ne l'a pas modifié manuellement
    setCode(nameToCode(v))
  }

  function handleSwitch(id: string) {
    if (id === activeFactoryId) return
    startSwitch(async () => {
      await switchFactory(id)
      router.refresh()
    })
  }

  function handleCreate() {
    const oh  = parseFloat(ohInput.replace(',', '.'))
    const nrj = parseFloat(nrgInput.replace(',', '.'))

    if (!name.trim())              { setFormError('Le nom est requis');                return }
    if (!code.trim())              { setFormError('Le code est requis');               return }
    if (isNaN(oh)  || oh  < 0 || oh  > 100) { setFormError('Taux FG invalide (0–100 %)'); return }
    if (isNaN(nrj) || nrj < 0)    { setFormError('Coût énergie invalide (≥ 0)');     return }

    startCreate(async () => {
      const res = await createFactory({ name, code, country, ohRate: oh / 100, energieUnitCost: nrj })
      if (res.error) { setFormError(res.error); return }
      // Switcher automatiquement vers le nouveau site puis fermer
      if (res.factory) await switchFactory(res.factory.id)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
            <Factory className="size-4 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="font-semibold text-sm">Sites de production</h2>
          <span className="text-xs text-muted-foreground">
            {factories.length} site{factories.length > 1 ? 's' : ''}
          </span>

          {canAdd && (
            <button
              onClick={openModal}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg border border-teal-300
                         dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300
                         text-xs font-medium hover:bg-teal-100 dark:hover:bg-teal-950/50 transition-colors"
            >
              <Plus className="size-3" />
              Ajouter un site
            </button>
          )}
        </div>

        {factories.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucun site assigné.</p>
        ) : (
          <div className="space-y-2">
            {factories.map(f => {
              const isActive = f.id === activeFactoryId
              return (
                <button
                  key={f.id}
                  onClick={() => handleSwitch(f.id)}
                  disabled={switching || isActive}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    isActive
                      ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30'
                      : 'border-transparent bg-muted/40 hover:bg-muted/70 hover:border-border cursor-pointer'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive ? 'bg-teal-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {f.code.slice(0, 3)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{f.name}</p>
                      {!f.is_active && (
                        <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-500 px-1.5 py-0.5 rounded shrink-0">
                          Inactif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[f.city, f.country].filter(Boolean).join(', ')}
                    </p>
                  </div>

                  {isActive && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Check className="size-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-medium text-teal-600 dark:text-teal-400">Actif</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {factories.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Cliquez sur un site pour le définir comme contexte actif.
          </p>
        )}
      </section>

      {/* ── Modale "Ajouter un site" ───────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl p-6 space-y-5">

            {/* En-tête modale */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                  <Factory className="size-4 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="font-semibold text-sm">Nouveau site de production</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            {/* Champs */}
            <div className="space-y-4">

              {/* Nom */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nom du site *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ex: Usine Dakar Nord"
                  disabled={creating}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background
                             focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                             disabled:opacity-50"
                />
              </div>

              {/* Code + Pays — sur 2 colonnes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Code court *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase().slice(0, 20))}
                    placeholder="DAK2"
                    disabled={creating}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-mono
                               focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                               disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Pays</label>
                  <input
                    type="text"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="Sénégal"
                    disabled={creating}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background
                               focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                               disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Séparateur coûts */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-3">Paramètres de marge</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Taux FG (OH)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0} max={100} step={0.5}
                        value={ohInput}
                        onChange={e => setOhInput(e.target.value)}
                        disabled={creating}
                        className="w-full pr-8 pl-3 py-2 text-sm rounded-lg border bg-background
                                   focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                                   disabled:opacity-50"
                        placeholder="8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Forfait Énergie</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0} step={1}
                        value={nrgInput}
                        onChange={e => setNrgInput(e.target.value)}
                        disabled={creating}
                        className="w-full pr-14 pl-3 py-2 text-sm rounded-lg border bg-background
                                   focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                                   disabled:opacity-50"
                        placeholder="50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">XOF/u</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Erreur */}
              {formError && (
                <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            {/* Boutons */}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={creating}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border hover:bg-muted transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Création…' : 'Créer le site'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
