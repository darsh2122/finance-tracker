"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"

type NavItem = { href: string; label: string; icon: string }

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "🧾" },
  { href: "/transactions/new", label: "Add Transaction", icon: "➕" },
  { href: "/accounts", label: "Accounts", icon: "🏦" },
]

const SIDEBAR_W = 288 // px (w-72)
const EDGE_OPEN_ZONE = 24 // px from left edge where swipe can open
const SWIPE_OPEN_THRESHOLD = 70
const SWIPE_CLOSE_THRESHOLD = 70

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // --- Route change: close sidebar on mobile
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // --- Prevent background scroll when sidebar open (mobile)
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // --- Swipe gesture state
  const dragging = useRef(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const mode = useRef<"open" | "close" | null>(null)

  const [dragX, setDragX] = useState(0) // 0..SIDEBAR_W while opening/closing

  const isMobile = useIsMobile()

  // when switching to desktop, ensure open state doesn't affect layout
  useEffect(() => {
    if (!isMobile) {
      setOpen(false)
      setDragX(0)
    }
  }, [isMobile])

  // Helper: start swipe
  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return

    const x = e.touches[0].clientX
    startX.current = x
    currentX.current = x
    dragging.current = false
    mode.current = null

    // If sidebar closed: only allow open swipe from left edge zone
    if (!open) {
      if (x <= EDGE_OPEN_ZONE) {
        mode.current = "open"
        dragging.current = true
        setDragX(0)
      }
      return
    }

    // If sidebar open: allow close swipe only if touch starts on sidebar (left panel area)
    // Sidebar width is SIDEBAR_W, so starting x within that means user is touching it.
    if (open && x <= SIDEBAR_W) {
      mode.current = "close"
      dragging.current = true
      setDragX(SIDEBAR_W)
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return
    if (!dragging.current || !mode.current) return

    const x = e.touches[0].clientX
    currentX.current = x

    const dx = x - startX.current

    if (mode.current === "open") {
      // dx increases from 0..SIDEBAR_W
      const val = clamp(dx, 0, SIDEBAR_W)
      setDragX(val)
    } else {
      // close: dx negative means moving left; translate is SIDEBAR_W + dx
      const val = clamp(SIDEBAR_W + dx, 0, SIDEBAR_W)
      setDragX(val)
    }
  }

  const onTouchEnd = () => {
    if (!isMobile) return
    if (!dragging.current || !mode.current) return

    const dx = currentX.current - startX.current

    if (mode.current === "open") {
      // open if dragged far enough
      if (dx >= SWIPE_OPEN_THRESHOLD) {
        setOpen(true)
      } else {
        setOpen(false)
      }
      setDragX(0)
    } else {
      // close if dragged far enough left
      if (dx <= -SWIPE_CLOSE_THRESHOLD) {
        setOpen(false)
      } else {
        setOpen(true)
      }
      setDragX(0)
    }

    dragging.current = false
    mode.current = null
  }

  const sidebarTransform = useMemo(() => {
    // Desktop: always visible
    if (!isMobile) return "translateX(0px)"

    // During drag gestures:
    if (dragging.current && mode.current) {
      // dragX = 0..SIDEBAR_W, but sidebar position should be:
      // open-mode: from -SIDEBAR_W -> 0 as dragX increases
      // close-mode: from 0 -> -SIDEBAR_W as dragX decreases
      const tx = dragX - SIDEBAR_W
      return `translateX(${tx}px)`
    }

    // Normal state:
    return open ? "translateX(0px)" : `translateX(-${SIDEBAR_W}px)`
  }, [isMobile, open, dragX])

  const overlayOpacity = useMemo(() => {
    if (!isMobile) return 0
    if (dragging.current && mode.current) {
      // fade overlay while dragging open/close
      const p = clamp(dragX / SIDEBAR_W, 0, 1)
      return open ? p : p // ok either way
    }
    return open ? 1 : 0
  }, [isMobile, open, dragX])

  return (
    <div
      className="min-h-screen bg-zinc-50"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <button
          className="h-10 w-10 rounded-lg border bg-white hover:bg-zinc-50 active:scale-[0.98]"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="font-semibold">MoneyFlow</div>

        <Link
          href="/transactions/new"
          className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white active:scale-[0.98]"
        >
          + Add
        </Link>
      </div>

      {/* Overlay (mobile) */}
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity"
          style={{
            opacity: overlayOpacity,
            pointerEvents: open || (dragging.current && mode.current) ? "auto" : "none",
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-white md:sticky md:z-30"
        style={{
          transform: sidebarTransform,
          transition: dragging.current ? "none" : "transform 180ms ease-out",
        }}
        aria-label="Sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
              💸
            </span>
            <span className="font-semibold">MoneyFlow</span>
          </Link>

          {/* Close (mobile) */}
          <button
            className="md:hidden h-10 w-10 rounded-lg border bg-white hover:bg-zinc-50 active:scale-[0.98]"
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
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                    active
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-700 hover:bg-zinc-100",
                  ].join(" ")}
                >
                  <span className="w-5 text-center">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Helpful hint on mobile */}
          <div className="mt-4 rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-600">
            Tip: Swipe from the left edge to open the menu.
          </div>
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t p-4 text-xs text-zinc-500">
          Track daily → better insights.
        </div>
      </aside>

      {/* Main */}
      <main className="md:ml-72">
        <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
      </main>
    </div>
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
