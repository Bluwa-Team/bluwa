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
  ClipboardList,
  Warehouse,
  Calculator,
  Factory,
  MonitorPlay,
  FlaskConical,
  GitBranch,
  FileText,
  ClipboardCheck,
  Cog,
  ShoppingBag,
  Receipt,
  PackageCheck,
  LineChart,
  Users2,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import Image from 'next/image'
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
    // ── 1. Principal ──────────────────────────────────────────────────────────
    {
      label: t('main'),
      items: [
        { title: t('dashboard'), url: '/dashboard', icon: LayoutDashboard, disabled: false },
      ],
    },
    // ── 2. Données de référence ───────────────────────────────────────────────
    {
      label: t('referenceData'),
      items: [
        { title: t('articles'),    url: '/articles',                    icon: BookOpen, disabled: false },
        { title: t('clients'),     url: '/clients',                     icon: Users,    disabled: false },
        { title: t('suppliers'),   url: '/fournisseurs',                icon: Truck,    disabled: false },
        { title: t('workCenters'), url: '/production/postes-de-charge', icon: Cog,      disabled: false },
      ],
    },
    // ── 3. Ventes ─────────────────────────────────────────────────────────────
    {
      label: t('ventes'),
      items: [
        { title: t('commandesClients'), url: '/ventes',    icon: ShoppingBag,  disabled: false },
        { title: t('adv'),              url: '/adv',        icon: Receipt,      disabled: false },
        { title: t('bonsLivraison'),    url: '/logistique', icon: PackageCheck, disabled: false },
      ],
    },
    // ── 4. Planification ─────────────────────────────────────────────────────
    {
      label: t('planification'),
      items: [
        { title: t('previsions'),     url: '/previsions',      icon: LineChart,  disabled: false },
        { title: t('demandeClients'), url: '/demande-clients', icon: Users2,     disabled: false },
        { title: t('supplyPlanning'), url: '/supply-planning', icon: Layers,     disabled: false },
        { title: t('mrp'),            url: '/mrp',             icon: Calculator, disabled: false },
      ],
    },
    // ── 5. Achats & Stocks ───────────────────────────────────────────────────
    {
      label: t('achatsStocks'),
      items: [
        { title: t('approvisionnement'), url: '/approvisionnement', icon: ClipboardList,  disabled: false },
        { title: t('reception'),         url: '/reception',         icon: ShoppingCart,   disabled: false },
        { title: t('stocks'),            url: '/stocks',            icon: Warehouse,      disabled: false },
        { title: t('inventaire'),        url: '/inventaire',        icon: ClipboardCheck, disabled: false },
      ],
    },
    // ── 6. Production ─────────────────────────────────────────────────────────
    {
      label: t('production'),
      items: [
        { title: t('ordresFabrication'), url: '/production',     icon: Factory,     disabled: false },
        { title: t('mes'),               url: '/production/mes', icon: MonitorPlay, disabled: false },
        { title: t('productionBatches'), url: '/lots',           icon: Package,     disabled: false },
      ],
    },
    // ── 7. Qualité ────────────────────────────────────────────────────────────
    {
      label: t('qualite'),
      items: [
        { title: t('liberationLots'),   url: '/qualite',                 icon: FlaskConical,  disabled: false },
        { title: t('planHaccp'),        url: '/qualite/haccp',           icon: ShieldCheck,   disabled: false },
        { title: t('nonConformitesQA'), url: '/qualite/non-conformites', icon: AlertTriangle, disabled: false },
        { title: t('genealogie'),       url: '/qualite/genealogie',      icon: GitBranch,     disabled: false },
      ],
    },
    // ── 8. Pilotage ────────────────────────────────────────────────────────────
    {
      label: t('analyse'),
      items: [
        { title: t('marginAnalysis'), url: '/analyse-marge', icon: TrendingUp, disabled: false },
      ],
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <motion.div
            className="w-8 h-8 shrink-0"
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Image src="/logo_icon.png" alt="Bluwa" width={32} height={32} className="w-full h-full object-contain" />
          </motion.div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold leading-none">Bluwa</span>
            <span className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">{orgName}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS
          .filter((g) => g.items.length > 0)
          .map((group) => (
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
            item={{ title: t('settings'), url: '/settings', icon: Settings, disabled: false }}
            isActive={pathname === '/settings'}
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
