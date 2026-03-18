import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SettleUpPage from "@/components/shared/SettleUpPage"

type GroupRow = {
  id: string
  name: string
}

export default async function SharedSettleUpPage(props: {
  searchParams?:
    | Promise<{ groupId?: string; to?: string }>
    | { groupId?: string; to?: string }
}) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")

  const meId = auth.user.id
  const query = await Promise.resolve(props.searchParams ?? {})
  const requestedGroupId = query.groupId ?? ""
  const requestedToUserId = query.to ?? ""

  const { data: groups } = await supabase
    .from("sw_groups")
    .select("id,name")
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  const groupRows = (groups || []) as GroupRow[]
  const groupSet = new Set(groupRows.map((g) => g.id))
  let initialGroupId = groupSet.has(requestedGroupId) ? requestedGroupId : (groupRows[0]?.id ?? "")

  if (!requestedGroupId && requestedToUserId && groupRows.length > 0) {
    const { data: toMemberships } = await supabase
      .from("sw_group_members")
      .select("group_id")
      .eq("user_id", requestedToUserId)

    const candidateGroupIds = new Set((toMemberships || []).map((m) => m.group_id as string))
    const matched = groupRows.find((g) => candidateGroupIds.has(g.id))
    if (matched) initialGroupId = matched.id
  }

  const { data: meProfile } = await supabase
    .from("profiles")
    .select("id,full_name")
    .eq("id", meId)
    .single()

  const meName = meProfile?.full_name?.trim() || "You"

  return (
    <SettleUpPage
      groups={groupRows}
      meId={meId}
      meName={meName}
      initialGroupId={initialGroupId}
      initialToUserId={requestedToUserId}
    />
  )
}
