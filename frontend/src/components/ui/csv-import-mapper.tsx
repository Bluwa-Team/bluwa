'use client'

import { useState, useMemo, useRef } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, ArrowRight, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import { parseCsvFile, type ParsedCsv } from '@/lib/csv-utils'

export interface CsvField {
  key: string
  label: string
  required?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  /** Champs cibles Bluwa (la clé est utilisée dans les lignes mappées). */
  fields: CsvField[]
  /** Titre du type d'entité importé, ex: "articles". */
  entityLabel: string
  /** Reçoit les lignes mappées (clés = field.key) et crée les entités. */
  onImport: (rows: Record<string, string>[]) => Promise<{ created: number; errors: number }>
}

const IGNORE = '__ignore__'

/** Normalise pour le rapprochement auto : minuscule, sans accent ni séparateur. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Devine la colonne source la plus proche d'un champ cible. */
function guessColumn(field: CsvField, headers: string[]): string {
  const targets = [norm(field.key), norm(field.label)]
  // 1. Correspondance exacte
  for (const h of headers) {
    if (targets.includes(norm(h))) return h
  }
  // 2. Correspondance partielle (l'un contient l'autre)
  for (const h of headers) {
    const nh = norm(h)
    if (targets.some((t) => t && (nh.includes(t) || t.includes(nh)))) return h
  }
  return IGNORE
}

export function CsvImportMapper({ open, onClose, fields, entityLabel, onImport }: Props) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; errors: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setParsed(null)
    setMapping({})
    setImporting(false)
    setResult(null)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError(null)
    try {
      const data = await parseCsvFile(file)
      if (data.headers.length === 0 || data.rows.length === 0) {
        setError('Le fichier est vide ou illisible.')
        return
      }
      setParsed(data)
      // Auto-mapping
      const auto: Record<string, string> = {}
      for (const f of fields) auto[f.key] = guessColumn(f, data.headers)
      setMapping(auto)
    } catch {
      setError('Impossible de lire ce fichier CSV.')
    }
  }

  const missingRequired = useMemo(
    () => fields.filter((f) => f.required && (!mapping[f.key] || mapping[f.key] === IGNORE)),
    [fields, mapping],
  )

  const previewRows = useMemo(() => {
    if (!parsed) return []
    return parsed.rows.slice(0, 3).map((row) => {
      const mapped: Record<string, string> = {}
      for (const f of fields) {
        const src = mapping[f.key]
        mapped[f.key] = src && src !== IGNORE ? (row[src] ?? '') : ''
      }
      return mapped
    })
  }, [parsed, mapping, fields])

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    setError(null)
    const mappedRows = parsed.rows.map((row) => {
      const mapped: Record<string, string> = {}
      for (const f of fields) {
        const src = mapping[f.key]
        mapped[f.key] = src && src !== IGNORE ? (row[src] ?? '') : ''
      }
      return mapped
    })
    try {
      const res = await onImport(mappedRows)
      setResult(res)
    } catch {
      setError("L'import a échoué. Vérifiez le mapping et réessayez.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="w-[min(720px,94vw)] max-h-[88vh] flex flex-col rounded-xl border bg-card shadow-lg">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="size-[18px] text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-base leading-tight">Importer des {entityLabel}</p>
                  <p className="text-xs text-muted-foreground">Associez les colonnes de votre fichier aux champs Bluwa</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handleClose}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto">

              {/* Étape résultat */}
              {result ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="font-semibold">Import terminé</p>
                  <p className="text-sm text-muted-foreground">
                    {result.created} {entityLabel} importé{result.created !== 1 ? 's' : ''}
                    {result.errors > 0 && ` · ${result.errors} ligne${result.errors !== 1 ? 's' : ''} ignorée${result.errors !== 1 ? 's' : ''}`}
                  </p>
                </div>
              ) : !parsed ? (
                /* Étape 1 : sélection du fichier */
                <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Choisissez un fichier CSV</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Les colonnes peuvent avoir n'importe quel nom, vous les associerez ensuite.
                    </p>
                  </div>
                  <Button onClick={() => fileRef.current?.click()} className="gap-1.5">
                    <Upload className="size-4" /> Parcourir
                  </Button>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
                </div>
              ) : (
                /* Étape 2 : mapping */
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {parsed.rows.length} ligne{parsed.rows.length !== 1 ? 's' : ''} détectée{parsed.rows.length !== 1 ? 's' : ''} · {parsed.headers.length} colonne{parsed.headers.length !== 1 ? 's' : ''}
                    </span>
                    <button onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline">
                      Changer de fichier
                    </button>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
                  </div>

                  {/* Mapping fields */}
                  <div className="space-y-2">
                    {fields.map((f) => {
                      const isMissing = f.required && (!mapping[f.key] || mapping[f.key] === IGNORE)
                      return (
                        <div key={f.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="text-sm font-medium flex items-center gap-1">
                            {f.label}
                            {f.required && <span className="text-destructive">*</span>}
                          </div>
                          <ArrowRight className="size-3.5 text-muted-foreground" />
                          <Select
                            value={mapping[f.key] ?? IGNORE}
                            onValueChange={(v) => setMapping((prev) => ({ ...prev, [f.key]: v ?? IGNORE }))}
                          >
                            <SelectTrigger className={`w-full ${isMissing ? 'border-destructive' : ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={IGNORE}>
                                <span className="text-muted-foreground">— Ignorer —</span>
                              </SelectItem>
                              {parsed.headers.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>

                  {/* Aperçu */}
                  {previewRows.length > 0 && (
                    <div className="rounded-lg border overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40">
                          <tr>
                            {fields.filter((f) => mapping[f.key] && mapping[f.key] !== IGNORE).map((f) => (
                              <th key={f.key} className="px-2.5 py-1.5 text-left font-semibold whitespace-nowrap">{f.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr key={i} className="border-t">
                              {fields.filter((f) => mapping[f.key] && mapping[f.key] !== IGNORE).map((f) => (
                                <td key={f.key} className="px-2.5 py-1.5 whitespace-nowrap text-muted-foreground">
                                  {row[f.key] || <span className="opacity-40">vide</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {missingRequired.length > 0 && (
                    <p className="text-xs text-destructive">
                      Champs obligatoires non associés : {missingRequired.map((f) => f.label).join(', ')}
                    </p>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-destructive mt-3">{error}</p>}
            </div>

            {/* Footer */}
            {!result && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20 shrink-0">
                <Button variant="outline" onClick={handleClose} disabled={importing}>Annuler</Button>
                {parsed && (
                  <Button
                    onClick={handleImport}
                    disabled={importing || missingRequired.length > 0}
                    className="gap-1.5"
                  >
                    {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {importing ? 'Import…' : `Importer ${parsed.rows.length} ligne${parsed.rows.length !== 1 ? 's' : ''}`}
                  </Button>
                )}
              </div>
            )}
            {result && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20 shrink-0">
                <Button onClick={handleClose}>Fermer</Button>
              </div>
            )}

          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
