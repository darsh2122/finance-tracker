import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import GroupsPage from "@/components/shared/GroupsPage"

type GroupRow = {
  id: string
  name: string
  is_archived: boolean
  created_at: string
}

type SharedSummary = {
  net_you_owe: number | null
  net_you_are_owed: number | null
  gross_you_owe: number | null
  gross_you_are_owed: number | null
}

type CounterpartyBalance = {
  other_user_id: string
  you_owe: number | null
  owes_you: number | null
  net_in_your_favor: number | null
}

type ActivityRow = {
  activity_id: string
  group_id: string
  occurred_at: string
  activity_type: "expense" | "settlement"
  actor_user_id: string
  amount: number | string
  note: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type GroupNameRow = {
  id: string
  name: string
}

export default async function SharedHome() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")

  const { data: groups } = await supabase
    .from("sw_groups")
    .select("id,name,is_archived,created_at")
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  const { data: summary } = await supabase
    .from("v_sw_my_shared_summary_net")
    .select("net_you_owe,net_you_are_owed,gross_you_owe,gross_you_are_owed")
    .single()

  const { data: counterparties } = await supabase
    .from("v_sw_my_counterparty_balances")
    .select("other_user_id,you_owe,owes_you,net_in_your_favor")
    .order("net_in_your_favor", { ascending: false })
    .limit(10)

  const { data: activities } = await supabase
    .from("v_sw_my_activities")
    .select("activity_id,group_id,occurred_at,activity_type,actor_user_id,amount,note,created_at")
    .order("created_at", { ascending: false })
    .limit(8)

  const typedCounterparties = (counterparties || []) as CounterpartyBalance[]
  const typedActivities = (activities || []) as ActivityRow[]

  const ids = typedCounterparties.map((c) => c.other_user_id)
  const actorIds = Array.from(new Set(typedActivities.map((a) => a.actor_user_id)))
  const profileIds = Array.from(new Set([...ids, ...actorIds]))
  const { data: profs } =
    profileIds.length === 0
      ? { data: [] }
      : await supabase.from("profiles").select("id,full_name").in("id", profileIds)

  const nameMap = Object.fromEntries(
    ((profs || []) as ProfileRow[]).map((p) => [p.id, p.full_name ?? p.id.slice(0, 8)])
  ) as Record<string, string>

  const groupIds = Array.from(new Set(typedActivities.map((a) => a.group_id)))
  const { data: activityGroupRows } =
    groupIds.length === 0
      ? { data: [] }
      : await supabase.from("sw_groups").select("id,name").in("id", groupIds)

  const groupNameMap = Object.fromEntries(
    ((activityGroupRows || []) as GroupNameRow[]).map((g) => [g.id, g.name])
  ) as Record<string, string>

  const groupRows = (groups || []) as GroupRow[]
  return (
    <GroupsPage
      groups={groupRows.map((g) => ({ id: g.id, name: g.name }))}
      summary={(summary || null) as SharedSummary | null}
      counterparties={typedCounterparties}
      nameMap={nameMap}
      activities={typedActivities}
      groupNameMap={groupNameMap}
    />
  )
}

