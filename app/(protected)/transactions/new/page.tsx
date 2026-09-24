"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createExpense, createIncome, createLoan, createTransfer } from "@/lib/services/transaction.service"
import { ParentCategory } from "@/lib/types/category"
import { NewTransactionSkeleton } from "@/components/skeletons/clay-skeletons"

const supabase = createClient()
type Account = { id: string; name: string; type: string; currency: string; is_default?: boolean }
type CatRow = { id: string; name: string; parent_id: string | null; group_type: "income" | "expense" | "transfer" | "loan" | null; expense_subtype: "fixed" | "variable" | "shared" | null; created_by: string | null; is_global: boolean }
type ParentCat = ParentCategory

const TYPE_CONFIG = {
  income: { icon: "💰", label: "Income", headerBg: "var(--green-grad)", btnCls: "clay-btn-green", accent: "#059669" },
  expense: { icon: "📤", label: "Expense", headerBg: "var(--red-grad)", btnCls: "clay-btn-red", accent: "#dc2626" },
  shared: { icon: "👥", label: "Shared", headerBg: "var(--amber-grad)", btnCls: "clay-btn-amber", accent: "#d97706" },
  transfer: { icon: "🔄", label: "Transfer", headerBg: "var(--purple-grad)", btnCls: "clay-btn-purple", accent: "#7c3aed" },
  loan: { icon: "🤝", label: "Loan", headerBg: "var(--blue-grad)", btnCls: "clay-btn-blue", accent: "#2563eb" },
} as const
type TxnType = keyof typeof TYPE_CONFIG

// Per-group pill color palettes: [bg, shadow-dark, shadow-light, border, text]
const GROUP_PILL_THEME = {
  income: { bg: "linear-gradient(145deg,#d1fae5,#a7f3d0)", dark: "rgba(5,150,105,0.30)", light: "rgba(255,255,255,0.90)", border: "rgba(52,211,153,0.35)", text: "#065f46", selectedBg: "linear-gradient(145deg,#34d399,#059669)", selectedText: "#fff", selectedDark: "rgba(5,150,105,0.45)", selectedLight: "rgba(255,255,255,0.20)" },
  expense: { bg: "linear-gradient(145deg,#fee2e2,#fecaca)", dark: "rgba(220,38,38,0.28)", light: "rgba(255,255,255,0.90)", border: "rgba(248,113,113,0.35)", text: "#7f1d1d", selectedBg: "linear-gradient(145deg,#f87171,#dc2626)", selectedText: "#fff", selectedDark: "rgba(220,38,38,0.45)", selectedLight: "rgba(255,255,255,0.20)" },
  transfer: { bg: "linear-gradient(145deg,#ede9fe,#ddd6fe)", dark: "rgba(124,58,237,0.25)", light: "rgba(255,255,255,0.90)", border: "rgba(167,139,250,0.35)", text: "#4c1d95", selectedBg: "linear-gradient(135deg,#7c3aed,#a855f7)", selectedText: "#fff", selectedDark: "rgba(124,58,237,0.45)", selectedLight: "rgba(255,255,255,0.20)" },
}

