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
    <div className="protected-theme w-64 border-r bg-white p-6 shadow-xl shadow-slate-900/10 backdrop-blur-sm transition-colors duration-300">
      <h2 className="text-xl font-bold mb-6">Finance Tracker</h2>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`group relative block overflow-hidden rounded-xl border border-transparent p-2 pl-4 transition-colors duration-200 ${
              pathname === item.href
                ? 'bg-black text-white'
                : 'text-zinc-700 hover:bg-gray-100'
            }`}
          >
            <span
              aria-hidden
              className={`absolute bottom-1.5 left-1.5 top-1.5 w-1 rounded-full transition-all duration-200 ${
                pathname === item.href
                  ? 'bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.55)]'
                  : 'bg-transparent'
              }`}
            />
            <span
              className={`inline-block transition-transform duration-200 ${
                pathname === item.href ? 'translate-x-0.5' : 'group-hover:translate-x-0.5'
              }`}
            >
              {item.name}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
