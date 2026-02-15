import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

type AccountRow = {
  id: string
  name: string
  type: string
  nature: "asset" | "liability"
}

export default async function LoansPage() {
  const supabase = await createClient()

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id,name,type,nature")
    .eq("is_archived", false)
    .in("type", ["receivable", "loan_payable"])
    .order("name")

  if (error) return <div className="p-6">Error loading loan accounts</div>

  // Pull loan transactions for quick totals (simple, not perfect performance—good start)
  const { data: loanTxns } = await supabase
    .from("transactions")
    .select("account_from_id,account_to_id,amount")
    .eq("direction", "loan")

  const totals: Record<string, number> = {}
  ;(accounts as any[] | null)?.forEach((a) => (totals[a.id] = 0))

  // Apply deltas for loan accounts only (asset receivable increases when money moves TO it)
  ;(loanTxns as any[] | null)?.forEach((t) => {
    const amt = Number(t.amount)
    if (t.account_from_id && totals[t.account_from_id] !== undefined) totals[t.account_from_id] -= amt
    if (t.account_to_id && totals[t.account_to_id] !== undefined) totals[t.account_to_id] += amt
  })

  const receivableTotal = (accounts as any[] | null)
    ?.filter((a) => a.type === "receivable")
    .reduce((s, a) => s + (totals[a.id] ?? 0), 0) ?? 0

  const payableTotal = (accounts as any[] | null)
    ?.filter((a) => a.type === "loan_payable")
    .reduce((s, a) => s + (totals[a.id] ?? 0), 0) ?? 0

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Link href="/transactions/new" className="rounded bg-black text-white px-4 py-2">
          Add Loan Transaction
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Receivable (people owe you)</div>
          <div className="text-2xl font-bold text-green-600">
            {receivableTotal.toFixed(2)} CAD
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Payable (you owe)</div>
          <div className="text-2xl font-bold text-red-600">
            {payableTotal.toFixed(2)} CAD
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold mb-3">Loan Accounts</h2>

        <div className="space-y-2">
          {(accounts as AccountRow[] | null)?.map((a) => {
            const bal = totals[a.id] ?? 0
            return (
              <Link
                key={a.id}
                href={`/loans/${a.id}`}
                className="block rounded border p-3 hover:bg-gray-50"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-gray-500">{a.type}</div>
                  </div>
                  <div className={`font-bold ${a.type === "receivable" ? "text-green-600" : "text-red-600"}`}>
                    {bal.toFixed(2)} CAD
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
