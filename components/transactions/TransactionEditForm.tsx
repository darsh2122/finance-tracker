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
  income:   { icon: "💰", label: "Income",   headerBg: "linear-gradient(145deg,#34d399,#059669)", accent: "#34d399" },
  expense:  { icon: "📤", label: "Expense",  headerBg: "linear-gradient(145deg,#f87171,#dc2626)", accent: "#f87171" },
  transfer: { icon: "🔄", label: "Transfer", headerBg: "linear-gradient(135deg,#818cf8,#4f46e5)", accent: "#818cf8" },
  loan:     { icon: "🤝", label: "Loan",     headerBg: "linear-gradient(135deg,#fbbf24,#d97706)", accent: "#fbbf24" },
}

const styles = `
  .edit-page { min-height: 100vh; background: #12091e; color: white; padding-bottom: 40px; }

  /* Colored header banner */
  .edit-header {
    padding: 20px 16px 32px; position: relative; overflow: hidden;
  }
  .edit-header::before { content:''; position:absolute; top:-50%; right:-15%; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.08); }
  .edit-header::after  { content:''; position:absolute; bottom:-40%; left:-10%; width:140px; height:140px; border-radius:50%; background:rgba(255,255,255,0.06); }
  .edit-back-btn {
    width: 40px; height: 40px; border-radius: 13px;
    background: rgba(255,255,255,0.2); border: none;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; cursor: pointer; color: white;
    box-shadow: inset 0 -2px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18);
    margin-bottom: 16px; transition: transform 0.15s;
  }
  .edit-back-btn:active { transform: scale(0.92); }
  .edit-header-title { font-size: 22px; font-weight: 900; color: white; }
  .edit-header-sub   { font-size: 13px; color: rgba(255,255,255,0.68); font-weight: 500; margin-top: 4px; }
  
  /* Amount preview */
  .edit-amt-preview { text-align: center; margin-top: 16px; position: relative; }
  .edit-amt-value { font-size: 42px; font-weight: 900; color: white; letter-spacing: -2px; text-shadow: 0 2px 10px rgba(0,0,0,0.2); }
  .edit-amt-currency { font-size: 13px; color: rgba(255,255,255,0.65); font-weight: 700; margin-top: 2px; }

  /* Form body */
  .edit-body { padding: 0 16px 20px; }
  .edit-section {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px; padding: 18px;
    margin-bottom: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2), inset 0 -3px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .edit-section-title { font-size: 12px; font-weight: 800; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 14px; }
  
  /* Field */
  .edit-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
  .edit-field:last-child { margin-bottom: 0; }
  .edit-label { font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.6px; }
  .edit-input, .edit-select {
    width: 100%; padding: 13px 16px; border-radius: 16px;
    background: rgba(255,255,255,0.07); border: 1.5px solid rgba(139,92,246,0.22);
    color: rgba(255,255,255,0.9); font-family: 'Nunito', sans-serif;
    font-size: 14px; font-weight: 700; outline: none;
    box-shadow: inset 0 2px 8px rgba(0,0,0,0.18); transition: border-color 0.18s;
    -webkit-appearance: none; appearance: none;
  }
  .edit-input::placeholder { color: rgba(255,255,255,0.28); font-weight: 500; }
  .edit-input:focus, .edit-select:focus { border-color: rgba(139,92,246,0.55); }
  .edit-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23a78bfa'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center; background-size: 18px;
    padding-right: 42px; cursor: pointer;
  }
  .edit-select option { background: #1e1535; color: white; }
  .edit-input-large { font-size: 22px; font-weight: 900; text-align: center; letter-spacing: -0.5px; }
  .edit-currency-hint { font-size: 11px; color: rgba(255,255,255,0.35); text-align: center; font-weight: 600; margin-top: 4px; }

  /* Save button */
  .edit-save-btn {
    width: 100%; padding: 17px; border-radius: 22px;
    font-family: 'Nunito', sans-serif; font-size: 16px; font-weight: 900;
    cursor: pointer; border: none; display: flex; align-items: center;
    justify-content: center; gap: 10px; margin-bottom: 12px;
    transition: transform 0.15s, filter 0.15s;
  }
  .edit-save-btn:active { transform: scale(0.97); }
  .edit-save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  
  .edit-cancel-btn {
    width: 100%; padding: 15px; border-radius: 18px;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.65); font-family: 'Nunito', sans-serif;
    font-size: 14px; font-weight: 800; cursor: pointer;
    transition: background 0.18s;
  }
  
  /* Info badge */
  .edit-dir-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 100px;
    font-size: 12px; font-weight: 800;
    background: rgba(255,255,255,0.18);
    color: white; margin-bottom: 6px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
  }
`

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
    <>
      <style>{styles}</style>
      <div className="edit-page">

        {/* Colored header */}
        <div className="edit-header" style={{ background: cfg.headerBg }}>
          <button className="edit-back-btn" onClick={() => router.back()}>←</button>
          <div className="edit-dir-badge">
            {cfg.icon} {cfg.label}
          </div>
          <div className="edit-header-title">Edit Transaction</div>
          <div className="edit-header-sub">Update the details below</div>

          {/* Amount preview */}
          {amount && Number(amount) > 0 && (
            <div className="edit-amt-preview">
              <div className="edit-amt-value">
                ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        <div className="edit-body">

          {/* Category */}
          <div className="edit-section">
            <div className="edit-section-title">📂 Category</div>
            <div className="edit-field">
              <label className="edit-label">Category group</label>
              <select className="edit-select" value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">Select category…</option>
                {parentsForDir.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="edit-field">
              <label className="edit-label">Subcategory</label>
              <select className="edit-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={!parentId}
                style={{ opacity: parentId ? 1 : 0.5 }}>
                <option value="">{parentId ? "Choose subcategory…" : "Choose category first"}</option>
                {filteredChildren.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Accounts */}
          <div className="edit-section">
            <div className="edit-section-title">🏦 Accounts</div>
            {(txn.direction === "expense" || txn.direction === "transfer" || txn.direction === "loan") && (
              <div className="edit-field">
                <label className="edit-label">📤 From account</label>
                <select className="edit-select" value={fromId} onChange={e => setFromId(e.target.value)}>
                  <option value="">Choose account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            {(txn.direction === "income" || txn.direction === "transfer" || txn.direction === "loan") && (
              <div className="edit-field">
                <label className="edit-label">📥 To account</label>
                <select className="edit-select" value={toId} onChange={e => setToId(e.target.value)}>
                  <option value="">Choose account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Amount & details */}
          <div className="edit-section">
            <div className="edit-section-title">💵 Details</div>
            <div className="edit-field">
              <label className="edit-label">Amount</label>
              <input className="edit-input edit-input-large" type="number" inputMode="decimal"
                placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="edit-field">
              <label className="edit-label">📅 Date</label>
              <input className="edit-input" type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
            </div>
            <div className="edit-field">
              <label className="edit-label">📝 Note (optional)</label>
              <input className="edit-input" placeholder="Add a note…" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Actions */}
          <button
            className="edit-save-btn"
            onClick={save}
            disabled={saving || !isReady}
            style={{
              background: isReady ? cfg.headerBg : "rgba(255,255,255,0.08)",
              color: isReady ? "white" : "rgba(255,255,255,0.4)",
              boxShadow: isReady ? `0 8px 24px ${cfg.accent}44, inset 0 -4px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.22)` : "none",
            }}
          >
            {saving ? "Saving…" : `${cfg.icon} Save Changes`}
          </button>
          <button className="edit-cancel-btn" onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </>
  )
}