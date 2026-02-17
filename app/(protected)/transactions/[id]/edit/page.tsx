import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import TransactionEditForm from "@/components/transactions/TransactionEditForm"

export default async function EditTxnPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")

  const { data: txn, error } = await supabase
    .from("transactions")
    .select("id,direction,amount,description,occurred_at,category_id,account_from_id,account_to_id,deleted_at")
    .eq("id", id)
    .maybeSingle()

  // If RLS blocks it (wrong user) or it’s deleted, it will look “not found”
  if (error || !txn || txn.deleted_at) {
    return <div className="p-6">Transaction not found.</div>
  }

  const [{ data: accounts }, { data: cats }] = await Promise.all([
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
      <TransactionEditForm
        txn={txn as any}
        accounts={(accounts || []) as any[]}
        categories={(cats || []) as any[]}
      />
    </div>
  )
}
