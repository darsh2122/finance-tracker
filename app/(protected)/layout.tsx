"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { CurrencyProvider } from "@/lib/context/CurrencyContext"

type NavItem = { href: string; label: string; icon: string }

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "🧾" },
  { href: "/transactions/new", label: "Add Transaction", icon: "➕" },
  { href: "/accounts", label: "Accounts", icon: "🏦" },
  { href: "/categories", label: "Categories", icon: "🏷️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/contact-us", label: "Contact Us", icon: "📧" },
  { href: "/onboarding", label: "Tutorial", icon: "📚" },
]

const SIDEBAR_W = 288
const RAIL_W = 72
const EDGE_OPEN_ZONE = 24
const SWIPE_OPEN_THRESHOLD = 70
const SWIPE_CLOSE_THRESHOLD = 70

const LS_KEY = "moneyflow.sidebarCollapsed"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return

      const metaName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined)

      if (metaName) setDisplayName(metaName)

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()

      if (prof?.full_name) setDisplayName(prof.full_name)
    })()
  }, [supabase])

  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const [displayName, setDisplayName] = useState<string>("")

  // ── Refs for direct DOM manipulation during drag (no re-renders) ──────────
  const sidebarRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Drag state kept in refs so updates don't trigger renders
  const dragging = useRef(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const dragMode = useRef<"open" | "close" | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY)
      if (v === "1") setCollapsed(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, collapsed ? "1" : "0")
    } catch {}
  }, [collapsed])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobile) {
      setOpen(false)
    }
  }, [isMobile])

  useEffect(() => {
    if (!open || !isMobile) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [open, isMobile])

  // ── Passive touch listeners (THE KEY FIX) ─────────────────────────────────
  // React's onTouchMove prop creates *active* (non-passive) listeners, forcing
  // the browser to wait for JS before scrolling/navigating — causing the freeze.
  // Using addEventListener with { passive: true } + direct DOM manipulation
  // eliminates both problems: no main-thread blocking and no React re-renders
  // during drag.
  useEffect(() => {
    if (!isMobile) return

    const sidebar = sidebarRef.current
    const overlay = overlayRef.current

    function applyDragPosition(dragX: number) {
      const tx = dragX - SIDEBAR_W
      if (sidebar) sidebar.style.transform = `translateX(${tx}px)`
      if (overlay) {
        const opacity = clamp(dragX / SIDEBAR_W, 0, 1)
        overlay.style.opacity = String(opacity)
        overlay.style.pointerEvents = opacity > 0 ? "auto" : "none"
      }
    }

    function clearDragStyles() {
      if (sidebar) sidebar.style.transform = ""
      if (overlay) {
        overlay.style.opacity = ""
        overlay.style.pointerEvents = ""
      }
    }

    // function handleTouchStart(e: TouchEvent) {
    //   const x = e.touches[0].clientX
    //   startX.current = x
    //   currentX.current = x
    //   dragging.current = false
    //   dragMode.current = null

    //   if (!open) {
    //     if (x <= EDGE_OPEN_ZONE) {
    //       dragMode.current = "open"
    //       dragging.current = true
    //       applyDragPosition(0)
    //     }
    //     return
    //   }

    //   if (x <= SIDEBAR_W) {
    //     dragMode.current = "close"
    //     dragging.current = true
    //     applyDragPosition(SIDEBAR_W)
    //   }
    // }

    // function handleTouchMove(e: TouchEvent) {
    //   if (!dragging.current || !dragMode.current) return
    //   const x = e.touches[0].clientX
    //   currentX.current = x
    //   const dx = x - startX.current

    //   const dragX =
    //     dragMode.current === "open"
    //       ? clamp(dx, 0, SIDEBAR_W)
    //       : clamp(SIDEBAR_W + dx, 0, SIDEBAR_W)

    //   // Direct DOM manipulation — zero React re-renders during drag
    //   applyDragPosition(dragX)
    // }

    // function handleTouchEnd() {
    //   if (!dragging.current || !dragMode.current) return
    //   const dx = currentX.current - startX.current

    //   // Clear inline styles so React's computed values take over
    //   clearDragStyles()

    //   if (dragMode.current === "open") {
    //     setOpen(dx >= SWIPE_OPEN_THRESHOLD)
    //   } else {
    //     setOpen(!(dx <= -SWIPE_CLOSE_THRESHOLD))
    //   }

    //   dragging.current = false
    //   dragMode.current = null
    // }

    // passive: true — browser doesn't wait for JS before scrolling/navigating
    // document.addEventListener("touchstart", handleTouchStart, { passive: true })
    // document.addEventListener("touchmove", handleTouchMove, { passive: true })
    // document.addEventListener("touchend", handleTouchEnd, { passive: true })

    // return () => {
    //   document.removeEventListener("touchstart", handleTouchStart)
    //   document.removeEventListener("touchmove", handleTouchMove)
    //   document.removeEventListener("touchend", handleTouchEnd)
    // }
  }, [isMobile, open]) // re-bind when open changes so handlers see latest value

  // ── Computed styles (only for non-drag state) ─────────────────────────────
  const sidebarTransform = useMemo(() => {
    if (!isMobile) return "translateX(0px)"
    return open ? "translateX(0px)" : `translateX(-${SIDEBAR_W}px)`
  }, [isMobile, open])

  const overlayOpacity = useMemo(() => {
    if (!isMobile) return 0
    return open ? 1 : 0
  }, [isMobile, open])

  const sidebarWidth = !isMobile ? (collapsed ? RAIL_W : SIDEBAR_W) : SIDEBAR_W

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
    } finally {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <CurrencyProvider>
      <div className="protected-theme min-h-screen bg-zinc-50 transition-colors duration-300 md:flex">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 backdrop-blur md:hidden">
          <button
            className="h-10 w-10 rounded-lg border bg-white hover:bg-zinc-50 active:scale-[0.98]"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="font-semibold">My Wallet</div>
          <Link
            href="/transactions/new"
            className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white active:scale-[0.98]"
          >
            + Add
          </Link>
        </div>

        {/* Overlay (mobile) — ref so drag can update opacity directly */}
        {isMobile && (
          <div
            ref={overlayRef}
            className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200"
            style={{
              opacity: overlayOpacity,
              pointerEvents: open ? "auto" : "none",
            }}
            onClick={() => setOpen(false)}
          />
        )}

        {/* Sidebar — ref so drag can update transform directly */}
        <aside
          ref={sidebarRef}
          className="fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r bg-white shadow-xl shadow-slate-900/10 backdrop-blur-sm md:sticky md:top-0 md:z-30 md:shrink-0"
          style={{
            width: sidebarWidth,
            transform: sidebarTransform,
            transition: "transform 180ms ease-out, width 180ms ease-out",
          }}
          aria-label="Sidebar"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white ring-1 ring-white/15">
                💸
              </span>
              {!collapsed && !isMobile && <span className="font-semibold">My Wallet</span>}
              {isMobile && <span className="font-semibold">My Wallet</span>}
            </Link>
            {!isMobile && (
              <button
                className="h-9 w-9 rounded-lg border bg-white hover:bg-zinc-50 active:scale-[0.98]"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? "›" : "‹"}
              </button>
            )}
            {isMobile && (
              <button
                className="h-10 w-10 rounded-lg border bg-white hover:bg-zinc-50 active:scale-[0.98]"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="p-2">
            <div className="space-y-1">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href + "/"))

                const base =
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2 text-sm transition-colors duration-200"
                const cls = active
                  ? "border-transparent bg-zinc-950 text-white"
                  : "border-transparent text-zinc-700 hover:bg-zinc-100"

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={item.href === "/onboarding" ? false : undefined}
                    className={`${base} ${cls}`}
                    title={collapsed && !isMobile ? item.label : undefined}
                  >
                    <span
                      aria-hidden
                      className={`absolute bottom-1.5 left-1.5 top-1.5 w-1 rounded-full transition-all duration-200 ${
                        active ? "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.55)]" : "bg-transparent"
                      }`}
                    />
                    <span
                      className={`relative z-10 w-6 text-center transition-transform duration-200 ${
                        active ? "scale-110" : "group-hover:translate-x-0.5"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {(!collapsed || isMobile) && (
                      <span
                        className={`relative z-10 font-medium transition-transform duration-200 ${
                          active ? "translate-x-0.5" : "group-hover:translate-x-0.5"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="mt-auto border-t p-2">
            <button
              className="w-full rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 flex items-center gap-3"
              onClick={handleLogout}
              title={collapsed && !isMobile ? "Logout" : undefined}
            >
              <span className="w-6 text-center">🚪</span>
              {(!collapsed || isMobile) && <span className="font-medium">Logout</span>}
            </button>
          </div>
          <div className="px-3 py-2 text-xs text-zinc-500">
            {displayName ? `Signed in as ${displayName}` : "Signed in"}
          </div>
        </aside>

        {/* Main */}
        <main className="md:min-w-0 md:flex-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={pathname}
              initial={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: 10, scale: 0.995 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: -6, scale: 0.998 }
              }
              transition={{
                duration: prefersReducedMotion ? 0.1 : 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="will-change-[transform,opacity]"
            >
              <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </CurrencyProvider>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return isMobile
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
