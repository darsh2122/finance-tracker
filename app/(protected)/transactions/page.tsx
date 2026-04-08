// app/(protected)/transactions/page.tsx
// Shows TransactionsSkeleton instantly, then streams real data via Suspense.

import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import TransactionsList from "@/components/transactions/TransactionsList"
import { TransactionsSkeleton } from "@/components/skeletons/clay-skeletons"

async function TransactionsContent() {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from("v_transactions_list")
    .select(`
      id, direction, amount, description, occurred_at,
      account_from_id, account_from_name, account_from_currency,
      account_to_id, account_to_name, account_to_currency,
      category_id, category_name, category_group_type, category_expense_subtype
    `)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) return (
    <div style={{ padding: 24, color: "#fca5a5", fontWeight: 700, background: "#12091e", minHeight: "100vh" }}>
      ⚠️ Failed to load transactions: {error.message}
    </div>
  )

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("id,name,is_archived").eq("is_archived", false).order("name"),
    supabase.from("v_category_leaf_info").select("category_id,leaf_name,group_type,expense_subtype").order("leaf_name"),
  ])

  return (
    <div className="p-2">
      <TransactionsList
        initialRows={(rows || []) as any[]}
        accounts={(accounts || []) as any[]}
        categories={(categories || []) as any[]}
      />
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsSkeleton />}>
      <TransactionsContent />
    </Suspense>
  )
}