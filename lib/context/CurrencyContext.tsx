'use client'

/**
 * CurrencyContext
 *
 * Provides two things to every component inside <CurrencyProvider>:
 *   1. baseCurrency  — the user's preferred display currency (from profiles.base_currency)
 *   2. fmt(amount, currencyCode?)  — a formatter function
 *        • if currencyCode is supplied it formats in that currency
 *        • if omitted it formats in baseCurrency
 *   3. currencies — the full list from supported_currencies (for dropdowns)
 *   4. getCurrencyInfo(code) — look up a single currency's metadata
 *
 * Why a context instead of fetching in every component?
 *   Without a context, every page that needs to display an amount would have
 *   to make its own Supabase call to get base_currency and supported_currencies.
 *   That means duplicate network requests and inconsistent loading states.
 *   The context fetches once when the protected layout mounts and makes the
 *   data available everywhere instantly.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupportedCurrency } from '@/lib/utils/currency'
import { formatCurrency } from '@/lib/utils/currency'

// ─── shape of everything the context exposes ────────────────────────────────
type CurrencyContextType = {
  /** The user's preferred display currency code, e.g. "CAD" */
  baseCurrency: string
  /** Full metadata for baseCurrency (symbol, decimal_digits, etc.) */
  baseCurrencyInfo: SupportedCurrency | null
  /** All rows from supported_currencies — use for dropdowns */
  currencies: SupportedCurrency[]
  /**
   * Format an amount as a currency string.
   * fmt(1234.5)          → "$1,234.50" (uses baseCurrency)
   * fmt(1234.5, 'USD')   → "$1,234.50" (explicit code)
   * fmt(1234.5, 'JPY')   → "¥1,235"   (zero decimals)
   */
  fmt: (amount: number, currencyCode?: string) => string
  /** Look up a single SupportedCurrency by its ISO code */
  getCurrencyInfo: (code: string) => SupportedCurrency | undefined
  /** True while the initial fetch is in-flight */
  loading: boolean
}

// ─── default / fallback values (used before first render) ───────────────────
const CurrencyContext = createContext<CurrencyContextType>({
  baseCurrency: 'CAD',
  baseCurrencyInfo: null,
  currencies: [],
  fmt: (amount) => `$${amount.toFixed(2)}`,
  getCurrencyInfo: () => undefined,
  loading: true,
})

// ─── Provider ────────────────────────────────────────────────────────────────
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [baseCurrency, setBaseCurrency] = useState('CAD')
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([])
  const [loading, setLoading] = useState(true)

  // Create one supabase client for the lifetime of this provider.
  // useMemo prevents a new client on every render.
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      // Fire both requests in parallel — no reason to wait for one before
      // starting the other.
      const [{ data: profile }, { data: currencyList }] = await Promise.all([
        supabase.from('profiles').select('base_currency').single(),
        supabase
          .from('supported_currencies')
          .select('code, name, symbol, decimal_digits')
          .order('code'),
      ])

      if (cancelled) return // component unmounted while fetching

      if (profile?.base_currency) {
        setBaseCurrency(profile.base_currency)
      }
      if (currencyList) {
        setCurrencies(currencyList as SupportedCurrency[])
      }
      setLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [supabase])

  // ── derived helpers (memoised so reference stays stable) ──────────────────

  const getCurrencyInfo = useMemo(
    () => (code: string) => currencies.find((c) => c.code === code),
    [currencies],
  )

  const baseCurrencyInfo = useMemo(
    () => getCurrencyInfo(baseCurrency) ?? null,
    [baseCurrency, getCurrencyInfo],
  )

  const fmt = useMemo(
    () =>
      (amount: number, currencyCode?: string) => {
        const code = currencyCode ?? baseCurrency
        const info = getCurrencyInfo(code)
        return formatCurrency(
          amount,
          code,
          info?.symbol,
          info?.decimal_digits ?? 2,
        )
      },
    [baseCurrency, getCurrencyInfo],
  )

  return (
    <CurrencyContext.Provider
      value={{ baseCurrency, baseCurrencyInfo, currencies, fmt, getCurrencyInfo, loading }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

// ─── Consumer hook ────────────────────────────────────────────────────────────
/**
 * Use this inside any client component that lives under the protected layout.
 *
 * const { fmt, baseCurrency } = useCurrency()
 * <span>{fmt(transaction.amount, transaction.currency)}</span>
 */
export function useCurrency() {
  return useContext(CurrencyContext)
}
