// Utilitaires CSV partagés — export, import, template

// ── Export ────────────────────────────────────────────────────────────────────

/** Convertit un tableau d'objets en CSV et déclenche le téléchargement. */
export function downloadCsv(filename: string, data: Record<string, unknown>[]): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = String(row[h] ?? '')
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val
    }).join(','),
  )
  const csv = [headers.join(','), ...rows].join('\n')
  triggerDownload(filename, csv)
}

/** Télécharge un fichier CSV vierge avec uniquement les en-têtes + une ligne d'exemple. */
export function downloadCsvTemplate(
  filename:   string,
  headers:    string[],
  exampleRow: Record<string, string>,
): void {
  const values = headers.map((h) => {
    const val = exampleRow[h] ?? ''
    return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
  })
  const csv = [headers.join(','), values.join(',')].join('\n')
  triggerDownload(filename, csv)
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface ParsedCsv {
  headers: string[]
  rows:    Record<string, string>[]
}

/** Parse un fichier CSV (gère BOM, CRLF, champs entre guillemets). */
export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const raw = await file.text()
  return parseCsvText(raw)
}

export function parseCsvText(raw: string): ParsedCsv {
  // Supprime le BOM UTF-8 et normalise les fins de ligne
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n').filter((l) => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = splitRow(lines[0]).map((h) => h.trim())
  const rows = lines.slice(1).map((line) => {
    const values = splitRow(line)
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? '').trim()]),
    )
  }).filter((row) => Object.values(row).some((v) => v !== ''))

  return { headers, rows }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function triggerDownload(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
