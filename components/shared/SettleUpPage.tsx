"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

type GroupItem = {
  id: string
  name: string
}

type MemberOption = {
  user_id: string
  name: string
}

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function SettleUpPage({
  groups,
  meId,
  meName,
  initialGroupId,
  initialToUserId,
}: {
  groups: GroupItem[]
  meId: string
  meName: string
  initialGroupId: string
  initialToUserId: string
}) {
  const router = useRouter()
  const [groupId, setGroupId] = useState(initialGroupId)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [toUserId, setToUserId] = useState(initialToUserId)
  const [amount, setAmount] = useState("")
  const [occurredAt, setOccurredAt] = useState(todayISO())
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function loadMembers() {
      if (!groupId) {
        setMembers([])
        return
      }

      setLoadingMembers(true)
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from("sw_group_members")
          .select("user_id")
          .eq("group_id", groupId)

        if (memberErr) {
          alert(memberErr.message)
          setMembers([])
          return
        }

        const memberIds = (memberRows || []).map((m) => m.user_id as string)
        const { data: profiles, error: profileErr } =
          memberIds.length === 0
            ? { data: [] as { id: string; full_name: string | null }[], error: null }
            : await supabase.from("profiles").select("id,full_name").in("id", memberIds)

        if (profileErr) {
          alert(profileErr.message)
          setMembers([])
          return
        }

        const fullNameById = new Map((profiles || []).map((p) => [p.id, p.full_name]))
        const options = memberIds
          .filter((id) => id !== meId)
          .map((id) => ({ user_id: id, name: fullNameById.get(id)?.trim() || id.slice(0, 8) }))

        setMembers(options)
        setToUserId((prev) => {
          if (options.some((m) => m.user_id === prev)) return prev
          if (initialToUserId && options.some((m) => m.user_id === initialToUserId)) return initialToUserId
          return options[0]?.user_id ?? ""
        })
      } finally {
        setLoadingMembers(false)
      }
    }

    loadMembers()
  }, [groupId, meId, initialToUserId])

  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupId) ?? null, [groups, groupId])

  async function recordSettlement() {
    const amt = Number(amount)
    if (!groupId) return alert("Please select a group")
    if (!toUserId) return alert("Please select who you are paying")
    if (!Number.isFinite(amt) || amt <= 0) return alert("Enter valid amount")

    setBusy(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const me = auth.user?.id
      if (!me) return alert("Not logged in")

      const { error } = await supabase.from("sw_settlements").insert({
        group_id: groupId,
        from_user_id: me,
        to_user_id: toUserId,
        amount: amt,
        occurred_at: occurredAt,
        note: note || null,
        created_by: me,
      })

      if (error) return alert(error.message)

      setAmount("")
      setNote("")
      router.push("/shared")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4 p-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Shared</div>
          <div className="text-2xl font-bold">Settle up</div>
        </div>
        <Link className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/shared">
          Back
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-gray-600">Group</label>
            <select className="mt-1 w-full border rounded-lg p-2" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.length === 0 ? (
                <option value="">No groups available</option>
              ) : (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">From</label>
            <input className="mt-1 w-full border rounded-lg p-2 bg-gray-50 text-gray-700" value={meName} readOnly />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm text-gray-600">To</label>
            <select
              className="mt-1 w-full border rounded-lg p-2"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              disabled={loadingMembers || members.length === 0}
            >
              {members.length === 0 ? (
                <option value="">{loadingMembers ? "Loading members..." : "No members available"}</option>
              ) : (
                members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Amount</label>
            <input className="mt-1 w-full border rounded-lg p-2" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div>
            <label className="text-sm text-gray-600">Date</label>
            <input className="mt-1 w-full border rounded-lg p-2" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Note (optional)</label>
          <input className="mt-1 w-full border rounded-lg p-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cash / transfer / settle up" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500">{selectedGroup ? `Will be recorded in ${selectedGroup.name}` : "Select a group"}</div>
          <button
            className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
            disabled={busy || !groupId || !toUserId}
            onClick={recordSettlement}
            type="button"
          >
            {busy ? "Saving..." : "Record settlement"}
          </button>
        </div>
      </div>
    </div>
  )
}
