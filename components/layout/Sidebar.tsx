'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Accounts', href: '/accounts' },
  { name: 'Transactions', href: '/transactions' },
  { name: 'Loans', href: '/loans' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r p-6">
      <h2 className="text-xl font-bold mb-6">Finance Tracker</h2>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`block rounded p-2 ${
              pathname === item.href
                ? 'bg-black text-white'
                : 'hover:bg-gray-100'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}
