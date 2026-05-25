'use client'

import { useRef, useState } from 'react'
import { Upload, FileCheck, X } from 'lucide-react'

interface Props {
  label?: string
  accept?: string
  file: File | null
  onFile: (file: File | null) => void
}

export function DragDrop({
  label = 'Glisser un fichier PDF ici',
  accept = '.pdf',
  file,
  onFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFile(e.target.files?.[0] ?? null)
  }

  return (
    <div
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-lg border-2 border-dashed px-6 py-7 text-center transition-colors ${
        file
          ? 'border-emerald-400 bg-emerald-50/60'
          : dragging
          ? 'border-blue-400 bg-blue-50/60 cursor-copy'
          : 'border-muted-foreground/30 hover:border-muted-foreground/50 cursor-pointer'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <FileCheck className="size-5 text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-700 font-medium truncate max-w-[240px]">
            {file.name}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFile(null) }}
            className="p-1 rounded hover:bg-emerald-200 text-emerald-600 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="size-5" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs">Cliquer pour parcourir ou glisser-déposer</p>
        </div>
      )}
    </div>
  )
}
