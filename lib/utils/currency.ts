// lib/utils/currency.ts

export type SupportedCurrency = {
  code: string
  name: string
  symbol: string
  decimal_digits: number
}

/**
 * Format a number as a currency string using the currency's symbol and decimal digits.
 * e.g. formatCurrency(1234.5, 'USD') → '$1,234.50'
 * e.g. formatCurrency(1234.5, 'JPY') → '¥1,235'
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  symbol?: string,
  decimalDigits = 2
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits,
    }).format(amount)
  } catch {
    // Fallback if Intl doesn't know the currency
    const sym = symbol ?? currencyCode
    return `${sym}${amount.toFixed(decimalDigits)}`
  }
}

/**
 * Get just the symbol for a currency (uses Intl if available)
 */
export function getCurrencySymbol(currencyCode: string, fallback?: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? fallback ?? currencyCode
  } catch {
    return fallback ?? currencyCode
  }
}