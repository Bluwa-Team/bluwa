'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type ResizableColumn = {
  id: string
  /** Fixed width in px. Use `null` for the flexible column that fills the
   *  remaining space (it cannot be resized directly). */
  defaultWidth: number | null
  minWidth?: number
}

type WidthMap = Record<string, number>

/**
 * Column-width management for a `table-fixed` table.
 * - Non-null `defaultWidth` columns get a fixed width and can be resized.
 * - The single `null` column flexes to absorb the remaining space.
 * - User overrides persist to localStorage under `storageKey`.
 */
export function useResizableColumns(storageKey: string, columns: ResizableColumn[]) {
  const defaults = useMemo(() => {
    const d: WidthMap = {}
    for (const c of columns) if (c.defaultWidth != null) d[c.id] = c.defaultWidth
    return d
  }, [columns])

  const [widths, setWidths] = useState<WidthMap>(defaults)

  // Hydrate from localStorage after mount. This deliberately runs post-mount
  // (not via a lazy initializer) so server and client first render produce the
  // same markup; the one extra render is intentional and avoids a hydration
  // mismatch on the persisted column widths.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw) as WidthMap
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWidths((prev) => ({ ...prev, ...saved }))
      }
    } catch {}
  }, [storageKey])

  const startResize = useCallback(
    (id: string, clientX: number) => {
      const col = columns.find((c) => c.id === id)
      if (!col || col.defaultWidth == null) return

      const startX = clientX
      const startW = widths[id] ?? col.defaultWidth
      const min = col.minWidth ?? 64
      let latest = startW

      const move = (e: MouseEvent | TouchEvent) => {
        const x = 'touches' in e ? e.touches[0]?.clientX ?? startX : e.clientX
        if ('touches' in e) e.preventDefault()
        latest = Math.max(min, Math.round(startW + (x - startX)))
        setWidths((prev) => ({ ...prev, [id]: latest }))
      }
      const end = () => {
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', end)
        window.removeEventListener('touchmove', move)
        window.removeEventListener('touchend', end)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        // Only column `id` changed during this drag, so the start-of-drag
        // snapshot plus the new value is the accurate final state.
        const next = { ...widths, [id]: latest }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {}
      }

      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', end)
      window.addEventListener('touchmove', move, { passive: false })
      window.addEventListener('touchend', end)
    },
    [columns, storageKey, widths]
  )

  const reset = useCallback(() => {
    setWidths(defaults)
    try {
      localStorage.removeItem(storageKey)
    } catch {}
  }, [defaults, storageKey])

  const isCustomized = useMemo(
    () => Object.keys(defaults).some((k) => widths[k] !== defaults[k]),
    [widths, defaults]
  )

  return { widths, startResize, reset, isCustomized }
}

/** Drag handle rendered on the right edge of a resizable `<th>`. */
export function ColumnResizer({
  columnId,
  onStart,
}: {
  columnId: string
  onStart: (id: string, clientX: number) => void
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onStart(columnId, e.clientX)
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        onStart(columnId, e.touches[0].clientX)
      }}
      className="group absolute top-0 right-0 z-10 flex h-full w-3.5 translate-x-1/2 cursor-col-resize touch-none items-center justify-center"
    >
      <span className="h-2/3 w-px bg-border transition-all group-hover:w-0.5 group-hover:bg-primary group-active:bg-primary" />
    </span>
  )
}
