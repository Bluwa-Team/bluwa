'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Check, Factory } from 'lucide-react'
import { switchFactory, type Factory as FactoryType } from '@/lib/actions/factory'

interface Props {
  factories:       FactoryType[]
  activeFactoryId: string | null
}

export function FactorySwitcher({ factories, activeFactoryId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const active = factories.find(f => f.id === activeFactoryId) ?? factories[0]

  if (!active || factories.length === 0) return null

  function handleSwitch(id: string) {
    if (id === active?.id) { setOpen(false); return }
    setOpen(false)
    startTransition(async () => {
      await switchFactory(id)
      router.refresh()
    })
  }

  return (
    <div className="relative group-data-[collapsible=icon]:hidden">
      {/* Bouton usine active */}
      <button
        onClick={() => setOpen(!open)}
        disabled={pending || factories.length <= 1}
        className="w-full flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
      >
        <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
          <Factory className="size-3 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate leading-none">{active.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{active.code} · {active.country}</p>
        </div>
        {factories.length > 1 && (
          <ChevronDown className={`size-3 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-full min-w-[200px] bg-popover border rounded-xl shadow-lg overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 border-b">
              Changer d&apos;usine
            </p>
            {factories.map(f => (
              <button
                key={f.id}
                onClick={() => handleSwitch(f.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted transition-colors"
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  f.id === active.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {f.code.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">{[f.city, f.country].filter(Boolean).join(', ')}</p>
                </div>
                {f.id === active.id && <Check className="size-3.5 text-primary shrink-0" />}
                {!f.is_active && (
                  <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded">Inactif</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
