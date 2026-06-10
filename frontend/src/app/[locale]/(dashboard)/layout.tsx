
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { AppHeader } from '@/components/dashboard/app-header'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id, cgu_accepted_at, cgu_version')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect(`/${locale}/onboarding`)

  const CGU_CURRENT_VERSION = '1.0'
  if (!profile.cgu_accepted_at || profile.cgu_version !== CGU_CURRENT_VERSION) {
    redirect(`/${locale}/cgu`)
  }

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('name, status')
    .eq('id', profile.organization_id)
    .maybeSingle()

  if (org?.status === 'archived') redirect(`/${locale}/archived`)

  const canUseAgent = profile.role === 'owner' || profile.role === 'admin'

  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false'
  const activeFactoryId = cookieStore.get('active_factory_id')?.value

  let allowedModules: string[] = ['*']
  if (activeFactoryId) {
    const { data: factory } = await supabaseAdmin
      .from('factories')
      .select('subscription_plans(features_config)')
      .eq('id', activeFactoryId)
      .maybeSingle()
    const plan = (factory as { subscription_plans?: { features_config?: { modules?: string[] } } } | null)
      ?.subscription_plans
    if (plan?.features_config?.modules?.length) {
      allowedModules = plan.features_config.modules
    }
  }

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar orgName={org?.name || ''} allowedModules={allowedModules} />
      <SidebarInset className="min-w-0">
        <AppHeader
          fullName={profile.full_name || ''}
          email={user.email || ''}
          role={profile.role}
          canUseAgent={canUseAgent}
        />
        <div className="flex-1 min-w-0 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
