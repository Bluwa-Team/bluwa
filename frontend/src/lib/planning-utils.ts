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

export function weekLabel(isoDate: string): string {
  const d = new Date(isoDate)
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + 6)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
}
