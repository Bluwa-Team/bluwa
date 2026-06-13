import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Building2, User, Palette } from 'lucide-react'
import type { Metadata } from 'next'
import { ThemeToggle } from '@/components/ThemeToggle'
import { UsersSection } from './_components/UsersSection'
import { AbonnementSection } from './_components/AbonnementSection'
import { listOrgUsers, type UserRole } from '@/lib/actions/users'
import { getUserFactories, getFactorySubscription } from '@/lib/actions/factory'
import { FactorySwitcherSettings } from './_components/FactorySwitcherSettings'
import { FactoryCostSettings } from './_components/FactoryCostSettings'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Paramètres · Bluwa ERP' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id')
    .eq('id', user?.id ?? '')
    .single()

  const cookieStore = await cookies()
  const activeFactoryId = cookieStore.get('active_factory_id')?.value ?? null

  const [{ data: org }, factories] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', profile?.organization_id ?? '')
      .single(),
    getUserFactories(),
  ])

  // activeId avec fallback sur le premier site (même logique que le reste de la page)
  const activeId = activeFactoryId ?? factories[0]?.id ?? null
  const orgUsers = await listOrgUsers(activeId)

  // Rôle de l'user sur le site actif (depuis user_site_access, migration 024)
  // Fallback sur profiles.role pour les owners/admins sans entrée user_site_access
  const { data: siteAccess } = activeId ? await supabase
    .from('user_site_access')
    .select('role')
    .eq('user_id', user?.id ?? '')
    .eq('factory_id', activeId)
    .single() : { data: null }

  const effectiveRole: UserRole = (siteAccess?.role as UserRole)
    ?? (['owner', 'admin'].includes(profile?.role ?? '') ? profile?.role as UserRole : 'viewer')

  const subscription = activeId ? await getFactorySubscription(activeId) : null

  return (
    <div className="max-w-2xl space-y-6">

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">Compte, organisation et sites de production.</p>
      </div>

      {/* Organisation */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <Building2 className="size-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="font-semibold text-sm">Organisation</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nom</p>
            <p className="font-medium">{org?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Identifiant</p>
            <p className="font-medium font-mono text-xs">{org?.slug ?? '—'}</p>
          </div>
        </div>
      </section>

      {/* Sites de production */}
      <FactorySwitcherSettings
        factories={factories}
        activeFactoryId={activeFactoryId ?? factories[0]?.id ?? null}
        canAdd={['owner', 'admin'].includes(effectiveRole)}
      />

      {/* Paramètres coûts usine */}
      {activeId && (() => {
        const activeFactory = factories.find(f => f.id === activeId)
        if (!activeFactory) return null
        return (
          <FactoryCostSettings
            factoryId={activeId}
            orgId={profile?.organization_id ?? ''}
            factoryName={activeFactory.name}
            ohRate={activeFactory.oh_rate ?? 0.08}
            energieUnitCost={activeFactory.energie_unit_cost ?? 50}
            canEdit={['owner', 'admin'].includes(effectiveRole)}
          />
        )
      })()}

      {/* Compte utilisateur */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
            <User className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="font-semibold text-sm">Compte</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nom</p>
            <p className="font-medium">{profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="font-medium">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rôle (site actif)</p>
            <p className="font-medium capitalize">{effectiveRole}</p>
          </div>
        </div>
      </section>

      {/* Utilisateurs */}
      <UsersSection
        users={orgUsers}
        currentUserId={user?.id ?? ''}
        currentUserRole={effectiveRole}
        activeFactoryId={activeId}
      />

      {/* Abonnement */}
      <AbonnementSection
        subscription={subscription}
        currentUserCount={orgUsers.length}
      />

      {/* Préférences */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
            <Palette className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="font-semibold text-sm">Préférences</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Langue</p>
            <p className="font-medium">Français</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-2">Thème</p>
            <ThemeToggle />
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground text-center pt-2">Bluwa ERP · v0.1.0</p>

    </div>
  )
}
