import { createClient } from '@/lib/supabase/server'
import { Building2, User, Palette, Factory } from 'lucide-react'
import type { Metadata } from 'next'
import { ThemeToggle } from '@/components/ThemeToggle'

export const metadata: Metadata = { title: 'Paramètres · Bluwa ERP' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id')
    .eq('id', user?.id ?? '')
    .single()

  const [{ data: org }, { data: siteAccess }] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, country, currency')
      .eq('id', profile?.organization_id ?? '')
      .single(),
    supabase
      .from('user_site_access')
      .select('factories(id, name, code, country, city, timezone, is_active)')
      .eq('user_id', user?.id ?? ''),
  ])

  const factories = siteAccess?.flatMap(r => r.factories ? [r.factories] : []) ?? []

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
            <p className="text-xs text-muted-foreground mb-1">Pays</p>
            <p className="font-medium">{org?.country ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Devise</p>
            <p className="font-medium">{org?.currency ?? 'XOF'}</p>
          </div>
        </div>
      </section>

      {/* Sites de production */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
            <Factory className="size-4 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="font-semibold text-sm">Sites de production</h2>
          <span className="ml-auto text-xs text-muted-foreground">{factories.length} site{factories.length > 1 ? 's' : ''}</span>
        </div>

        {factories.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucun site assigné.</p>
        ) : (
          <div className="space-y-3">
            {factories.map((f: any) => (
              <div key={f.id} className="flex items-start justify-between rounded-lg bg-muted/40 px-4 py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{f.name}</p>
                    <span className="font-mono text-[11px] bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">
                      {f.code}
                    </span>
                    {!f.is_active && (
                      <span className="text-[11px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inactif</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[f.city, f.country].filter(Boolean).join(', ')}
                    {f.timezone && <span className="ml-2 opacity-60">· {f.timezone}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
            <p className="text-xs text-muted-foreground mb-1">Rôle</p>
            <p className="font-medium capitalize">{profile?.role ?? '—'}</p>
          </div>
        </div>
      </section>

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
