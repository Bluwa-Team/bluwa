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
  Lock,
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
  locked?: boolean
}

function NavItem({ item, isActive }: { item: NavItemData; isActive: boolean }) {
  const isBlocked = item.disabled || item.locked

  return (
    <SidebarMenuItem>
      <motion.div
        className="relative"
        whileHover={!isBlocked && !isActive ? { x: 2 } : {}}
        whileTap={!isBlocked ? { scale: 0.97 } : {}}
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

        {isBlocked ? (
          <SidebarMenuButton disabled className="opacity-40 cursor-not-allowed">
            <span className="inline-flex items-center justify-center">
              {item.locked ? <Lock className="size-4" /> : <item.icon className="size-4" />}
            </span>
            <span className="flex-1">{item.title}</span>
            {item.locked && (
              <span className="text-[9px] font-medium tracking-wide uppercase text-muted-foreground/60 shrink-0">
                Pro
              </span>
            )}
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

function isAllowed(module: string | undefined, allowedModules: string[]): boolean {
  if (!module) return true
  if (allowedModules.includes('*')) return true
  return allowedModules.includes(module)
}

export function AppSidebar({ orgName, allowedModules }: { orgName: string; allowedModules: string[] }) {
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
    // ── 2. Données de référence (mdm) ─────────────────────────────────────────
    {
      label: t('referenceData'),
      items: [
        { title: t('articles'),    url: '/articles',                    icon: BookOpen, disabled: false, module: 'mdm' },
        { title: t('clients'),     url: '/clients',                     icon: Users,    disabled: false, module: 'mdm' },
        { title: t('suppliers'),   url: '/fournisseurs',                icon: Truck,    disabled: false, module: 'mdm' },
        { title: t('workCenters'), url: '/production/postes-de-charge', icon: Cog,      disabled: false, module: 'mdm' },
      ],
    },
    // ── 3. Ventes ─────────────────────────────────────────────────────────────
    {
      label: t('ventes'),
      items: [
        { title: t('commandesClients'), url: '/ventes',    icon: ShoppingBag,  disabled: false, module: 'ventes' },
        { title: t('adv'),              url: '/adv',       icon: Receipt,      disabled: false, module: 'ventes' },
        { title: t('bonsLivraison'),    url: '/logistique',icon: PackageCheck, disabled: false, module: 'logistique' },
      ],
    },
    // ── 4. Planification ─────────────────────────────────────────────────────
    {
      label: t('planification'),
      items: [
        { title: t('previsions'),     url: '/previsions',      icon: LineChart,  disabled: false, module: 'planification' },
        { title: t('demandeClients'), url: '/demande-clients', icon: Users2,     disabled: false, module: 'planification' },
        { title: t('supplyPlanning'), url: '/supply-planning', icon: Layers,     disabled: false, module: 'supply_planning' },
        { title: t('mrp'),            url: '/mrp',             icon: Calculator, disabled: false, module: 'mrp' },
      ],
    },
    // ── 5. Achats & Stocks ───────────────────────────────────────────────────
    {
      label: t('achatsStocks'),
      items: [
        { title: t('approvisionnement'), url: '/approvisionnement', icon: ClipboardList,  disabled: false, module: 'achats' },
        { title: t('reception'),         url: '/reception',         icon: ShoppingCart,   disabled: false, module: 'reception' },
        { title: t('stocks'),            url: '/stocks',            icon: Warehouse,      disabled: false, module: 'stocks' },
        { title: t('inventaire'),        url: '/inventaire',        icon: ClipboardCheck, disabled: false, module: 'inventaire' },
      ],
    },
    // ── 6. Production ─────────────────────────────────────────────────────────
    {
      label: t('production'),
      items: [
        { title: t('ordresFabrication'), url: '/production',     icon: Factory,     disabled: false, module: 'production' },
        { title: t('mes'),               url: '/production/mes', icon: MonitorPlay, disabled: false, module: 'production' },
        { title: t('productionBatches'), url: '/lots',           icon: Package,     disabled: false, module: 'production' },
      ],
    },
    // ── 7. Qualité ────────────────────────────────────────────────────────────
    {
      label: t('qualite'),
      items: [
        { title: t('liberationLots'),   url: '/qualite',                 icon: FlaskConical,  disabled: false, module: 'qualite' },
        { title: t('planHaccp'),        url: '/qualite/haccp',           icon: ShieldCheck,   disabled: false, module: 'qualite' },
        { title: t('nonConformitesQA'), url: '/qualite/non-conformites', icon: AlertTriangle, disabled: false, module: 'qualite' },
        { title: t('genealogie'),       url: '/qualite/genealogie',      icon: GitBranch,     disabled: false, module: 'qualite' },
      ],
    },
    // ── 8. Pilotage ───────────────────────────────────────────────────────────
    {
      label: t('analyse'),
      items: [
        { title: t('marginAnalysis'), url: '/analyse-marge', icon: TrendingUp, disabled: false, module: 'analyse_marge' },
      ],
    },
  ].map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      locked: !isAllowed((item as { module?: string }).module, allowedModules),
    })),
  }))

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
