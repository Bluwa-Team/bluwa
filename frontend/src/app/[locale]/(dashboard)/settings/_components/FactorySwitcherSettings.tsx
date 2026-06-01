'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Factory } from 'lucide-react'
import { switchFactory, type Factory as FactoryType } from '@/lib/actions/factory'

interface Props {
  factories:       FactoryType[]
  activeFactoryId: string | null
}

export function FactorySwitcherSettings({ factories, activeFactoryId }: Props) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSwitch(id: string) {
    if (id === activeFactoryId) return
    startTransition(async () => {
      await switchFactory(id)
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
          <Factory className="size-4 text-teal-600 dark:text-teal-400" />
        </div>
        <h2 className="font-semibold text-sm">Sites de production</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {factories.length} site{factories.length > 1 ? 's' : ''}
        </span>
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
                disabled={pending || isActive}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  isActive
                    ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30'
                    : 'border-transparent bg-muted/40 hover:bg-muted/70 hover:border-border cursor-pointer'
                }`}
              >
                {/* Badge code */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {f.code.slice(0, 3)}
                </div>

                {/* Infos */}
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

                {/* Indicateur actif */}
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
  )
}
