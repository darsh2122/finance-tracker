"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Txn = {
  id: string; direction: "income" | "expense" | "transfer" | "loan"
  amount: number; description: string | null; occurred_at: string
  category_id: string; account_from_id: string | null; account_to_id: string | null
}
type AccountOpt = { id: string; name: string }
type CatRow = {
  id: string; name: string; parent_id: string | null
  group_type: "income" | "expense" | "transfer" | "loan" | null
  expense_subtype: "fixed" | "variable" | "shared" | null
  created_by: string | null; is_global: boolean
}
type ParentCat = { id: string; name: string; group_type: "income" | "expense" | "transfer" | "loan"; expense_subtype: "fixed" | "variable" | "shared" | null }

const DIR_CONFIG = {
  income:   { icon: "💰", label: "Income",   headerBg: "var(--green-grad)", accent: "var(--green)", btnCls: 'clay-btn-green' },
  expense:  { icon: "📤", label: "Expense",  headerBg: "var(--red-grad)", accent: "var(--red)", btnCls: 'clay-btn-red' },
  transfer: { icon: "🔄", label: "Transfer", headerBg: "var(--purple-grad)", accent: "var(--purple-mid)", btnCls: 'clay-btn-purple' },
  loan:     { icon: "🤝", label: "Loan",     headerBg: "var(--amber-grad)", accent: "var(--amber)", btnCls: 'clay-btn-amber' },
}

