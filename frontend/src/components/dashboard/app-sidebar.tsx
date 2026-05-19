'use client'

import {
  LayoutDashboard,
  Package,
  Boxes,
  ScanLine,
  Truck,
  AlertTriangle,
  Settings,
  BookOpen,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function AppSidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const NAV_GROUPS = [
    {
      label: t('main'),
      items: [
        { title: t('dashboard'), url: '/dashboard', icon: LayoutDashboard, disabled: false },
        { title: t('marginAnalysis'), url: '/analyse-marge', icon: TrendingUp, disabled: true },
      ],
    },
    {
      label: t('referenceData'),
      items: [
        { title: t('articles'), url: '/articles', icon: BookOpen, disabled: false },
        { title: t('clients'), url: '/clients', icon: Users, disabled: false },
        { title: t('suppliers'), url: '/fournisseurs', icon: Truck, disabled: false },
      ],
    },
    {
      label: t('production'),
      items: [
        { title: t('productionBatches'), url: '/lots', icon: Package, disabled: true },
        { title: t('stocks'), url: '/stocks', icon: Boxes, disabled: false },
        { title: t('traceability'), url: '/tracabilite', icon: ScanLine, disabled: true },
        { title: t('nonConformities'), url: '/non-conformites', icon: AlertTriangle, disabled: true },
      ],
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="w-8 h-8 shrink-0 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            B
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold leading-none">Bluwa</span>
            <span className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">{orgName}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    {item.disabled ? (
                      <SidebarMenuButton
                        disabled
                        className="opacity-40 cursor-not-allowed"
                      >
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={pathname === item.url}
                      >
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              disabled
              className="opacity-40 cursor-not-allowed"
            >
              <Settings className="size-4" />
              <span>{t('settings')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
