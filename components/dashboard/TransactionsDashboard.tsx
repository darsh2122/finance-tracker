"use client"

/**
 * TransactionsDashboard
 *
 * Currency changes:
 * - Now accepts `baseCurrency` prop (user's preferred display currency)
 * - Each row now has a `currency` field
 * - All aggregates (income, expense, etc.) ONLY sum transactions that are in
 *   baseCurrency. This avoids meaningless cross-currency addition.
 * - The spending trend chart and pie chart also filter to baseCurrency.
 * - If the user has transactions in other currencies, a small notice is shown.
 * - The useCurrency() hook provides the fmt() formatter so amounts display
 *   with the correct symbol and decimal places.
 */

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
import { useCurrency } from "@/lib/context/CurrencyContext"

type Row = {
  id: string
  direction: "income" | "expense" | "transfer" | "loan"
  amount: number
  currency: string          // ← NEW
  description: string
  occurred_at: string
  leaf_name: string
  group_type: "income" | "expense" | "transfer" | "loan" | null
  expense_subtype: "fixed" | "variable" | "shared" | null
}

const COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#a855f7",
  "#f59e0b", "#0ea5e9", "#14b8a6", "#64748b",
]

function ym(d: string) { return d.slice(0, 7) }
function prevMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-").map(Number)
  return new Date(y, m - 2, 1).toISOString().slice(0, 7)
}
function monthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" })
}

