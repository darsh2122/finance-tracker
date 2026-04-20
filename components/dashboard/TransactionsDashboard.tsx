"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts"
import { useCurrency } from "@/lib/context/CurrencyContext"

type Row = {
  id: string
  direction: "income" | "expense" | "transfer" | "loan"
  amount: number; currency: string; description: string
  occurred_at: string; leaf_name: string
  group_type: "income" | "expense" | "transfer" | "loan" | null
  expense_subtype: "fixed" | "variable" | "shared" | null
}

const CAT_COLORS = [
  { bg: "bubble-amber", label: "Eating Out" },
  { bg: "bubble-green", label: "Gas" },
  { bg: "bubble-red", label: "Phone" },
  { bg: "bubble-indigo", label: "Other" },
  { bg: "bubble-pink", label: "Travel" },
  { bg: "bubble-teal", label: "Health" },
]

const CAT_EMOJIS: Record<string, string> = {
  "Eating Out": "🍕", "Gas": "⛽", "Phone": "📱", "Groceries": "🛒",
  "Travel": "✈️", "Health": "🏥", "Shopping": "🛍️", "Entertainment": "🎬",
  "Utilities": "💡", "Rent": "🏠", "Insurance": "🛡️", "Gym": "💪",
}

const TXN_ICONS: Record<string, { emoji: string; cls: string }> = {
  income: { emoji: "💼", cls: "bubble-green" },
  expense: { emoji: "📤", cls: "bubble-red" },
  transfer: { emoji: "🔄", cls: "bubble-indigo" },
  loan: { emoji: "🤝", cls: "bubble-amber" },
}

function useCountUp(value: number, duration = 800) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const startTime = performance.now()
    function animate(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(start + (value - start) * eased)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])
  return display
}

function ym(d: string) { return d.slice(0, 7) }
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number)
  return new Date(y, mo - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" })
}
function monthShort(m: string) {
  const [y, mo] = m.split("-").map(Number)
  return new Date(y, mo - 1, 1).toLocaleString(undefined, { month: "short" })
}
function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number)
  return new Date(y, mo - 2, 1).toISOString().slice(0, 7)
}

