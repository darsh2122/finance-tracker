import { createClient } from "@/lib/supabase/client"

export type SwGroup = { id: string; name: string }
export type SwMember = { user_id: string; role: string; profiles?: { full_name: string | null } | null }

const supabase = createClient()

export async function fetchMySharedGroups() {
  const { data, error } = await supabase
    .from("sw_groups")
    .select("id,name")
    .eq("is_archived", false)
    .order("name")

  if (error) throw error
  return (data || []) as SwGroup[]
}

export async function fetchGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from("sw_group_members")
    .select("user_id,role")
    .eq("group_id", groupId)

  if (error) throw error

  const memberRows = (data || []) as { user_id: string; role: string }[]
  const memberIds = memberRows.map((r) => r.user_id)

  const { data: profiles, error: profileErr } =
    memberIds.length === 0
      ? { data: [] as { id: string; full_name: string | null }[], error: null }
      : await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", memberIds)

  if (profileErr) throw profileErr

  const fullNameById = new Map((profiles || []).map((p) => [p.id, p.full_name]))

  return memberRows.map((r) => ({
    user_id: r.user_id,
    role: r.role,
    label: fullNameById.get(r.user_id)?.trim() || r.user_id.slice(0, 8),
  }))
}
