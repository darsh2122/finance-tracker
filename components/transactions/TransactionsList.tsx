"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const supabase = createClient()

type Row = {
  id: string
  direction: "income" | "expense" | "transfer" | "loan"
  amount: number
  description: string | null
  occurred_at: string // YYYY-MM-DD
  account_from_id: string | null
  account_from_name: string | null
  account_to_id: string | null
  account_to_name: string | null
  category_id: string
  category_name: string
  category_group_type: "income" | "expense" | "transfer" | "loan"
  category_expense_subtype: "fixed" | "variable" | "shared" | null
}

type AccountOpt = { id: string; name: string }
type CatOpt = {
  category_id: string
  leaf_name: string
  group_type: "income" | "expense" | "transfer" | "loan"
  expense_subtype: "fixed" | "variable" | "shared" | null
}

type Sort = "date_desc" | "date_asc" | "amt_desc" | "amt_asc"

function ym(d: string) {
  return d.slice(0, 7)
}
function monthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" })
}

export default function TransactionsList({
  initialRows,
  accounts,
  categories,
}: {
  initialRows: Row[]
  accounts: AccountOpt[]
  categories: CatOpt[]
}) {
  const router = useRouter()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    const onWindowClick = () => setOpenMenuId(null)
    window.addEventListener("click", onWindowClick)
    return () => window.removeEventListener("click", onWindowClick)
  }, [])

  async function handleDelete(id: string) {
    setOpenMenuId(null)
    const ok = confirm("Delete this transaction? You can't undo this (soft delete).")
    if (!ok) return

    const { error } = await supabase.rpc("soft_delete_transaction", {
      p_transaction_id: id,
    })

    if (error) {
      alert(error.message)
      return
    }

    // simplest refresh: reload page data
    router.refresh()
  }
  // month options derived from rows
  const monthOptions = useMemo(() => {
    const s = new Set<string>()
    initialRows.forEach((r) => s.add(ym(r.occurred_at)))
    return Array.from(s).sort().reverse()
  }, [initialRows])

  const [month, setMonth] = useState<string>(monthOptions[0] ?? "")
  const [type, setType] = useState<"" | Row["direction"]>("")
  const [subtype, setSubtype] = useState<"" | "fixed" | "variable" | "shared">("")
  const [categoryId, setCategoryId] = useState("")
  const [accountId, setAccountId] = useState("")
  const [minAmt, setMinAmt] = useState("")
  const [maxAmt, setMaxAmt] = useState("")
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<Sort>("date_desc")

  const filteredCategories = useMemo(() => {
    if (!type) return categories
    if (type === "expense") {
      // subtype applies here
      return categories.filter((c) => c.group_type === "expense" && (!subtype || c.expense_subtype === subtype))
    }
    return categories.filter((c) => c.group_type === type)
  }, [categories, type, subtype])

  const rows = useMemo(() => {
    let r = [...initialRows]

    // month filter
    if (month) r = r.filter((x) => ym(x.occurred_at) === month)

    // type filter
    if (type) r = r.filter((x) => x.direction === type)

    // subtype filter (expense)
    if (type === "expense" && subtype) {
      r = r.filter((x) => x.category_expense_subtype === subtype)
    }

    // category
    if (categoryId) r = r.filter((x) => x.category_id === categoryId)

    // account (match either from or to)
    if (accountId) {
      r = r.filter((x) => x.account_from_id === accountId || x.account_to_id === accountId)
    }

    // amount range
    const min = minAmt ? Number(minAmt) : null
    const max = maxAmt ? Number(maxAmt) : null
    if (min !== null && !Number.isNaN(min)) r = r.filter((x) => x.amount >= min)
    if (max !== null && !Number.isNaN(max)) r = r.filter((x) => x.amount <= max)

    // text search
    const query = q.trim().toLowerCase()
    if (query) {
      r = r.filter((x) => (x.description ?? "").toLowerCase().includes(query) || x.category_name.toLowerCase().includes(query))
    }

    // sorting
    r.sort((a, b) => {
      if (sort === "date_desc") return b.occurred_at.localeCompare(a.occurred_at)
      if (sort === "date_asc") return a.occurred_at.localeCompare(b.occurred_at)
      if (sort === "amt_desc") return b.amount - a.amount
      if (sort === "amt_asc") return a.amount - b.amount
      return 0
    })

    return r
  }, [initialRows, month, type, subtype, categoryId, accountId, minAmt, maxAmt, q, sort])

  const total = useMemo(() => rows.reduce((s, x) => s + x.amount * (x.direction === "income" ? 1 : x.direction === "expense" ? -1 : 0), 0), [rows])
  const expenseTotal = useMemo(() => rows.filter(x => x.direction === "expense").reduce((s,x)=>s+x.amount,0), [rows])
  const incomeTotal = useMemo(() => rows.filter(x => x.direction === "income").reduce((s,x)=>s+x.amount,0), [rows])

  function clear() {
    setType("")
    setSubtype("")
    setCategoryId("")
    setAccountId("")
    setMinAmt("")
    setMaxAmt("")
    setQ("")
    setSort("date_desc")
    setMonth(monthOptions[0] ?? "")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-bold">Transactions</div>
          <div className="text-sm text-gray-500">
            {rows.length} shown • Income {incomeTotal.toFixed(2)} • Expense {expenseTotal.toFixed(2)} • Net {total.toFixed(2)}
          </div>
        </div>

        <Link href="/transactions/new" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
          Add
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-6">
          <select className="border rounded-lg p-2" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>

          <select className="border rounded-lg p-2" value={type} onChange={(e) => {
            const v = e.target.value as any
            setType(v)
            setSubtype("")
            setCategoryId("")
          }}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
            <option value="loan">Loan</option>
          </select>

          <select
            className="border rounded-lg p-2"
            value={subtype}
            onChange={(e) => {
              setSubtype(e.target.value as any)
              setCategoryId("")
            }}
            disabled={type !== "expense"}
            title={type !== "expense" ? "Select Expense first" : undefined}
          >
            <option value="">All expense types</option>
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
            <option value="shared">Shared</option>
          </select>

          <select className="border rounded-lg p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {filteredCategories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.leaf_name}
              </option>
            ))}
          </select>

          <select className="border rounded-lg p-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select className="border rounded-lg p-2" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="date_desc">Date ↓</option>
              <option value="date_asc">Date ↑</option>
            <option value="amt_desc">Amount ↓</option>
            <option value="amt_asc">Amount ↑</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-6">
          <input className="border rounded-lg p-2 md:col-span-2" placeholder="Search description or category…" value={q} onChange={(e) => setQ(e.target.value)} />
          <input className="border rounded-lg p-2" placeholder="Min amount" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} />
          <input className="border rounded-lg p-2" placeholder="Max amount" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} />
          <button className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 md:col-span-2" onClick={clear}>
            Clear filters
          </button>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => { setType("expense"); setSubtype("shared"); }}>Shared only</Chip>
          <Chip onClick={() => { setMinAmt("100"); }}>Over $100</Chip>
          <Chip onClick={() => { setType("income"); }}>Income only</Chip>
          <Chip onClick={() => { setType("expense"); }}>Expense only</Chip>
        </div>
      </div>

      {/* List */}
      <div className="relative rounded-xl border bg-white overflow-visible">
        {rows.length === 0 ? (
          <div className="p-6 text-gray-500">No transactions match your filters.</div>
        ) : (
          <div className="divide-y">
            {rows.map((t) => (
              <div
                key={t.id}
                className={`relative p-4 flex items-center justify-between ${
                  openMenuId === t.id ? "z-20" : "z-0"
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.category_name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {t.occurred_at}
                    {" • "}
                    {t.direction}
                    {t.direction === "expense" && t.category_expense_subtype ? ` • ${t.category_expense_subtype}` : ""}
                    {" • "}
                    {t.direction === "income" ? (t.account_to_name ?? "—") : t.direction === "expense" ? (t.account_from_name ?? "—") : `${t.account_from_name ?? "—"} → ${t.account_to_name ?? "—"}`}
                    {t.description ? ` • ${t.description}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`font-semibold ${
                    t.direction === "income" ? "text-green-600" :
                    t.direction === "expense" ? "text-red-600" : "text-gray-700"
                  }`}>
                    {t.direction === "income" ? "+" : t.direction === "expense" ? "-" : ""}
                    {Number(t.amount).toFixed(2)}
                  </div>

                  <div className="relative">
                    <button
                      className="h-9 w-9 rounded-lg border bg-white hover:bg-gray-50 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === t.id ? null : t.id)
                      }}
                      aria-label="Transaction actions"
                    >
                      ...
                    </button>

                    {openMenuId === t.id && (
                      <div
                        className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border bg-white shadow-xl shadow-slate-900/20 backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-inherit transition-colors duration-150 hover:bg-gray-50"
                          onClick={() => {
                            setOpenMenuId(null)
                            router.push(`/transactions/${t.id}/edit`)
                          }}
                        >
                          Edit
                        </button>

                        <div className="border-t" />

                        <button
                          className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors duration-150 hover:bg-gray-50"
                          onClick={() => handleDelete(t.id)}
                        >
                          Delete...
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="rounded-full border bg-white px-3 py-1 text-sm hover:bg-gray-50"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}
