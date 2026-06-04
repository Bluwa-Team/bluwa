'use client'

import { useState } from 'react'
import { Check, Plus, X, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SelectWithAddProps {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  /** Persiste une nouvelle valeur. Retourne true si succès. */
  onAdd: (value: string) => Promise<boolean>
  /** Texte du champ d'ajout, ex: "Nouvelle famille". */
  addPlaceholder?: string
  className?: string
}

/**
 * Select enrichissable : liste déroulante classique + bouton « + » qui ouvre
 * un champ inline pour ajouter une valeur au référentiel. La valeur ajoutée
 * est immédiatement sélectionnée.
 */
export function SelectWithAdd({
  value,
  onValueChange,
  options,
  placeholder = 'Sélectionner…',
  disabled = false,
  onAdd,
  addPlaceholder = 'Nouvelle valeur',
  className,
}: SelectWithAddProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  async function confirmAdd() {
    const v = draft.trim()
    if (!v) return
    setSaving(true)
    const ok = await onAdd(v)
    setSaving(false)
    if (ok) {
      onValueChange(v)
      setDraft('')
      setAdding(false)
    }
  }

  function cancelAdd() {
    setDraft('')
    setAdding(false)
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={addPlaceholder}
          disabled={saving}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmAdd() }
            if (e.key === 'Escape') { e.preventDefault(); cancelAdd() }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          size="icon"
          variant="default"
          className="size-8 shrink-0"
          onClick={confirmAdd}
          disabled={saving || !draft.trim()}
          title="Valider"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 shrink-0"
          onClick={cancelAdd}
          disabled={saving}
          title="Annuler"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={value} onValueChange={(v) => onValueChange(v ?? '')} disabled={disabled}>
        <SelectTrigger className={className ?? 'w-full'}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-8 shrink-0"
        onClick={() => setAdding(true)}
        disabled={disabled}
        title="Ajouter"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}
