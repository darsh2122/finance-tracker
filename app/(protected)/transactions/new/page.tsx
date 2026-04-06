"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createExpense, createIncome, createLoan, createTransfer } from "@/lib/services/transaction.service"
import { ParentCategory } from "@/lib/types/category"

const supabase = createClient()
type Account = { id: string; name: string; type: string; currency: string; is_default?: boolean }
type CatRow  = { id: string; name: string; parent_id: string | null; group_type: "income"|"expense"|"transfer"|"loan"|null; expense_subtype: "fixed"|"variable"|"shared"|null; created_by: string|null; is_global: boolean }
type ParentCat = ParentCategory

// Visual config per transaction type
const TYPE_CONFIG = {
  income:   { icon:"💰", label:"Income",   headerBg:"linear-gradient(145deg,#34d399,#059669)", btnCls:"clay-btn-green" },
  expense:  { icon:"📤", label:"Expense",  headerBg:"linear-gradient(145deg,#f87171,#dc2626)", btnCls:"clay-btn-red"   },
  shared:   { icon:"👥", label:"Shared",   headerBg:"linear-gradient(135deg,#fbbf24,#d97706)", btnCls:"clay-btn-purple" },
  transfer: { icon:"🔄", label:"Transfer", headerBg:"linear-gradient(135deg,#7c3aed,#a855f7)", btnCls:"clay-btn-purple" },
  loan:     { icon:"🤝", label:"Loan",     headerBg:"linear-gradient(145deg,#60a5fa,#2563eb)", btnCls:"clay-btn-purple" },
} as const

type TxnType = keyof typeof TYPE_CONFIG

// Color per parent group
const GROUP_COLORS = ["bubble-green","bubble-red","bubble-purple","bubble-amber","bubble-blue","bubble-indigo","bubble-pink","bubble-teal"]

