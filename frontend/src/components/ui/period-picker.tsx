'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '7 jours',  value: '7d',  getRange: () => ({ from: startOfDay(subDays(new Date(), 6)),   to: endOfDay(new Date()) }) },
  { label: '1 mois',   value: '1m',  getRange: () => ({ from: startOfDay(subMonths(new Date(), 1)), to: endOfDay(new Date()) }) },
  { label: '3 mois',   value: '3m',  getRange: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }) },
  { label: '6 mois',   value: '6m',  getRange: () => ({ from: startOfDay(subMonths(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: '1 an',     value: '1a',  getRange: () => ({ from: startOfDay(subYears(new Date(), 1)),  to: endOfDay(new Date()) }) },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PeriodValue {
  preset?: string
  range?: DateRange
}

interface PeriodPickerProps {
  value?: PeriodValue
  onChange?: (value: PeriodValue) => void
  defaultPreset?: string
  className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLabel(value: PeriodValue): string {
  if (value.preset) {
    const p = PRESETS.find(p => p.value === value.preset)
    if (p) return p.label
  }
  if (value.range?.from) {
    if (value.range.to) {
      return `${format(value.range.from, 'd MMM', { locale: fr })} – ${format(value.range.to, 'd MMM yy', { locale: fr })}`
    }
    return format(value.range.from, 'd MMM yyyy', { locale: fr })
  }
  return 'Période'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PeriodPicker({ value, onChange, defaultPreset = '6m', className }: PeriodPickerProps) {
  const [open, setOpen] = React.useState(false)

  // Internal state when uncontrolled
  const [internalValue, setInternalValue] = React.useState<PeriodValue>(() => {
    if (value) return value
    const preset = PRESETS.find(p => p.value === defaultPreset) ?? PRESETS[3]
    return { preset: preset.value, range: preset.getRange() }
  })

  const current = value ?? internalValue

  const handlePreset = (preset: typeof PRESETS[number]) => {
    const next: PeriodValue = { preset: preset.value, range: preset.getRange() }
    setInternalValue(next)
    onChange?.(next)
    setOpen(false)
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    const next: PeriodValue = { range }
    setInternalValue(next)
    onChange?.(next)
    // Ne ferme que quand les deux bornes sont sélectionnées ET distinctes
    if (range?.from && range?.to && !isSameDay(range.from, range.to)) {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          className
        )}
      >
        <CalendarIcon className="size-3 shrink-0" />
        {formatLabel(current)}
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-0.5 border-r p-2 min-w-[110px]">
            {PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => handlePreset(preset)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted',
                  current.preset === preset.value
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-foreground'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <Calendar
            mode="range"
            selected={current.range}
            onSelect={handleRangeSelect}
            numberOfMonths={1}
            locale={fr}
            defaultMonth={current.range?.from}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
