'use client'

/**
 * New Account Page
 *
 * Changes from original:
 * - Currency field is now a dropdown instead of hardcoded 'CAD'.
 * - The dropdown is pre-filled with the user's base_currency (from CurrencyContext).
 * - The full list of supported currencies comes from the same context.
 * - AccountType also now includes 'receivable' and 'loan_payable' which exist
 *   in the database (the loans pages reference them).
 */

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AccountType, AccountNature } from '@/types/database'
import { useCurrency } from '@/lib/context/CurrencyContext'

const accountTypes: AccountType[] = [
  'cash',
  'bank',
  'investment',
  'digital_wallet',
  'credit_card',
  'mortgage',
  'internal',
]

export default function NewAccountPage() {
  const supabase = createClient()
  const router = useRouter()

  // Get the user's base_currency as the default, and the full currency list
  // for the dropdown. Both come from the CurrencyProvider in the layout —
  // no extra fetch needed here.
  const { baseCurrency, currencies } = useCurrency()

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [nature, setNature] = useState<AccountNature>('asset')
  const [currency, setCurrency] = useState<string>(baseCurrency)
  const [isDefault, setIsDefault] = useState(false)
  const [loading, setLoading] = useState(false)

  // When baseCurrency loads (async), sync the default selection.
  // We use a ref trick: if user hasn't manually changed the currency yet,
  // update it when baseCurrency changes. We track this with a simple flag.
  const [userChoseCurrency, setUserChoseCurrency] = useState(false)
  if (!userChoseCurrency && currency !== baseCurrency && baseCurrency !== 'CAD') {
    // baseCurrency just loaded from context — update our local default
    setCurrency(baseCurrency)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return alert('Account name is required')
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('Not authenticated')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: name.trim(),
      type,
      nature,
      currency,          // ← now dynamic instead of hardcoded 'CAD'
      is_default: isDefault,
    })

    if (error) {
      alert(error.message)
    } else {
      router.push('/accounts')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Create Account</h1>

      <input
        className="w-full border rounded p-2"
        placeholder="Account Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Account type */}
      <select
        className="w-full border rounded p-2"
        value={type}
        onChange={(e) => setType(e.target.value as AccountType)}
      >
        {accountTypes.map((t) => (
          <option key={t} value={t}>
            {t.replace('_', ' ')}
          </option>
        ))}
      </select>

      {/* Asset / Liability */}
      <select
        className="w-full border rounded p-2"
        value={nature}
        onChange={(e) => setNature(e.target.value as AccountNature)}
      >
        <option value="asset">Asset</option>
        <option value="liability">Liability</option>
      </select>

      {/* ↓ NEW: Currency dropdown ─────────────────────────────────────────── */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          Account Currency
        </label>
        <select
          className="w-full border rounded p-2"
          value={currency}
          onChange={(e) => {
            setUserChoseCurrency(true)
            setCurrency(e.target.value)
          }}
        >
          {currencies.length === 0 && (
            // Fallback while the list is loading — just show the current value
            <option value={currency}>{currency}</option>
          )}
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name} ({c.symbol})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Pre-filled with your display currency. Change if this account holds a
          different currency.
        </p>
      </div>
      {/* ─────────────────────────────────────────────────────────────────── */}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Make Default Account
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-black text-white rounded p-2 disabled:opacity-60"
      >
        {loading ? 'Creating...' : 'Create'}
      </button>
    </div>
  )
}
