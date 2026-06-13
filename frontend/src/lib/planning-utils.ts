// Utilitaires planning — importables côté client et serveur

export function getWeekStarts(count: number): string[] {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i * 7)
    return d.toISOString().split('T')[0]
  })
}

// Convertit une date ISO (lundi de semaine) en code "YYYY-Wxx" utilisé dans sales_forecasts.
export function isoToWeekCode(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  const year = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7))
  const weekNum = Math.ceil(((d.getTime() - startOfWeek1.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

// Convertit un code "YYYY-Wxx" en date ISO du lundi correspondant.
export function weekCodeToMonday(weekCode: string): string {
  const [yearStr, weekStr] = weekCode.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7))
  const monday = new Date(startOfWeek1)
  monday.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7)
  return monday.toISOString().split('T')[0]
}

export function weekLabel(isoDate: string): string {
  const d = new Date(isoDate)
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + 6)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
}
