import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getOrg, getUsers, getUserSiteAccess, getInvoices, getPlans } from '@/lib/db'
import { OrgStatus, InvoiceStatus } from '@/types/merchant'
import Link from 'next/link'
import {
  ArrowLeft, Users, CreditCard, Calendar,
  CheckCircle2, XCircle, AlertCircle, Clock, MapPin, Building2,
} from 'lucide-react'
import { OrgStatusActions } from './_components/OrgStatusActions'
import { AssignPlanForm } from './_components/AssignPlanForm'
import { UsersPanel } from './_components/UsersPanel'

const STATUS_STYLES: Record<OrgStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  churned: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<OrgStatus, string> = {
  active: 'Actif', trial: 'Essai', suspended: 'Suspendu', churned: 'Churned',
}

const SUB_STATUS_STYLES: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  CANCELED: 'bg-gray-100 text-gray-500',
}

const SUB_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif', PAST_DUE: 'Impayé', CANCELED: 'Annulé',
}

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'En attente', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée',
}

const INVOICE_STATUS_ICONS: Record<InvoiceStatus, React.ReactNode> = {
  paid: <CheckCircle2 className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
  overdue: <AlertCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
}

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [org, users, allInvoices, plans, siteAccess] = await Promise.all([
    getOrg(id),
    getUsers(id),
    getInvoices(id),
    getPlans(),
    getUserSiteAccess(id),
  ])

  if (!org) notFound()

  const factories = org.factories ?? []

  // Factures de tous les sites de cette org
  const factoryIds = factories.map((f) => f.id)
  const invoices = allInvoices.filter((i) => factoryIds.includes(i.factory_id))
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount_xof, 0)
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length

  // MRR de l'org = somme des abonnements actifs de tous ses sites
  const mrr = factories
    .filter((f) => f.subscription_status === 'ACTIVE')
    .reduce((s, f) => s + (f.plan?.price_monthly ?? 0), 0)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link href="/orgs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux organisations
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-700 font-bold text-lg">{org.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
              <p className="text-sm text-gray-400">{org.country ?? '—'}</p>
            </div>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[org.status]}`}>
              {STATUS_LABELS[org.status]}
            </span>
          </div>
          <OrgStatusActions orgId={org.id} currentStatus={org.status} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Building2 className="w-4 h-4" />
            <span className="text-xs">Sites actifs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{factories.filter((f) => f.is_active).length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{factories.length} site{factories.length > 1 ? 's' : ''} au total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs">Utilisateurs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs">MRR org</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(mrr)}</p>
          {overdueCount > 0 && <p className="text-xs text-red-500 mt-0.5">{overdueCount} facture{overdueCount > 1 ? 's' : ''} en retard</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Client depuis</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1">{formatDate(org.created_at)}</p>
        </div>
      </div>

      {/* Sites (factories) */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Sites ({factories.length})</h2>
        <div className="space-y-3">
          {factories.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-10 text-center text-sm text-gray-400">
              Aucun site configuré
            </div>
          ) : (
            factories.map((factory) => {
              const factoryInvoices = invoices.filter((i) => i.factory_id === factory.id)
              const factoryOverdue = factoryInvoices.filter((i) => i.status === 'overdue').length
              return (
                <div key={factory.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600">{factory.code}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{factory.name}</p>
                          {!factory.is_active && (
                            <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Inactif</span>
                          )}
                          {factoryOverdue > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                              {factoryOverdue} facture{factoryOverdue > 1 ? 's' : ''} en retard
                            </span>
                          )}
                        </div>
                        <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {factory.location_city ? `${factory.location_city}, ` : ''}{factory.location_country}
                        </p>
                      </div>
                    </div>

                    {/* Abonnement du site */}
                    <div className="flex items-center gap-3">
                      {factory.subscription_plan_id ? (
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm font-semibold text-gray-900">
                              {factory.plan?.name ?? '—'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STATUS_STYLES[factory.subscription_status ?? '']}`}>
                              {SUB_STATUS_LABELS[factory.subscription_status ?? '']}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatCurrency(factory.plan?.price_monthly ?? 0)}/mois · depuis {formatDate(factory.created_at)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Aucun abonnement</span>
                      )}
                      <AssignPlanForm
                        factoryId={factory.id}
                        factoryName={factory.name}
                        plans={plans}
                        currentPlanId={factory.subscription_plan_id ?? null}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Utilisateurs + Factures */}
      <div className="grid grid-cols-2 gap-6">
        {/* Utilisateurs */}
        <UsersPanel initialUsers={users} factories={factories} orgId={org.id} siteAccess={siteAccess} />

        {/* Factures consolidées (tous sites) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Factures — tous sites ({invoices.length})</h2>
            {overdueCount > 0 && <span className="text-xs text-red-600 font-medium">{overdueCount} en retard</span>}
          </div>
          {invoices.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">Aucune facture</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Site</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Montant</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Statut</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Échéance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => {
                  const factory = factories.find((f) => f.id === inv.factory_id)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-mono font-bold text-gray-500">{factory?.code}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-medium text-gray-900 text-xs">
                        {formatCurrency(inv.amount_xof)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${INVOICE_STATUS_STYLES[inv.status as InvoiceStatus]}`}>
                          {INVOICE_STATUS_ICONS[inv.status as InvoiceStatus]}
                          {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{formatDate(inv.due_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
