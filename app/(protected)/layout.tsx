"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { CurrencyProvider } from "@/lib/context/CurrencyContext"
import { PushPermissionPrompt } from "@/components/layout/PushPermissionPrompt"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", exact: true },
  { href: "/transactions", label: "Transactions", icon: "🧾", exact: true },
  { href: "/transactions/new", label: "Add New", icon: "➕", exact: false },
  { href: "/accounts", label: "Accounts", icon: "🏦", exact: true },
  { href: "/categories", label: "Categories", icon: "🏷️", exact: true },
  { href: "/settings", label: "Settings", icon: "⚙️", exact: true },
  { href: "/onboarding", label: "Tutorial", icon: "📚", exact: true },
  { href: "/contact-us", label: "Contact", icon: "📧", exact: true },
]

function active(href: string, path: string, exact?: boolean) {
  return exact ? path === href : path === href || path.startsWith(href + "/")
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [name, setName] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { })
    }
  }, [])

  useEffect(() => {
    ; (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const n = data.user.user_metadata?.full_name as string | undefined
      if (n) { setName(n); return }
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).single()
      if (p?.full_name) setName(p.full_name)
    })()
  }, [supabase])

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/")
  }

  const sidebarItems = NAV.map(item => (
    <Link
      key={item.href}
      href={item.href}
      className={`clay-sidebar-item ${active(item.href, pathname, item.exact) ? "active" : ""}`}
    >
      <span className="sidebar-item-icon">{item.icon}</span>
      {item.label}
    </Link>
  ))

  const isOnboarding = pathname === "/onboarding"

  if (isOnboarding) {
    return (
      <CurrencyProvider>
        <main>{children}</main>
      </CurrencyProvider>
    )
  }

  return (
    <CurrencyProvider>
      <div style={{ minHeight: "100vh" }}>

        {/* ── DESKTOP SIDEBAR ──────────────────────────────────────── */}
        <aside className="clay-sidebar show-desktop" style={{ flexDirection: "column" }}>
          <div className="clay-sidebar-logo">
            <span style={{ fontSize: 22 }}>💸</span>
            <span className="sidebar-logo-text">My Wallet</span>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {sidebarItems}
          </nav>

          <div style={{ marginTop: 12, borderTop: `1px solid var(--border)`, paddingTop: 12 }}>
            {name && (
              <div style={{ padding: "8px 13px 10px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                👋 {name}
              </div>
            )}
            <button onClick={logout} className="clay-sidebar-item" style={{ color: "var(--red)", width: "100%" }}>
              <span className="sidebar-item-icon">🚪</span> Sign Out
            </button>
            <div className="clay-tip" style={{ marginTop: 12 }}>
              💡 Tip: Log transactions daily for best insights!
            </div>
          </div>
        </aside>

        {/* ── MOBILE TOP BAR ───────────────────────────────────────── */}
        <div
          className="show-mobile"
          style={{
            position: "sticky", top: 0, left: 0, right: 0, height: 54,
            background: "var(--surface)",
            boxShadow: "0 2px 12px rgba(109,72,200,0.10), 0 1px 0 var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 14px", zIndex: 90,
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              width: 38, height: 38, borderRadius: "var(--r-sm)",
              background: "var(--purple-pale)", border: "none",
              cursor: "pointer", fontSize: 17, display: "flex",
              alignItems: "center", justifyContent: "center",
              boxShadow: "var(--clay-card-sm)", color: "var(--purple)",
            }}
          >☰</button>

          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <span style={{ fontSize: 18 }}>💸</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>My Wallet</span>
          </Link>

          <Link
            href="/transactions/new"
            style={{
              width: 38, height: 38, borderRadius: "var(--r-sm)",
              background: "var(--purple-grad)",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none", fontSize: 18,
              boxShadow: "0 4px 12px rgba(124,58,237,0.35), inset 0 -2px 0 rgba(0,0,0,0.12)",
            }}
          >➕</Link>
        </div>

        {/* ── MOBILE DRAWER OVERLAY ────────────────────────────────── */}
        {drawerOpen && (
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(30,21,53,0.45)", backdropFilter: "blur(5px)", zIndex: 110 }}
            />
            <div style={{
              position: "fixed", top: 0, left: 0, bottom: 0, width: 280,
              background: "var(--surface)",
              boxShadow: "0 0 40px rgba(124,58,237,0.20), inset -1px 0 0 var(--border)",
              zIndex: 120, display: "flex", flexDirection: "column", padding: "18px 14px",
              animation: "clay-slide-up 0.28s var(--spring) both",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div className="clay-sidebar-logo" style={{ flex: 1, marginRight: 10, marginBottom: 0 }}>
                  <span style={{ fontSize: 20 }}>💸</span>
                  <span className="sidebar-logo-text">My Wallet</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    width: 36, height: 36, borderRadius: "var(--r-sm)",
                    background: "var(--surface-soft)", border: "none",
                    cursor: "pointer", fontSize: 17, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    boxShadow: "var(--clay-card-sm)",
                  }}
                >✕</button>
              </div>

              <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                {sidebarItems}
              </nav>

              <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                {name && (
                  <div style={{ padding: "6px 13px 8px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>👋 {name}</div>
                )}
                <button onClick={logout} className="clay-sidebar-item" style={{ color: "var(--red)", width: "100%" }}>
                  <span className="sidebar-item-icon">🚪</span> Sign Out
                </button>
                <div className="clay-tip" style={{ marginTop: 12 }}>
                  💡 Tip: Log transactions daily for best insights!
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <main style={{ marginLeft: 0 }} className="main-layout">
          <style>{`
            @media (min-width: 768px) { .main-layout { margin-left: 220px !important; } }
          `}</style>
          {children}
        </main>

        {/* ── MOBILE BOTTOM NAV ────────────────────────────────────── */}
        <nav className="clay-bottom-nav show-mobile">
          {[
            { href: "/dashboard", label: "Home", icon: "📊" },
            { href: "/transactions", label: "History", icon: "🧾" },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`clay-nav-tab ${active(item.href, pathname, true) ? "active" : ""}`}
            >
              <span className="tab-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <Link href="/transactions/new" className="clay-fab">➕</Link>

          {[
            { href: "/accounts", label: "Accounts", icon: "🏦" },
            { href: "/settings", label: "Settings", icon: "⚙️" },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`clay-nav-tab ${active(item.href, pathname, true) ? "active" : ""}`}
            >
              <span className="tab-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <PushPermissionPrompt />
      </div>
    </CurrencyProvider>
  )
}
