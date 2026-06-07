import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CurrencyCode } from '@/types/merchant'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Taux de conversion approximatifs vers XOF (Franc CFA BCEAO)
export const XOF_RATES: Record<CurrencyCode, number> = {
  XOF: 1,
  GHS: 58,    // 1 GHS ≈ 58 XOF
  NGN: 0.44,  // 1 NGN ≈ 0.44 XOF
  GNF: 0.076, // 1 GNF ≈ 0.076 XOF
  GMD: 10.5,  // 1 GMD ≈ 10.5 XOF
  SLE: 31,    // 1 SLE ≈ 31 XOF (nouveau leone depuis 2022)
  LRD: 3.4,   // 1 LRD ≈ 3.4 XOF
  CVE: 6.1,   // 1 CVE ≈ 6.1 XOF
  MRU: 16,    // 1 MRU ≈ 16 XOF
}

// Locale d'affichage par devise
const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  XOF: 'fr-FR',
  GHS: 'en-GH',
  NGN: 'en-NG',
  GNF: 'fr-GN',
  GMD: 'en-GM',
  SLE: 'en-SL',
  LRD: 'en-LR',
  CVE: 'pt-CV',
  MRU: 'fr-MR',
}

// Pour les prix de plans : 0 = "Sur devis" (Enterprise)
export function formatPlanPrice(amount: number, currency: CurrencyCode | string = 'XOF') {
  if (amount === 0) return 'Sur devis'
  return formatCurrency(amount, currency)
}

export function formatCurrency(amount: number, currency: CurrencyCode | string = 'XOF') {
  const locale = CURRENCY_LOCALE[currency as CurrencyCode] ?? 'fr-FR'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // fallback si le code devise n'est pas reconnu par le runtime
    return `${amount.toLocaleString('fr-FR')} ${currency}`
  }
}

// Convertit un montant XOF vers une devise locale
export function xofToLocal(amountXof: number, currency: CurrencyCode): number {
  if (currency === 'XOF') return amountXof
  return Math.round(amountXof / XOF_RATES[currency])
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}
