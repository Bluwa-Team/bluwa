'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

interface Props {
  page:     number
  total:    number
  pageSize: number
  loading?: boolean
  onPage:   (p: number) => void
}

export function Paginator({ page, total, pageSize, loading, onPage }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = page * pageSize + 1
  const to   = Math.min((page + 1) * pageSize, total)

  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-sm text-muted-foreground">
        {from}–{to} sur {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="sm"
          className="h-8 w-8 p-0"
          disabled={page === 0 || loading}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium px-3">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline" size="sm"
          className="h-8 w-8 p-0"
          disabled={page >= totalPages - 1 || loading}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
