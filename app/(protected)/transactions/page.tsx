import { createClient } from "@/lib/supabase/server"
import TransactionsList from "@/components/transactions/TransactionsList"

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from("v_transactions_list")
    .select(`
      id, direction, amount, description, occurred_at,
      account_from_id, account_from_name,
      account_to_id, account_to_name,
      category_id, category_name, category_group_type, category_expense_subtype
    `)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) return <div className="p-6">Failed to load transactions</div>

  // also load accounts + categories for filter dropdowns
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,is_archived")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("v_category_leaf_info")
      .select("category_id,leaf_name,group_type,expense_subtype")
      .order("leaf_name"),
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