export default function TransactionsDashboard({
  data,
  baseCurrency,
}: {
  data: Row[]
  baseCurrency: string
}) {
  // fmt(amount, currencyCode) — formats with correct symbol & decimals
  const { fmt } = useCurrency()

  const [chartKey, setChartKey] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setChartKey((k) => k + 1)
      window.dispatchEvent(new Event("resize"))
    })
    const t = setTimeout(() => {
      setChartKey((k) => k + 1)
      window.dispatchEvent(new Event("resize"))
    }, 200)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [])

  // ── Month selector ─────────────────────────────────────────────────────────
  const monthOptions = useMemo(() => {
    const s = new Set<string>()
    data.forEach((t) => s.add(ym(t.occurred_at)))
    return Array.from(s).sort().reverse()
  }, [data])

  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0] ?? "")
  const selectedPrev = useMemo(() => selectedMonth ? prevMonth(selectedMonth) : "", [selectedMonth])

  // ── Filter to selected month ───────────────────────────────────────────────
  const monthTxns = useMemo(
    () => data.filter((t) => ym(t.occurred_at) === selectedMonth),
    [data, selectedMonth]
  )
  const prevTxns = useMemo(
    () => data.filter((t) => ym(t.occurred_at) === selectedPrev),
    [data, selectedPrev]
  )

  // ── Filter further to baseCurrency for aggregates ─────────────────────────
  // Why: adding $100 CAD + $100 USD = $200 "something" is wrong.
  // We only sum transactions that are in the user's chosen display currency.
  const monthBase = useMemo(
    () => monthTxns.filter((t) => t.currency === baseCurrency),
    [monthTxns, baseCurrency]
  )
  const prevBase = useMemo(
    () => prevTxns.filter((t) => t.currency === baseCurrency),
    [prevTxns, baseCurrency]
  )

  // Whether this month has any non-base-currency transactions
  const hasOtherCurrencies = useMemo(
    () => monthTxns.some((t) => t.currency !== baseCurrency),
    [monthTxns, baseCurrency]
  )

  // ── Summary stats (base currency only) ────────────────────────────────────
  const thisIncome = useMemo(
    () => monthBase.filter((t) => t.direction === "income").reduce((s, t) => s + t.amount, 0),
    [monthBase]
  )
  const thisExpense = useMemo(
    () => monthBase.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0),
    [monthBase]
  )
  const prevExpense = useMemo(
    () => prevBase.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0),
    [prevBase]
  )
  const expenseChangePct =
    prevExpense > 0 ? ((thisExpense - prevExpense) / prevExpense) * 100 : null

  // ── Spending trend (12 months, base currency, expense only) ───────────────
  const spendTrend = useMemo(() => {
    const byMonth = new Map<string, number>()
    data.forEach((t) => {
      if (t.direction !== "expense" || t.currency !== baseCurrency) return
      const key = ym(t.occurred_at)
      byMonth.set(key, (byMonth.get(key) || 0) + t.amount)
    })
    return Array.from(byMonth.keys()).sort().map((m) => ({
      month: m,
      spending: Number((byMonth.get(m) || 0).toFixed(2)),
    }))
  }, [data, baseCurrency])

  // ── Where money went (base currency, selected month) ──────────────────────
  const topCategories = useMemo(() => {
    const map = new Map<string, number>()
    monthBase.forEach((t) => {
      if (t.direction !== "expense") return
      map.set(t.leaf_name, (map.get(t.leaf_name) || 0) + t.amount)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
  }, [monthBase])

  const standings = topCategories.slice(0, 5)

  // ── Spending type breakdown (base currency) ────────────────────────────────
  const subtypeData = useMemo(() => {
    const map = new Map<string, number>()
    monthBase.forEach((t) => {
      if (t.direction !== "expense") return
      const key = t.expense_subtype || "unknown"
      map.set(key, (map.get(key) || 0) + t.amount)
    })
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }))
  }, [monthBase])

  // ── Most expensive day (base currency) ────────────────────────────────────
  const mostExpensiveDay = useMemo(() => {
    const map = new Map<string, number>()
    monthBase.forEach((t) => {
      if (t.direction !== "expense") return
      const day = t.occurred_at.slice(0, 10)
      map.set(day, (map.get(day) || 0) + t.amount)
    })
    let best: { day: string; total: number } | null = null
    for (const [day, total] of map.entries()) {
      if (!best || total > best.total) best = { day, total }
    }
    return best
  }, [monthBase])

  // ── Biggest transaction (any currency, selected month) ────────────────────
  const biggestTxn = useMemo(() => {
    if (monthTxns.length === 0) return null
    return monthTxns.reduce((best, t) => (t.amount > best.amount ? t : best))
  }, [monthTxns])

  // ── Month-over-month by category (base currency) ───────────────────────────
  const categoryMoM = useMemo(() => {
    const thisMap = new Map<string, number>()
    const prevMap = new Map<string, number>()
    monthBase.forEach((t) => {
      if (t.direction !== "expense") return
      thisMap.set(t.leaf_name, (thisMap.get(t.leaf_name) || 0) + t.amount)
    })
    prevBase.forEach((t) => {
      if (t.direction !== "expense") return
      prevMap.set(t.leaf_name, (prevMap.get(t.leaf_name) || 0) + t.amount)
    })
    const all = new Set([...thisMap.keys(), ...prevMap.keys()])
    return Array.from(all)
      .map((name) => {
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
      .sort((a, b) => b.cur - a.cur)
      .slice(0, 8)
  }, [monthBase, prevBase])

  const recent = monthTxns.slice(0, 8)

  // ── Render ─────────────────────────────────────────────────────────────────
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
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <Link href="/transactions/new" className="rounded-lg bg-black text-white px-4 py-2">
            Add Transaction
          </Link>
        </div>
      </div>

      {/* Multi-currency notice */}
      {hasOtherCurrencies && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some transactions this month are in currencies other than{" "}
          <strong>{baseCurrency}</strong>. Summaries below only include{" "}
          {baseCurrency} transactions. View all transactions in the{" "}
          <Link href="/transactions" className="underline">Transactions</Link> page.
        </div>
      )}

      {/* Top stat cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          title="Income"
          value={fmt(thisIncome, baseCurrency)}
          subtitle={monthLabel(selectedMonth)}
          tone="good"
        />
        <StatCard
          title="Spending"
          value={fmt(thisExpense, baseCurrency)}
          subtitle={monthLabel(selectedMonth)}
          tone="bad"
        />
        <StatCard
          title="vs Prev Month"
          value={fmt(thisExpense, baseCurrency)}
          subtitle={
            expenseChangePct === null
              ? "No previous month data"
              : `${expenseChangePct >= 0 ? "↑" : "↓"} ${Math.abs(expenseChangePct).toFixed(1)}%`
          }
          tone={expenseChangePct !== null && expenseChangePct < 0 ? "good" : "neutral"}
        />
        <StatCard
          title="Biggest Transaction"
          value={biggestTxn ? fmt(biggestTxn.amount, biggestTxn.currency) : fmt(0)}
          subtitle={biggestTxn ? `${biggestTxn.direction} • ${biggestTxn.leaf_name}` : "No data"}
          tone="neutral"
        />
      </div>

      {/* Extra highlight cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <MiniCard
          title="Most Expensive Day"
          value={mostExpensiveDay ? fmt(mostExpensiveDay.total, baseCurrency) : "No expense data"}
          subtitle={mostExpensiveDay ? mostExpensiveDay.day : monthLabel(selectedMonth)}
        />
        <MiniCard
          title="Top Spending Category"
          value={topCategories[0] ? fmt(topCategories[0].value, baseCurrency) : "No expense data"}
          subtitle={topCategories[0]?.name ?? monthLabel(selectedMonth)}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">
            Spending Trend — {baseCurrency} (Last 12 months)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: any) => fmt(Number(v), baseCurrency)} />
                <Bar dataKey="spending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">
            Where money went — {baseCurrency} ({monthLabel(selectedMonth)})
          </h2>
          <div className="h-64">
            <ResponsiveContainer key={`pie-${chartKey}`} width="100%" height="100%" minHeight={240}>
              <PieChart>
                <Pie data={topCategories} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius="72%">
                  {topCategories.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(Number(v), baseCurrency)} />
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
                  <div className="font-semibold">{fmt(s.value, baseCurrency)}</div>
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
                <span className="font-semibold">{fmt(x.value, baseCurrency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-blue-600">View all</Link>
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
                    {fmt(t.amount, t.currency)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Month-over-month */}
      <div className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-3">
          Category Change: {monthLabel(selectedMonth)} vs {monthLabel(selectedPrev)}
          <span className="ml-2 text-xs font-normal text-gray-400">({baseCurrency} only)</span>
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
                      Prev: {fmt(r.prev, baseCurrency)} • Now: {fmt(r.cur, baseCurrency)}
                    </div>
                  </div>
                  <div className={`font-semibold ${color}`}>
                    {arrow} {fmt(Math.abs(r.diff), baseCurrency)} ({pctText})
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string
  value: string
  subtitle?: string
  tone: "good" | "bad" | "neutral"
}) {
  const border =
    tone === "good" ? "border-green-200" : tone === "bad" ? "border-red-200" : "border-gray-200"
  return (
    <div className={`rounded-xl border bg-white p-4 ${border}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
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
