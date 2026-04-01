'use client'

/**
 * CurrencySettings
 *
 * Lets the user change their base/display currency.
 *
 * Uses the CurrencyContext so it gets the currency list and current selection
 * without an extra fetch. The only network call it makes is the update itself.
 */

import { useState } from 'react'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useUserBaseCurrency } from '@/lib/hooks/useCurrencies'

export default function CurrencySettings() {
  // useCurrency gives us the live list of currencies (already fetched by the
  // CurrencyProvider in the layout — zero extra round trips).
  const { currencies, loading: listLoading } = useCurrency()

  // useUserBaseCurrency gives us the update function and local optimistic state.
  const { baseCurrency, loading: profileLoading, updateBaseCurrency } =
    useUserBaseCurrency()

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const loading = listLoading || profileLoading

  const handleChange = async (code: string) => {
    setSaving(true)
    setMessage(null)
    const error = await updateBaseCurrency(code)
    if (error) {
      setMessage({ text: `Error: ${error.message}`, ok: false })
    } else {
      setMessage({ text: 'Currency updated! Refresh the page to see updated amounts.', ok: true })
      setTimeout(() => setMessage(null), 5000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="h-10 w-full rounded-lg border bg-gray-50 animate-pulse" />
    )
  }

  return (
    <div className="space-y-3">
      <select
        className="w-full border rounded-lg p-2 text-sm"
        value={baseCurrency}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        aria-label="Display currency"
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.name} ({c.symbol})
          </option>
        ))}
      </select>

      {message && (
        <p
          className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
