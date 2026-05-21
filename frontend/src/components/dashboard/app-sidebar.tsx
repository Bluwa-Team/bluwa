'use client'

import { motion, AnimatePresence } from 'framer-motion'
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
  ShoppingCart,
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

type NavItemData = {
  title: string
  url: string
  icon: React.ElementType
  disabled: boolean
}

function NavItem({ item, isActive }: { item: NavItemData; isActive: boolean }) {
  return (
    <SidebarMenuItem>
      <motion.div
        className="relative"
        whileHover={!item.disabled && !isActive ? { x: 2 } : {}}
        whileTap={!item.disabled ? { scale: 0.97 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <AnimatePresence>
          {isActive && (
            <motion.span
              layoutId="nav-active-marker"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-[2px] bg-blue-600 dark:bg-blue-400 pointer-events-none z-10"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </AnimatePresence>

        {item.disabled ? (
          <SidebarMenuButton disabled className="opacity-40 cursor-not-allowed">
            <span className="inline-flex items-center justify-center">
              <item.icon className="size-4" />
            </span>
            <span>{item.title}</span>
          </SidebarMenuButton>
        ) : (
          <SidebarMenuButton render={<Link href={item.url} />} isActive={isActive}>
            <motion.span
              className="inline-flex items-center justify-center"
              whileHover={{ scale: 1.2, rotate: isActive ? 0 : 4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <item.icon className="size-4" />
            </motion.span>
            <span>{item.title}</span>
          </SidebarMenuButton>
        )}
      </motion.div>
    </SidebarMenuItem>
  )
}

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
    {
      label: t('sourcing'),
      items: [
        { title: t('purchases'), url: '/achats', icon: ShoppingCart, disabled: false },
      ],
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <motion.div
            className="w-8 h-8 shrink-0 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm"
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            B
          </motion.div>
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
                  <NavItem
                    key={item.url}
                    item={item}
                    isActive={pathname === item.url}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <NavItem
            item={{ title: t('settings'), url: '/settings', icon: Settings, disabled: true }}
            isActive={false}
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
