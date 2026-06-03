import { CreditCard, Users, CalendarClock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { FactorySubscription, SubscriptionStatus } from '@/lib/actions/factory'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubscriptionStatus, {
  label: string
  icon:  React.ReactNode
  cls:   string
}> = {
  ACTIVE: {
    label: 'Actif',
    icon:  <CheckCircle2 className="size-3.5" />,
    cls:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  PAST_DUE: {
    label: 'Paiement en attente',
    icon:  <AlertTriangle className="size-3.5" />,
    cls:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  CANCELED: {
    label: 'Résilié',
    icon:  <XCircle className="size-3.5" />,
    cls:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
}

function formatXOF(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
  })
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface Props {
  subscription: FactorySubscription | null
  currentUserCount: number
}

export function AbonnementSection({ subscription, currentUserCount }: Props) {
  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <CreditCard className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="font-semibold text-sm">Abonnement</h2>
        </div>

        {subscription?.status && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CONFIG[subscription.status].cls}`}>
            {STATUS_CONFIG[subscription.status].icon}
            {STATUS_CONFIG[subscription.status].label}
          </span>
        )}
      </div>

      {/* Pas d'abonnement configuré */}
      {!subscription ? (
        <p className="text-sm text-muted-foreground">
          Aucun abonnement configuré pour ce site.{' '}
          <a href="mailto:selom@bluwa.io?cc=john@bluwa.io" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Contacter Bluwa
          </a>
        </p>
      ) : (
        <>
          {/* Infos plan */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Plan</p>
              <p className="font-semibold text-base">{subscription.planName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tarif mensuel</p>
              <p className="font-semibold text-base">{formatXOF(subscription.priceMonthly)}</p>
            </div>
          </div>

          {/* Métadonnées */}
          <div className="grid grid-cols-2 gap-3">

            {/* Utilisateurs */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
              <Users className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Utilisateurs</p>
                <p className="text-sm font-medium">
                  {currentUserCount}
                  <span className="text-muted-foreground font-normal"> / {subscription.maxUsers}</span>
                </p>
              </div>
            </div>

            {/* Date de renouvellement */}
            {subscription.expiresAt && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
                <CalendarClock className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Renouvellement</p>
                  <p className="text-sm font-medium">{formatDate(subscription.expiresAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Alerte PAST_DUE */}
          {subscription.status === 'PAST_DUE' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Un paiement est en attente.{' '}
                <a href="mailto:selom@bluwa.io?cc=john@bluwa.io" className="underline underline-offset-2 font-medium">
                  Contacter Bluwa
                </a>{' '}
                pour régulariser la situation.
              </p>
            </div>
          )}

          {/* Lien contact */}
          <p className="text-xs text-muted-foreground pt-1">
            Pour modifier votre plan ou obtenir une facture, contactez-nous à{' '}
            <a href="mailto:selom@bluwa.io?cc=john@bluwa.io" className="underline underline-offset-2 hover:text-foreground transition-colors">
              selom@bluwa.io
            </a>
          </p>
        </>
      )}
    </section>
  )
}
