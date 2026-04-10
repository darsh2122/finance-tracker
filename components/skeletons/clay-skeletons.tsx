/**
 * clay-skeletons.tsx
 * 
 * Drop-in skeleton loading screens for:
 *   - DashboardSkeleton   → show while dashboard data loads
 *   - TransactionsSkeleton → show while transaction list loads  
 *   - NewTransactionSkeleton → show while categories/accounts load
 *   - AccountsSkeleton    → show while accounts load
 * 
 * USAGE:
 * 
 * In your Server Component page:
 *   import { Suspense } from "react"
 *   import { DashboardSkeleton } from "@/components/skeletons/clay-skeletons"
 *
 *   export default function DashboardPage() {
 *     return (
 *       <Suspense fallback={<DashboardSkeleton />}>
 *         <DashboardContent />   ← your async component
 *       </Suspense>
 *     )
 *   }
 *
 * OR in a client component with useState:
 *   const [loading, setLoading] = useState(true)
 *   if (loading) return <TransactionsSkeleton />
 */

"use client"

// ─── SHIMMER KEYFRAME (injected once) ────────────────────────────────────────
const SHIMMER_CSS = `
@keyframes clay-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
@keyframes clay-pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1;   }
}

/* Light-mode shimmer */
.sk-base {
  background: linear-gradient(
    90deg,
    rgba(0,0,0,0.04) 0%,
    rgba(0,0,0,0.09) 40%,
    rgba(0,0,0,0.04) 80%
  );
  background-size: 800px 100%;
  animation: clay-shimmer 1.6s ease-in-out infinite;
  border-radius: 12px;
}

/* Dark-mode shimmer override */
@media (prefers-color-scheme: dark) {
  .sk-base {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.10) 40%,
      rgba(255,255,255,0.04) 80%
    );
    background-size: 800px 100%;
    animation: clay-shimmer 1.6s ease-in-out infinite;
  }
}

.sk-pulse {
  animation: clay-pulse 1.8s ease-in-out infinite;
}

/* Top bar shared across all skeleton pages */
.sk-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 10px;
  background: var(--surface); backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 40;
}
.sk-topbar-icon { width:42px; height:42px; border-radius:13px; }
.sk-topbar-title { width:110px; height:22px; border-radius:10px; }
.sk-topbar-btn   { width:70px;  height:38px; border-radius:13px; }

/* Body padding */
.sk-body { padding: 20px 16px; }

/* Stat cards row */
.sk-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:16px 0; }
.sk-stat  { height:76px; border-radius:22px; }

/* Hero card */
.sk-hero { height:230px; border-radius:26px; margin:16px 0; }

/* Section label */
.sk-label { height:14px; width:120px; border-radius:8px; margin-bottom:14px; }

/* Generic card */
.sk-card { border-radius:22px; margin-bottom:10px; }

/* Row item — icon + text block */
.sk-row { display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:20px; margin-bottom:10px; background: var(--surface-soft); }
.sk-row-icon  { width:44px; height:44px; border-radius:15px; flex-shrink:0; }
.sk-row-lines { flex:1; display:flex; flex-direction:column; gap:8px; }
.sk-row-line1 { height:14px; border-radius:8px; }
.sk-row-line2 { height:11px; border-radius:6px; width:65%; }
.sk-row-amt   { width:56px; height:18px; border-radius:8px; flex-shrink:0; }

/* Chart placeholder */
.sk-chart { border-radius:22px; }

/* Category chips row */
.sk-chips { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
.sk-chip  { height:38px; border-radius:14px; }

/* Input field */
.sk-field { height:52px; border-radius:16px; margin-bottom:12px; }

/* Progress bar in onboarding */
.sk-progress { height:6px; border-radius:100px; margin:10px 0; }
`

let shimmerInjected = false
function injectShimmer() {
    if (typeof document === "undefined" || shimmerInjected) return
    const style = document.createElement("style")
    style.textContent = SHIMMER_CSS
    document.head.appendChild(style)
    shimmerInjected = true
}

