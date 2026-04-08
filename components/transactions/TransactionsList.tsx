"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"
import { formatCurrency } from "@/lib/utils/currency"

const supabase = createClient()

type Row = {
  id: string; direction: "income" | "expense" | "transfer" | "loan"
  amount: number; description: string | null; occurred_at: string
  account_from_id: string | null; account_from_name: string | null
  account_to_id: string | null; account_to_name: string | null
  category_id: string; category_name: string
  category_group_type: "income" | "expense" | "transfer" | "loan"
  category_expense_subtype: "fixed" | "variable" | "shared" | null
  account_from_currency: string; account_to_currency: string
}

type AccountOpt = { id: string; name: string }
type CatOpt     = { category_id: string; leaf_name: string; group_type: string; expense_subtype: string | null }

const PAGE_SIZE = 30
function ym(d: string) { return d.slice(0, 7) }
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number)
  return new Date(y, mo-1, 1).toLocaleString(undefined, { month: "long", year: "numeric" })
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

const DIR_CONFIG = {
  income:   { icon: "💰", color: "var(--green)", bg: "bubble-green", label: "Income"   },
  expense:  { icon: "📤", color: "var(--red)", bg: "bubble-red", label: "Expense"  },
  transfer: { icon: "🔄", color: "var(--purple)", bg: "bubble-purple", label: "Transfer" },
  loan:     { icon: "🤝", color: "var(--amber)", bg: "bubble-amber", label: "Loan"     },
}

