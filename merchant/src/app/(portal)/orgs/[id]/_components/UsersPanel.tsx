'use client'

// UsersPanel — lecture seule dans le Merchant Portal
// Les utilisateurs sont invités et gérés depuis l'app ERP (settings/utilisateurs)
// Le Merchant Portal affiche uniquement la liste et les accès sites

import { Factory, UserSiteAccess } from '@/types/merchant'
import { CheckCircle2, XCircle } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  owner:    'Propriétaire',
  admin:    'Administrateur',
  manager:  'Responsable',
  operator: 'Opérateur',
  viewer:   'Lecteur',
}

interface User {
  id: string
  full_name: string
  email?: string
  role: string
  is_active: boolean
  created_at: string
}

interface Props {
  initialUsers: User[]
  factories: Factory[]
  orgId: string
  siteAccess?: UserSiteAccess[]
}

export function UsersPanel({ initialUsers, factories, siteAccess = [] }: Props) {
  const activeSites = factories.filter((f) => f.is_active)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">Utilisateurs ({initialUsers.length})</h2>
        <span className="text-xs text-gray-400 italic">Gestion via l&apos;app ERP</span>
      </div>

      {initialUsers.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">Aucun utilisateur</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {initialUsers.map((u) => {
            const siteIds     = siteAccess.filter((a) => a.user_id === u.id).map((a) => a.factory_id)
            const accessible  = factories.filter((f) => siteIds.includes(f.id))
            const allActive   = activeSites.every((f) => siteIds.includes(f.id)) && activeSites.length > 0
            const isOwnerOrAdmin = u.role === 'owner' || u.role === 'admin'
            const roleLabel   = ROLE_LABELS[u.role] ?? u.role

            return (
              <div key={u.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {u.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-tight">{u.full_name}</p>
                      <span className="text-xs text-gray-400">{roleLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <XCircle className="w-3.5 h-3.5" /> Inactif
                      </span>
                    )}
                  </div>
                </div>

                {/* Accès sites */}
                <div className="mt-1.5 ml-9 flex flex-wrap gap-1">
                  {isOwnerOrAdmin ? (
                    <span className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full font-medium">Accès complet</span>
                  ) : allActive ? (
                    <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">Tous les sites</span>
                  ) : accessible.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">Aucun accès site</span>
                  ) : (
                    accessible.map((f) => (
                      <span key={f.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">{f.code}</span>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
        <p className="text-xs text-gray-400">Seuls les propriétaires et admins peuvent gérer les utilisateurs.</p>
      </div>
    </div>
  )
}