// ─── PRIMITIVE SKELETON ───────────────────────────────────────────────────────
interface SkProps {
    w?: string | number
    h?: string | number
    radius?: string | number
    className?: string
    style?: React.CSSProperties
}

function Sk({ w, h, radius, className = "", style }: SkProps) {
    if (typeof window !== "undefined") injectShimmer()
    return (
        <div
            className={`sk-base ${className}`}
            style={{
                width: w,
                height: h,
                borderRadius: radius,
                flexShrink: 0,
                ...style,
            }}
        />
    )
}

// ─── SHARED TOPBAR ────────────────────────────────────────────────────────────
function SkTopBar({ titleW = 130 }: { titleW?: number }) {
    return (
        <div className="sk-topbar">
            <Sk className="sk-topbar-icon sk-base" h={42} w={42} radius={13} />
            <Sk className="sk-topbar-title sk-base" h={22} w={titleW} radius={10} />
            <Sk className="sk-topbar-btn sk-base" h={38} w={72} radius={13} />
        </div>
    )
}

// ─── SHARED ROW SKELETON ──────────────────────────────────────────────────────
function SkRow({ line2W = "65%" }: { line2W?: string }) {
    return (
        <div className="sk-row">
            <Sk className="sk-row-icon sk-base" w={44} h={44} radius={15} />
            <div className="sk-row-lines">
                <Sk className="sk-row-line1 sk-base" h={14} radius={8} style={{ width: "70%" }} />
                <Sk className="sk-row-line2 sk-base" h={11} radius={6} style={{ width: line2W }} />
            </div>
            <Sk className="sk-row-amt sk-base" w={56} h={18} radius={8} />
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function DashboardSkeleton() {
    injectShimmer()
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 100 }}>
            <SkTopBar titleW={100} />

            <div className="sk-body">
                {/* Page title */}
                <Sk h={28} w="55%" radius={12} style={{ marginBottom: 8 }} />
                <Sk h={14} w="70%" radius={8} style={{ marginBottom: 20 }} />

                {/* Month selector row */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    <Sk h={42} w={150} radius={14} />
                    <Sk h={42} w={160} radius={14} />
                </div>

                {/* Hero card */}
                <Sk h={240} radius={26} style={{ marginBottom: 16 }} />

                {/* 3 stat cards */}
                <div className="sk-stats">
                    {[1, 2, 3].map(i => <Sk key={i} className="sk-stat" h={76} radius={22} />)}
                </div>

                {/* 2 mini cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    <Sk h={88} radius={22} />
                    <Sk h={88} radius={22} />
                </div>

                {/* Section label */}
                <Sk className="sk-label" h={13} w={140} radius={8} style={{ marginBottom: 14 }} />

                {/* Chart placeholder */}
                <Sk className="sk-chart" h={220} radius={22} style={{ marginBottom: 16 }} />

                {/* Section label */}
                <Sk className="sk-label" h={13} w={110} radius={8} style={{ marginBottom: 14 }} />

                {/* Chart placeholder 2 */}
                <Sk className="sk-chart" h={220} radius={22} style={{ marginBottom: 20 }} />

                {/* Section label */}
                <Sk className="sk-label" h={13} w={120} radius={8} style={{ marginBottom: 14 }} />

                {/* Recent transactions */}
                {[1, 2, 3, 4, 5].map(i => <SkRow key={i} line2W={i % 2 === 0 ? "50%" : "70%"} />)}
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS LIST SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function TransactionsSkeleton() {
    injectShimmer()
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 100 }}>
            <SkTopBar titleW={140} />

            <div className="sk-body">
                {/* Title */}
                <Sk h={28} w="50%" radius={12} style={{ marginBottom: 8 }} />
                <Sk h={13} w="35%" radius={8} style={{ marginBottom: 16 }} />

                {/* 3 stat cards */}
                <div className="sk-stats">
                    {[1, 2, 3].map(i => <Sk key={i} h={76} radius={22} />)}
                </div>

                {/* Filter card */}
                <div style={{ background: "var(--surface)", borderRadius: 20, padding: "14px 16px", marginBottom: 16, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Sk h={16} w={90} radius={8} />
                        <Sk h={16} w={80} radius={8} />
                    </div>
                </div>

                {/* Date label */}
                <Sk h={12} w={100} radius={7} style={{ marginBottom: 10, marginLeft: 4 }} />

                {/* Transaction rows — grouped */}
                {[80, 65, 75, 55, 70, 60, 80, 65].map((w, i) => (
                    <SkRow key={i} line2W={`${w}%`} />
                ))}
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// NEW TRANSACTION SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function NewTransactionSkeleton() {
    injectShimmer()
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: 54 }}>
            {/* Coloured header placeholder */}
            <div style={{
                background: "linear-gradient(135deg,rgba(124,58,237,0.6),rgba(168,85,247,0.6))",
                padding: "20px 16px 36px", position: "relative", overflow: "hidden",
            }}>
                <Sk h={40} w={40} radius={13} style={{ marginBottom: 18, background: "rgba(255,255,255,0.15)" }} />
                <Sk h={14} w={100} radius={8} style={{ marginBottom: 10, background: "rgba(255,255,255,0.2)" }} />
                <Sk h={26} w="60%" radius={12} style={{ marginBottom: 8, background: "rgba(255,255,255,0.2)" }} />
                <Sk h={14} w="40%" radius={8} style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            <div className="sk-body" style={{ marginTop: -16 }}>
                {/* Category chips */}
                <div style={{ background: "var(--surface)", borderRadius: 24, padding: 18, marginBottom: 14 }}>
                    <Sk h={13} w={100} radius={8} style={{ marginBottom: 14 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        {[90, 70, 110, 80, 60, 100].map((w, i) => (
                            <Sk key={i} h={38} w={w} radius={14} />
                        ))}
                    </div>
                    <Sk h={13} w={80} radius={8} style={{ marginBottom: 10, marginTop: 6 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[75, 95, 65, 85, 70].map((w, i) => (
                            <Sk key={i} h={38} w={w} radius={14} />
                        ))}
                    </div>
                </div>

                {/* Account pickers */}
                <div style={{ background: "var(--surface)", borderRadius: 24, padding: 18, marginBottom: 14 }}>
                    <Sk h={13} w={90} radius={8} style={{ marginBottom: 14 }} />
                    {[1, 2].map(i => (
                        <div key={i} style={{ marginBottom: 12 }}>
                            <Sk h={11} w={80} radius={6} style={{ marginBottom: 8 }} />
                            <Sk h={52} radius={16} />
                        </div>
                    ))}
                </div>

                {/* Amount + details */}
                <div style={{ background: "var(--surface)", borderRadius: 24, padding: 18, marginBottom: 20 }}>
                    <Sk h={13} w={70} radius={8} style={{ marginBottom: 14 }} />
                    <Sk h={60} radius={16} style={{ marginBottom: 12 }} />
                    <Sk h={52} radius={16} style={{ marginBottom: 12 }} />
                    <Sk h={52} radius={16} />
                </div>

                {/* Save button */}
                <Sk h={58} radius={22} style={{ marginBottom: 12 }} />
                <Sk h={48} radius={18} style={{ opacity: 0.5 }} />
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// ACCOUNTS LIST SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function AccountsSkeleton() {
    injectShimmer()
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 100 }}>
            <SkTopBar titleW={110} />

            <div className="sk-body">
                <Sk h={28} w="45%" radius={12} style={{ marginBottom: 8 }} />
                <Sk h={13} w="35%" radius={8} style={{ marginBottom: 16 }} />

                {/* Hero */}
                <Sk h={120} radius={26} style={{ marginBottom: 20 }} />

                {/* Section label */}
                <Sk h={12} w={60} radius={7} style={{ marginBottom: 12, marginLeft: 4 }} />

                {/* Account rows */}
                {[1, 2, 3, 4].map(i => <SkRow key={i} line2W={i % 2 ? "55%" : "65%"} />)}
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function SettingsSkeleton() {
    injectShimmer()
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 100 }}>
            <SkTopBar titleW={100} />
            <div className="sk-body">
                <Sk h={28} w="45%" radius={12} style={{ marginBottom: 8 }} />
                <Sk h={13} w="55%" radius={8} style={{ marginBottom: 20 }} />

                {/* Profile hero */}
                <Sk h={110} radius={26} style={{ marginBottom: 24 }} />

                {/* Section */}
                <Sk h={12} w={100} radius={7} style={{ marginBottom: 12, marginLeft: 4 }} />
                <div style={{ background: "var(--surface)", borderRadius: 24, overflow: "hidden", marginBottom: 20 }}>
                    <SkRow line2W="50%" />
                </div>

                {/* Quick links */}
                <Sk h={12} w={90} radius={7} style={{ marginBottom: 12, marginLeft: 4 }} />
                <div style={{ background: "var(--surface)", borderRadius: 24, overflow: "hidden", marginBottom: 20 }}>
                    {[1, 2, 3, 4, 5].map(i => <SkRow key={i} line2W={i % 2 ? "60%" : "45%"} />)}
                </div>

                {/* Danger zone */}
                <Sk h={12} w={80} radius={7} style={{ marginBottom: 12, marginLeft: 4 }} />
                <div style={{ background: "var(--surface)", borderRadius: 24, overflow: "hidden" }}>
                    <SkRow line2W="40%" />
                </div>
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORIES SKELETON
// ═════════════════════════════════════════════════════════════════════════════
export function CategoriesSkeleton() {
    injectShimmer()
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 100 }}>
            <SkTopBar titleW={120} />
            <div className="sk-body">
                <Sk h={28} w="52%" radius={12} style={{ marginBottom: 8 }} />
                <Sk h={13} w="70%" radius={8} style={{ marginBottom: 22 }} />

                {/* Group chips × 4 groups */}
                {[4, 3, 2, 2].map((count, gi) => (
                    <div key={gi} style={{ marginBottom: 22 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <Sk h={28} w={28} radius={10} />
                            <Sk h={13} w={70} radius={7} />
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {Array.from({ length: count }).map((_, i) => (
                                <Sk key={i} h={38} w={[85, 100, 70, 90][i % 4]} radius={14} />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Sub-list */}
                <div style={{ background: "var(--surface)", borderRadius: 22, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                        <Sk h={13} w={130} radius={7} />
                        <Sk h={22} w={36} radius={100} />
                    </div>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 16, marginBottom: 8, background: "var(--surface-soft)" }}>
                            <Sk h={14} radius={8} style={{ flex: 1 }} />
                            <Sk h={22} w={52} radius={100} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// INLINE LOADING SPINNER (for small areas)
// ═════════════════════════════════════════════════════════════════════════════
export function ClaySpinner({ size = 40, label = "Loading…" }: { size?: number; label?: string }) {
    const spinnerCSS = `
    @keyframes clay-spin { to { transform: rotate(360deg); } }
    .clay-spinner-ring {
      border-radius: 50%;
      border: 3px solid rgba(139,92,246,0.2);
      border-top-color: #a855f7;
      animation: clay-spin 0.75s linear infinite;
    }
  `
    return (
        <>
            <style>{spinnerCSS}</style>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 40 }}>
                <div
                    className="clay-spinner-ring"
                    style={{
                        width: size, height: size,
                        boxShadow: `0 0 ${size / 2}px rgba(168,85,247,0.25)`,
                    }}
                />
                {label && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.2px" }}>
                        {label}
                    </div>
                )}
            </div>
        </>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// FULL-SCREEN LOADING OVERLAY (for page transitions)
// ═════════════════════════════════════════════════════════════════════════════
export function ClayPageLoader({ message = "Loading…" }: { message?: string }) {
    return (
        <div style={{
            position: "fixed", inset: 0, background: "var(--bg)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", zIndex: 9999, gap: 20,
        }}>
            <div style={{ fontSize: 48 }}>💸</div>
            <ClaySpinner size={48} label={message} />
        </div>
    )
}
