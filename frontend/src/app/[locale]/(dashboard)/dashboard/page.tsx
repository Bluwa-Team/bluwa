'use client'

import React, { useEffect, useState } from 'react'
import { ArrowRight, TrendingUp, BarChart3, Factory, Boxes, CheckCircle2, Layers, Bell, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { PeriodPicker, type PeriodValue } from '@/components/ui/period-picker'
import { getPurchaseOrders } from '@/lib/actions/approvisionnement'
import type { BCHeader } from '../approvisionnement/_components/types'

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiDir({ label, value, sub, bgClass, iconBgClass, iconColorClass, icon: Icon, href }: {
  label: string
  value: string
  sub: string
  bgClass: string
  iconBgClass: string
  iconColorClass: string
  icon: React.ElementType
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`size-4 ${iconColorClass}`} />
        </div>
        <span className="text-sm font-semibold">{label}</span>
        {href && <ArrowRight className="size-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="bg-white dark:bg-background rounded-lg px-3 py-2.5 shadow-sm">
        <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-tight">{sub}</p>
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`group rounded-xl p-3 transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-lg cursor-pointer block ${bgClass}`}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={`rounded-xl p-3 transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-lg cursor-default ${bgClass}`}>
      {inner}
    </div>
  )
}

// ── Empty state chart ─────────────────────────────────────────────────────────

function EmptyChart({ message = 'Aucune donnée sur la période' }: { message?: string }) {
  return (
    <div className="h-[200px] w-full flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/30 border border-dashed border-gray-200 dark:border-gray-700">
      <BarChart3 className="size-8 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const locale = useLocale()
  const [periodeCA, setPeriodeCA] = React.useState<PeriodValue>({ preset: '6m' })
  const [periodeStock, setPeriodeStock] = React.useState<PeriodValue>({ preset: '6m' })
  const [pendingApproval, setPendingApproval] = useState<BCHeader[]>([])

  useEffect(() => {
    getPurchaseOrders().then(({ headers }) => {
      setPendingApproval(headers.filter((h) => h.statut === 'PENDING_APPROVAL'))
    })
  }, [])

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        <KpiDir
          label="CA du mois"
          value="—"
          sub="Aucune donnée"
          bgClass="bg-blue-50 dark:bg-blue-950/30"
          iconBgClass="bg-blue-100 dark:bg-blue-900/50"
          iconColorClass="text-blue-600 dark:text-blue-400"
          icon={TrendingUp}
        />
        <KpiDir
          label="Marge brute"
          value="—"
          sub="Aucune donnée"
          bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/50"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          icon={BarChart3}
          href={`/${locale}/analyse-marge`}
        />
        <KpiDir
          label="TRS atelier"
          value="—"
          sub="Aucune donnée"
          bgClass="bg-teal-50 dark:bg-teal-950/30"
          iconBgClass="bg-teal-100 dark:bg-teal-900/50"
          iconColorClass="text-teal-600 dark:text-teal-400"
          icon={Factory}
          href={`/${locale}/production`}
        />
        <KpiDir
          label="Valeur stock"
          value="—"
          sub="Aucune donnée"
          bgClass="bg-violet-50 dark:bg-violet-950/30"
          iconBgClass="bg-violet-100 dark:bg-violet-900/50"
          iconColorClass="text-violet-600 dark:text-violet-400"
          icon={Boxes}
          href={`/${locale}/stocks`}
        />
      </div>

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart CA & Coût */}
        <Card className="lg:col-span-2 py-3 gap-2">
          <CardHeader>
            <CardTitle>CA &amp; Marge brute</CardTitle>
            <CardDescription>6 derniers mois · FCFA</CardDescription>
            <CardAction>
              <PeriodPicker value={periodeCA} onChange={setPeriodeCA} defaultPreset="6m" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <EmptyChart />
          </CardContent>
        </Card>

        {/* Donut répartition stock */}
        <Card className="py-3 gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/50">
                <Layers className="size-[15px] text-violet-600 dark:text-violet-400" />
              </div>
              Répartition du stock
            </CardTitle>
            <CardAction>
              <PeriodPicker value={periodeStock} onChange={setPeriodeStock} defaultPreset="6m" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <EmptyChart message="Enregistrez vos articles pour voir la répartition" />
          </CardContent>
        </Card>
      </div>

      {/* ── Analyse de marge + Alertes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Analyse de marge */}
        <Card className="lg:col-span-3 py-3 gap-3">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-100 dark:bg-rose-900/50">
                <BarChart3 className="size-[15px] text-rose-600 dark:text-rose-400" />
              </div>
              Analyse de marge
            </CardTitle>
            <CardAction className="row-span-1 self-center">
              <Link href={`/${locale}/analyse-marge`} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                Détail <ArrowRight className="size-3" />
              </Link>
            </CardAction>
            <CardDescription className="mt-2">Écart vs coût cible par produit</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <EmptyChart message="Enregistrez vos ordres de fabrication pour voir les écarts de marge" />
          </CardContent>
        </Card>

        {/* Alertes */}
        <Card className="lg:col-span-2 py-3 gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/50">
                <Bell className="size-[15px] text-amber-600 dark:text-amber-400" />
              </div>
              Alertes prioritaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingApproval.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aucune alerte active</p>
                <p className="text-xs text-muted-foreground">Les alertes stock, DLC et MRP apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingApproval.map((h) => (
                  <Link
                    key={h.id}
                    href={`/${locale}/approvisionnement`}
                    className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                      <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 truncate">
                        {h.numero} — {h.fournisseur}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {h.type} · En attente d'approbation
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-amber-400 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  )
}
