'use client'

import { Popover } from '@base-ui/react/popover'
import { HelpCircle, X } from 'lucide-react'
import { HELP_CONTENT } from '@/config/help-content'

// ── HelpPopover ────────────────────────────────────────────────────────────────
// Usage : <HelpPopover section="reception" />
// Place it next to any page section title — renders a ? icon that opens a popover.

export function HelpPopover({ section }: { section: string }) {
  const entry = HELP_CONTENT[section]
  if (!entry) return null

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Aide contextuelle"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors shrink-0"
      >
        <HelpCircle className="size-3.5" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
          <Popover.Popup className="w-[min(320px,90vw)] rounded-xl border bg-card shadow-lg outline-none origin-(--transform-origin) data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">

            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{entry.icon}</span>
                <Popover.Title className="text-sm font-semibold">{entry.title}</Popover.Title>
              </div>
              <Popover.Close className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5">
                <X className="size-3" />
              </Popover.Close>
            </div>

            {/* Description */}
            <Popover.Description className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
              {entry.description}
            </Popover.Description>

            {/* Tips */}
            <div className="px-4 pb-3 space-y-1.5">
              {entry.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 text-muted-foreground/50 shrink-0">→</span>
                  <span className="leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>

            {/* Glossary */}
            {entry.glossary && entry.glossary.length > 0 && (
              <div className="px-4 pb-4 pt-2 border-t space-y-1.5">
                {entry.glossary.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {g.term && (
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] shrink-0 leading-tight mt-0.5">
                        {g.term}
                      </span>
                    )}
                    <span className="text-muted-foreground leading-relaxed">{g.def}</span>
                  </div>
                ))}
              </div>
            )}

          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
