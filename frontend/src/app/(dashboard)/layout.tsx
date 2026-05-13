import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { AppHeader } from '@/components/dashboard/app-header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .maybeSingle()

  const canUseAgent = profile.role === 'org_admin' || profile.role === 'factory_admin' || profile.role === 'super_admin'

  return (
    <SidebarProvider>
      <AppSidebar orgName={org?.name || ''} />
      <SidebarInset>
        <AppHeader
          fullName={profile.full_name || ''}
          email={user.email || ''}
          role={profile.role}
          canUseAgent={canUseAgent}
        />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
