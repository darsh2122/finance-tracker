"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

type NavItem = { href: string; label: string; icon?: string }

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "🧾" },
  { href: "/transactions/new", label: "Add Transaction", icon: "➕" },
  { href: "/accounts", label: "Accounts", icon: "🏦" },
  { href: "/categories", label: "Categories", icon: "🗂️" },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Prevent background scroll when sidebar is open (mobile)
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <div className="protected-theme min-h-screen bg-zinc-50 transition-colors duration-300">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 backdrop-blur md:hidden">
        <button
          className="h-10 w-10 rounded-lg border bg-white hover:bg-zinc-50"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="font-semibold">MoneyFlow</div>

        <Link
          href="/transactions/new"
          className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white"
        >
          + Add
        </Link>
      </div>

      {/* Overlay (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 border-r bg-white shadow-xl shadow-slate-900/10 backdrop-blur-sm md:sticky md:z-30",
          "transform transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        ].join(" ")}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white ring-1 ring-white/15">
              💸
            </span>
            <span className="font-semibold">MoneyFlow</span>
          </Link>

          {/* Close button (mobile) */}
          <button
            className="md:hidden h-10 w-10 rounded-lg border bg-white hover:bg-zinc-50"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="p-3">
          <div className="space-y-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/"))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group relative flex items-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-sm transition-colors duration-200",
                    active
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-700 hover:bg-zinc-100",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className={`absolute bottom-1.5 left-1.5 top-1.5 w-1 rounded-full transition-all duration-200 ${
                      active ? "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.55)]" : "bg-transparent"
                    }`}
                  />
                  <span
                    className={`relative z-10 w-5 text-center transition-transform duration-200 ${
                      active ? "scale-110" : "group-hover:translate-x-0.5"
                    }`}
                  >
                    {item.icon ?? "•"}
                  </span>
                  <span
                    className={`relative z-10 font-medium transition-transform duration-200 ${
                      active ? "translate-x-0.5" : "group-hover:translate-x-0.5"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer area */}
        <div className="mt-auto border-t p-4 text-xs text-zinc-500">
          Tip: Add transactions daily for best insights.
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-72">
        <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}