export default function NewTransactionPage() {
  const router = useRouter()
  const [dataLoading, setDataLoading] = useState(true)  // skeleton until data ready
  const [accounts, setAccounts] = useState<Account[]>([])
  const [parents, setParents] = useState<ParentCat[]>([])
  const [children, setChildren] = useState<CatRow[]>([])
  const [parentId, setParentId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() =>
    new Date().toLocaleString("en-CA", { timeZone: "America/New_York" }).slice(0, 10)
  )
  const [loading, setLoading] = useState(false)
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false)

  useEffect(() => {
    ; (async () => {
      const [{ data: acc }, { data: cats }] = await Promise.all([
        supabase.from("accounts").select("id,name,type,currency,is_default").eq("is_archived", false).order("name"),
        supabase.from("categories").select("id,name,parent_id,group_type,expense_subtype,created_by,is_global"),
      ])
      setAccounts((acc || []) as Account[])
      const rows = (cats || []) as CatRow[]
      setParents(rows.filter(c => c.parent_id === null && c.group_type).map(p => ({ id: p.id, name: p.name, group_type: p.group_type!, expense_subtype: p.expense_subtype })))
      setChildren(rows.filter(c => c.parent_id !== null))
      setDataLoading(false)   // ← skeleton off
    })()
  }, [])

  const selectedParent = useMemo(() => parents.find(p => p.id === parentId) ?? null, [parents, parentId])
  const txnType = useMemo<TxnType | null>(() => {
    if (!selectedParent) return null
    if (selectedParent.group_type === "income") return "income"
    if (selectedParent.group_type === "transfer") return "transfer"
    if (selectedParent.group_type === "loan") return "loan"
    if (selectedParent.expense_subtype === "shared") return "shared"
    return "expense"
  }, [selectedParent])

  const filteredChildren = useMemo(() => [...children.filter(c => c.parent_id === parentId)].sort((a, b) => a.name.localeCompare(b.name)), [parentId, children])

  const groups = useMemo(() => {
    const g: Record<string, { emoji: string; label: string; parents: ParentCat[]; theme: typeof GROUP_PILL_THEME["income"] }> = {
      income: { emoji: "💰", label: "Income", parents: [], theme: GROUP_PILL_THEME.income },
      expense: { emoji: "📤", label: "Expense", parents: [], theme: GROUP_PILL_THEME.expense },
      transfer: { emoji: "🔄", label: "Transfer & Loans", parents: [], theme: GROUP_PILL_THEME.transfer },
      loan: { emoji: "", label: "", parents: [], theme: GROUP_PILL_THEME.transfer },
    }
    parents.slice().sort((a, b) => {
      const aLast = a.group_type === "transfer" || a.group_type === "loan"
      const bLast = b.group_type === "transfer" || b.group_type === "loan"
      if (aLast !== bLast) return aLast ? 1 : -1
      return a.name.localeCompare(b.name)
    }).forEach(p => { if (p.group_type && g[p.group_type]) g[p.group_type].parents.push(p) })
    return g
  }, [parents])

  useEffect(() => { setCategoryId("") }, [parentId])

  // Subcategory horizontal scroll & drag helpers
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isWrapped, setIsWrapped] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false })

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current
    if (!el || isWrapped) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 6)
    setCanScrollRight(el.scrollLeft < maxScroll - 6)
  }, [isWrapped])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || isWrapped) return

    updateScrollButtons()
    const timer = setTimeout(updateScrollButtons, 120)

    const handleWheel = (e: WheelEvent) => {
      // If user is already scrolling horizontally via trackpad or shift+scroll, let it be
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 0) return

      // If at boundary, let normal page scroll proceed
      if (e.deltaY < 0 && el.scrollLeft <= 2) return
      if (e.deltaY > 0 && el.scrollLeft >= maxScroll - 2) return

      e.preventDefault()
      el.scrollLeft += e.deltaY
      updateScrollButtons()
    }

    el.addEventListener("scroll", updateScrollButtons, { passive: true })
    window.addEventListener("resize", updateScrollButtons)
    el.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      clearTimeout(timer)
      el.removeEventListener("scroll", updateScrollButtons)
      window.removeEventListener("resize", updateScrollButtons)
      el.removeEventListener("wheel", handleWheel)
    }
  }, [parentId, filteredChildren, isWrapped, updateScrollButtons])

  useEffect(() => {
    if (!categoryId || isWrapped || !scrollRef.current) return
    const selectedBtn = scrollRef.current.querySelector(`.subcat-pill.selected`) as HTMLElement | null
    if (selectedBtn) {
      selectedBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [categoryId, isWrapped])

  const scrollByAmount = (offset: number) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isWrapped || !scrollRef.current) return
    dragRef.current = {
      isDown: true,
      startX: e.pageX - scrollRef.current.offsetLeft,
      scrollLeft: scrollRef.current.scrollLeft,
      moved: false,
    }
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDown || !scrollRef.current) return
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - dragRef.current.startX) * 1.2
    if (Math.abs(walk) > 4) {
      dragRef.current.moved = true
    }
    scrollRef.current.scrollLeft = dragRef.current.scrollLeft - walk
  }

  const handleMouseUpOrLeave = () => {
    if (!dragRef.current.isDown) return
    dragRef.current.isDown = false
    setIsDragging(false)
    setTimeout(() => {
      dragRef.current.moved = false
    }, 50)
  }

  useEffect(() => {
    if (!accounts.length || !txnType) return
    const def = accounts.find(a => a.is_default)
    if (!def) return
    if (txnType === "income") { setToId(def.id); return }
    setFromId(def.id)
  }, [accounts, txnType])

  function getCurrency() {
    if (txnType === "income") return accounts.find(a => a.id === toId)?.currency ?? "CAD"
    return accounts.find(a => a.id === fromId)?.currency ?? "CAD"
  }

  async function handleSave() {
    if (!txnType) return alert("Please select a category")
    if (!categoryId) return alert("Please select a subcategory")
    const amt = Number(amount)
    if (!amount || amt <= 0) return alert("Please enter a valid amount")
    setLoading(true)
    try {
      const cur = getCurrency()
      if (txnType === "income") { if (!toId) return alert("Select a destination account"); await createIncome({ to_account_id: toId, category_id: categoryId, amount: amt, description, occurred_at: date, currency: cur }) }
      else if (txnType === "expense" || txnType === "shared") { if (!fromId) return alert("Select an account"); await createExpense({ from_account_id: fromId, category_id: categoryId, amount: amt, description: txnType === "shared" ? `${description}${description ? " | " : ""}Shared` : description, occurred_at: date, currency: cur }) }
      else if (txnType === "transfer") { if (!fromId || !toId) return alert("Select From and To accounts"); if (fromId === toId) return alert("From and To must differ"); await createTransfer({ from_account: fromId, to_account: toId, category_id: categoryId, amount: amt, description, occurred_at: date, currency: cur }) }
      else if (txnType === "loan") { if (!fromId || !toId) return alert("Select From and To accounts"); if (fromId === toId) return alert("From and To must differ"); await createLoan({ from_account: fromId, to_account: toId, category_id: categoryId, amount: amt, description, occurred_at: date, currency: cur }) }
      router.push("/transactions"); router.refresh()
    } catch (e: any) { alert(e?.message ?? "Error") }
    finally { setLoading(false) }
  }

  const selectedParentName = useMemo(() => parents.find(p => p.id === parentId)?.name ?? "", [parents, parentId])

  if (dataLoading) return <NewTransactionSkeleton />

  const cfg = txnType ? TYPE_CONFIG[txnType] : null
  const isReady = !!(categoryId && amount && Number(amount) > 0)

  return (
    <div style={{ paddingBottom: "calc(var(--nav-h) + 20px)", maxWidth: 560, margin: "0 auto" }} className="new-txn-pad">
      <style>{`
        @media(min-width:768px){ .new-txn-pad{ padding-bottom:28px!important; } }

        /* ── Pill base ── */
        .cat-pill {
          margin: 2px; /* Gives the shadow/scale room to breathe */
          display: inline-block; /* Ensures margin/transform behave correctly */
          padding: 9px 18px;
          border-radius: 50px;
          border: none;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          position: relative;
          letter-spacing: -0.1px;
          transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.18s ease, background 0.2s ease, color 0.2s ease;
          /* Prevent text select on tap */
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .cat-pill:active {
          transform: scale(0.93) translateY(1px) !important;
        }

        /* ── Income pills ── */
        .cat-pill-income {
          background: linear-gradient(145deg,#d1fae5,#a7f3d0);
          color: #065f46;
          box-shadow:
          3px 3px 8px rgba(5, 150, 105, 0.22),
          -2px -2px 6px var(--clay-highlight),     /* ← adapts to mode */
          inset 0 0 0 1px rgba(52, 211, 153, 0.20);
        }
        .cat-pill-income.selected {
          background: linear-gradient(145deg,#34d399,#059669);
          color: #fff;
          box-shadow:
            0 6px 14px rgba(5,150,105,0.22),
            0 0 0 1.5px rgba(5,150,105,0.18),
            inset 0 1px 0 rgba(255,255,255,0.22),
            inset 0 -1px 0 rgba(0,0,0,0.10),
            inset 0 0 0 1px rgba(255,255,255,0.14);
          transform: scale(1.03);
        }
        /* ── Expense pills ── */
        .cat-pill-expense {
          background: linear-gradient(145deg,#fee2e2,#fecaca);
          color: #7f1d1d;
          box-shadow:
          3px 3px 8px rgba(150, 5, 5, 0.22),
          -2px -2px 6px var(--clay-highlight),     /* ← adapts to mode */
          inset 0 0 0 1px rgba(211, 52, 52, 0.2);
        }
        .cat-pill-expense.selected {
          background: linear-gradient(145deg,#f87171,#dc2626);
          color: #fff;
          box-shadow:
            5px 5px 14px rgba(220,38,38,0.45),
            -2px -2px 6px rgba(255,255,255,0.15),
            inset 1px 1px 2px rgba(255,255,255,0.25),
            inset 0 0 0 1.5px rgba(255,255,255,0.18);
          transform: scale(1.06);
        }

        /* ── Transfer/Loan pills ── */
        .cat-pill-transfer {
          background: linear-gradient(145deg, #ede9fe, #ddd6fe);
          color: #4c1d95;
          box-shadow:
            2px 2px 6px rgba(124, 58, 237, 0.12), /* Softer, lighter shadow for light mode */
            -2px -2px 6px var(--clay-highlight),
            inset 0 0 0 1px rgba(124, 58, 237, 0.15);
          /* Added margin to prevent scale clipping */
          margin: 2px; 
        }
          .cat-pill-transfer.selected {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: #fff;
          box-shadow:
            4px 4px 12px rgba(124, 58, 237, 0.35),
            -2px -2px 6px rgba(255, 255, 255, 0.15),
            inset 1px 1px 2px rgba(255, 255, 255, 0.25),
            inset 0 0 0 1.5px rgba(255, 255, 255, 0.18);
          transform: scale(1.04); /* Slightly reduced scale to prevent edge clipping */
          z-index: 2; /* Ensure it sits above neighbors when scaled */
        }
        /* ── Sub-category pills ── */
        .subcat-pill {
          padding: 8px 16px;
          border-radius: 50px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          user-select: none;
          -webkit-user-drag: none;
          -webkit-tap-highlight-color: transparent;
          background: var(--surface-soft);
          color: var(--text-muted);
          box-shadow:
            3px 3px 8px rgba(151, 140, 140, 0.22),
            -2px -2px 6px var(--clay-highlight),
            inset 0 0 0 1.5px rgba(120, 134, 130, 0.25);
          transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.18s ease, background 0.2s ease, color 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .subcat-pill:hover {
          color: var(--text);
          transform: translateY(-1px);
        }
        .subcat-pill:active { transform: scale(0.93) translateY(1px) !important; }
        .subcat-pill.selected {
          color: #fff;
          transform: scale(1.05);
        }

        /* ── Scroll track & container for subcats ── */
        .subcat-scroll-container {
          position: relative;
          width: 100%;
          margin: 0 -4px;
          padding: 0 4px;
        }
        .subcat-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 6px 12px 10px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        .subcat-scroll::-webkit-scrollbar { display: none; }
        .subcat-scroll.wrapped {
          flex-wrap: wrap;
          overflow-x: visible;
          padding: 6px 4px 6px;
        }

        @media (min-width: 768px) {
          .subcat-scroll:not(.wrapped) {
            scrollbar-width: thin;
            scrollbar-color: var(--border-mid) transparent;
            cursor: grab;
          }
          .subcat-scroll.is-dragging {
            cursor: grabbing !important;
            user-select: none;
          }
          .subcat-scroll:not(.wrapped)::-webkit-scrollbar {
            display: block;
            height: 6px;
          }
          .subcat-scroll:not(.wrapped)::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 999px;
            margin: 0 28px;
          }
          .subcat-scroll:not(.wrapped)::-webkit-scrollbar-thumb {
            background: var(--border-mid);
            border-radius: 999px;
          }
          .subcat-scroll:not(.wrapped)::-webkit-scrollbar-thumb:hover {
            background: var(--text-faint);
          }
        }

        /* ── Side arrow buttons & fade gradients ── */
        .subcat-arrow-wrapper {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 44px;
          display: flex;
          align-items: center;
          z-index: 10;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .subcat-arrow-wrapper.left {
          left: 0;
          justify-content: flex-start;
          background: linear-gradient(to right, var(--surface) 40%, transparent 100%);
          padding-left: 2px;
        }
        .subcat-arrow-wrapper.right {
          right: 0;
          justify-content: flex-end;
          background: linear-gradient(to left, var(--surface) 40%, transparent 100%);
          padding-right: 2px;
        }
        .subcat-arrow-wrapper.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .subcat-arrow-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid var(--border-mid);
          background: var(--surface);
          color: var(--text);
          font-size: 19px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.35);
          transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
          user-select: none;
          line-height: 1;
          padding-bottom: 2px;
        }
        .subcat-arrow-btn:hover {
          transform: scale(1.12);
          background: var(--surface-soft);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
        }
        .subcat-arrow-btn:active {
          transform: scale(0.92);
        }

        .subcat-toggle-btn {
          background: var(--surface-soft);
          color: var(--text-muted);
          border: 1px solid var(--border-mid);
          padding: 3px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.18s ease;
          user-select: none;
        }
        .subcat-toggle-btn:hover {
          background: var(--surface);
          color: var(--text);
          border-color: var(--purple-mid);
        }
        .subcat-toggle-btn:active {
          transform: scale(0.95);
        }

        /* ── Section label ── */
        .group-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.9px;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 10px;
          opacity: 0.75;
        }

        /* ── Collapsed summary pill ── */
        .summary-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 18px;
          border-radius: 50px;
          cursor: pointer;
          font-weight: 800;
          font-size: 14px;
          color: var(--text);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          user-select: none;
          flex-shrink: 0;
          transform-origin: center;
        }
        .summary-pill:active { transform: scale(0.97); }

        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .anim-slide-up { animation: fadeSlideUp 0.25s ease forwards; }
      `}</style>

      <div
        style={{
          position: "sticky", top: 54, zIndex: 110,
          marginTop: 4,
          background: cfg?.headerBg ?? "var(--surface-tinted)",
          padding: "18px 24px",
          borderRadius: 20, margin: "0 16px",
          width: "calc(100% - 32px)",
          boxShadow: "0 10px 28px -10px rgba(0,0,0,0.35)",
          overflow: "hidden",
          transition: "background 0.4s ease",
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.3px" }}>
              {cfg ? `${cfg.icon} ${cfg.label}` : "➕ New Transaction"}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>
              {cfg ? "Fill in the details below" : "Choose a category to get started"}
            </div>
          </div>

          {/* Amount badge — slides in when amount is typed */}
          {amount && Number(amount) > 0 && (
            <div className="anim-slide-up">
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", letterSpacing: "-1px", lineHeight: 1 }}>
                ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 7, color: "var(--text)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>
                {getCurrency()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Form ── */}
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Category card ── */}
        <div className="clay-card">
          {/* Card header */}
          <div
            className="clay-label"
            style={{
              marginBottom: isCategoryCollapsed ? 0 : 14,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              cursor: parentId ? "pointer" : "default",
              transition: "margin 0.3s ease",
            }}
            onClick={() => parentId && setIsCategoryCollapsed(p => !p)}
          >
            <span>Category</span>
            {parentId && (
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)" }}>
                {isCategoryCollapsed ? "✏️ Change" : "▲ Collapse"}
              </span>
            )}
          </div>

          {/* Collapsed summary */}
          <div style={{
            maxHeight: (isCategoryCollapsed && parentId) ? "60px" : "0px",
            opacity: (isCategoryCollapsed && parentId) ? 1 : 0,
            overflow: "hidden",
            clipPath: "inset(0)",
            transition: "max-height 0.35s ease, opacity 0.25s ease",
            pointerEvents: (isCategoryCollapsed && parentId) ? "auto" : "none",
          }}>
            <div
              className="summary-pill"
              onClick={() => setIsCategoryCollapsed(false)}
              style={{
                marginTop: 8,
                background: cfg?.headerBg ?? "linear-gradient(135deg,#7c3aed,#a855f7)",
                boxShadow: `0px 50px 14px ${cfg?.accent ? cfg.accent + "55" : "rgba(124,58,237,0.35)"}, -2px -2px 8px rgba(255,255,255,0.15), inset 1px 1px 2px rgba(255,255,255,0.25)`,
              }}
            >
              <span>{selectedParentName}</span>
            </div>
          </div>

          {/* Expanded pill groups */}
          <div style={{
            maxHeight: !isCategoryCollapsed ? "1200px" : "0px",
            opacity: !isCategoryCollapsed ? 1 : 0,
            overflow: "hidden",
            clipPath: "inset(0)",
            transition: "max-height 0.4s ease, opacity 0.3s ease",
            pointerEvents: !isCategoryCollapsed ? "auto" : "none",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 4 }}>
              {Object.entries(groups)
                .filter(([key, g]) => g.parents.length > 0 && key !== "loan")
                .map(([key, g]) => {
                  const pillClass = key === "income" ? "cat-pill-income" : key === "expense" ? "cat-pill-expense" : "cat-pill-transfer"
                  return (
                    <div key={key}>
                      <div className="group-label">{g.emoji} {g.label}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, padding: "6px", overflow: "visible" }}>
                        {[...g.parents, ...(key === "transfer" ? (groups.loan?.parents ?? []) : [])]
                          .map(p => {
                            const isSelected = parentId === p.id
                            return (
                              <button
                                key={p.id}
                                className={`cat-pill ${pillClass}${isSelected ? " selected" : ""}`}
                                onClick={() => {
                                  setParentId(p.id)
                                  setIsCategoryCollapsed(true)
                                }}
                              >
                                {p.name}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* ── Subcategory — horizontal scroll pill row ── */}
        {parentId && (
          <div className="clay-card anim-slide-up" style={{ overflow: "visible" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div className="clay-label" style={{ marginBottom: 0 }}>Subcategory</div>
              {filteredChildren.length > 3 && (
                <button
                  type="button"
                  className="subcat-toggle-btn"
                  onClick={() => setIsWrapped(w => !w)}
                  title={isWrapped ? "Switch to horizontal scroll" : "Show all subcategories"}
                >
                  {isWrapped ? "⇄ Scroll row" : "⊞ View all"}
                </button>
              )}
            </div>

            <div className="subcat-scroll-container">
              {/* Left arrow button & gradient mask */}
              <div className={`subcat-arrow-wrapper left ${canScrollLeft && !isWrapped ? "visible" : ""}`}>
                <button
                  type="button"
                  className="subcat-arrow-btn"
                  onClick={() => scrollByAmount(-220)}
                  aria-label="Scroll subcategories left"
                  tabIndex={canScrollLeft ? 0 : -1}
                >
                  ‹
                </button>
              </div>

              <div
                ref={scrollRef}
                className={`subcat-scroll${isWrapped ? " wrapped" : ""}${isDragging ? " is-dragging" : ""}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
              >
                {filteredChildren.map(c => {
                  const isSelected = categoryId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      draggable={false}
                      className={`subcat-pill${isSelected ? " selected" : ""}`}
                      style={isSelected ? {
                        background: cfg?.headerBg,
                        boxShadow: `4px 0px 12px ${cfg?.accent ? cfg.accent + "44" : "rgba(0,0,0,0.25)"}, -2px -2px 6px rgba(255,255,255,0.15), inset 1px 1px 2px rgba(255,255,255,0.20)`,
                      } : {}}
                      onClick={() => {
                        if (dragRef.current.moved) return
                        setCategoryId(c.id)
                      }}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>

              {/* Right arrow button & gradient mask */}
              <div className={`subcat-arrow-wrapper right ${canScrollRight && !isWrapped ? "visible" : ""}`}>
                <button
                  type="button"
                  className="subcat-arrow-btn"
                  onClick={() => scrollByAmount(220)}
                  aria-label="Scroll subcategories right"
                  tabIndex={canScrollRight ? 0 : -1}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Accounts ── */}
        {txnType && (
          <div className="clay-card anim-slide-up">
            <div className="clay-label" style={{ marginBottom: 14 }}>Accounts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(txnType === "expense" || txnType === "shared" || txnType === "transfer" || txnType === "loan") && (
                <div className="clay-form-group">
                  <label className="clay-label">📤 From account</label>
                  <select className="clay-select" value={fromId} onChange={e => setFromId(e.target.value)}>
                    <option value="">Choose account…</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                  </select>
                </div>
              )}
              {(txnType === "income" || txnType === "transfer" || txnType === "loan") && (
                <div className="clay-form-group">
                  <label className="clay-label">📥 To account</label>
                  <select className="clay-select" value={toId} onChange={e => setToId(e.target.value)}>
                    <option value="">Choose account…</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Amount, date, note ── */}
        <div className="clay-card anim-slide-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="clay-form-group">
            <label className="clay-label">💵 Amount</label>
            <input
              className="clay-input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ fontSize: 22, fontWeight: 900, textAlign: "center", letterSpacing: "-0.5px" }}
            />
            {getCurrency() && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", fontWeight: 700, marginTop: 2 }}>
                {getCurrency()}
              </div>
            )}
          </div>
          <div className="clay-form-group">
            <label className="clay-label">📅 Date</label>
            <input className="clay-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="clay-form-group">
            <label className="clay-label">📝 Note (optional)</label>
            <input className="clay-input" placeholder="Add a note…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        {/* ── Save button ── */}
        <button
          className={`clay-btn clay-btn-lg ${isReady ? (cfg?.btnCls ?? "clay-btn-purple") : "clay-btn-white"}`}
          onClick={handleSave}
          disabled={loading || !isReady}
          style={{
            width: "100%",
            background: isReady && cfg ? cfg.headerBg : undefined,
            opacity: isReady ? 1 : 0.55,
            boxShadow: isReady
              ? `0 8px 20px -6px ${cfg?.accent ?? "rgba(0,0,0,0.3)"}88, inset 1px 1px 2px rgba(255,255,255,0.25)`
              : "var(--clay-card-sm)",
            transition: "all 0.35s cubic-bezier(.34,1.56,.64,1)",
            transform: isReady ? "scale(1.01)" : "scale(1)",
          }}
        >
          {loading ? "Saving…" : `${cfg?.icon ?? "💾"} Save ${cfg?.label ?? "Transaction"}`}
        </button>

      </div>
    </div>
  )
}