export default function TransactionsDashboard({ data, baseCurrency }: { data: Row[]; baseCurrency: string }) {
  const { fmt, getCurrencyInfo } = useCurrency()

  const monthOptions = useMemo(() => {
    const s = new Set(data.map(t => ym(t.occurred_at)))
    return Array.from(s).sort().reverse()
  }, [data])

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0] ?? "")
  const selectedPrev = useMemo(() => selectedMonth ? prevMonth(selectedMonth) : "", [selectedMonth])

  const monthTxns = useMemo(() => data.filter(t => ym(t.occurred_at) === selectedMonth), [data, selectedMonth])
  const prevTxns = useMemo(() => data.filter(t => ym(t.occurred_at) === selectedPrev), [data, selectedPrev])

  const monthCurrencies = useMemo(() => {
    const seen = new Set(monthTxns.map(t => t.currency))
    return Array.from(seen).sort((a, b) => a === baseCurrency ? -1 : b === baseCurrency ? 1 : a.localeCompare(b))
  }, [monthTxns, baseCurrency])

  const [viewCurrency, setViewCurrency] = useState(baseCurrency)
  useEffect(() => {
    setViewCurrency(monthCurrencies.includes(baseCurrency) ? baseCurrency : monthCurrencies[0] ?? baseCurrency)
  }, [selectedMonth, monthCurrencies, baseCurrency])

  const monthView = useMemo(() => monthTxns.filter(t => t.currency === viewCurrency), [monthTxns, viewCurrency])
  const prevView = useMemo(() => prevTxns.filter(t => t.currency === viewCurrency), [prevTxns, viewCurrency])

  const income = useMemo(() => monthView.filter(t => t.direction === "income").reduce((s, t) => s + t.amount, 0), [monthView])
  const expense = useMemo(() => monthView.filter(t => t.direction === "expense").reduce((s, t) => s + t.amount, 0), [monthView])
  const prevExp = useMemo(() => prevView.filter(t => t.direction === "expense").reduce((s, t) => s + t.amount, 0), [prevView])
  const net = income - expense
  const changePct = prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : null
  const incomeAnimated = useCountUp(income)
  const expenseAnimated = useCountUp(expense)
  const netAnimated = useCountUp(net)

  // ── Transfers ────────────────────────────────────────────────────────────
  const transferTxns = useMemo(() => monthView.filter(t => t.direction === "transfer"), [monthView])
  const transferVol = useMemo(() => transferTxns.reduce((s, t) => s + t.amount, 0), [transferTxns])

  const transferCats = useMemo(() => {
    const m = new Map<string, number>()
    transferTxns.forEach(t => m.set(t.leaf_name, (m.get(t.leaf_name) || 0) + t.amount))
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value: +value.toFixed(2) }))
  }, [transferTxns])

  // ── Loans ────────────────────────────────────────────────────────────────
  const loanTxns = useMemo(() => monthView.filter(t => t.direction === "loan"), [monthView])
  const loanVol = useMemo(() => loanTxns.reduce((s, t) => s + t.amount, 0), [loanTxns])
  const transferVolAnimated = useCountUp(transferVol)
  const loanVolAnimated = useCountUp(loanVol)

  const loanCats = useMemo(() => {
    const m = new Map<string, number>()
    loanTxns.forEach(t => m.set(t.leaf_name, (m.get(t.leaf_name) || 0) + t.amount))
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value: +value.toFixed(2) }))
  }, [loanTxns])

  const spendTrend = useMemo(() => {
    const m = new Map<string, number>()
    data.forEach(t => {
      if (t.direction !== "expense" || t.currency !== viewCurrency) return
      const k = ym(t.occurred_at); m.set(k, (m.get(k) || 0) + t.amount)
    })
    return Array.from(m.keys()).sort().map(k => ({ month: monthShort(k), spending: +(m.get(k) || 0).toFixed(2) }))
  }, [data, viewCurrency])

  const topCats = useMemo(() => {
    const m = new Map<string, number>()
    monthView.forEach(t => { if (t.direction !== "expense") return; m.set(t.leaf_name, (m.get(t.leaf_name) || 0) + t.amount) })
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value: +value.toFixed(2) }))
  }, [monthView])

  const maxCat = Math.max(...topCats.map(c => c.value), 1)

  const subtypes = useMemo(() => {
    const m = new Map<string, number>()
    monthView.forEach(t => { if (t.direction !== "expense") return; const k = t.expense_subtype || "other"; m.set(k, (m.get(k) || 0) + t.amount) })
    return Array.from(m.entries()).map(([name, value]) => ({ name, value: +value.toFixed(2) }))
  }, [monthView])

  const catMoM = useMemo(() => {
    const tm = new Map<string, number>(); const pm = new Map<string, number>()
    monthView.forEach(t => { if (t.direction !== "expense") return; tm.set(t.leaf_name, (tm.get(t.leaf_name) || 0) + t.amount) })
    prevView.forEach(t => { if (t.direction !== "expense") return; pm.set(t.leaf_name, (pm.get(t.leaf_name) || 0) + t.amount) })
    const all = new Set([...tm.keys(), ...pm.keys()])
    return Array.from(all).map(name => {
      const cur = tm.get(name) || 0, prev = pm.get(name) || 0, diff = cur - prev
      return { name, cur: +cur.toFixed(2), prev: +prev.toFixed(2), diff: +diff.toFixed(2), pct: prev > 0 ? (diff / prev) * 100 : null }
    }).sort((a, b) => b.cur - a.cur).slice(0, 6)
  }, [monthView, prevView])

  const recent = monthTxns.slice(0, 6)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="clay-card-sm" style={{ fontSize: 12, fontWeight: 800, minWidth: 80 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{payload[0].payload.month}</div>
        <div style={{ color: "var(--purple)", fontSize: 15, marginTop: 2 }}>{fmt(payload[0].value, viewCurrency)}</div>
      </div>
    )
  }

  return (
    <div className="clay-page">
      <style>{`
        @media (max-width: 767px) { .stat-full { grid-column: 1 / -1; } }
        @media(min-width:768px){
          .dashboard-cols { grid-template-columns: 1.4fr 1fr !important; }
          .dashboard-wide { grid-column: 1 / -1 !important; }
          .stat-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .stat-value { font-size: 28px; font-weight: 900; color: var(--text-soft); }
        }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12, marginTop: -20 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{monthLabel(selectedMonth)} — your financial overview</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {monthCurrencies.length > 1 && monthCurrencies.map(cur => (
            <button
              key={cur}
              onClick={() => setViewCurrency(cur)}
              className={`clay-pill ${cur === viewCurrency ? "pill-purple" : ""}`}
              style={{ cursor: "pointer", border: "none", fontFamily: "Nunito,sans-serif", background: cur === viewCurrency ? undefined : "var(--surface)", color: cur === viewCurrency ? undefined : "var(--text-muted)", boxShadow: "var(--clay-card-sm)" }}
            >
              {cur === baseCurrency ? "★ " : ""}{cur}
            </button>
          ))}
          <select
            className="clay-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: "auto", minWidth: 150, padding: "9px 38px 9px 13px", fontSize: 13 }}
          >
            {monthOptions.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <Link href="/transactions/new" className="clay-btn clay-btn-purple clay-btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>
            ➕ Add Transaction
          </Link>
        </div>
      </div>

      {/* ── INCOME / EXPENSE STAT CARDS ── */}
      <div
        className="stat-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 16, alignItems: "stretch" }}
      >
        {[
          { cls: "clay-stat-green", emoji: "💰", label: "Monthly Income", value: fmt(incomeAnimated, viewCurrency), change: "This month" },
          { cls: "clay-stat-red", emoji: "📤", label: "Monthly Spending", value: fmt(expenseAnimated, viewCurrency), change: changePct === null ? "No prev data" : `${changePct >= 0 ? "↑" : "↓"} ${Math.abs(changePct).toFixed(1)}% vs prev` },
        ].map((s, i) => (
          <div key={s.label} className={`${s.cls} clay-stat anim-slide-up`} style={{ animationDelay: `${i * 0.07}s` }}>
            <span className="stat-emoji">{s.emoji}</span>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change">{s.change}</div>
          </div>
        ))}

        {/* Net savings — full width */}
        <div
          className="clay-stat-purple clay-stat anim-slide-up stat-full"
          style={{ animationDelay: "0.14s", display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className="stat-emoji">🎯</span>
              <div className="stat-label">Net Saved This Month</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{fmt(netAnimated, viewCurrency)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="stat-value" style={{ fontSize: 28, fontWeight: 900 }}>
                {income > 0 ? `${Math.max(0, Math.round((net / income) * 100))}%` : "—"}
              </div>
              <div className="stat-change">savings rate</div>
            </div>
          </div>
          {income > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 100,
                  background: "rgba(255,255,255,0.7)",
                  width: `${Math.min(100, Math.max(0, (net / income) * 100))}%`,
                  transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
                  boxShadow: "0 0 8px rgba(255,255,255,0.5)",
                }} />
              </div>
              <div className="stat-change" style={{ marginTop: 5 }}>
                {fmt(income, viewCurrency)} earned · {fmt(expense, viewCurrency)} spent
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TRANSFERS & LOANS STAT ROW ── */}
      {(transferVol > 0 || loanVol > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: transferVol > 0 && loanVol > 0 ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 16 }}>
          {transferVol > 0 && (
            <div className="clay-stat clay-stat-indigo anim-slide-up" style={{ animationDelay: "0.21s", minHeight: "auto", padding: "16px 18px" }}>
              <span className="stat-emoji">🔄</span>
              <div className="stat-label">Transfers</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{fmt(transferVolAnimated, viewCurrency)}</div>
              <div className="stat-change">{transferTxns.length} transaction{transferTxns.length !== 1 ? "s" : ""}</div>
            </div>
          )}
          {loanVol > 0 && (
            <div className="clay-stat clay-stat-amber anim-slide-up" style={{ animationDelay: "0.28s", minHeight: "auto", padding: "16px 18px" }}>
              <span className="stat-emoji">🤝</span>
              <div className="stat-label">Loan Activity</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{fmt(loanVolAnimated, viewCurrency)}</div>
              <div className="stat-change">{loanTxns.length} transaction{loanTxns.length !== 1 ? "s" : ""}</div>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }} className="dashboard-cols">

        {/* Chart + Categories */}
        <div className="clay-card anim-slide-up" style={{ animationDelay: "0.21s" }}>
          <div className="card-title">📈 Spending Trend ({viewCurrency})</div>
          <div style={{ height: 110, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendTrend} barSize={26} barGap={4}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "Nunito", fontWeight: 700 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--purple-pale)", radius: 8 }} />
                <Bar dataKey="spending" radius={[12, 12, 6, 6]} fill="var(--purple)" style={{ filter: "drop-shadow(0 4px 8px rgba(124,58,237,0.28))" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-title" style={{ marginBottom: 12 }}>🏅 Top Expense Categories</div>
          {topCats.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No expense data this month.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topCats.map((cat, i) => {
                const cfg = CAT_COLORS[i % CAT_COLORS.length]
                return (
                  <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className={`clay-bubble clay-bubble-sm ${cfg.bg}`}>{CAT_EMOJIS[cat.name] ?? "📌"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-soft)" }}>{cat.name}</div>
                      <div className="clay-progress-track">
                        <div className="clay-progress-fill" style={{ width: `${(cat.value / maxCat) * 100}%`, background: ["var(--amber-grad)", "var(--green-grad)", "var(--red-grad)", "var(--indigo-grad)", "var(--pink-grad)"][i % 5] }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", flexShrink: 0 }}>{fmt(cat.value, viewCurrency)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Transfer breakdown */}
          {transferCats.length > 0 && (
            <>
              <div className="card-title" style={{ marginTop: 24, marginBottom: 12 }}>🔄 Transfer Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {transferCats.map(cat => (
                  <div key={cat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="clay-bubble clay-bubble-sm bubble-indigo">🔄</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-soft)" }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{fmt(cat.value, viewCurrency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Loan breakdown */}
          {loanCats.length > 0 && (
            <>
              <div className="card-title" style={{ marginTop: 24, marginBottom: 12 }}>🤝 Loan Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {loanCats.map(cat => (
                  <div key={cat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="clay-bubble clay-bubble-sm bubble-amber">🤝</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-soft)" }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{fmt(cat.value, viewCurrency)}</span>
                  </div>
                ))}
              </div>
              <Link href="/loans" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "10px", borderRadius: 14, background: "var(--amber-pale)", color: "var(--amber)", fontWeight: 800, fontSize: 13, textDecoration: "none", boxShadow: "var(--clay-card-sm)" }}>
                View Loan Accounts →
              </Link>
            </>
          )}
        </div>

        {/* Recent transactions */}
        <div className="clay-card anim-slide-up" style={{ animationDelay: "0.28s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>⚡ Recent</div>
            <Link href="/transactions" style={{ fontSize: 12, fontWeight: 800, color: "var(--purple)", textDecoration: "none" }}>View all →</Link>
          </div>

          {recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No transactions yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recent.map(t => {
                const ic = TXN_ICONS[t.direction] ?? { emoji: "💰", cls: "bubble-green" }
                const isInc = t.direction === "income"
                const isExp = t.direction === "expense"
                const isTransfer = t.direction === "transfer"
                const isLoan = t.direction === "loan"
                return (
                  <div key={t.id} className="clay-txn-row">
                    <div className={`clay-bubble clay-bubble-sm ${ic.cls}`}>{ic.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.leaf_name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, marginTop: 1 }}>
                        {t.occurred_at} · {t.direction}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, flexShrink: 0, color: isInc ? "var(--green)" : isExp ? "var(--red)" : isTransfer ? "var(--purple)" : "var(--amber)" }}>
                      {isInc ? "+" : isExp ? "−" : ""}{fmt(t.amount, t.currency)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {subtypes.length > 0 && (
            <>
              <div className="card-title" style={{ marginTop: 20, marginBottom: 12 }}>🔵 Spending Mix</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {subtypes.slice().sort((a, b) => b.value - a.value).map(x => (
                  <div key={x.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 700, textTransform: "capitalize" }}>{x.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "var(--text)" }}>{fmt(x.value, viewCurrency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <Link href="/transactions/new" className="clay-btn clay-btn-purple" style={{ width: "100%", marginTop: 16, textDecoration: "none", display: "flex", justifyContent: "center" }}>
            ➕ Add Transaction
          </Link>
        </div>

        {/* Month-over-month — full width */}
        {catMoM.length > 0 && (
          <div className="clay-card dashboard-wide anim-slide-up" style={{ animationDelay: "0.35s" }}>
            <div className="card-title">
              📊 Month-over-Month (Expenses)
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", marginLeft: 8 }}>
                {monthLabel(selectedMonth)} vs {monthLabel(selectedPrev)}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {catMoM.map(r => {
                const up = r.diff > 0, down = r.diff < 0
                return (
                  <div key={r.name} className="clay-txn-row" style={{ cursor: "default" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>
                        {fmt(r.prev, viewCurrency)} → {fmt(r.cur, viewCurrency)}
                      </div>
                    </div>
                    <span className={`clay-pill ${up ? "pill-red" : down ? "pill-green" : "pill-purple"}`} style={{ flexShrink: 0 }}>
                      {up ? "↑" : down ? "↓" : "→"} {fmt(Math.abs(r.diff), viewCurrency)}
                      {r.pct !== null ? ` (${Math.abs(r.pct).toFixed(0)}%)` : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}