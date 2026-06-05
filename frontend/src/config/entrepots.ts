// ── Entrepôts — configuration usine ─────────────────────────────────────────

export const ENTREPOTS: Record<string, { nom: string; emplacements: string[] }> = {
  'ENT-MP-01':  { nom: 'Entrepôt MP · Dakar',    emplacements: ['Zone A', 'Zone B', 'Zone C', 'Zone D'] },
  'ENT-PF-01':  { nom: 'Entrepôt PF · Dakar',    emplacements: ['Allée 1', 'Allée 2', 'Allée 3']        },
  'ENT-EMB-01': { nom: 'Entrepôt Emballages',     emplacements: ['Étagère 1', 'Étagère 2', 'Étagère 3'] },
}
