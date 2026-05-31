// ── Types Bluwa Academy Backend ───────────────────────────────────────────────

export interface AcademyProfile {
  id:           string
  full_name:    string
  email:        string
  organisation: string | null
  created_at:   string
}

export interface SectionProgress {
  id:            string
  user_id:       string
  module_slug:   string
  section_title: string
  completed_at:  string
}

export interface AcademyCertification {
  id:        string
  user_id:   string
  level:     CertLevel
  issued_at: string
}

export type CertLevel = 'user' | 'metier' | 'cbscp'

export interface CertInfo {
  level:       CertLevel
  label:       string
  description: string
  color:       string
  modules:     string[]   // module slugs requis
}

// ── Configuration des modules ─────────────────────────────────────────────────

export const MODULE_SECTIONS: Record<string, string[]> = {
  'fondations-mdm': [
    'Règle de codification  Format TYPE-XXXX',
    'Dualité formel / informel',
    'Exemple de catalogue MDM',
    'Mise en pratique terrain',
  ],
  'planification-mrp2': [
    'Le processus de planification opérationnelle',
    'TRS  Taux de Rendement Synthétique',
    'Spécificité régionale  Aléas locaux',
  ],
  'stocks-qualite': [
    'Zoning des stocks',
    'Phase exécution terrain  Séquence OF',
    'Principes de contrôle qualité',
  ],
  'haccp': [
    'Les 7 principes HACCP',
    'Blocage automatique des lots dans Bluwa',
    'Interfaces avec les laboratoires nationaux',
  ],
}

export const MODULE_LABELS: Record<string, string> = {
  'fondations-mdm':      'Module 01 — Fondations & MDM',
  'planification-mrp2':  'Module 02 — Planification MRP2',
  'stocks-qualite':      'Module 03 — Stocks & Qualité',
  'haccp':               'Module 04 — HACCP',
}

// ── Configuration des certifications ─────────────────────────────────────────

export const CERTS: CertInfo[] = [
  {
    level:       'user',
    label:       'Bluwa User',
    description: 'Maîtrise des fondations MDM et des référentiels industriels.',
    color:       'blue',
    modules:     ['fondations-mdm'],
  },
  {
    level:       'metier',
    label:       'Compétences Métier',
    description: 'Expertise en planification MRP2, stocks et contrôle qualité.',
    color:       'amber',
    modules:     ['planification-mrp2', 'stocks-qualite'],
  },
  {
    level:       'cbscp',
    label:       'CBSCP',
    description: 'Certification suprême — maîtrise complète de la chaîne agroalimentaire.',
    color:       'indigo',
    modules:     ['fondations-mdm', 'planification-mrp2', 'stocks-qualite', 'haccp'],
  },
]
