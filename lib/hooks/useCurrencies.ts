'use client'

/**
 * lib/hooks/useCurrencies.ts
 *
 * Two hooks:
 *
 * 1. useCurrencies()
 *    Returns the list of supported currencies.
 *    NOTE: If you are inside a component that is already wrapped by
 *    CurrencyProvider (i.e. inside the protected layout), prefer useCurrency()
 *    from CurrencyContext instead — it re-uses the already-fetched data.
 *    Use this hook only in components that live outside the protected layout
 *    (e.g. onboarding, auth pages).
 *
 * 2. useUserBaseCurrency()
 *    Returns the current user's base_currency and an updateBaseCurrency()
 *    function. This is used by CurrencySettings.
 *    It fetches independently so CurrencySettings works even if the
 *    CurrencyContext hasn't loaded yet (graceful degradation).
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupportedCurrency } from '@/lib/utils/currency'

const supabase = createClient()

// ─── useCurrencies ────────────────────────────────────────────────────────────
export function useCurrencies() {
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    supabase
      .from('supported_currencies')
      .select('code, name, symbol, decimal_digits')
      .order('code')
      .then(({ data }) => {
        setCurrencies((data as SupportedCurrency[]) || [])
        setLoading(false)
      })
  }, [])

  return { currencies, loading }
}

// ─── useUserBaseCurrency ──────────────────────────────────────────────────────
export function useUserBaseCurrency() {
  const [baseCurrency, setBaseCurrency] = useState<string>('CAD')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('base_currency')
        .eq('id', auth.user.id)   // ✅ FIX
        .single()

      if (!active) return

      if (data?.base_currency) {
        setBaseCurrency(data.base_currency)
      }

      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  const updateBaseCurrency = async (code: string): Promise<Error | null> => {
    const { error } = await supabase.rpc('set_user_base_currency', {
      p_currency: code,
    })

    if (!error) {
      setBaseCurrency(code)
      return null
    }

    return error
  }

  return { baseCurrency, loading, updateBaseCurrency }
}