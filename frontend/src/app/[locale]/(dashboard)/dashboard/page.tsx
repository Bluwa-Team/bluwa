
import { getTranslations } from 'next-intl/server'
import { Package, AlertTriangle, TrendingUp, Boxes } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')

  const STATS = [
    { labelKey: 'stats.activeBatches', value: '0', icon: Package, hintKey: 'statsHints.activeBatches' },
    { labelKey: 'stats.totalStock', value: '0 kg', icon: Boxes, hintKey: 'statsHints.totalStock' },
    { labelKey: 'stats.yield', value: 'N/A', icon: TrendingUp, hintKey: 'statsHints.yield' },
    { labelKey: 'stats.nonConformities', value: '0', icon: AlertTriangle, hintKey: 'statsHints.nonConformities' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.labelKey}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(stat.labelKey as any)}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{t(stat.hintKey as any)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('welcome.title')}</CardTitle>
          <CardDescription>
            {t('welcome.description')}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
