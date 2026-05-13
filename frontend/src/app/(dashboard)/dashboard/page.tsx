import { Package, AlertTriangle, TrendingUp, Boxes } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const STATS = [
  { label: 'Lots en cours', value: '0', icon: Package, hint: 'Aucun lot pour le moment' },
  { label: 'Stock total', value: '0 kg', icon: Boxes, hint: 'Aucune matière première' },
  { label: 'Rendement', value: '—', icon: TrendingUp, hint: 'Données insuffisantes' },
  { label: 'Non-conformités', value: '0', icon: AlertTriangle, hint: 'Aucune cette semaine' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Activité de production en temps réel
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bienvenue sur Bluwa</CardTitle>
          <CardDescription>
            Votre espace de production est prêt. Commencez par configurer vos matières premières
            et créer votre premier lot de production.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
