import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import GroupMembersPage from "@/components/shared/GroupMembersPage"

type GroupRow = { id: string; name: string }
type MemberRow = {
  user_id: string
  role: "admin" | "member"
  full_name: string | null
}

export default async function MembersPage(props: { params: Promise<{ id: string }> | { id: string } }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")

  const { id: groupId } = await Promise.resolve(props.params)
  const meId = auth.user.id

  const { data: group, error: groupErr } = await supabase
    .from("sw_groups")
    .select("id,name")
    .eq("id", groupId)
    .single()

  if (groupErr || !group) notFound()

  const { data: members } = await supabase
    .from("sw_group_members")
    .select("user_id,role")
    .eq("group_id", groupId)
    .order("role", { ascending: false })

  const memberRows = (members || []) as { user_id: string; role: "admin" | "member" }[]
  const memberIds = memberRows.map((m) => m.user_id)

  const { data: profiles } =
    memberIds.length === 0
      ? { data: [] as { id: string; full_name: string | null }[] }
      : await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", memberIds)

  const fullNameByUserId = new Map((profiles || []).map((p) => [p.id, p.full_name]))

  const normalizedMembers: MemberRow[] = memberRows.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    full_name: fullNameByUserId.get(m.user_id) ?? null,
  }))

  const meRole = normalizedMembers.find((m) => m.user_id === meId)?.role ?? "member"

  return (
    <GroupMembersPage
      group={group as GroupRow}
      groupId={groupId}
      meId={meId}
      meRole={meRole}
      members={normalizedMembers}
    />
  )
}