export default function TransactionEditForm({ txn, accounts }: { txn: Txn; accounts: AccountOpt[] }) {
  const supabase = createClient()
  const router   = useRouter()

  const [amount, setAmount]         = useState(String(txn.amount))
  const [occurredAt, setOccurredAt] = useState(txn.occurred_at)
  const [description, setDescription] = useState(txn.description ?? "")
  const [parents, setParents]       = useState<ParentCat[]>([])
  const [children, setChildren]     = useState<CatRow[]>([])
  const [parentId, setParentId]     = useState("")
  const [categoryId, setCategoryId] = useState(txn.category_id)
  const [fromId, setFromId]         = useState(txn.account_from_id ?? "")
  const [toId, setToId]             = useState(txn.account_to_id ?? "")
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from("categories").select("id,name,parent_id,group_type,expense_subtype,created_by,is_global")
      if (!data) return
      const rows = data as CatRow[]
      setParents(rows.filter(c => c.parent_id === null && c.group_type).map(p => ({
        id: p.id, name: p.name, group_type: p.group_type!, expense_subtype: p.expense_subtype,
      })))
      setChildren(rows.filter(c => c.parent_id !== null))
    })()
  }, [])

  // Derive parent from existing category
  useEffect(() => {
    if (!children.length || !txn.category_id) return
    const leaf = children.find(c => c.id === txn.category_id)
    if (leaf?.parent_id) setParentId(leaf.parent_id)
  }, [children, txn.category_id])

  const parentsForDir = useMemo(() => parents.filter(p => p.group_type === txn.direction), [parents, txn.direction])
  const filteredChildren = useMemo(() => {
    if (!parentId) return []
    return [...children.filter(c => c.parent_id === parentId)].sort((a, b) => a.name.localeCompare(b.name))
  }, [parentId, children])

  useEffect(() => {
    if (!parentId) return
    const leaf = children.find(c => c.id === categoryId)
    if (leaf && leaf.parent_id !== parentId) setCategoryId("")
  }, [parentId])

  async function save() {
    const amt = Number(amount)
    if (!isFinite(amt) || amt <= 0) return alert("Amount must be greater than 0")
    if (!occurredAt) return alert("Date is required")
    if (!parentId)   return alert("Please select a category")
    if (!categoryId) return alert("Please select a subcategory")
    if (txn.direction === "income" && !toId)   return alert("To account is required")
    if (txn.direction === "expense" && !fromId) return alert("From account is required")
    if ((txn.direction === "transfer" || txn.direction === "loan") && (!fromId || !toId)) return alert("Both accounts are required")
    if ((txn.direction === "transfer" || txn.direction === "loan") && fromId === toId) return alert("From and To must be different")

    setSaving(true)
    try {
      const { error } = await supabase.from("transactions").update({
        amount: amt, occurred_at: occurredAt,
        description: description.trim() || null,
        category_id: categoryId,
        account_from_id: fromId || null,
        account_to_id: toId || null,
      }).eq("id", txn.id)
      if (error) { alert(error.message); return }
      router.push("/transactions"); router.refresh()
    } finally { setSaving(false) }
  }

  const cfg = DIR_CONFIG[txn.direction]
  const isReady = !!(categoryId && amount && Number(amount) > 0)

  return (
    <div style={{ paddingBottom: "calc(var(--nav-h) + 20px)", maxWidth: 560, margin: "0 auto" }} className="new-txn-pad">
      <style>{`
        @media(min-width:768px){ .new-txn-pad{ padding-bottom:28px!important; } }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .anim-slide-up { animation: fadeSlideUp 0.25s ease forwards; }
      `}</style>
      
      {/* ── Sticky coloured header ── */}
      <div
        style={{
          position: "sticky", top: "calc(var(--nav-h) - 6px)", zIndex: 100,
          marginTop: 4,
          background: cfg.headerBg,
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
            <div style={{ fontSize: 18, fontWeight: 800, color: "white", letterSpacing: "-0.3px", textShadow: "0 2px 10px rgba(0,0,0,0.18)" }}>
              {cfg.icon} Edit {cfg.label}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600, marginTop: 2 }}>
              Update the details below
            </div>
          </div>
          
          {/* Amount badge — slides in when amount is typed */}
          {amount && Number(amount) > 0 && (
            <div className="anim-slide-up" style={{
              background: "var(--surface-soft)",
              borderRadius: 16,
              padding: "6px 14px",
              boxShadow: "var(--clay-row)",
              textAlign: "right",
            }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", letterSpacing: "-1px", lineHeight: 1 }}>
                ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Category */}
        <div className="clay-card anim-slide-up">
          <div className="clay-label" style={{ marginBottom: 14 }}>📂 Category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="clay-form-group">
              <label className="clay-label">Category group</label>
              <select className="clay-select" value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">Select category…</option>
                {parentsForDir.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="clay-form-group">
              <label className="clay-label">Subcategory</label>
              <select className="clay-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={!parentId}
                style={{ opacity: parentId ? 1 : 0.5 }}>
                <option value="">{parentId ? "Choose subcategory…" : "Choose category first"}</option>
                {filteredChildren.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Accounts */}
        <div className="clay-card anim-slide-up">
          <div className="clay-label" style={{ marginBottom: 14 }}>🏦 Accounts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(txn.direction === "expense" || txn.direction === "transfer" || txn.direction === "loan") && (
              <div className="clay-form-group">
                <label className="clay-label">📤 From account</label>
                <select className="clay-select" value={fromId} onChange={e => setFromId(e.target.value)}>
                  <option value="">Choose account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            {(txn.direction === "income" || txn.direction === "transfer" || txn.direction === "loan") && (
              <div className="clay-form-group">
                <label className="clay-label">📥 To account</label>
                <select className="clay-select" value={toId} onChange={e => setToId(e.target.value)}>
                  <option value="">Choose account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Amount & details */}
        <div className="clay-card anim-slide-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="clay-label" style={{ marginBottom: 0 }}>💵 Details</div>
          
          <div className="clay-form-group">
            <label className="clay-label">Amount</label>
            <input className="clay-input" type="number" inputMode="decimal"
              placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
              style={{ fontSize: 22, fontWeight: 900, textAlign: "center", letterSpacing: "-0.5px" }} />
          </div>
          <div className="clay-form-group">
            <label className="clay-label">📅 Date</label>
            <input className="clay-input" type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
          </div>
          <div className="clay-form-group">
            <label className="clay-label">📝 Note (optional)</label>
            <input className="clay-input" placeholder="Add a note…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          <button
            className={`clay-btn clay-btn-lg ${isReady ? cfg.btnCls : "clay-btn-white"}`}
            onClick={save}
            disabled={saving || !isReady}
            style={{
              width: "100%",
              background: isReady ? cfg.headerBg : undefined,
              color: isReady ? "white" : undefined,
              opacity: isReady ? 1 : 0.55,
              textShadow: isReady ? "0 2px 10px rgba(0,0,0,0.18)" : undefined,
              boxShadow: isReady
                ? `0 8px 20px -6px ${cfg.accent}88, inset 1px 1px 2px rgba(255,255,255,0.25)`
                : "var(--clay-card-sm)",
              transition: "all 0.35s cubic-bezier(.34,1.56,.64,1)",
              transform: isReady ? "scale(1.01)" : "scale(1)",
            }}
          >
            {saving ? "Saving…" : `${cfg.icon} Save Changes`}
          </button>
          <button className="clay-btn clay-btn-lg clay-btn-white" style={{ width: "100%" }} onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </div>
  )
}