'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Topbar({ userEmail }: { userEmail: string }) {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="flex items-center justify-between bg-white border-b px-6 py-4">
      <div className="text-sm text-gray-600">{userEmail}</div>

      <button
        onClick={handleLogout}
        className="rounded bg-black px-4 py-2 text-white"
      >
        Logout
      </button>
    </div>
  )
}
