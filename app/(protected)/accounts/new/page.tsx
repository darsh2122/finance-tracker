'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AccountType, AccountNature } from '@/types/database'

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

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [nature, setNature] = useState<AccountNature>('asset')
  const [isDefault, setIsDefault] = useState(false)
  const [loading, setLoading] = useState(false)

const handleSubmit = async () => {
  setLoading(true)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    alert('Not authenticated')
    return
  }

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,   // 🔥 IMPORTANT
    name,
    type,
    nature,
    is_default: isDefault,
    currency: 'CAD',
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

      <select
        className="w-full border rounded p-2"
        value={type}
        onChange={(e) => setType(e.target.value as AccountType)}
      >
        {accountTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        className="w-full border rounded p-2"
        value={nature}
        onChange={(e) => setNature(e.target.value as AccountNature)}
      >
        <option value="asset">Asset</option>
        <option value="liability">Liability</option>
      </select>

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
        className="w-full bg-black text-white rounded p-2"
      >
        {loading ? 'Creating...' : 'Create'}
      </button>
    </div>
  )
}
