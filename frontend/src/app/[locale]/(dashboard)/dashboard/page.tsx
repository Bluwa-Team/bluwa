'use client'

import { useMemo } from 'react'
import {
  Activity, AlertTriangle, ArrowRight, Boxes,
  CheckCircle2, Clock, Factory, FlaskConical,
  Lock, ShieldAlert, ShoppingCart, Truck,
  TrendingUp, Package, CircleDot,
} from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { formatDlcStatus } from '@/types/erp'
import {
  STATUT_OF_DB_LABELS,
  STATUT_OF_DB_COLORS,
} from '../production/_components/types'
import {
  MOCK_PRODUCTION_ORDER_ROWS,
  MOCK_PURCHASE_REQUISITION_ROWS,
  STATUT_DA_LABELS,
  STATUT_DA_COLORS,
  type ProductionOrderRow,
  type PurchaseRequisitionRow,
} from '../mrp/_components/types'
import {
  MOCK_LOTS,
} from '../stocks/_components/types'
import {
  MOCK_LOTS_CONTROLE,
  MOCK_NON_CONFORMITES,
  STATUT_LOT_COLORS,
  STATUT_LOT_LABELS,
  STATUT_NC_LABELS,
  STATUT_NC_COLORS,
} from '../qualite/_components/types'
import {
  MOCK_BC_HEADERS,
  STATUT_COMMANDE_LABELS,
  STATUT_COMMANDE_COLORS,
} from '../approvisionnement/_components/types'

