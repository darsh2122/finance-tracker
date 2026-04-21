import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils/currency"

type TxnRow = {
  id: string
  amount: string
  occurred_at: string
  description: string | null
  account_from_id: string | null
  account_to_id: string | null
  account_from_name: string | null
  account_to_name: string | null
  category_name: string | null
  account_from_currency: string
  account_to_currency: string
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

export default async function LoanAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: loanAccountId } = await params
  const supabase = await createClient()

  const { data: account } = await supabase
    .from("accounts")
    .select("id,name,type,currency")
    .eq("id", loanAccountId)
    .single()

  const { data: txns } = await supabase
    .from("v_transactions_list")
    .select(`
      id, amount, occurred_at, description, account_from_id, account_to_id,
      account_from_name, account_to_name, category_name, account_from_currency, account_to_currency
    `)
    .eq("direction", "loan")
    .or(`account_from_id.eq.${loanAccountId},account_to_id.eq.${loanAccountId}`)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })

  const rows = (txns as any[] | null) || []

  // Compute running balance
  let running = 0
  const chronological = [...rows].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
  const runningMap: Record<string, number> = {}
  for (const t of chronological) {
    const amt = Number(t.amount)
    if (t.account_to_id === loanAccountId) running += amt
    if (t.account_from_id === loanAccountId) running -= amt
    runningMap[t.id] = Number(running.toFixed(2))
  }

  const currentBalance = running
  const isReceivable = account?.type === "receivable"
  const currency = account?.currency ?? "CAD"

  // Group by date
  const grouped = new Map<string, TxnRow[]>()
  rows.forEach(r => { 
    if (!grouped.has(r.occurred_at)) grouped.set(r.occurred_at, [])
    grouped.get(r.occurred_at)!.push(r)
  })

  return (
    <div className="clay-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/loans" className="clay-btn clay-btn-white clay-btn-icon" style={{ textDecoration: "none" }}>
          ‹
        </Link>
        <div>
          <h1 className="page-title">{account?.name ?? "Loan Account"}</h1>
          <p className="page-sub">{isReceivable ? "Money you are owed" : "Money you owe"}</p>
        </div>
      </div>

      {/* Account Hero Card */}
      <div className="clay-card-lg anim-slide-up" style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Current Balance
        </div>
        <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-1.5px", color: isReceivable ? "var(--green)" : "var(--red)" }}>
          {currentBalance >= 0 ? "+" : "−"}{formatCurrency(Math.abs(currentBalance), currency)}
        </div>
        <div className={`clay-pill ${isReceivable ? 'pill-green' : 'pill-red'}`} style={{ marginTop: 12, padding: "6px 14px" }}>
          {account?.type.replace("_", " ")}
        </div>
      </div>

      {/* Transactions List */}
      <div className="anim-slide-up" style={{ animationDelay: "0.1s" }}>
        {rows.length === 0 ? (
          <div className="clay-card" style={{ textAlign: "center", padding: "40px 20px" }}>
             <div style={{ fontSize: 40, marginBottom: 12 }}>🌑</div>
             <p className="text-faint">No transactions found for this loan account.</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([date, dayRows]) => (
            <div key={date} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, padding: "10px 4px 6px" }}>
                {fmtDate(date)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dayRows.map(t => {
                  const isIncoming = t.account_to_id === loanAccountId
                  const otherSide = isIncoming ? t.account_from_name : t.account_to_name
                  const runBal = runningMap[t.id]
                  
                  return (
                    <div key={t.id} className="clay-txn-row" style={{ cursor: "default" }}>
                      <div className={`clay-bubble clay-bubble-md ${isIncoming ? 'bubble-green' : 'bubble-amber'}`}>
                        {isIncoming ? "📥" : "📤"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.category_name ?? "Loan"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 3 }}>
                          {isIncoming ? "From" : "To"}: {otherSide ?? "—"}
                          {t.description ? ` · ${t.description}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: isIncoming ? "var(--green)" : "var(--amber)" }}>
                          {isIncoming ? "+" : "−"}{formatCurrency(Number(t.amount), currency)}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 2 }}>
                          Bal: {formatCurrency(runBal, currency)}
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
    </div>
  )
}
