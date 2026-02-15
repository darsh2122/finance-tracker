import { createClient } from "@/lib/supabase/server"

type TxnRow = {
  id: string
  amount: string
  occurred_at: string
  description: string | null
  account_from_id: string | null
  account_to_id: string | null
  from: { name: string } | null
  to: { name: string } | null
  category: { name: string } | null
}

export default async function LoanAccountPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const loanAccountId = params.id

  const { data: account } = await supabase
    .from("accounts")
    .select("id,name,type")
    .eq("id", loanAccountId)
    .single()

  const { data: txns } = await supabase
    .from("transactions")
    .select(`
      id, amount, occurred_at, description, account_from_id, account_to_id,
      from:accounts!transactions_account_from_fkey(name),
      to:accounts!transactions_account_to_fkey(name),
      category:categories(name)
    `)
    .eq("direction", "loan")
    .or(`account_from_id.eq.${loanAccountId},account_to_id.eq.${loanAccountId}`)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })

  // Compute running balance for this loan account
  // For the loan account itself: to=+, from=-
  let running = 0
  const rows = (txns as any[] | null) || []

  // Oldest→newest for running
  const chronological = [...rows].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))

  const runningMap: Record<string, number> = {}
  for (const t of chronological) {
    const amt = Number(t.amount)
    if (t.account_to_id === loanAccountId) running += amt
    if (t.account_from_id === loanAccountId) running -= amt
    runningMap[t.id] = Number(running.toFixed(2))
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{account?.name ?? "Loan Account"}</h1>
        <div className="text-sm text-gray-500">{account?.type}</div>
      </div>

      <div className="space-y-3">
        {rows.map((t: TxnRow) => {
          const amt = Number(t.amount).toFixed(2)

          // For this loan account: incoming increases, outgoing decreases
          const sign =
            t.account_to_id === loanAccountId ? "+" : t.account_from_id === loanAccountId ? "-" : ""

          const otherSide =
            t.account_to_id === loanAccountId ? t.from?.name : t.to?.name

          return (
            <div key={t.id} className="rounded-lg border bg-white p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-semibold truncate">{t.category?.name ?? "Loan"}</div>
                <div className="text-sm text-gray-500 truncate">
                  With: {otherSide ?? "Unknown"} {t.description ? `• ${t.description}` : ""}
                </div>
                <div className="text-xs text-gray-400">{t.occurred_at}</div>
              </div>

              <div className="text-right ml-4">
                <div className="font-bold">{sign}{amt} CAD</div>
                <div className="text-xs text-gray-400">
                  Balance: {runningMap[t.id]?.toFixed(2)} CAD
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
