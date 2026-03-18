import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SharedActivityPage from "@/components/shared/SharedActivityPage"

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

type GroupRow = {
  id: string
  name: string
}

type ProfileRow = {
  id: string
  full_name: string | null
}

export default async function SharedActivity() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")

  const { data: activities } = await supabase
    .from("v_sw_my_activities")
    .select("activity_id,group_id,occurred_at,activity_type,actor_user_id,amount,note,created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  const typedActivities = (activities || []) as ActivityRow[]
  const groupIds = Array.from(new Set(typedActivities.map((a) => a.group_id)))
  const { data: groupRows } =
    groupIds.length === 0 ? { data: [] } : await supabase.from("sw_groups").select("id,name").in("id", groupIds)

  const groupNameMap = Object.fromEntries(((groupRows || []) as GroupRow[]).map((g) => [g.id, g.name]))

  const actorIds = Array.from(new Set(typedActivities.map((a) => a.actor_user_id)))
  const { data: profs } =
    actorIds.length === 0 ? { data: [] } : await supabase.from("profiles").select("id,full_name").in("id", actorIds)

  const nameMap = Object.fromEntries(((profs || []) as ProfileRow[]).map((p) => [p.id, p.full_name ?? p.id.slice(0, 8)]))

  return <SharedActivityPage activities={typedActivities} groupNameMap={groupNameMap} nameMap={nameMap} />
}
