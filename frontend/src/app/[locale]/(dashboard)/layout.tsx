
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
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
    .select('full_name, role, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect(`/${locale}/onboarding`)

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .maybeSingle()

  const canUseAgent = profile.role === 'owner' || profile.role === 'admin'

  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar orgName={org?.name || ''} />
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
