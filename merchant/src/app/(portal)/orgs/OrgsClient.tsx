'use client'

import { MerchantOrg, OrgStatus, SubscriptionPlan } from '@/types/merchant'
import { formatDate } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_STYLES: Record<OrgStatus, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  trial:     'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  churned:   'bg-gray-100 text-gray-500',
  archived:  'bg-gray-100 text-gray-400 line-through',
}

const STATUS_LABELS: Record<OrgStatus, string> = {
  active:    'Actif',
  trial:     'Essai',
  suspended: 'Suspendu',
  churned:   'Churned',
  archived:  'Archivée',
}

export function OrgsClient({ orgs, plans: _plans }: { orgs: MerchantOrg[]; plans: SubscriptionPlan[] }) {
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Organisations</h1>
            <p className="text-sm text-gray-500 mt-0.5">{orgs.length} clients enregistrés</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {orgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Building2 className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Aucune organisation</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Organisation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pays</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sites</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateurs</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Créée le</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 font-semibold text-xs">
                            {org.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{org.country ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {org.factories?.filter((f) => f.is_active).length ?? 0} site{(org.factories?.filter((f) => f.is_active).length ?? 0) > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{org.users_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[org.status]}`}>
                        {STATUS_LABELS[org.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(org.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/orgs/${org.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                        Détail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
