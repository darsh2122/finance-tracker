"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"

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
const PAGE_SIZE = 30

function ym(d: string) {
  return d.slice(0, 7)
}
function monthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" })
}
function parseDirection(value: string): "" | Row["direction"] {
  if (value === "income" || value === "expense" || value === "transfer" || value === "loan") return value
  return ""
}
function parseSubtype(value: string): "" | "fixed" | "variable" | "shared" {
  if (value === "fixed" || value === "variable" || value === "shared") return value
  return ""
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
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  const [originY, setOriginY] = useState<number>(0.5)


  async function handleDelete(id: string) {
    // setOpenMenuId(null)
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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

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
  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount])
  const hasMore = visibleCount < rows.length
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (type) count += 1
    if (subtype) count += 1
    if (categoryId) count += 1
    if (accountId) count += 1
    if (minAmt.trim()) count += 1
    if (maxAmt.trim()) count += 1
    if (q.trim()) count += 1
    if (sort !== "date_desc") count += 1
    if (month && month !== (monthOptions[0] ?? "")) count += 1
    return count
  }, [type, subtype, categoryId, accountId, minAmt, maxAmt, q, sort, month, monthOptions])

  const total = useMemo(() => rows.reduce((s, x) => s + x.amount * (x.direction === "income" ? 1 : x.direction === "expense" ? -1 : 0), 0), [rows])
  const expenseTotal = useMemo(() => rows.filter(x => x.direction === "expense").reduce((s,x)=>s+x.amount,0), [rows])
  const incomeTotal = useMemo(() => rows.filter(x => x.direction === "income").reduce((s,x)=>s+x.amount,0), [rows])

  useEffect(() => {
    if (!hasMore) return
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, rows.length))
        }
      },
      { rootMargin: "120px 0px" },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, rows.length])

  function clear() {
    setVisibleCount(PAGE_SIZE)
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
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            {activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}` : "No active filters"}
          </div>
          <button
            type="button"
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <span className="inline-flex items-center gap-2">
              {filtersOpen ? "Hide filters" : "Show filters"}
              <motion.span
                animate={{ rotate: filtersOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                aria-hidden="true"
              >
                v
              </motion.span>
            </span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              key="filters-panel"
              initial={{ height: 0, opacity: 0, y: -8 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -8 }}
              transition={{
                height: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.2, ease: "easeOut" },
                y: { duration: 0.25, ease: "easeOut" },
              }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.7 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pt-1"
              >
            <div className="grid gap-3 md:grid-cols-6">
              <select className="border rounded-lg p-2" value={month} onChange={(e) => {
                setVisibleCount(PAGE_SIZE)
                setMonth(e.target.value)
              }}>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>

              <select className="border rounded-lg p-2" value={type} onChange={(e) => {
                const v = parseDirection(e.target.value)
                setVisibleCount(PAGE_SIZE)
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
                  setVisibleCount(PAGE_SIZE)
                  setSubtype(parseSubtype(e.target.value))
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

              <select className="border rounded-lg p-2" value={categoryId} onChange={(e) => {
                setVisibleCount(PAGE_SIZE)
                setCategoryId(e.target.value)
              }}>
                <option value="">All categories</option>
                {filteredCategories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.leaf_name}
                  </option>
                ))}
              </select>

              <select className="border rounded-lg p-2" value={accountId} onChange={(e) => {
                setVisibleCount(PAGE_SIZE)
                setAccountId(e.target.value)
              }}>
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <select className="border rounded-lg p-2" value={sort} onChange={(e) => {
                setVisibleCount(PAGE_SIZE)
                setSort(e.target.value as Sort)
              }}>
                <option value="date_desc">Date ↓</option>
                <option value="date_asc">Date ↑</option>
                <option value="amt_desc">Amount ↓</option>
                <option value="amt_asc">Amount ↑</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-6">
              <input className="border rounded-lg p-2 md:col-span-2" placeholder="Search description or category..." value={q} onChange={(e) => {
                setVisibleCount(PAGE_SIZE)
                setQ(e.target.value)
              }} />
              <input className="border rounded-lg p-2" placeholder="Min amount" value={minAmt} onChange={(e) => {
                setVisibleCount(PAGE_SIZE)
                setMinAmt(e.target.value)
              }} />
              <input className="border rounded-lg p-2" placeholder="Max amount" value={maxAmt} onChange={(e) => {
                setVisibleCount(PAGE_SIZE)
                setMaxAmt(e.target.value)
              }} />
              <button className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 md:col-span-2" onClick={clear}>
                Clear filters
              </button>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2">
              <Chip onClick={() => { setVisibleCount(PAGE_SIZE); setType("expense"); setSubtype("shared"); }}>Shared only</Chip>
              <Chip onClick={() => { setVisibleCount(PAGE_SIZE); setMinAmt("100"); }}>Over $100</Chip>
              <Chip onClick={() => { setVisibleCount(PAGE_SIZE); setType("income"); }}>Income only</Chip>
              <Chip onClick={() => { setVisibleCount(PAGE_SIZE); setType("expense"); }}>Expense only</Chip>
            </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="relative rounded-xl border bg-white overflow-visible">
        {rows.length === 0 ? (
          <div className="p-6 text-gray-500">No transactions match your filters.</div>
        ) : (
          <div className="divide-y">
            {visibleRows.map((t) => (
              <div
                key={t.id}
                className="relative p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"

              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const centerY = rect.top + rect.height / 2
                const originFraction = centerY / window.innerHeight
                setOriginY(originFraction)
                setSelectedRow(t)
              }}    
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
                </div>
              </div>
            ))}
            {hasMore && <div ref={loadMoreRef} className="h-10" />}
            {hasMore && <div className="p-3 text-center text-sm text-gray-500">Loading more...</div>}
          </div>
        )}
      </div>
    {/* Transaction Detail Drawer — rendered in a portal so fixed positioning is always relative to the true viewport */}
{typeof window !== "undefined" && createPortal(
  <AnimatePresence>
    {selectedRow && (
      <>
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setSelectedRow(null)}
        />

        {/* Modal — grows from the clicked row */}
        <motion.div
          key="modal"
          className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
          style={{
            top: "50%",
            transformOrigin: `50% ${originY * 100}%`,
          }}
          initial={{
            opacity: 0,
            x: "-50%",
            y: "-50%",
            scale: 0.15,
          }}
          animate={{
            opacity: 1,
            x: "-50%",
            y: "-50%",
            scale: 1,
          }}
          exit={{
            opacity: 0,
            x: "-50%",
            y: "-50%",
            scale: 0.15,
          }}
          transition={{
            type: "spring",
            damping: 22,
            stiffness: 280,
            opacity: { duration: 0.2 },
          }}
        >
          {/* Bubble tail — small triangle pointing toward the origin row */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-900 rotate-45 rounded-sm z-10 shadow-sm"
            style={{
              [originY < 0.5 ? "top" : "bottom"]: "-6px",
            }}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Transaction Details</h2>
            <button
              onClick={() => setSelectedRow(null)}
              className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            {/* Amount */}
            <div className="text-center py-3">
              <div className={`text-4xl font-bold ${
                selectedRow.direction === "income" ? "text-green-500" :
                selectedRow.direction === "expense" ? "text-red-500" : "text-gray-800 dark:text-gray-100"
              }`}>
                {selectedRow.direction === "income" ? "+" : selectedRow.direction === "expense" ? "−" : ""}
                ${Number(selectedRow.amount).toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{selectedRow.direction}</div>
            </div>

            {/* Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl divide-y divide-gray-200 dark:divide-gray-700">
              <DetailRow label="Date" value={selectedRow.occurred_at} />
              <DetailRow label="Category" value={selectedRow.category_name} />
              {selectedRow.category_expense_subtype && (
                <DetailRow label="Expense type" value={selectedRow.category_expense_subtype} capitalize />
              )}
              {selectedRow.description && (
                <DetailRow label="Description" value={selectedRow.description} />
              )}
              {selectedRow.account_from_name && (
                <DetailRow label="From account" value={selectedRow.account_from_name} />
              )}
              {selectedRow.account_to_name && (
                <DetailRow label="To account" value={selectedRow.account_to_name} />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-4">
              <button
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  setSelectedRow(null)
                  router.push(`/transactions/${selectedRow.id}/edit`)
                }}
              >
                Edit
              </button>
              <button
                className="flex-1 rounded-xl border border-red-200 dark:border-red-900 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => {
                  handleDelete(selectedRow.id)
                  setSelectedRow(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>,
  document.body
)}

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

function DetailRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  )
}
