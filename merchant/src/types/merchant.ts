export type OrgStatus = 'active' | 'suspended' | 'trial' | 'churned' | 'archived'
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
export type UserRole = 'SUPER_ADMIN' | 'PLANT_MANAGER' | 'OPERATOR' | 'QUALITY_AUDITOR'

// ISO 4217 — devises Afrique de l'Ouest
export type CurrencyCode =
  | 'XOF'  // Franc CFA BCEAO — UEMOA (Sénégal, CI, Mali, BF, Niger, Togo, Bénin, Guinée-Bissau)
  | 'GHS'  // Cedi ghanéen
  | 'NGN'  // Naira nigérian
  | 'GNF'  // Franc guinéen
  | 'GMD'  // Dalasi gambien
  | 'SLE'  // Leone sierra-léonais (nouveau, depuis 2022)
  | 'LRD'  // Dollar libérien
  | 'CVE'  // Escudo cap-verdien
  | 'MRU'  // Ouguiya mauritanien

export type OnboardingStage =
  | 'prospect'
  | 'demo'
  | 'trial'
  | 'configuration'
  | 'formation'
  | 'golive'

export interface OnboardingItem {
  id: string
  org_id: string
  org_name: string
  country: string | null
  stage: OnboardingStage
  plan_target: string | null
  assigned_to: string | null
  notes: string | null
  blocked: boolean
  blocked_reason: string | null
  stage_entered_at: string
  created_at: string
  checklist: OnboardingCheck[]
  comments: OnboardingComment[]
}

export interface OnboardingCheck {
  id: string
  label: string
  done: boolean
}

export interface OnboardingComment {
  id: string
  author: string
  content: string
  created_at: string
}

export type PlanName = 'starter' | 'growth' | 'enterprise'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

export type PaymentMethod = 'virement' | 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'especes' | 'cheque' | 'stripe'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  virement:     'Virement bancaire',
  wave:         'Wave',
  orange_money: 'Orange Money',
  mtn_momo:     'MTN MoMo',
  moov_money:   'Moov Money',
  especes:      'Espèces',
  cheque:       'Chèque',
  stripe:       'Stripe',
}

export type PlanEngagement = 'monthly' | 'annual'
export type OrgSize = 'tpe' | 'pme' | 'grande'
export type ServiceType = 'formation' | 'support_prioritaire' | 'audit_conseil' | 'migration_donnees'
export type InstallationSize = 'tpe' | 'pme' | 'grande'

export interface SubscriptionPlan {
  id: string
  name: string
  price_monthly: number               // Prix de référence en XOF
  price_monthly_annual: number
  max_users_allowed: number
  target_size: OrgSize
  features_config: Record<string, unknown>
  prices?: Partial<Record<CurrencyCode, number>>  // Prix localisés par devise
  created_at: string
}

export interface InstallationFee {
  id: string
  factory_id: string
  size: InstallationSize
  amount_xof: number
  amount_local?: number
  currency?: CurrencyCode
  status: 'pending' | 'partial' | 'paid'
  paid_at: string | null
  payment_method: PaymentMethod | null
  payment_reference: string | null
  payment_note: string | null
  notes: string | null
  created_at: string
}

export interface ServiceOrder {
  id: string
  org_id: string
  factory_id: string | null
  service_type: ServiceType
  description: string
  amount_xof: number
  amount_local?: number
  currency?: CurrencyCode
  status: 'quoted' | 'confirmed' | 'delivered' | 'invoiced' | 'paid'
  scheduled_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface Factory {
  id: string
  organization_id: string
  name: string
  code: string
  location_country: string
  location_city: string
  timezone: string
  currency: CurrencyCode              // Devise de facturation du site
  subscription_plan_id: string | null
  subscription_status: SubscriptionStatus | null
  subscription_expires_at: string | null
  is_active: boolean
  created_at: string
  plan?: SubscriptionPlan
}

/** @deprecated Use Factory.subscription_plan_id + Factory.plan instead */
export interface FactorySubscription {
  id: string
  factory_id: string
  plan_id: string
  plan?: SubscriptionPlan
  engagement: PlanEngagement
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  starts_at: string
  ends_at: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export interface UserSiteAccess {
  id: string
  user_id: string
  factory_id: string
  granted_at: string
  granted_by: string | null
}

export interface Invoice {
  id: string
  factory_id: string
  subscription_id: string
  amount_xof: number
  amount_local?: number
  currency?: CurrencyCode
  status: InvoiceStatus
  due_at: string
  paid_at: string | null
  payment_method: PaymentMethod | null
  payment_reference: string | null    // N° virement, ref Wave/OM, N° chèque
  payment_note: string | null
  notes: string | null
  created_at: string
}

export interface SupportTicket {
  id: string
  factory_id: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  assigned_to: string | null
  messages: TicketMessage[]
  created_at: string
  updated_at: string
  factory?: {
    id: string
    name: string
    code: string
    org: { id: string; name: string } | null
  } | null
}

export interface TicketMessage {
  id: string
  author: string
  content: string
  created_at: string
  is_internal: boolean
}

export interface MerchantOrg {
  id: string
  name: string
  status: OrgStatus
  country: string | null
  currency: CurrencyCode              // Devise principale de l'org
  created_at: string
  factories?: Factory[]
  users_count?: number
}
