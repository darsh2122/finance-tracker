import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import GroupDetailPage from "@/components/shared/GroupDetailPage"

type GroupRow = { id: string; name: string }

type RawExpenseRow = {
  id: string
  amount: number | string
  occurred_at: string
  note: string | null
  paid_by_user_id: string
  categories: { name: string | null } | { name: string | null }[] | null
}

type ExpenseRow = {
  id: string
  amount: number | string
  occurred_at: string
  note: string | null
  category_name: string | null
  paid_by_user_id: string
  payer_name: string | null
}

type ExpenseSplitRow = { expense_id: string; share_amount: number | string }
type EdgeRow = { debtor: string; creditor: string; amount: number | string }
type GroupMemberRow = { user_id: string }

export default async function GroupPage(props: { params: Promise<{ id: string }> | { id: string } }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")

  // ✅ Works whether params is a Promise or not (future-proof)
  const { id: groupId } = await Promise.resolve(props.params)

  const me = auth.user.id

  const { data: group, error: groupErr } = await supabase
    .from("sw_groups")
    .select("id,name")
    .eq("id", groupId)
    .single()

  // If RLS blocks, group will be null and error will exist
  if (groupErr || !group) notFound()

  const { data: expenses, error: expensesErr } = await supabase
    .from("sw_expenses")
    .select("id,amount,occurred_at,note,paid_by_user_id,categories(name)")
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })

  if (expensesErr) {
    console.error("Failed to load shared expenses", {
      groupId,
      code: expensesErr.code,
      message: expensesErr.message,
      details: expensesErr.details,
    })
  }

  const rawExpenseRows = (expenses || []) as RawExpenseRow[]
  console.log("expense rows", rawExpenseRows)

  const expenseIds = rawExpenseRows.map((e) => e.id)

  const { data: mySplits } =
    expenseIds.length === 0
      ? { data: [] as ExpenseSplitRow[] }
      : await supabase
          .from("sw_expense_splits")
          .select("expense_id,share_amount")
          .in("expense_id", expenseIds)
          .eq("user_id", me)

  const { data: edges, error: edgesErr } = await supabase
    .from("v_sw_group_net_edges")
    .select("debtor,creditor,amount")
    .eq("group_id", groupId)

  if (edgesErr) {
    console.error("Failed to load group net edges", {
      groupId,
      code: edgesErr.code,
      message: edgesErr.message,
      details: edgesErr.details,
    })
  }

  const { data: members, error: membersErr } = await supabase
    .from("sw_group_members")
    .select("user_id")
    .eq("group_id", groupId)

  if (membersErr) {
    console.error("Failed to load group members", {
      groupId,
      code: membersErr.code,
      message: membersErr.message,
      details: membersErr.details,
    })
  }

  const memberRows = (members || []) as GroupMemberRow[]
  const memberIds = memberRows.map((m) => m.user_id)
  const edgeIds = ((edges || []) as EdgeRow[]).flatMap((e) => [e.debtor, e.creditor])
  const payerIds = rawExpenseRows.map((e) => e.paid_by_user_id)
  const profileIds = Array.from(new Set([...memberIds, ...edgeIds, ...payerIds]))

  const { data: profiles, error: profilesErr } =
    profileIds.length === 0
      ? { data: [] as { id: string; full_name: string | null }[], error: null }
      : await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", profileIds)

  if (profilesErr) {
    console.error("Failed to load profiles for group detail", {
      groupId,
      code: profilesErr.code,
      message: profilesErr.message,
      details: profilesErr.details,
    })
  }

  const fullNameByUserId = new Map((profiles || []).map((p) => [p.id, p.full_name]))
  const expenseRows: ExpenseRow[] = rawExpenseRows.map((e) => ({
    id: e.id,
    amount: e.amount,
    occurred_at: e.occurred_at,
    note: e.note,
    category_name: Array.isArray(e.categories) ? (e.categories[0]?.name ?? null) : (e.categories?.name ?? null),
    paid_by_user_id: e.paid_by_user_id,
    payer_name: fullNameByUserId.get(e.paid_by_user_id) ?? null,
  }))
  const nameMap = Object.fromEntries(profileIds.map((id) => [id, fullNameByUserId.get(id) ?? id.slice(0, 8)]))

  return (
    <GroupDetailPage
      groupId={groupId}
      group={group as GroupRow}
      expenses={expenseRows}
      mySplits={(mySplits || []) as ExpenseSplitRow[]}
      meId={me}
      edges={(edges || []) as EdgeRow[]}
      nameMap={nameMap}
    />
  )
}
