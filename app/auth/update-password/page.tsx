'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError('Invalid or expired reset link.')
      }

      setLoading(false)
    }

    checkSession()
  }, [supabase])

  const handleUpdate = async () => {
    setUpdating(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      setUpdating(false)
      return
    }

    setMessage('Password updated successfully.')

    setTimeout(() => {
      router.push('/auth/login')
    }, 1500)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Update Password</h1>

        {!error && (
          <>
            <input
              type="password"
              placeholder="New Password"
              className="w-full border p-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={handleUpdate}
              disabled={updating}
              className="w-full bg-black text-white p-2 rounded"
            >
              {updating ? 'Updating...' : 'Update Password'}
            </button>
          </>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-600 text-sm">{message}</p>}

        {/* 👇 Same style as Signup page */}
        <Link href="/auth/login" className="text-sm block text-center">
          Back to Login
        </Link>
      </div>
    </div>
  )
}
