"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"
import { formatCurrency } from "@/lib/utils/currency"

const supabase = createClient()

type TxnRow = {
  id: string
  amount: number
  direction: string
  occurred_at: string
  description: string | null
  account_from_id: string | null
  account_to_id: string | null
  account_from_name: string | null
  account_to_name: string | null
  category_name: string | null
}

type Account = {
  id: string
  name: string
  type: string
  currency: string
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

export default function LoanAccountSheet({ 
  account, 
  onClose 
}: { 
  account: Account | null, 
  onClose: () => void 
}) {
  const [txns, setTxns] = useState<TxnRow[]>([])
  const [loading, setLoading] = useState(false)
  const [runningMap, setRunningMap] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!account) {
      setTxns([])
      return
    }

    async function load() {
      if (!account) return
      const accId = account.id
      setLoading(true)
      const { data, error } = await supabase
        .from("v_transactions_list")
        .select(`
          id, amount, direction, occurred_at, description, account_from_id, account_to_id,
          account_from_name, account_to_name, category_name
        `)
        .eq("direction", "loan")
        .or(`account_from_id.eq.${accId},account_to_id.eq.${accId}`)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading loan transactions:", error)
      } else {
        const rows = (data || []) as any[]
        setTxns(rows)

        // Compute running balance
        let running = 0
        const chronological = [...rows].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
        const rMap: Record<string, number> = {}
        for (const t of chronological) {
          const amt = Number(t.amount)
          if (t.account_to_id === accId) running += amt
          if (t.account_from_id === accId) running -= amt
          rMap[t.id] = Number(running.toFixed(2))
        }
        setRunningMap(rMap)
      }
      setLoading(false)
    }

    load()
  }, [account])

  if (typeof window === "undefined") return null

  // Group by date
  const grouped = new Map<string, TxnRow[]>()
  txns.forEach(r => { 
    if (!grouped.has(r.occurred_at)) grouped.set(r.occurred_at, [])
    grouped.get(r.occurred_at)!.push(r)
  })

  const isReceivable = account?.type === "receivable"
  const currentBalance = txns.length > 0 ? (runningMap[txns[0].id] || 0) : 0

  return createPortal(
    <AnimatePresence>
      {account && (
        <>
          <motion.div key="overlay" 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 300 }} 
            onClick={onClose} 
          />
          <motion.div key="sheet" className="clay-card-lg"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={{ 
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 301, 
              borderRadius: "30px 30px 0 0", maxHeight: "90vh", overflowY: "auto", 
              margin: 0, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
              paddingTop: 20
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 100, background: "var(--text-faint)", opacity: 0.3, margin: "0 auto 22px" }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{account.name}</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>{isReceivable ? "Money Owed To You" : "Money You Owe"}</p>
              </div>
              <button onClick={onClose} className="clay-btn clay-btn-ghost clay-btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: "50%" }}>✕</button>
            </div>

            {/* Account Hero Card */}
            <div className="clay-card-sm" style={{ textAlign: "center", marginBottom: 24, background: "var(--surface-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Current Balance
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", color: isReceivable ? "var(--green)" : "var(--red)" }}>
                {currentBalance >= 0 ? "+" : "−"}{formatCurrency(Math.abs(currentBalance), account!.currency)}
              </div>
              <div className={`clay-pill ${isReceivable ? 'pill-green' : 'pill-red'}`} style={{ marginTop: 10 }}>
                {account!.type.replace("_", " ")}
              </div>
            </div>

            {/* Transactions List */}
            <div style={{ paddingBottom: 20 }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div className="text-faint">Loading history…</div>
                </div>
              ) : txns.length === 0 ? (
                <div className="clay-card-sm" style={{ textAlign: "center", padding: "40px 20px", background: "none", boxShadow: "none" }}>
                   <div style={{ fontSize: 40, marginBottom: 12 }}>🌑</div>
                   <p className="text-faint" style={{ fontSize: 13 }}>No transactions found for this account.</p>
                </div>
              ) : (
                Array.from(grouped.entries()).map(([date, dayRows]) => (
                  <div key={date} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, padding: "8px 4px 4px" }}>
                      {fmtDate(date)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {dayRows.map(t => {
                        const isIncoming = t.account_to_id === account.id
                        const otherSide = isIncoming ? t.account_from_name : t.account_to_name
                        const runBal = runningMap[t.id]
                        
                        return (
                          <div key={t.id} className="clay-txn-row" style={{ padding: "10px 12px" }}>
                            <div className={`clay-bubble clay-bubble-sm ${isIncoming ? 'bubble-green' : 'bubble-amber'}`}>
                              {isIncoming ? "📥" : "📤"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {t.category_name ?? "Loan"}
                              </div>
                              <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>
                                {isIncoming ? "From" : "To"}: {otherSide ?? "—"}
                              </div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 900, color: isIncoming ? "var(--green)" : "var(--amber)" }}>
                                {isIncoming ? "+" : "−"}{formatCurrency(Number(t.amount), account!.currency)}
                              </div>
                              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, marginTop: 1 }}>
                                {formatCurrency(runBal, account!.currency)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button className="clay-btn clay-btn-white" style={{ width: "100%", marginTop: 10 }} onClick={onClose}>
              Close
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
