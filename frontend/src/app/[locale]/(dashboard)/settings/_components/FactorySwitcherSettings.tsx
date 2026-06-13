'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Factory, Plus, X, Mail } from 'lucide-react'
import { switchFactory, type Factory as FactoryType } from '@/lib/actions/factory'

interface Props {
  factories:       FactoryType[]
  activeFactoryId: string | null
  canAdd:          boolean
}

export function FactorySwitcherSettings({ factories, activeFactoryId, canAdd }: Props) {
  const [switching, startSwitch] = useTransition()
  const router = useRouter()
  const [infoOpen, setInfoOpen] = useState(false)

  function handleSwitch(id: string) {
    if (id === activeFactoryId) return
    startSwitch(async () => {
      await switchFactory(id)
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
              onClick={() => setInfoOpen(true)}
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

      {/* ── Modale information extension infrastructure ─────────────────────── */}
      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl overflow-hidden">

            {/* Bandeau */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Factory className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Bluwa ERP</p>
                    <p className="text-teal-100 text-xs">Extension d&apos;infrastructure</p>
                  </div>
                </div>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
                >
                  <X className="size-4 text-white" />
                </button>
              </div>
            </div>

            {/* Corps */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-foreground leading-relaxed">
                Extension de votre infrastructure — Pour ajouter un nouveau site de production
                (usine, entrepôt, comptoir) à votre espace Bluwa, veuillez contacter votre
                gestionnaire de compte ou envoyer une demande à{' '}
                <a
                  href="mailto:commercial@bluwa.io"
                  className="font-medium text-teal-600 dark:text-teal-400 hover:underline"
                >
                  commercial@bluwa.io
                </a>{' '}
                afin d&apos;ajuster votre offre tarifaire.
              </p>

              <div className="flex gap-3 pt-1">
                <a
                  href="mailto:commercial@bluwa.io?subject=Demande%20d%27ajout%20de%20site%20de%20production"
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl
                             bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors"
                >
                  <Mail className="size-3.5" />
                  Contacter commercial@bluwa.io
                </a>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-medium hover:bg-muted transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
