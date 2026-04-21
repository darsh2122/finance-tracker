"use client"

import { useState } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils/currency"
import LoanAccountSheet from "./LoanAccountSheet"

type AccountRow = {
  id: string
  name: string
  type: string
  nature: "asset" | "liability"
  currency: string
}

export default function LoansList({ 
  accounts, 
  totals, 
  noAccounts 
}: { 
  accounts: AccountRow[], 
  totals: Record<string, number>, 
  noAccounts: boolean 
}) {
  const [selectedAcc, setSelectedAcc] = useState<AccountRow | null>(null)

  return (
    <div className="anim-slide-up" style={{ animationDelay: "0.3s" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, padding: "0 4px 10px" }}>
        Your Loan Accounts
      </div>
      
      {noAccounts ? (
        <div className="clay-card" style={{ textAlign: "center", padding: "50px 20px" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🤝</div>
          <div className="card-title" style={{ marginBottom: 4 }}>No loan accounts yet</div>
          <div className="text-faint" style={{ fontSize: 13, marginBottom: 20 }}>Start tracking money you owe or are owed</div>
          <Link href="/accounts/new" className="clay-btn clay-btn-purple clay-btn-sm" style={{ textDecoration: "none" }}>
            Create Account
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {accounts.map((a) => {
            const bal = totals[a.id] ?? 0
            const isReceivable = a.type === "receivable"
            return (
              <div
                key={a.id}
                onClick={() => setSelectedAcc(a)}
                className="clay-txn-row"
                style={{ cursor: "pointer" }}
              >
                <div className={`clay-bubble clay-bubble-md ${isReceivable ? 'bubble-green' : 'bubble-red'}`}>
                  {isReceivable ? "🤝" : "📋"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-soft)" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>
                    {isReceivable ? "Receivable" : "Loan Payable"}
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: isReceivable ? "var(--green)" : "var(--red)" }}>
                  {isReceivable && bal >= 0 ? "+" : bal < 0 ? "−" : ""}{formatCurrency(Math.abs(bal), a.currency)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <LoanAccountSheet 
        account={selectedAcc} 
        onClose={() => setSelectedAcc(null)} 
      />
    </div>
  )
}
