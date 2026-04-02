"use client"

/**
 * TransactionsDashboard
 *
 * Multi-currency UX:
 * - Detects all currencies that have transactions in the selected month
 * - If more than one currency exists → shows currency pills above the stats
 * - `viewCurrency` drives ALL aggregates (income, expense, charts, etc.)
 * - Defaults to `baseCurrency`; if baseCurrency has no data that month,
 *   auto-falls back to the first currency that does
 * - Single-currency users see zero UI change — no pills rendered at all
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
  currency: string
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
  return new Date(y, m - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  })
}

export default function TransactionsDashboard({
  data,
  baseCurrency,
}: {
  data: Row[]
  baseCurrency: string
}) {
  const { fmt, getCurrencyInfo } = useCurrency()

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
  const selectedPrev = useMemo(() => (selectedMonth ? prevMonth(selectedMonth) : ""), [selectedMonth])

  const monthTxns = useMemo(
    () => data.filter((t) => ym(t.occurred_at) === selectedMonth),
    [data, selectedMonth]
  )
  const prevTxns = useMemo(
    () => data.filter((t) => ym(t.occurred_at) === selectedPrev),
    [data, selectedPrev]
  )

  // ── Currency pills ─────────────────────────────────────────────────────────
  // Currencies that have at least one transaction this month, baseCurrency first

  const monthCurrencies = useMemo(() => {
    const seen = new Set<string>()
    monthTxns.forEach((t) => seen.add(t.currency))
    return Array.from(seen).sort((a, b) => {
      if (a === baseCurrency) return -1
      if (b === baseCurrency) return 1
      return a.localeCompare(b)
    })
  }, [monthTxns, baseCurrency])

  const [viewCurrency, setViewCurrency] = useState<string>(baseCurrency)

  // When month changes, re-evaluate which currency to show
  useEffect(() => {
    if (monthCurrencies.includes(baseCurrency)) {
      setViewCurrency(baseCurrency)
    } else if (monthCurrencies.length > 0) {
      setViewCurrency(monthCurrencies[0])
    }
  }, [selectedMonth, monthCurrencies, baseCurrency])

  // ── All calculations filtered to viewCurrency ─────────────────────────────

  const monthView = useMemo(
    () => monthTxns.filter((t) => t.currency === viewCurrency),
    [monthTxns, viewCurrency]
  )

  const prevView = useMemo(
    () => prevTxns.filter((t) => t.currency === viewCurrency),
    [prevTxns, viewCurrency]
  )

  const thisIncome = useMemo(
    () => monthView.filter((t) => t.direction === "income").reduce((s, t) => s + t.amount, 0),
    [monthView]
  )

  const thisExpense = useMemo(
    () => monthView.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0),
    [monthView]
  )

  const prevExpense = useMemo(
    () => prevView.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0),
    [prevView]
  )

  const expenseChangePct =
    prevExpense > 0 ? ((thisExpense - prevExpense) / prevExpense) * 100 : null

  const spendTrend = useMemo(() => {
    const byMonth = new Map<string, number>()
    data.forEach((t) => {
      if (t.direction !== "expense" || t.currency !== viewCurrency) return
      const key = ym(t.occurred_at)
      byMonth.set(key, (byMonth.get(key) || 0) + t.amount)
    })
    return Array.from(byMonth.keys())
      .sort()
      .map((m) => ({ month: m, spending: Number((byMonth.get(m) || 0).toFixed(2)) }))
  }, [data, viewCurrency])

  const topCategories = useMemo(() => {
    const map = new Map<string, number>()
    monthView.forEach((t) => {
      if (t.direction !== "expense") return
      map.set(t.leaf_name, (map.get(t.leaf_name) || 0) + t.amount)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
  }, [monthView])

  const standings = topCategories.slice(0, 5)

  const subtypeData = useMemo(() => {
    const map = new Map<string, number>()
    monthView.forEach((t) => {
      if (t.direction !== "expense") return
      const key = t.expense_subtype || "unknown"
      map.set(key, (map.get(key) || 0) + t.amount)
    })
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }))
  }, [monthView])

  const mostExpensiveDay = useMemo(() => {
    const map = new Map<string, number>()
    monthView.forEach((t) => {
      if (t.direction !== "expense") return
      const day = t.occurred_at.slice(0, 10)
      map.set(day, (map.get(day) || 0) + t.amount)
    })
    let best: { day: string; total: number } | null = null
    for (const [day, total] of map.entries()) {
      if (!best || total > best.total) best = { day, total }
    }
    return best
  }, [monthView])

  // Biggest transaction: show across ALL currencies (shows true max this month)
  const biggestTxn = useMemo(() => {
    if (monthTxns.length === 0) return null
    return monthTxns.reduce((best, t) => (t.amount > best.amount ? t : best))
  }, [monthTxns])

  const categoryMoM = useMemo(() => {
    const thisMap = new Map<string, number>()
    const prevMap = new Map<string, number>()
    monthView.forEach((t) => {
      if (t.direction !== "expense") return
      thisMap.set(t.leaf_name, (thisMap.get(t.leaf_name) || 0) + t.amount)
    })
    prevView.forEach((t) => {
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
  }, [monthView, prevView])

  // Recent across all currencies — the live feed
  const recent = monthTxns.slice(0, 8)

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="text-sm text-gray-500">
            Trends, standings, and where your money went
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="border rounded-lg px-3 py-2 bg-white text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <Link href="/transactions/new" className="rounded-lg bg-black text-white px-4 py-2 text-sm">
            Add Transaction
          </Link>
        </div>
      </div>

      {/* ── Currency pill selector ─────────────────────────────────────────
           Hidden for single-currency users. Appears automatically when
           multiple currencies are present in the selected month.
      ──────────────────────────────────────────────────────────────────── */}
      {monthCurrencies.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 mr-1">Viewing:</span>
          {monthCurrencies.map((cur) => {
            const info = getCurrencyInfo(cur)
            const isActive = cur === viewCurrency
            return (
              <button
                key={cur}
                onClick={() => setViewCurrency(cur)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                  "border transition-all duration-150",
                  isActive
                    ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900",
                ].join(" ")}
              >
                {info?.symbol && (
                  <span className={isActive ? "text-zinc-300" : "text-zinc-400"}>
                    {info.symbol}
                  </span>
                )}
                <span>{cur}</span>
                {cur === baseCurrency && (
                  // Small star indicates this is their home currency
                  <span
                    className={`text-[10px] ${isActive ? "text-zinc-400" : "text-zinc-300"}`}
                    title="Your display currency"
                  >
                    ★
                  </span>
                )}
              </button>
            )
          })}
          {/* Only show the legend hint when there are multiple currencies */}
          <span className="text-xs text-gray-400">
            ★ display currency
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          title="Income"
          value={fmt(thisIncome, viewCurrency)}
          subtitle={monthLabel(selectedMonth)}
          tone="good"
        />
        <StatCard
          title="Spending"
          value={fmt(thisExpense, viewCurrency)}
          subtitle={monthLabel(selectedMonth)}
          tone="bad"
        />
        <StatCard
          title="vs Prev Month"
          value={fmt(thisExpense, viewCurrency)}
          subtitle={
            expenseChangePct === null
              ? "No previous month data"
              : `${expenseChangePct >= 0 ? "↑" : "↓"} ${Math.abs(expenseChangePct).toFixed(1)}%`
          }
          tone={expenseChangePct !== null && expenseChangePct < 0 ? "good" : "neutral"}
        />
        <StatCard
          title="Biggest Transaction"
          value={biggestTxn ? fmt(biggestTxn.amount, biggestTxn.currency) : fmt(0, viewCurrency)}
          subtitle={biggestTxn ? `${biggestTxn.direction} • ${biggestTxn.leaf_name}` : "No data"}
          tone="neutral"
        />
      </div>

      {/* Highlight mini-cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <MiniCard
          title="Most Expensive Day"
          value={mostExpensiveDay ? fmt(mostExpensiveDay.total, viewCurrency) : "No expense data"}
          subtitle={mostExpensiveDay ? mostExpensiveDay.day : monthLabel(selectedMonth)}
        />
        <MiniCard
          title="Top Spending Category"
          value={topCategories[0] ? fmt(topCategories[0].value, viewCurrency) : "No expense data"}
          subtitle={topCategories[0]?.name ?? monthLabel(selectedMonth)}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">
            Spending Trend ({viewCurrency}) — Last 12 months
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [fmt(Number(v), viewCurrency), "Spending"]} />
                <Bar dataKey="spending" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">
            Where money went — {viewCurrency} ({monthLabel(selectedMonth)})
          </h2>
          <div className="h-64">
            <ResponsiveContainer
              key={`pie-${chartKey}-${viewCurrency}-${selectedMonth}`}
              width="100%"
              height="100%"
              minHeight={240}
            >
              <PieChart>
                <Pie
                  data={topCategories}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius="72%"
                >
                  {topCategories.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [fmt(Number(v), viewCurrency), ""]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Standings + Type + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Top Categories</h2>
          <div className="space-y-2">
            {standings.length === 0 ? (
              <div className="text-sm text-gray-500">No expense data.</div>
            ) : (
              standings.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs dark:bg-gray-700 dark:text-gray-300 shrink-0">
                      {i + 1}
                    </div>
                    <div className="truncate text-sm">{s.name}</div>
                  </div>
                  <div className="font-semibold text-sm shrink-0 ml-2">
                    {fmt(s.value, viewCurrency)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Spending Type</h2>
          <div className="space-y-2 text-sm">
            {subtypeData.length === 0 ? (
              <div className="text-gray-500">No expense data.</div>
            ) : (
              subtypeData.map((x) => (
                <div key={x.name} className="flex justify-between">
                  <span className="capitalize text-gray-700">{x.name}</span>
                  <span className="font-semibold">{fmt(x.value, viewCurrency)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent across ALL currencies — the live feed shouldn't be filtered */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent</h2>
            <Link href="/transactions" className="text-sm text-blue-600">View all</Link>
          </div>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <div className="text-sm text-gray-500">No transactions.</div>
            ) : (
              recent.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{t.leaf_name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {t.occurred_at} • {t.direction}
                      {/* Show currency badge in recent when multi-currency */}
                      {monthCurrencies.length > 1 && (
                        <span className="ml-1 text-gray-400">({t.currency})</span>
                      )}
                    </div>
                  </div>
                  <div className={`font-semibold text-sm shrink-0 ml-2 ${
                    t.direction === "income" ? "text-green-600" :
                    t.direction === "expense" ? "text-red-600" : "text-gray-700"
                  }`}>
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
          <span className="ml-2 text-xs font-normal text-gray-400">({viewCurrency})</span>
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
                    <div className="font-medium text-sm truncate">{r.name}</div>
                    <div className="text-xs text-gray-500">
                      Prev: {fmt(r.prev, viewCurrency)} • Now: {fmt(r.cur, viewCurrency)}
                    </div>
                  </div>
                  <div className={`font-semibold text-sm shrink-0 ml-2 ${color}`}>
                    {arrow} {fmt(Math.abs(r.diff), viewCurrency)} ({pctText})
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link className="rounded-lg border bg-white px-4 py-2 text-sm" href="/transactions/new">
          + Add Transaction
        </Link>
        <Link className="rounded-lg border bg-white px-4 py-2 text-sm" href="/transactions">
          View Transactions
        </Link>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title, value, subtitle, tone,
}: {
  title: string; value: string; subtitle?: string; tone: "good" | "bad" | "neutral"
}) {
  const border =
    tone === "good" ? "border-green-200" :
    tone === "bad" ? "border-red-200" : "border-gray-200"
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
