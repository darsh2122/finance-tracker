import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency } from "@/lib/utils/currency"
import LoansList from "@/components/loans/LoansList"

type AccountRow = {
  id: string
  name: string
  type: string
  nature: "asset" | "liability"
  currency: string
}

export default async function LoansPage() {
  const supabase = await createClient()

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id,name,type,nature,currency")
    .eq("is_archived", false)
    .in("type", ["receivable", "loan_payable"])
    .order("name")

  if (error) return <div className="clay-page p-6 text-red-500">Error loading loan accounts</div>

  // Exclude soft-deleted transactions from totals
  const { data: loanTxns } = await supabase
    .from("transactions")
    .select("account_from_id,account_to_id,amount")
    .eq("direction", "loan")
    .is("deleted_at", null)

  const totals: Record<string, number> = {}
  if (accounts) {
    accounts.forEach((a) => (totals[a.id] = 0))
  }

  if (loanTxns) {
    loanTxns.forEach((t) => {
      const amt = Number(t.amount)
      if (t.account_from_id && totals[t.account_from_id] !== undefined) totals[t.account_from_id] -= amt
      if (t.account_to_id && totals[t.account_to_id] !== undefined) totals[t.account_to_id] += amt
    })
  }

  const receivableAccounts = accounts?.filter((a) => a.type === "receivable") || []
  const payableAccounts = accounts?.filter((a) => a.type === "loan_payable") || []

  const receivableTotal = receivableAccounts.reduce((s, a) => s + (totals[a.id] ?? 0), 0)
  const payableTotal = payableAccounts.reduce((s, a) => s + (totals[a.id] ?? 0), 0)

  const netTotal = receivableTotal + payableTotal
  const noAccounts = !accounts || accounts.length === 0
  const baseCurrency = accounts?.[0]?.currency ?? "CAD"

  return (
    <div className="clay-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-sub">{accounts?.length || 0} loan accounts</p>
        </div>
        <Link href="/transactions/new" className="clay-btn clay-btn-purple clay-btn-sm" style={{ textDecoration: "none" }}>
          ➕ Add Loan
        </Link>
      </div>

      {/* Summary cards */}
      <div className="anim-slide-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24, animationDelay: "0.2s" }}>
        <div className="clay-stat clay-stat-green" style={{ minHeight: "auto", padding: "16px 12px" }}>
          <div className="stat-label">Receivable</div>
          <div className="stat-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>{formatCurrency(receivableTotal, baseCurrency)}</div>
        </div>
        <div className="clay-stat clay-stat-red" style={{ minHeight: "auto", padding: "16px 12px" }}>
          <div className="stat-label">Payable</div>
          <div className="stat-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>{formatCurrency(Math.abs(payableTotal), baseCurrency)}</div>
        </div>
        <div className="clay-stat clay-stat-purple" style={{ minHeight: "auto", padding: "16px 12px" }}>
          <div className="stat-label">Net</div>
          <div className="stat-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>{netTotal >= 0 ? "+" : "−"}{formatCurrency(Math.abs(netTotal), baseCurrency)}</div>
        </div>
      </div>

      <LoansList 
        accounts={(accounts || []) as AccountRow[]} 
        totals={totals} 
        noAccounts={noAccounts} 
      />
    </div>
  )
}