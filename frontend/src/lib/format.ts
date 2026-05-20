// Locale-aware number formatting.
//
// Bluwa runs across francophone West Africa (space thousands separator,
// comma decimals: "3 000 000,5") and anglophone markets like Ghana and
// Nigeria (comma thousands, dot decimals: "3,000,000.5"). The app locale
// drives the format, which matches each subsidiary's region in practice.

const NUMBER_LOCALE: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
}

function resolve(locale: string): string {
  return NUMBER_LOCALE[locale] ?? NUMBER_LOCALE.fr
}

/** Format a number with locale-appropriate grouping and decimal separators. */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(resolve(locale), options).format(value)
}

/** Format an amount followed by a currency/unit suffix, e.g. "3 000 000 XOF". */
export function formatAmount(
  value: number,
  locale: string,
  suffix: string,
  options?: Intl.NumberFormatOptions,
): string {
  const n = formatNumber(value, locale, options)
  return suffix ? `${n} ${suffix}` : n
}
