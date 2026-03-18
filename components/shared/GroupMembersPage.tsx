"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

type Member = {
  user_id: string
  role: "admin" | "member"
  full_name: string | null
}

export default function GroupMembersPage({
  group,
  groupId,
  meId,
  meRole,
  members,
}: {
  group: { id: string; name: string }
  groupId: string
  meId: string
  meRole: "admin" | "member"
  members: Member[]
}) {
  const router = useRouter()
  const isAdmin = meRole === "admin"

  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)

  const list = useMemo(() => {
    return members.map((m) => ({
      ...m,
      name: m.full_name?.trim() || m.user_id.slice(0, 8),
      isMe: m.user_id === meId,
    }))
  }, [members, meId])

  async function addByEmail() {
    const e = email.trim().toLowerCase()
    if (!e) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc("sw_add_member_by_email", {
        p_group_id: groupId,
        p_email: e,
      })
      if (error) return alert(error.message)
      setEmail("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this group?`)) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc("sw_remove_member", {
        p_group_id: groupId,
        p_user_id: userId,
      })
      if (error) return alert(error.message)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function setRole(userId: string, role: "admin" | "member") {
    setBusy(true)
    try {
      const { error } = await supabase.rpc("sw_set_member_role", {
        p_group_id: groupId,
        p_user_id: userId,
        p_role: role,
      })
      if (error) return alert(error.message)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4 p-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Group</div>
          <div className="text-2xl font-bold">{group.name}</div>
          <div className="text-xs text-gray-500 mt-1">
            You are <b>{meRole}</b>
          </div>
        </div>

        <Link
          href={`/shared/groups/${groupId}`}
          className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          Back
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="font-semibold">Members</div>

        {!isAdmin ? (
          <div className="text-sm text-gray-500">
            Only admins can add/remove members.
          </div>
        ) : (
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              className="flex-1 border rounded-lg p-2"
              placeholder="Add member by email (must already have an account)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <button
              className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
              onClick={addByEmail}
              disabled={busy}
              type="button"
            >
              {busy ? "Working..." : "Add"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="divide-y">
          {list.map((m) => (
            <div key={m.user_id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {m.name} {m.isMe && <span className="text-xs text-gray-500">(you)</span>}
                </div>
                <div className="text-xs text-gray-500 truncate">{m.user_id}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs rounded-full px-2 py-1 border ${
                  m.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-gray-50 text-gray-700 border-gray-200"
                }`}>
                  {m.role}
                </span>

                {isAdmin && !m.isMe && (
                  <>
                    <button
                      className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                      disabled={busy}
                      onClick={() => setRole(m.user_id, m.role === "admin" ? "member" : "admin")}
                      type="button"
                      title="Toggle admin"
                    >
                      {m.role === "admin" ? "Demote" : "Promote"}
                    </button>

                    <button
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                      disabled={busy}
                      onClick={() => removeMember(m.user_id, m.name)}
                      type="button"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Tip: members must sign up first.
      </div>
    </div>
  )
}
