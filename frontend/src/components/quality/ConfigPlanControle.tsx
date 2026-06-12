'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Save, Loader2, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

interface SpecLigne {
  id?: string
  parametre: string
  unite: string
  valeur_min: string
  valeur_max: string
  type_analyse: string
  obligatoire: boolean
}

const TYPES_ANALYSE = ['PHYSICO_CHIMIQUE', 'MICROBIOLOGIQUE', 'PHYSIQUE', 'CHIMIQUE']

const TYPE_LABELS: Record<string, string> = {
  PHYSICO_CHIMIQUE: 'Physico-chimique',
  MICROBIOLOGIQUE:  'Microbiologique',
  PHYSIQUE:         'Physique',
  CHIMIQUE:         'Chimique',
}

export default function ConfigPlanControle({ articleId }: { articleId: string }) {
  const supabase = createClient()
  const [lignes, setLignes] = useState<SpecLigne[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('article_quality_specs')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      setLignes(data.map((r: any) => ({
        id:            r.id,
        parametre:     r.parametre ?? '',
        unite:         r.unite ?? '',
        valeur_min:    r.valeur_min != null ? String(r.valeur_min) : '',
        valeur_max:    r.valeur_max != null ? String(r.valeur_max) : '',
        type_analyse:  r.type_analyse ?? 'PHYSICO_CHIMIQUE',
        obligatoire:   r.obligatoire ?? true,
      })))
    } else {
      setLignes([emptyLigne()])
    }
    setLoading(false)
  }, [articleId, supabase])

  useEffect(() => { load() }, [load])

  function emptyLigne(): SpecLigne {
    return { parametre: '', unite: '', valeur_min: '', valeur_max: '', type_analyse: 'PHYSICO_CHIMIQUE', obligatoire: true }
  }

  function update(index: number, field: keyof SpecLigne, value: string | boolean) {
    setLignes(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  function addLigne() {
    setLignes(prev => [...prev, emptyLigne()])
  }

  function removeLigne(index: number) {
    setLignes(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    const valides = lignes.filter(l => l.parametre.trim())

    // Supprimer les specs existantes et recréer (upsert simple)
    await supabase.from('article_quality_specs').delete().eq('article_id', articleId)

    if (valides.length > 0) {
      await supabase.from('article_quality_specs').insert(
        valides.map(l => ({
          article_id:   articleId,
          parametre:    l.parametre.trim(),
          unite:        l.unite.trim() || null,
          valeur_min:   l.valeur_min !== '' ? parseFloat(l.valeur_min) : null,
          valeur_max:   l.valeur_max !== '' ? parseFloat(l.valeur_max) : null,
          type_analyse: l.type_analyse,
          obligatoire:  l.obligatoire,
        }))
      )
    }

    await load()
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Chargement des spécifications…
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Plan de contrôle — Spécifications laboratoire</h3>
        </div>
        <Button size="sm" variant="outline" onClick={addLigne} className="gap-1.5">
          <Plus className="size-3.5" />
          Ajouter un paramètre
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Paramètre</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[120px]">Unité</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[110px]">Min</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[110px]">Max</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[180px]">Type d&apos;analyse</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[90px]">Obligatoire</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/10">
                <td className="px-3 py-2">
                  <Input
                    value={ligne.parametre}
                    onChange={e => update(i, 'parametre', e.target.value)}
                    placeholder="ex : pH, Brix, Salmonella…"
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={ligne.unite}
                    onChange={e => update(i, 'unite', e.target.value)}
                    placeholder="ex : °Bx, pH…"
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    step="any"
                    value={ligne.valeur_min}
                    onChange={e => update(i, 'valeur_min', e.target.value)}
                    placeholder="—"
                    className="h-8 text-xs font-mono"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    step="any"
                    value={ligne.valeur_max}
                    onChange={e => update(i, 'valeur_max', e.target.value)}
                    placeholder="—"
                    className="h-8 text-xs font-mono"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={ligne.type_analyse}
                    onChange={e => update(i, 'type_analyse', e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {TYPES_ANALYSE.map(t => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={ligne.obligatoire}
                    onChange={e => update(i, 'obligatoire', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeLigne(i)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucun paramètre. Cliquez sur &quot;Ajouter un paramètre&quot; pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t flex items-center justify-end gap-3">
        <span className="text-xs text-muted-foreground">
          {lignes.filter(l => l.parametre.trim()).length} paramètre{lignes.filter(l => l.parametre.trim()).length !== 1 ? 's' : ''} défini{lignes.filter(l => l.parametre.trim()).length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <><Loader2 className="size-3.5 animate-spin" />Enregistrement…</> : <><Save className="size-3.5" />Enregistrer le plan</>}
        </Button>
      </div>
    </div>
  )
}
