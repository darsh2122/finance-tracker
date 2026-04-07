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
  income:   { icon: "💰", color: "#34d399", bg: "linear-gradient(145deg,#34d399,#059669)", label: "Income"   },
  expense:  { icon: "📤", color: "#f87171", bg: "linear-gradient(145deg,#f87171,#dc2626)", label: "Expense"  },
  transfer: { icon: "🔄", color: "#a78bfa", bg: "linear-gradient(135deg,#818cf8,#4f46e5)", label: "Transfer" },
  loan:     { icon: "🤝", color: "#fbbf24", bg: "linear-gradient(135deg,#fbbf24,#d97706)", label: "Loan"     },
}

const styles = `
  .txn-page {
    min-height: 100vh; background: #12091e; color: white;
    padding-bottom: calc(var(--nav-h, 70px) + 20px);
  }
  .txn-top-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px 10px; position: sticky; top: 0; z-index: 40;
    background: rgba(18,9,30,0.9); backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(139,92,246,0.12);
  }
  .txn-icon-btn {
    width: 42px; height: 42px; border-radius: 13px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 18px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3), inset 0 -2px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.85); text-decoration: none; transition: transform 0.15s;
  }
  .txn-icon-btn:active { transform: scale(0.93); }
  .txn-add-btn {
    background: linear-gradient(135deg,#7c3aed,#a855f7);
    color: white; border-radius: 13px; padding: 10px 16px;
    font-size: 13px; font-weight: 800; border: none; cursor: pointer;
    box-shadow: 0 6px 18px rgba(124,58,237,0.45), inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.22);
    display: flex; align-items: center; gap: 6px; font-family: 'Nunito', sans-serif;
    text-decoration: none; transition: transform 0.15s;
  }
  .txn-add-btn:active { transform: scale(0.95); }
  .txn-body { padding: 20px 16px 0; }

  /* Summary stat cards — matching screenshot green/red/blue */
  .txn-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 14px 0 20px; }
  .txn-stat {
    border-radius: 22px; padding: 16px 12px; position: relative; overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.30), inset 0 -4px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.20);
  }
  .txn-stat::after { content:''; position:absolute; top:-35%; right:-15%; width:90px; height:90px; border-radius:50%; background:rgba(255,255,255,0.14); }
  .txn-stat-label { font-size:9px; font-weight:800; color:rgba(255,255,255,0.78); text-transform:uppercase; letter-spacing:.8px; }
  .txn-stat-value { font-size:17px; font-weight:900; color:white; margin-top:4px; text-shadow:0 2px 6px rgba(0,0,0,0.2); }

  /* Filter panel */
  .txn-filter-card {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px; padding: 14px 16px; margin-bottom: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.20), inset 0 -2px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .txn-filter-toggle {
    display: flex; justify-content: space-between; align-items: center;
    cursor: pointer; border: none; background: transparent;
    font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800;
    color: rgba(255,255,255,0.8); width: 100%; padding: 0;
  }
  .txn-filter-chevron { transition: transform 0.22s; }
  .txn-filter-chevron.open { transform: rotate(180deg); }
  .txn-filter-body { padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
  .txn-filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .txn-filter-select {
    width: 100%; padding: 12px 14px; border-radius: 14px;
    background: rgba(255,255,255,0.07); border: 1.5px solid rgba(139,92,246,0.2);
    color: rgba(255,255,255,0.85); font-family: 'Nunito', sans-serif;
    font-size: 12px; font-weight: 700; outline: none;
    -webkit-appearance: none; appearance: none; cursor: pointer;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.15);
  }
  .txn-filter-select option { background: #1e1535; color: white; }
  .txn-search {
    width: 100%; padding: 12px 14px; border-radius: 14px;
    background: rgba(255,255,255,0.07); border: 1.5px solid rgba(139,92,246,0.2);
    color: rgba(255,255,255,0.85); font-family: 'Nunito', sans-serif;
    font-size: 13px; font-weight: 600; outline: none;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.15);
  }
  .txn-search::placeholder { color: rgba(255,255,255,0.3); }
  .txn-search:focus { border-color: rgba(139,92,246,0.5); }
  .txn-clear-btn {
    width: 100%; padding: 11px; border-radius: 14px;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.6); font-family: 'Nunito', sans-serif;
    font-size: 12px; font-weight: 800; cursor: pointer; transition: background 0.18s;
  }
  .txn-filter-badge {
    display: inline-flex; align-items: center; padding: 3px 10px;
    border-radius: 100px; background: rgba(139,92,246,0.25);
    color: #c4b5fd; font-size: 11px; font-weight: 800;
  }
  
  /* Date group header */
  .txn-date-label {
    font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.4);
    text-transform: uppercase; letter-spacing: 0.8px;
    padding: 10px 4px 6px; display: block;
  }
  
  /* Transaction row */
  .txn-row-card {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px; padding: 14px 16px;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 10px; cursor: pointer;
    box-shadow: 0 4px 18px rgba(0,0,0,0.22), inset 0 -3px 0 rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.05);
    transition: transform 0.15s;
  }
  .txn-row-card:active { transform: scale(0.985); }
  .txn-bubble {
    width: 44px; height: 44px; border-radius: 15px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(0,0,0,0.35), inset 0 -2px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.28);
  }
  .txn-row-name { font-size: 14px; font-weight: 800; color: rgba(255,255,255,0.9); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .txn-row-sub  { font-size: 11px; color: rgba(255,255,255,0.38); font-weight: 600; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .txn-row-amt  { font-size: 15px; font-weight: 900; flex-shrink: 0; }

  /* Empty state */
  .txn-empty { text-align: center; padding: 50px 20px; }
  .txn-empty-icon { font-size: 52px; margin-bottom: 14px; }
  .txn-empty-title { font-size: 18px; font-weight: 800; color: rgba(255,255,255,0.7); }
  .txn-empty-sub   { font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 6px; }

  /* Bottom sheet */
  .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); z-index: 200; }
  .sheet-panel {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 201;
    background: #1e1535; border-radius: 30px 30px 0 0;
    border-top: 1px solid rgba(139,92,246,0.2);
    padding: 20px 20px calc(40px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -8px 40px rgba(0,0,0,0.5); max-height: 85vh; overflow-y: auto;
  }
  .sheet-handle { width: 40px; height: 4px; border-radius: 100px; background: rgba(255,255,255,0.15); margin: 0 auto 22px; }
  .sheet-action-btn {
    width: 100%; padding: 15px; border-radius: 18px;
    font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800;
    cursor: pointer; border: none; display: flex; align-items: center;
    justify-content: center; gap: 8px; margin-bottom: 10px; transition: transform 0.15s;
  }
  .sheet-action-btn:active { transform: scale(0.97); }
  .btn-purple {
    background: linear-gradient(135deg,#7c3aed,#a855f7); color: white;
    box-shadow: 0 6px 18px rgba(124,58,237,0.4), inset 0 -3px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .btn-glass { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1); }
  .btn-danger { background: rgba(248,113,113,0.15); color: #fca5a5; border: 1px solid rgba(248,113,113,0.25); }
  .sheet-info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
  .sheet-info-label { font-size: 13px; color: rgba(255,255,255,0.45); font-weight: 600; }
  .sheet-info-val   { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 700; text-transform: capitalize; text-align: right; max-width: 55%; }
`

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
    <>
      <style>{styles}</style>
      <div className="txn-page">

        {/* Top bar */}
        <div className="txn-top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🧾</span>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Transactions</span>
          </div>
          <Link href="/transactions/new" className="txn-add-btn">
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add
          </Link>
        </div>

        <div className="txn-body">
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 2 }}>{filtered.length} transactions</div>

          {/* Stat cards */}
          <div className="txn-stats">
            <div className="txn-stat" style={{ background: "linear-gradient(145deg,#34d399,#059669)" }}>
              <div className="txn-stat-label">Income</div>
              <div className="txn-stat-value">${income.toFixed(0)}</div>
            </div>
            <div className="txn-stat" style={{ background: "linear-gradient(145deg,#f87171,#dc2626)" }}>
              <div className="txn-stat-label">Spent</div>
              <div className="txn-stat-value">${expense.toFixed(0)}</div>
            </div>
            <div className="txn-stat" style={{ background: net >= 0 ? "linear-gradient(145deg,#60a5fa,#2563eb)" : "linear-gradient(145deg,#f87171,#dc2626)" }}>
              <div className="txn-stat-label">Net</div>
              <div className="txn-stat-value">{net >= 0 ? "+" : "−"}${Math.abs(net).toFixed(0)}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="txn-filter-card">
            <button className="txn-filter-toggle" onClick={() => setFiltersOpen(v => !v)}>
              <span>
                🔍 Filters
                {activeFilters > 0 && <span className="txn-filter-badge" style={{ marginLeft: 10 }}>{activeFilters}</span>}
              </span>
              <span className={`txn-filter-chevron ${filtersOpen ? "open" : ""}`}>▾</span>
            </button>

            <AnimatePresence>
              {filtersOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
                  <div className="txn-filter-body">
                    <div className="txn-filter-grid">
                      <select className="txn-filter-select" value={month} onChange={e => { setMonth(e.target.value); setVisibleCount(PAGE_SIZE) }}>
                        {monthOptions.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                      </select>
                      <select className="txn-filter-select" value={type} onChange={e => { setType(e.target.value); setSubtype(""); setCategoryId(""); setVisibleCount(PAGE_SIZE) }}>
                        <option value="">All types</option>
                        <option value="income">💰 Income</option>
                        <option value="expense">📤 Expense</option>
                        <option value="transfer">🔄 Transfer</option>
                        <option value="loan">🤝 Loan</option>
                      </select>
                      {type === "expense" && (
                        <select className="txn-filter-select" value={subtype} onChange={e => { setSubtype(e.target.value); setCategoryId(""); setVisibleCount(PAGE_SIZE) }}>
                          <option value="">All expense types</option>
                          <option value="fixed">Fixed</option>
                          <option value="variable">Variable</option>
                          <option value="shared">Shared</option>
                        </select>
                      )}
                      <select className="txn-filter-select" value={categoryId} onChange={e => { setCategoryId(e.target.value); setVisibleCount(PAGE_SIZE) }}>
                        <option value="">All categories</option>
                        {filteredCats.map(c => <option key={c.category_id} value={c.category_id}>{c.leaf_name}</option>)}
                      </select>
                      <select className="txn-filter-select" value={accountId} onChange={e => { setAccountId(e.target.value); setVisibleCount(PAGE_SIZE) }}>
                        <option value="">All accounts</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <select className="txn-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="date_desc">Date ↓</option>
                        <option value="date_asc">Date ↑</option>
                        <option value="amt_desc">Amount ↓</option>
                        <option value="amt_asc">Amount ↑</option>
                      </select>
                    </div>
                    <input className="txn-search" placeholder="🔍  Search description or category…" value={q}
                      onChange={e => { setQ(e.target.value); setVisibleCount(PAGE_SIZE) }} />
                    {activeFilters > 0 && (
                      <button className="txn-clear-btn" onClick={clear}>✕ Clear all filters</button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="txn-empty">
              <div className="txn-empty-icon">🔍</div>
              <div className="txn-empty-title">No transactions found</div>
              <div className="txn-empty-sub">Try adjusting your filters</div>
            </div>
          ) : (
            <>
              {Array.from(grouped.entries()).map(([date, rows]) => (
                <div key={date}>
                  <span className="txn-date-label">{fmtDate(date)}</span>
                  {rows.map(t => {
                    const cfg = DIR_CONFIG[t.direction]
                    const isInc = t.direction === "income"
                    const isExp = t.direction === "expense"
                    return (
                      <div key={t.id} className="txn-row-card" onClick={() => setSelectedRow(t)}>
                        <div className="txn-bubble" style={{ background: cfg.bg }}>{cfg.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="txn-row-name">{t.category_name}</div>
                          <div className="txn-row-sub">
                            {isInc ? (t.account_to_name ?? "—")
                              : isExp ? (t.account_from_name ?? "—")
                              : `${t.account_from_name ?? "—"} → ${t.account_to_name ?? "—"}`}
                            {t.description ? ` · ${t.description}` : ""}
                            {t.category_expense_subtype ? ` · ${t.category_expense_subtype}` : ""}
                          </div>
                        </div>
                        <div className="txn-row-amt" style={{ color: cfg.color }}>
                          {isInc ? "+" : isExp ? "−" : ""}{getAmt(t)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {hasMore && <div ref={loadMoreRef} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Loading more…</div>
              </div>}
            </>
          )}
        </div>
      </div>

      {/* Transaction detail bottom sheet */}
      {typeof window !== "undefined" && selectedRow && createPortal(
        <AnimatePresence>
          <motion.div key="overlay" className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedRow(null)} />
          <motion.div key="sheet" className="sheet-panel"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="sheet-handle" />
            
            {/* Amount header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>{DIR_CONFIG[selectedRow.direction].icon}</div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-1.5px", color: DIR_CONFIG[selectedRow.direction].color }}>
                {selectedRow.direction === "income" ? "+" : selectedRow.direction === "expense" ? "−" : ""}
                {getAmt(selectedRow)}
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", padding: "4px 14px",
                borderRadius: "100px", marginTop: 10, fontSize: 12, fontWeight: 800,
                background: `${DIR_CONFIG[selectedRow.direction].color}22`,
                color: DIR_CONFIG[selectedRow.direction].color,
                border: `1px solid ${DIR_CONFIG[selectedRow.direction].color}44`,
              }}>
                {DIR_CONFIG[selectedRow.direction].label}
              </div>
            </div>

            {/* Info rows */}
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "0 16px", marginBottom: 20 }}>
              {[
                { label: "Date",     val: selectedRow.occurred_at },
                { label: "Category", val: selectedRow.category_name },
                ...(selectedRow.category_expense_subtype ? [{ label: "Type", val: selectedRow.category_expense_subtype }] : []),
                ...(selectedRow.description ? [{ label: "Note", val: selectedRow.description }] : []),
                ...(selectedRow.account_from_name ? [{ label: "From",  val: selectedRow.account_from_name }] : []),
                ...(selectedRow.account_to_name   ? [{ label: "To",    val: selectedRow.account_to_name }]   : []),
              ].map(row => (
                <div key={row.label} className="sheet-info-row">
                  <span className="sheet-info-label">{row.label}</span>
                  <span className="sheet-info-val">{row.val}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <button className="sheet-action-btn btn-glass" onClick={() => { setSelectedRow(null); router.push(`/transactions/${selectedRow.id}/edit`) }}>
                ✏️ Edit
              </button>
              <button className="sheet-action-btn btn-danger" onClick={() => handleDelete(selectedRow.id)}>
                🗑️ Delete
              </button>
            </div>
            <button className="sheet-action-btn btn-glass" onClick={() => setSelectedRow(null)}>Close</button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}