export default function TransactionsList({ initialRows, accounts, categories }: { initialRows: Row[]; accounts: AccountOpt[]; categories: CatOpt[] }) {
  const router = useRouter()
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const monthOptions = useMemo(() => {
    const s = new Set(initialRows.map(r => ym(r.occurred_at)))
    return Array.from(s).sort().reverse()
  }, [initialRows])

  const [month, setMonth]         = useState(monthOptions[0] ?? "")
  const [type, setType]           = useState("")
  const [subtype, setSubtype]     = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [accountId, setAccountId] = useState("")
  const [q, setQ]                 = useState("")
  const [sort, setSort]           = useState("date_desc")

  const filtered = useMemo(() => {
    let r = [...initialRows]
    if (month)      r = r.filter(x => ym(x.occurred_at) === month)
    if (type)       r = r.filter(x => x.direction === type)
    if (type === "expense" && subtype) r = r.filter(x => x.category_expense_subtype === subtype)
    if (categoryId) r = r.filter(x => x.category_id === categoryId)
    if (accountId)  r = r.filter(x => x.account_from_id === accountId || x.account_to_id === accountId)
    if (q.trim()) {
      const lq = q.toLowerCase()
      r = r.filter(x => (x.description||"").toLowerCase().includes(lq) || x.category_name.toLowerCase().includes(lq))
    }
    r.sort((a, b) => {
      if (sort === "date_desc") return b.occurred_at.localeCompare(a.occurred_at)
      if (sort === "date_asc")  return a.occurred_at.localeCompare(b.occurred_at)
      if (sort === "amt_desc")  return b.amount - a.amount
      if (sort === "amt_asc")   return a.amount - b.amount
      return 0
    })
    return r
  }, [initialRows, month, type, subtype, categoryId, accountId, q, sort])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const hasMore = visibleCount < filtered.length

  const income  = useMemo(() => filtered.filter(x=>x.direction==="income").reduce((s,x)=>s+x.amount,0),  [filtered])
  const expense = useMemo(() => filtered.filter(x=>x.direction==="expense").reduce((s,x)=>s+x.amount,0), [filtered])
  const net     = income - expense

  const activeFilters = [type, subtype, categoryId, accountId, q].filter(Boolean).length
    + (sort !== "date_desc" ? 1 : 0)
    + (month && month !== (monthOptions[0]??"") ? 1 : 0)

  useEffect(() => {
    if (!hasMore) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisibleCount(p => Math.min(p + PAGE_SIZE, filtered.length)) }, { rootMargin: "100px" })
    if (loadMoreRef.current) obs.observe(loadMoreRef.current)
    return () => obs.disconnect()
  }, [hasMore, filtered.length])

  function clear() {
    setType(""); setSubtype(""); setCategoryId(""); setAccountId("")
    setQ(""); setSort("date_desc"); setMonth(monthOptions[0] ?? ""); setVisibleCount(PAGE_SIZE)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction? This cannot be undone.")) return
    const { error } = await supabase.rpc("soft_delete_transaction", { p_transaction_id: id })
    if (error) { alert(error.message); return }
    setSelectedRow(null); router.refresh()
  }

  const filteredCats = useMemo(() => {
    if (!type) return categories
    return categories.filter(c => c.group_type === type && (!subtype || c.expense_subtype === subtype))
  }, [categories, type, subtype])

  // Group by date
  const grouped = useMemo(() => {
    const g = new Map<string, Row[]>()
    visible.forEach(r => { if (!g.has(r.occurred_at)) g.set(r.occurred_at, []); g.get(r.occurred_at)!.push(r) })
    return g
  }, [visible])

  function getAmt(t: Row) {
    if (t.direction === "income")   return formatCurrency(t.amount, t.account_to_currency)
    if (t.direction === "expense")  return formatCurrency(t.amount, t.account_from_currency)
    return formatCurrency(t.amount, t.account_from_currency)
  }

  return (
    <div className="clay-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">{filtered.length} transactions found</p>
        </div>
        <Link href="/transactions/new" className="clay-btn clay-btn-purple clay-btn-sm" style={{ textDecoration:"none", flexShrink:0 }}>
          ➕ Add
        </Link>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        <div className="clay-stat clay-stat-green anim-slide-up" style={{ minHeight: "auto", padding: "16px 12px" }}>
          <div className="stat-label">Income</div>
          <div className="stat-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>${income.toFixed(0)}</div>
        </div>
        <div className="clay-stat clay-stat-red anim-slide-up" style={{ minHeight: "auto", padding: "16px 12px", animationDelay: "0.1s" }}>
          <div className="stat-label">Spent</div>
          <div className="stat-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>${expense.toFixed(0)}</div>
        </div>
        <div className="clay-stat clay-stat-purple anim-slide-up" style={{ minHeight: "auto", padding: "16px 12px", animationDelay: "0.2s" }}>
          <div className="stat-label">Net</div>
          <div className="stat-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>{net >= 0 ? "+" : "−"}${Math.abs(net).toFixed(0)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="clay-card anim-slide-up" style={{ marginBottom: 16, animationDelay: "0.3s", padding: "14px 16px" }}>
        <button style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", background:"none", border:"none", cursor:"pointer", padding: 0 }} onClick={() => setFiltersOpen(v => !v)}>
          <span style={{ fontSize:14, fontWeight:800, color:"var(--text-soft)", fontFamily:"Nunito", display: "flex", alignItems: "center" }}>
            🔍 Filters
            {activeFilters > 0 && <span className="clay-pill pill-purple" style={{ marginLeft: 10 }}>{activeFilters}</span>}
          </span>
          <span style={{ transform: filtersOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", color:"var(--text-faint)" }}>▾</span>
        </button>

        <AnimatePresence>
          {filtersOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
              <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <select className="clay-select" style={{ padding: "10px 30px 10px 12px" }} value={month} onChange={e => { setMonth(e.target.value); setVisibleCount(PAGE_SIZE) }}>
                    {monthOptions.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                  <select className="clay-select" style={{ padding: "10px 30px 10px 12px" }} value={type} onChange={e => { setType(e.target.value); setSubtype(""); setCategoryId(""); setVisibleCount(PAGE_SIZE) }}>
                    <option value="">All types</option>
                    <option value="income">💰 Income</option>
                    <option value="expense">📤 Expense</option>
                    <option value="transfer">🔄 Transfer</option>
                    <option value="loan">🤝 Loan</option>
                  </select>
                  {type === "expense" && (
                    <select className="clay-select" style={{ padding: "10px 30px 10px 12px" }} value={subtype} onChange={e => { setSubtype(e.target.value); setCategoryId(""); setVisibleCount(PAGE_SIZE) }}>
                      <option value="">All expense types</option>
                      <option value="fixed">Fixed</option>
                      <option value="variable">Variable</option>
                      <option value="shared">Shared</option>
                    </select>
                  )}
                  <select className="clay-select" style={{ padding: "10px 30px 10px 12px" }} value={categoryId} onChange={e => { setCategoryId(e.target.value); setVisibleCount(PAGE_SIZE) }}>
                    <option value="">All categories</option>
                    {filteredCats.map(c => <option key={c.category_id} value={c.category_id}>{c.leaf_name}</option>)}
                  </select>
                  <select className="clay-select" style={{ padding: "10px 30px 10px 12px" }} value={accountId} onChange={e => { setAccountId(e.target.value); setVisibleCount(PAGE_SIZE) }}>
                    <option value="">All accounts</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <select className="clay-select" style={{ padding: "10px 30px 10px 12px" }} value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="date_desc">Date ↓</option>
                    <option value="date_asc">Date ↑</option>
                    <option value="amt_desc">Amount ↓</option>
                    <option value="amt_asc">Amount ↑</option>
                  </select>
                </div>
                <input className="clay-input" placeholder="🔍  Search description or category…" value={q}
                  onChange={e => { setQ(e.target.value); setVisibleCount(PAGE_SIZE) }} />
                {activeFilters > 0 && (
                  <button className="clay-btn clay-btn-ghost" style={{ width: "100%", padding: 11 }} onClick={clear}>✕ Clear all filters</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🔍</div>
          <div className="card-title" style={{ marginBottom: 4 }}>No transactions found</div>
          <div className="text-faint" style={{ fontSize: 13 }}>Try adjusting your filters</div>
        </div>
      ) : (
        <div style={{ paddingBottom: 20 }}>
          {Array.from(grouped.entries()).map(([date, rows]) => (
            <div key={date}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, padding: "10px 4px 6px" }}>
                {fmtDate(date)}
              </div>
              {rows.map(t => {
                const cfg = DIR_CONFIG[t.direction]
                const isInc = t.direction === "income"
                const isExp = t.direction === "expense"
                return (
                  <div key={t.id} className="clay-txn-row anim-slide-up" style={{ marginBottom: 8 }} onClick={() => setSelectedRow(t)}>
                    <div className={`clay-bubble clay-bubble-md ${cfg.bg}`}>{cfg.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.category_name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isInc ? (t.account_to_name ?? "—")
                          : isExp ? (t.account_from_name ?? "—")
                          : `${t.account_from_name ?? "—"} → ${t.account_to_name ?? "—"}`}
                        {t.description ? ` · ${t.description}` : ""}
                        {t.category_expense_subtype ? ` · ${t.category_expense_subtype}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: cfg.color, flexShrink: 0 }}>
                      {isInc ? "+" : isExp ? "−" : ""}{getAmt(t)}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          {hasMore && <div ref={loadMoreRef} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Loading more…</div>
          </div>}
        </div>
      )}

      {/* Transaction detail bottom sheet */}
      {typeof window !== "undefined" && selectedRow && createPortal(
        <AnimatePresence>
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 200 }} onClick={() => setSelectedRow(null)} />
          <motion.div key="sheet" className="clay-card-lg"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, borderRadius: "30px 30px 0 0", maxHeight: "85vh", overflowY: "auto", margin: 0, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 100, background: "var(--text-faint)", opacity: 0.3, margin: "0 auto 22px" }} />
            
            {/* Amount header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>{DIR_CONFIG[selectedRow.direction].icon}</div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-1.5px", color: DIR_CONFIG[selectedRow.direction].color }}>
                {selectedRow.direction === "income" ? "+" : selectedRow.direction === "expense" ? "−" : ""}
                {getAmt(selectedRow)}
              </div>
              <div className={`clay-pill ${selectedRow.direction === 'income' ? 'pill-green' : selectedRow.direction === 'expense' ? 'pill-red' : 'pill-purple'}`} style={{ marginTop: 10, padding: "6px 14px" }}>
                {DIR_CONFIG[selectedRow.direction].label}
              </div>
            </div>

            {/* Info rows */}
            <div className="clay-card-sm" style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Date",     val: selectedRow.occurred_at },
                { label: "Category", val: selectedRow.category_name },
                ...(selectedRow.category_expense_subtype ? [{ label: "Type", val: selectedRow.category_expense_subtype }] : []),
                ...(selectedRow.description ? [{ label: "Note", val: selectedRow.description }] : []),
                ...(selectedRow.account_from_name ? [{ label: "From",  val: selectedRow.account_from_name }] : []),
                ...(selectedRow.account_to_name   ? [{ label: "To",    val: selectedRow.account_to_name }]   : []),
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: i < arr.length - 1 ? 12 : 0 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 800, textAlign: "right", maxWidth: "60%" }}>{row.val}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <button className="clay-btn clay-btn-white" onClick={() => { setSelectedRow(null); router.push(`/transactions/${selectedRow.id}/edit`) }}>
                ✏️ Edit
              </button>
              <button className="clay-btn clay-btn-red" onClick={() => handleDelete(selectedRow.id)}>
                🗑️ Delete
              </button>
            </div>
            <button className="clay-btn clay-btn-ghost" style={{ width: "100%" }} onClick={() => setSelectedRow(null)}>Close</button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}