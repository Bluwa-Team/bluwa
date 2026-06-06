// TODO: réactiver l'auth une fois SMTP configuré
// import { redirect } from 'next/navigation'
// import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Auth temporairement désactivée — accès libre pour test
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user || !user.email?.endsWith('@bluwa.io')) {
  //   redirect('/login')
  // }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail="r.okoye@icloud.com" />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