export default function NewTransactionPage() {
  const router = useRouter()
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [parents, setParents]         = useState<ParentCat[]>([])
  const [children, setChildren]       = useState<CatRow[]>([])
  const [parentId, setParentId]       = useState("")
  const [categoryId, setCategoryId]   = useState("")
  const [fromId, setFromId]           = useState("")
  const [toId, setToId]               = useState("")
  const [amount, setAmount]           = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => {
    return new Date().toLocaleString("en-CA",{timeZone:"America/New_York"}).slice(0,10)
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [{ data: acc }, { data: cats }] = await Promise.all([
        supabase.from("accounts").select("id,name,type,currency,is_default").eq("is_archived",false).order("name"),
        supabase.from("categories").select("id,name,parent_id,group_type,expense_subtype,created_by,is_global"),
      ])
      setAccounts((acc||[]) as Account[])
      const rows = (cats||[]) as CatRow[]
      setParents(rows.filter(c=>c.parent_id===null&&c.group_type).map(p=>({id:p.id,name:p.name,group_type:p.group_type!,expense_subtype:p.expense_subtype})))
      setChildren(rows.filter(c=>c.parent_id!==null))
    })()
  }, [])

  const selectedParent = useMemo(()=>parents.find(p=>p.id===parentId)??null,[parents,parentId])
  const txnType = useMemo<TxnType|null>(()=>{
    if(!selectedParent) return null
    if(selectedParent.group_type==="income")   return "income"
    if(selectedParent.group_type==="transfer") return "transfer"
    if(selectedParent.group_type==="loan")     return "loan"
    if(selectedParent.expense_subtype==="shared") return "shared"
    return "expense"
  },[selectedParent])

  const filteredChildren = useMemo(()=>[...children.filter(c=>c.parent_id===parentId)].sort((a,b)=>a.name.localeCompare(b.name)),[parentId,children])

  // Group parents
  const groups = useMemo(()=>{
    const g: Record<string, { emoji:string; label:string; parents:ParentCat[] }> = {
      income:   { emoji:"💰", label:"Income",           parents:[] },
      expense:  { emoji:"📤", label:"Expense",          parents:[] },
      transfer: { emoji:"🔄", label:"Transfer & Loans", parents:[] },
      loan:     { emoji:"",   label:"",                 parents:[] },
    }
    parents.slice().sort((a,b)=>{
      const aLast=a.group_type==="transfer"||a.group_type==="loan"
      const bLast=b.group_type==="transfer"||b.group_type==="loan"
      if(aLast!==bLast) return aLast?1:-1
      return a.name.localeCompare(b.name)
    }).forEach(p=>{ if(p.group_type&&g[p.group_type]) g[p.group_type].parents.push(p) })
    return g
  },[parents])

  useEffect(()=>{ setCategoryId("") },[parentId])

  useEffect(()=>{
    if(!accounts.length||!txnType) return
    const def=accounts.find(a=>a.is_default)
    if(!def) return
    if(txnType==="income")  { setToId(def.id); return }
    setFromId(def.id)
  },[accounts,txnType])

  function getCurrency() {
    if(txnType==="income") return accounts.find(a=>a.id===toId)?.currency??"CAD"
    return accounts.find(a=>a.id===fromId)?.currency??"CAD"
  }

  async function handleSave() {
    if(!txnType)   return alert("Please select a category")
    if(!categoryId) return alert("Please select a subcategory")
    const amt = Number(amount)
    if(!amount||amt<=0) return alert("Please enter a valid amount")
    setLoading(true)
    try {
      const cur = getCurrency()
      if(txnType==="income")  { if(!toId) return alert("Select a destination account"); await createIncome({to_account_id:toId,category_id:categoryId,amount:amt,description,occurred_at:date,currency:cur}) }
      else if(txnType==="expense"||txnType==="shared") { if(!fromId) return alert("Select an account"); await createExpense({from_account_id:fromId,category_id:categoryId,amount:amt,description:txnType==="shared"?`${description}${description?" | ":""}Shared`:description,occurred_at:date,currency:cur}) }
      else if(txnType==="transfer") { if(!fromId||!toId) return alert("Select From and To accounts"); if(fromId===toId) return alert("From and To must differ"); await createTransfer({from_account:fromId,to_account:toId,category_id:categoryId,amount:amt,description,occurred_at:date,currency:cur}) }
      else if(txnType==="loan")     { if(!fromId||!toId) return alert("Select From and To accounts"); if(fromId===toId) return alert("From and To must differ"); await createLoan({from_account:fromId,to_account:toId,category_id:categoryId,amount:amt,description,occurred_at:date,currency:cur}) }
      router.push("/transactions"); router.refresh()
    } catch(e:any) { alert(e?.message??"Error") }
    finally { setLoading(false) }
  }

  const cfg = txnType ? TYPE_CONFIG[txnType] : null
  const isReady = !!(categoryId && amount && Number(amount) > 0)
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false)
  function toggleCategory() {
    setIsCategoryCollapsed(prev => !prev)
  }
  const selectedParentName = useMemo(() => {
    return parents.find(p => p.id === parentId)?.name ?? ""
  }, [parents, parentId])

  useEffect(() => {
    setCategoryId("")
  }, [parentId])

  return (
    <div style={{ paddingBottom:"calc(var(--nav-h) + 20px)", maxWidth:560, margin:"0 auto" }} className="new-txn-pad">
      <style>{`
        @media(min-width:768px){.new-txn-pad{padding-bottom:28px!important;}}
        
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-down { animation: fadeSlideDown 0.25s ease forwards; }
        .anim-fade-up   { animation: fadeSlideUp   0.25s ease forwards; }
        .anim-fade-down:active { transform: scale(0.97); }
        .anim-slide-up  { animation: slideUp 0.3s ease forwards; }
        .header-grad { transition: opacity 0.4s ease; }
      `}</style>

      {/* Colored header */}
        <div
          style={{
            position: "sticky",
            top: 55,
            zIndex: 100,
            background: cfg?.headerBg ?? "linear-gradient(135deg,#7c3aed,#a855f7)",
            padding: "22px 20px 28px",
            overflow: "hidden",
            transition: "background 0.4s ease",
          }}
        >
        <div style={{ position:"absolute", top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.10)" }} />
        <div style={{ position:"absolute", bottom:-30, left:-20, width:110, height:110, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:"white" }}>
              {cfg ? `${cfg.icon} ${cfg.label}` : "➕ New Transaction"}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.72)", fontWeight:600, marginTop:2 }}>
              {cfg ? "Fill in the details below" : "Choose a category to get started"}
            </div>
          </div>
        </div>

        {/* Live amount display */}
        {amount && Number(amount) > 0 && (
          <div style={{ textAlign:"center", marginTop:20, position:"relative" }}>
            <div style={{ fontSize:44, fontWeight:900, color:"white", letterSpacing:"-2px", textShadow:"0 2px 10px rgba(0,0,0,0.18)" }}>
              ${Number(amount).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.72)", fontWeight:700, marginTop:2 }}>{getCurrency()}</div>
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:16 }}>

        {/* Category chips by group */}
        <div className="clay-card">
          <div
            className="clay-label"
            style={{
              marginBottom: isCategoryCollapsed ? 0 : 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: parentId ? "pointer" : "default",
              transition: "margin 0.3s ease",   // ← smooth margin change too
            }}
            onClick={() => parentId && toggleCategory()}
          >
            <span>Category</span>
            {parentId && (
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)" }}>
                {isCategoryCollapsed ? "✏️ Change" : "▲ Collapse"}
              </span>
            )}
          </div>

          {/* Collapsed pill — always in DOM, animated with max-height + opacity */}
          <div style={{
            maxHeight: (isCategoryCollapsed && parentId) ? "60px" : "0px",
            opacity:   (isCategoryCollapsed && parentId) ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 0.35s ease, opacity 0.25s ease",
            pointerEvents: (isCategoryCollapsed && parentId) ? "auto" : "none",
          }}>
            <div
              onClick={toggleCategory}
              style={{
                marginTop: 10,
                padding: "12px 16px",
                borderRadius: 14,
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                color: "white",
                fontWeight: 800,
                textAlign: "center",
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(124,58,237,0.3)",
                transition: "transform 0.2s ease",
              }}
            >
              {selectedParentName}
            </div>
          </div>

          {/* Expanded chip list — always in DOM, animated with max-height + opacity */}
          <div style={{
            maxHeight: !isCategoryCollapsed ? "600px" : "0px",
            opacity:   !isCategoryCollapsed ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 0.4s ease, opacity 0.3s ease",
            pointerEvents: !isCategoryCollapsed ? "auto" : "none",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 4 }}>
              {Object.entries(groups)
                .filter(([key, g]) => g.parents.length > 0 && key !== "loan")
                .map(([key, g]) => (
                  <div key={key}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.6px"
                    }}>
                      {g.emoji} {g.label}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[...g.parents, ...(key === "transfer" ? (groups.loan?.parents ?? []) : [])]
                        .map((p) => {
                          const isSelected = parentId === p.id
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                setParentId(p.id)
                                setIsCategoryCollapsed(true)
                              }}
                              style={{
                                padding: "9px 16px",
                                borderRadius: 16,
                                border: "none",
                                fontSize: 13,
                                fontWeight: 800,
                                cursor: "pointer",
                                background: isSelected
                                  ? "linear-gradient(135deg,#7c3aed,#a855f7)"
                                  : "var(--surface-soft)",
                                color: isSelected ? "white" : "var(--text-muted)",
                                transform: isSelected ? "scale(1.05)" : "scale(1)",
                                transition: "all 0.25s ease",
                              }}
                            >
                              {p.name}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Subcategory */}
        {parentId && (
          <div className="clay-form-group anim-slide-up">
            <label className="clay-label">Subcategory</label>
            <select className="clay-select" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
              <option value="">Choose subcategory…</option>
              {filteredChildren.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* Accounts */}
        {txnType && (
          <div className="clay-card anim-slide-up">
            <div className="clay-label" style={{ marginBottom:14 }}>Accounts</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {(txnType==="expense"||txnType==="shared"||txnType==="transfer"||txnType==="loan") && (
                <div className="clay-form-group">
                  <label className="clay-label">📤 From account</label>
                  <select className="clay-select" value={fromId} onChange={e=>setFromId(e.target.value)}>
                    <option value="">Choose account…</option>
                    {accounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                  </select>
                </div>
              )}
              {(txnType==="income"||txnType==="transfer"||txnType==="loan") && (
                <div className="clay-form-group">
                  <label className="clay-label">📥 To account</label>
                  <select className="clay-select" value={toId} onChange={e=>setToId(e.target.value)}>
                    <option value="">Choose account…</option>
                    {accounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Amount & details */}
        <div className="clay-card anim-slide-up" style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="clay-form-group">
            <label className="clay-label">💵 Amount</label>
            <input
              className="clay-input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e=>setAmount(e.target.value)}
              style={{ fontSize:22, fontWeight:900, textAlign:"center", letterSpacing:"-0.5px" }}
            />
            {getCurrency() && <div style={{ fontSize:11, color:"var(--text-muted)", textAlign:"center", fontWeight:700, marginTop:2 }}>{getCurrency()}</div>}
          </div>
          <div className="clay-form-group">
            <label className="clay-label">📅 Date</label>
            <input className="clay-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="clay-form-group">
            <label className="clay-label">📝 Note (optional)</label>
            <input className="clay-input" placeholder="Add a note…" value={description} onChange={e=>setDescription(e.target.value)} />
          </div>
        </div>

        {/* Save */}
        <button
          className={`clay-btn clay-btn-lg ${isReady ? (cfg?.btnCls ?? "clay-btn-purple") : "clay-btn-white"}`}
          onClick={handleSave}
          disabled={loading || !isReady}
          style={{
            width:"100%",
            background: isReady && cfg ? cfg.headerBg : undefined,
            opacity: isReady ? 1 : 0.65,
            boxShadow: isReady ? undefined : "var(--clay-card-sm)",
            transition:"all 0.35s var(--spring)",
          }}
        >
          {loading ? "Saving…" : `${cfg?.icon ?? "💾"} Save ${cfg?.label ?? "Transaction"}`}
        </button>

      </div>
    </div>
  )
}
