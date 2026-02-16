"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

type Row = {
  id: string
  direction: "income" | "expense" | "transfer" | "loan"
  amount: number
  description: string
  occurred_at: string // YYYY-MM-DD
  leaf_name: string
  group_type: "income" | "expense" | "transfer" | "loan" | null
  expense_subtype: "fixed" | "variable" | "shared" | null
}

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#a855f7", "#f59e0b", "#0ea5e9", "#14b8a6", "#64748b"]

function ym(d: string) {
  return d.slice(0, 7) // YYYY-MM
}
function ymd(d: string) {
  return d.slice(0, 10) // YYYY-MM-DD
}
function prevMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-").map(Number)
  const dt = new Date(y, m - 2, 1)
  return dt.toISOString().slice(0, 7)
}
function monthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-").map(Number)
  const dt = new Date(y, m - 1, 1)
  return dt.toLocaleString(undefined, { month: "long", year: "numeric" })
}

export default function TransactionsDashboard({ data }: { data: Row[] }) {
  const [chartKey, setChartKey] = useState(0)

  useEffect(() => {
    // Re-measure charts after first paint so mobile first-load layout shifts don't clip the pie.
    const raf = requestAnimationFrame(() => {
      setChartKey((k) => k + 1)
      window.dispatchEvent(new Event("resize"))
    })
    const t = setTimeout(() => {
      setChartKey((k) => k + 1)
      window.dispatchEvent(new Event("resize"))
    }, 200)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [])

  // Month options from data
  const monthOptions = useMemo(() => {
    const s = new Set<string>()
    data.forEach((t) => s.add(ym(t.occurred_at)))
    return Array.from(s).sort().reverse()
  }, [data])

  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0] ?? "")

  const selectedPrev = useMemo(() => (selectedMonth ? prevMonth(selectedMonth) : ""), [selectedMonth])

  const monthTxns = useMemo(
    () => data.filter((t) => ym(t.occurred_at) === selectedMonth),
    [data, selectedMonth]
  )
  const prevTxns = useMemo(
    () => data.filter((t) => ym(t.occurred_at) === selectedPrev),
    [data, selectedPrev]
  )

  // Summary
  const thisIncome = useMemo(
    () => monthTxns.filter((t) => t.direction === "income").reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  )
  const thisExpense = useMemo(
    () => monthTxns.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  )
  const prevExpense = useMemo(
    () => prevTxns.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0),
    [prevTxns]
  )
  const expenseChangePct =
    prevExpense > 0 ? ((thisExpense - prevExpense) / prevExpense) * 100 : null

  // Spending trend (last 12 months, expense-only)
  const spendTrend = useMemo(() => {
    const byMonth = new Map<string, number>()
    data.forEach((t) => {
      if (t.direction !== "expense") return
      const key = ym(t.occurred_at)
      byMonth.set(key, (byMonth.get(key) || 0) + t.amount)
    })
    const keys = Array.from(byMonth.keys()).sort()
    return keys.map((m) => ({ month: m, spending: Number((byMonth.get(m) || 0).toFixed(2)) }))
  }, [data])

  // Where money went (selected month) – by leaf category
  const topCategories = useMemo(() => {
    const map = new Map<string, number>()
    monthTxns.forEach((t) => {
      if (t.direction !== "expense") return
      map.set(t.leaf_name, (map.get(t.leaf_name) || 0) + t.amount)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
  }, [monthTxns])

  // Standings (top categories)
  const standings = topCategories.slice(0, 5)

  // Spending type totals (fixed/variable/shared) – selected month
  const subtypeData = useMemo(() => {
    const map = new Map<string, number>()
    monthTxns.forEach((t) => {
      if (t.direction !== "expense") return
      const key = t.expense_subtype || "unknown"
      map.set(key, (map.get(key) || 0) + t.amount)
    })
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }))
  }, [monthTxns])

  // ✅ This month vs last month by category (arrows + %)
  const categoryMoM = useMemo(() => {
    const thisMap = new Map<string, number>()
    const prevMap = new Map<string, number>()

    monthTxns.forEach((t) => {
      if (t.direction !== "expense") return
      thisMap.set(t.leaf_name, (thisMap.get(t.leaf_name) || 0) + t.amount)
    })
    prevTxns.forEach((t) => {
      if (t.direction !== "expense") return
      prevMap.set(t.leaf_name, (prevMap.get(t.leaf_name) || 0) + t.amount)
    })

    // include any category appearing in either month
    const all = new Set<string>([...thisMap.keys(), ...prevMap.keys()])

    const rows = Array.from(all).map((name) => {
      const cur = thisMap.get(name) || 0
      const prev = prevMap.get(name) || 0
      const diff = cur - prev
      const pct = prev > 0 ? (diff / prev) * 100 : null
      return {
        name,
        cur: Number(cur.toFixed(2)),
        prev: Number(prev.toFixed(2)),
        diff: Number(diff.toFixed(2)),
        pct,
      }
    })

    // sort by current month spending (so it’s “standings-like”)
    return rows.sort((a, b) => b.cur - a.cur).slice(0, 8)
  }, [monthTxns, prevTxns])

  // ✅ Most expensive day (selected month, expense-only)
  const mostExpensiveDay = useMemo(() => {
    const map = new Map<string, number>()
    monthTxns.forEach((t) => {
      if (t.direction !== "expense") return
      const day = ymd(t.occurred_at)
      map.set(day, (map.get(day) || 0) + t.amount)
    })
    let best: { day: string; total: number } | null = null
    for (const [day, total] of map.entries()) {
      if (!best || total > best.total) best = { day, total }
    }
    return best
  }, [monthTxns])

  // ✅ Biggest transaction (selected month, any direction)
  const biggestTxn = useMemo(() => {
    if (monthTxns.length === 0) return null
    let best = monthTxns[0]
    for (const t of monthTxns) {
      if (t.amount > best.amount) best = t
    }
    return best
  }, [monthTxns])

  const recent = monthTxns.slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Header + month selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="text-sm text-gray-500">
            Trends, standings, and where your money went
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="border rounded-lg px-3 py-2 bg-white"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>

          <Link href="/transactions/new" className="rounded-lg bg-black text-white px-4 py-2">
            Add Transaction
          </Link>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Income" value={thisIncome} subtitle={monthLabel(selectedMonth)} tone="good" />
        <StatCard title="Spending" value={thisExpense} subtitle={monthLabel(selectedMonth)} tone="bad" />
        <StatCard
          title="Spending vs Prev Month"
          value={thisExpense}
          subtitle={
            expenseChangePct === null
              ? "No previous month data"
              : `${expenseChangePct >= 0 ? "↑" : "↓"} ${Math.abs(expenseChangePct).toFixed(1)}%`
          }
          tone={expenseChangePct !== null && expenseChangePct < 0 ? "good" : "neutral"}
        />
        <StatCard
          title="Biggest Transaction"
          value={biggestTxn ? biggestTxn.amount : 0}
          subtitle={biggestTxn ? `${biggestTxn.direction} • ${biggestTxn.leaf_name}` : "No data"}
          tone="neutral"
        />
      </div>

      {/* Extra highlight cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <MiniCard
          title="Most Expensive Day"
          value={
            mostExpensiveDay
              ? `${mostExpensiveDay.total.toFixed(2)} CAD`
              : "No expense data"
          }
          subtitle={mostExpensiveDay ? mostExpensiveDay.day : monthLabel(selectedMonth)}
        />
        <MiniCard
          title="Top Spending Category"
          value={topCategories[0] ? `${topCategories[0].value.toFixed(2)} CAD` : "No expense data"}
          subtitle={topCategories[0]?.name ?? monthLabel(selectedMonth)}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">Spending Trend (Last 12 months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="spending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">Where your money went ({monthLabel(selectedMonth)})</h2>
          <div className="h-64">
            <ResponsiveContainer key={`where-money-${chartKey}`} width="100%" height="100%" minHeight={240}>
              <PieChart>
                <Pie data={topCategories} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius="72%">
                  {topCategories.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Standings + subtype + recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Standings (Top categories)</h2>
          <div className="space-y-2">
            {standings.length === 0 ? (
              <div className="text-sm text-gray-500">No expense data.</div>
            ) : (
              standings.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                      {i + 1}
                    </div>
                    <div className="truncate">{s.name}</div>
                  </div>
                  <div className="font-semibold">{s.value.toFixed(2)} CAD</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Spending Type</h2>
          <div className="space-y-2 text-sm">
            {subtypeData.map((x) => (
              <div key={x.name} className="flex justify-between">
                <span className="capitalize text-gray-700">{x.name}</span>
                <span className="font-semibold">{x.value.toFixed(2)} CAD</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-blue-600">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recent.length === 0 ? (
              <div className="text-sm text-gray-500">No transactions.</div>
            ) : (
              recent.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.leaf_name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {t.occurred_at} • {t.direction}
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${
                      t.direction === "income"
                        ? "text-green-600"
                        : t.direction === "expense"
                        ? "text-red-600"
                        : "text-gray-700"
                    }`}
                  >
                    {t.direction === "income" ? "+" : t.direction === "expense" ? "-" : ""}
                    {t.amount.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ✅ Month-over-month by category */}
      <div className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-3">
          Category Change: {monthLabel(selectedMonth)} vs {monthLabel(selectedPrev)}
        </h2>

        <div className="space-y-2">
          {categoryMoM.length === 0 ? (
            <div className="text-sm text-gray-500">No expense data.</div>
          ) : (
            categoryMoM.map((r) => {
              const up = r.diff > 0
              const down = r.diff < 0
              const arrow = up ? "↑" : down ? "↓" : "→"
              const color = up ? "text-red-600" : down ? "text-green-600" : "text-gray-500"
              const pctText = r.pct === null ? "new" : `${Math.abs(r.pct).toFixed(1)}%`

              return (
                <div key={r.name} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-gray-500">
                      Prev: {r.prev.toFixed(2)} • Now: {r.cur.toFixed(2)}
                    </div>
                  </div>

                  <div className={`font-semibold ${color}`}>
                    {arrow} {Math.abs(r.diff).toFixed(2)} ({pctText})
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link className="rounded-lg border bg-white px-4 py-2" href="/transactions/new">
          + Add Transaction
        </Link>
        <Link className="rounded-lg border bg-white px-4 py-2" href="/transactions">
          View Transactions
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string
  value: number
  subtitle?: string
  tone: "good" | "bad" | "neutral"
}) {
  const border =
    tone === "good" ? "border-green-200" : tone === "bad" ? "border-red-200" : "border-gray-200"

  return (
    <div className={`rounded-xl border bg-white p-4 ${border}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value.toFixed(2)} CAD</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function MiniCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-bold">{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}