const TODAY = '2026-05-26'

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon,
  iconBg, iconColor, valueBg, alert = false,
  href,
}: {
  label: string
  value: number | string
  sub: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  valueBg: string
  alert?: boolean
  href?: string
}) {
  const inner = (
    <div className={`rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-default ${valueBg} ${alert ? 'ring-1 ring-red-400/40' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`size-4 ${iconColor}`} />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        {href && <ArrowRight className="size-3.5 text-muted-foreground/50" />}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold tabular-nums ${alert && Number(value) > 0 ? 'text-red-600' : ''}`}>{value}</span>
        <span className="text-xs text-muted-foreground pb-0.5 leading-tight">{sub}</span>
      </div>
    </div>
  )
  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max, colorClass = 'bg-rose-500' }: { value: number; max: number; colorClass?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, badge, badgeColor = 'bg-muted text-muted-foreground',
  icon: Icon, href, children,
}: {
  title: string
  badge?: number
  badgeColor?: string
  icon: React.ElementType
  href?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{title}</span>
          {badge !== undefined && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
          )}
        </div>
        {href && (
          <Link href={href} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Voir tout <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const locale = useLocale()

  // ── Derived stats ──────────────────────────────────────────────────────────

  const activeOFs = useMemo(
    () => MOCK_PRODUCTION_ORDER_ROWS.filter((o: ProductionOrderRow) =>
      o.status === 'PLANNED' || o.status === 'RELEASED' || o.status === 'IN_PROGRESS',
    ),
    [],
  )

  const lotsEnControle = useMemo(
    () => MOCK_LOTS_CONTROLE.filter((l) => l.statut === 'EnControle'),
    [],
  )

  const ncOuvertes = useMemo(
    () => MOCK_NON_CONFORMITES.filter((n) => n.statut !== 'Clos'),
    [],
  )

  const daPending = useMemo(
    () => MOCK_PURCHASE_REQUISITION_ROWS.filter((d) => d.status === 'PENDING'),
    [],
  )

  const bcActifs = useMemo(
    () => MOCK_BC_HEADERS.filter((b) => b.statut === 'PENDING' || b.statut === 'APPROVED'),
    [],
  )

  const stockAlerts = useMemo(
    () => MOCK_LOTS.filter((lot) => {
      if (!lot.dlc) return false
      const diff = Math.ceil(
        (new Date(lot.dlc).getTime() - new Date(TODAY).getTime()) / 86_400_000,
      )
      return diff <= lot.seuilAlertePeremption
    }),
    [],
  )

  // ── DA urgentes : date limite ≤ dans 7 jours ───────────────────────────────
  const daUrgentes = useMemo(
    () => daPending.filter((d) => {
      const diff = Math.ceil(
        (new Date(d.requestedDeliveryDate).getTime() - new Date(TODAY).getTime()) / 86_400_000,
      )
      return diff <= 7
    }),
    [daPending],
  )

  // ─────────────────────────────────────────────────────────────────────────

  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(TODAY))

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border">
          <CircleDot className="size-3 text-emerald-500" />
          Données en temps réel — simulées
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="OF actifs"
          value={activeOFs.length}
          sub="en cours / planifiés"
          icon={Factory}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          valueBg="bg-violet-50/50 border"
          href={`/${locale}/production`}
        />
        <KpiCard
          label="Lots QC"
          value={lotsEnControle.length}
          sub="en contrôle"
          icon={FlaskConical}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          valueBg="bg-amber-50/50 border"
          href={`/${locale}/qualite`}
        />
        <KpiCard
          label="Non-conformités"
          value={ncOuvertes.length}
          sub="ouvertes"
          icon={ShieldAlert}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          valueBg="bg-red-50/50 border"
          alert={ncOuvertes.length > 0}
          href={`/${locale}/qualite`}
        />
        <KpiCard
          label="DA à traiter"
          value={daPending.length}
          sub={`dont ${daUrgentes.length} urgente${daUrgentes.length > 1 ? 's' : ''}`}
          icon={ShoppingCart}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          valueBg="bg-orange-50/50 border"
          alert={daUrgentes.length > 0}
          href={`/${locale}/approvisionnement`}
        />
        <KpiCard
          label="Alertes DLC"
          value={stockAlerts.length}
          sub="lots à surveiller"
          icon={AlertTriangle}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
          valueBg="bg-pink-50/50 border"
          alert={stockAlerts.length > 0}
          href={`/${locale}/stocks`}
        />
        <KpiCard
          label="Commandes"
          value={bcActifs.length}
          sub="en attente livraison"
          icon={Truck}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          valueBg="bg-blue-50/50 border"
          href={`/${locale}/approvisionnement`}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left column (2/3) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Production en cours */}
          <Section
            title="Production en cours"
            badge={activeOFs.length}
            badgeColor="bg-violet-100 text-violet-700"
            icon={Factory}
            href={`/${locale}/production`}
          >
            {activeOFs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun OF actif</p>
            ) : (
              <div className="space-y-2">
                {activeOFs.map((of) => {
                  const pct = of.quantityTarget > 0
                    ? Math.round((of.quantityProduced / of.quantityTarget) * 100)
                    : 0
                  const colorClass =
                    of.status === 'IN_PROGRESS' ? 'bg-rose-500' :
                    of.status === 'RELEASED'    ? 'bg-violet-500' :
                    'bg-blue-400'
                  return (
                    <div key={of.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono text-muted-foreground">{of.orderNumber}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUT_OF_DB_COLORS[of.status]}`}>
                            {STATUT_OF_DB_LABELS[of.status]}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{of.factoryName}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{of.articleLabel}</p>
                        <div className="mt-1.5">
                          <ProgressBar
                            value={of.quantityProduced}
                            max={of.quantityTarget}
                            colorClass={colorClass}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums">{of.quantityProduced}<span className="text-muted-foreground font-normal">/{of.quantityTarget}</span></p>
                        <p className="text-xs text-muted-foreground">{of.unitLabel}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Demandes d'achat */}
          <Section
            title="Demandes d'achat"
            badge={daPending.length}
            badgeColor="bg-orange-100 text-orange-700"
            icon={ShoppingCart}
            href={`/${locale}/approvisionnement`}
          >
            {daPending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune DA en attente</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left font-medium pb-2 px-1">N° DA</th>
                      <th className="text-left font-medium pb-2 px-1">Article</th>
                      <th className="text-left font-medium pb-2 px-1">Site</th>
                      <th className="text-right font-medium pb-2 px-1">Qté</th>
                      <th className="text-left font-medium pb-2 px-1">Date limite</th>
                      <th className="text-left font-medium pb-2 px-1">OF source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {daPending.map((da) => {
                      const diff = Math.ceil(
                        (new Date(da.requestedDeliveryDate).getTime() - new Date(TODAY).getTime()) / 86_400_000,
                      )
                      const urgent = diff <= 7
                      return (
                        <tr key={da.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-1 font-mono text-muted-foreground">{da.requisitionNumber}</td>
                          <td className="py-2 px-1">
                            <p className="font-medium">{da.articleLabel}</p>
                            <p className="text-muted-foreground">{da.articleSku}</p>
                          </td>
                          <td className="py-2 px-1 text-muted-foreground">{da.factoryName}</td>
                          <td className="py-2 px-1 text-right tabular-nums font-medium">{da.quantityRequired} {da.unitLabel}</td>
                          <td className="py-2 px-1">
                            <span className={`font-medium ${urgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {urgent && '⚠ '}
                              {new Date(da.requestedDeliveryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </span>
                          </td>
                          <td className="py-2 px-1">
                            {da.sourceOrderNumber && (
                              <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-mono text-[10px]">
                                {da.sourceOrderNumber}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

        </div>

        {/* ── Right column (1/3) ── */}
        <div className="space-y-4">

          {/* Lots en contrôle QC */}
          <Section
            title="Contrôle qualité"
            badge={lotsEnControle.length}
            badgeColor="bg-amber-100 text-amber-700"
            icon={FlaskConical}
            href={`/${locale}/qualite`}
          >
            <div className="space-y-2">
              {lotsEnControle.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun lot en contrôle</p>
              ) : (
                lotsEnControle.map((lot) => (
                  <div key={lot.id} className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{lot.codeLot}</p>
                      <p className="text-xs font-medium mt-0.5 truncate">{lot.article}</p>
                      <p className="text-[10px] text-muted-foreground">{lot.origine} · {lot.quantite} {lot.unite}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${STATUT_LOT_COLORS[lot.statut]}`}>
                      {STATUT_LOT_LABELS[lot.statut]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* Non-conformités */}
          <Section
            title="Non-conformités ouvertes"
            badge={ncOuvertes.length}
            badgeColor={ncOuvertes.length > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}
            icon={ShieldAlert}
            href={`/${locale}/qualite`}
          >
            <div className="space-y-2">
              {ncOuvertes.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 justify-center py-2">
                  <CheckCircle2 className="size-4" />
                  Aucune NC ouverte
                </div>
              ) : (
                ncOuvertes.map((nc) => (
                  <div key={nc.id} className="p-2.5 rounded-xl bg-red-50/60 border border-red-100">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{nc.numero}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUT_NC_COLORS[nc.statut]}`}>
                        {STATUT_NC_LABELS[nc.statut]}
                      </span>
                    </div>
                    <p className="text-xs font-medium">{nc.article}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{nc.cause}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{nc.responsable}</p>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* Alertes DLC */}
          <Section
            title="Alertes péremption"
            badge={stockAlerts.length}
            badgeColor={stockAlerts.length > 0 ? 'bg-pink-100 text-pink-700' : 'bg-muted text-muted-foreground'}
            icon={AlertTriangle}
            href={`/${locale}/stocks`}
          >
            <div className="space-y-2">
              {stockAlerts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucune alerte</p>
              ) : (
                stockAlerts.map((lot) => {
                  const { label, urgent, expired } = formatDlcStatus(lot.dlc, TODAY)
                  return (
                    <div key={lot.id} className={`p-2.5 rounded-xl border ${expired ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-100'}`}>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-medium truncate">{lot.designation}</p>
                        <span className={`text-[10px] font-bold shrink-0 ${expired ? 'text-red-600' : 'text-orange-600'}`}>
                          {label}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{lot.numero} · {lot.quantite} {lot.unite}</p>
                    </div>
                  )
                })
              )}
            </div>
          </Section>

          {/* Commandes fournisseurs actives */}
          <Section
            title="Commandes fournisseurs"
            badge={bcActifs.length}
            badgeColor="bg-blue-100 text-blue-700"
            icon={Truck}
            href={`/${locale}/approvisionnement`}
          >
            <div className="space-y-2">
              {bcActifs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucune commande active</p>
              ) : (
                bcActifs.map((bc) => (
                  <div key={bc.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{bc.numero}</p>
                      <p className="text-xs font-medium truncate">{bc.fournisseur}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${STATUT_COMMANDE_COLORS[bc.statut]}`}>
                      {STATUT_COMMANDE_LABELS[bc.statut]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}
