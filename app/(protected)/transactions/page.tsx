import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

type Row = {
  id: string
  direction: "income" | "expense" | "transfer" | "loan"
  amount: string
  description: string | null
  occurred_at: string
  shared_group_id: string | null
  from: { name: string } | null
  to: { name: string } | null
  category: { name: string } | null
}

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      direction,
      amount,
      description,
      occurred_at,
      shared_group_id,
      from:accounts!transactions_account_from_fkey(name),
      to:accounts!transactions_account_to_fkey(name),
      category:categories(name)
    `)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) return <div className="p-6">Error loading transactions</div>

  const rows = (data || []) as unknown as Row[]

  const title = (t: Row) => {
    const cat = t.category?.name ?? "Unknown"
    if (t.direction === "income") return `${cat} → ${t.to?.name ?? "?"}`
    if (t.direction === "expense") return `${t.from?.name ?? "?"} → ${cat}`
    if (t.direction === "transfer") return `Transfer: ${t.from?.name ?? "?"} → ${t.to?.name ?? "?"}`
    return `Loan: ${t.from?.name ?? "?"} → ${t.to?.name ?? "?"}`
  }

  const amountText = (t: Row) => {
    const n = Number(t.amount).toFixed(2)
    if (t.direction === "income") return `+${n} CAD`
    if (t.direction === "expense") return `-${n} CAD`
    return `${n} CAD`
  }

  const amountClass = (t: Row) => {
    if (t.direction === "income") return "text-green-600"
    if (t.direction === "expense") return "text-red-600"
    return "text-gray-700"
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Link className="rounded bg-black text-white px-4 py-2" href="/transactions/new">
          Add
        </Link>
      </div>

      <div className="space-y-3">
        {rows.map((t) => (
          <div key={t.id} className="rounded-lg border bg-white p-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-semibold truncate">{title(t)}</div>
              {t.description && <div className="text-sm text-gray-500 truncate">{t.description}</div>}
              <div className="text-xs text-gray-400">
                {t.occurred_at}
                {t.shared_group_id && <span className="ml-2 text-blue-600">Shared</span>}
              </div>
            </div>

            <div className="text-right flex-shrink-0 ml-4">
              <div className={`font-bold ${amountClass(t)}`}>{amountText(t)}</div>
              <div className="text-xs text-gray-400">{t.direction}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
