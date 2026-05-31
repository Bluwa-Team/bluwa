import { createClient } from '@/lib/supabase/server'
import { Building2, User, Globe, Palette } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Paramètres · Bluwa ERP' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organisation_id')
    .eq('id', user?.id ?? '')
    .single()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, country, currency')
    .eq('id', profile?.organisation_id ?? '')
    .single()

  return (
    <div className="max-w-2xl space-y-6">

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">Informations sur votre compte et votre organisation.</p>
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
          <div>
            <p className="text-xs text-muted-foreground mb-1">Thème</p>
            <p className="font-medium text-muted-foreground italic text-xs">Bientôt disponible</p>
          </div>
        </div>
      </section>

      {/* Version */}
      <p className="text-xs text-muted-foreground text-center pt-2">Bluwa ERP · v0.1.0</p>

    </div>
  )
}
