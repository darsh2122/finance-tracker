"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchGroupMembers, fetchMySharedGroups } from "@/lib/services/shared.service"

type SplitMethod = "equal" | "exact" | "percent"

type Member = { user_id: string; label: string }

export type SharedPayload = {
  group_id: string
  paid_by: string
  splits: { user_id: string; share_amount: number }[]
}

export default function SharedSplitEditor({
  amount,
  meUserId,
  onChange,
}: {
  amount: number
  meUserId: string
  onChange: (v: SharedPayload | null) => void
}) {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [groupId, setGroupId] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [paidBy, setPaidBy] = useState(meUserId)

  const [method, setMethod] = useState<SplitMethod>("equal")
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [exact, setExact] = useState<Record<string, string>>({})
  const [percent, setPercent] = useState<Record<string, string>>({})

  const round2 = (n: number) => Math.round(n * 100) / 100
  const parseNum = (v: string | undefined) => {
    if (!v || !v.trim()) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  // load groups
  useEffect(() => {
    fetchMySharedGroups().then(setGroups).catch(() => setGroups([]))
  }, [])

  // load members when group chosen
  useEffect(() => {
    if (!groupId) {
      onChange(null)
      return
    }

    fetchGroupMembers(groupId)
      .then((rows) => {
        const m: Member[] = (rows as { user_id: string; label: string }[]).map((r) => ({
          user_id: r.user_id,
          label: r.label,
        }))
        setMembers(m)

        const en: Record<string, boolean> = {}
        const ex: Record<string, string> = {}
        const pe: Record<string, string> = {}

        m.forEach((x) => {
          en[x.user_id] = true
          ex[x.user_id] = ""
          pe[x.user_id] = ""
        })

        setEnabled(en)
        setExact(ex)
        setPercent(pe)

        // default payer = me if present else first
        const meIn = m.find((x) => x.user_id === meUserId)
        setPaidBy(meIn ? meUserId : (m[0]?.user_id ?? meUserId))
      })
      .catch(() => {
        setMembers([])
        setEnabled({})
        onChange(null)
      })
  }, [groupId, meUserId, onChange])

  const activeMembers = useMemo(
    () => members.filter((m) => enabled[m.user_id]),
    [members, enabled]
  )

  const splitState = useMemo(() => {
    if (!groupId) {
      return {
        payload: null as SharedPayload | null,
        previewTotal: 0,
        error: "Select a group",
      }
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        payload: null as SharedPayload | null,
        previewTotal: 0,
        error: "Enter a valid amount",
      }
    }
    if (activeMembers.length === 0) {
      return {
        payload: null as SharedPayload | null,
        previewTotal: 0,
        error: "Select at least one participant",
      }
    }
    if (!paidBy || !members.some((m) => m.user_id === paidBy)) {
      return {
        payload: null as SharedPayload | null,
        previewTotal: 0,
        error: "Select who paid",
      }
    }
    if (!enabled[paidBy]) {
      return {
        payload: null as SharedPayload | null,
        previewTotal: 0,
        error: "Payer must be a participant",
      }
    }

    let splits: { user_id: string; share_amount: number }[] = []
    let previewTotal = 0
    let error = ""

    if (method === "equal") {
      const each = round2(amount / activeMembers.length)
      splits = activeMembers.map((m) => ({ user_id: m.user_id, share_amount: each }))
      const sum = round2(splits.reduce((s, x) => s + x.share_amount, 0))
      const diff = round2(amount - sum)
      if (diff !== 0) splits[0].share_amount = round2(splits[0].share_amount + diff)
      previewTotal = round2(splits.reduce((s, x) => s + x.share_amount, 0))
    }

    if (method === "exact") {
      const parsed = activeMembers.map((m) => ({
        user_id: m.user_id,
        value: parseNum(exact[m.user_id]),
      }))
      previewTotal = round2(parsed.reduce((s, x) => s + (x.value ?? 0), 0))
      if (parsed.some((x) => x.value === null)) {
        error = "Enter all amounts"
      } else if (parsed.some((x) => (x.value as number) < 0)) {
        error = "Amounts must be zero or positive"
      } else {
        splits = parsed.map((x) => ({
          user_id: x.user_id,
          share_amount: round2(x.value as number),
        }))
      }
    }

    if (method === "percent") {
      const parsed = activeMembers.map((m) => ({
        user_id: m.user_id,
        value: parseNum(percent[m.user_id]),
      }))
      const totalPercent = parsed.reduce((s, x) => s + (x.value ?? 0), 0)

      previewTotal = round2(
        parsed.reduce((s, x) => s + round2((amount * Math.max(0, x.value ?? 0)) / 100), 0)
      )

      if (parsed.some((x) => x.value === null)) {
        error = "Enter all percentages"
      } else if (parsed.some((x) => (x.value as number) < 0)) {
        error = "Percentages must be zero or positive"
      } else if (round2(totalPercent) !== 100) {
        error = "Percent total must be 100"
      } else {
        splits = parsed.map((x) => ({
          user_id: x.user_id,
          share_amount: round2((amount * (x.value as number)) / 100),
        }))
        const sum = round2(splits.reduce((s, x) => s + x.share_amount, 0))
        const diff = round2(amount - sum)
        if (diff !== 0) splits[0].share_amount = round2(splits[0].share_amount + diff)
      }
    }

    const finalSum = round2(splits.reduce((s, x) => s + x.share_amount, 0))
    if (!error && finalSum !== round2(amount)) {
      error = "Split total must match amount"
    }
    if (splits.some((x) => !Number.isFinite(x.share_amount) || x.share_amount < 0)) {
      error = "Split amounts must be valid"
    }

    const payload = !error
      ? ({ group_id: groupId, paid_by: paidBy, splits } as SharedPayload)
      : null

    return {
      payload,
      previewTotal: round2(previewTotal || finalSum),
      error,
    }
  }, [groupId, paidBy, amount, method, activeMembers, exact, percent, members, enabled])

  // push value up
  useEffect(() => {
    onChange(splitState.payload)
  }, [splitState.payload, onChange])

  const sumPreview = splitState.previewTotal

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="font-semibold">Shared details</div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-sm text-gray-600">Group</label>
          <select
            className="mt-1 w-full border rounded-lg p-2"
            value={groupId}
            onChange={(e) => {
              const nextGroupId = e.target.value
              setGroupId(nextGroupId)
              if (!nextGroupId) {
                setMembers([])
                setEnabled({})
              }
            }}
          >
            <option value="">Select group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Paid by</label>
          <select
            className="mt-1 w-full border rounded-lg p-2"
            value={paidBy}
            onChange={(e) => {
              const nextPaidBy = e.target.value
              setPaidBy(nextPaidBy)
              setEnabled((s) => ({ ...s, [nextPaidBy]: true }))
            }}
            disabled={!groupId}
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Split method</label>
          <select
            className="mt-1 w-full border rounded-lg p-2"
            value={method}
            onChange={(e) => setMethod(e.target.value as SplitMethod)}
            disabled={!groupId}
          >
            <option value="equal">Equal</option>
            <option value="exact">Exact amounts</option>
            <option value="percent">Percent</option>
          </select>
        </div>
      </div>

      {groupId && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">Participants</div>

          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!enabled[m.user_id]}
                  onChange={(e) =>
                    setEnabled((s) => ({ ...s, [m.user_id]: e.target.checked }))
                  }
                  disabled={m.user_id === paidBy}
                />
                <div className="w-44 text-sm">{m.label}</div>

                {method === "exact" && (
                  <input
                    type="number"
                    className="border rounded-lg p-2 w-40"
                    placeholder="amount"
                    value={exact[m.user_id] ?? ""}
                    onChange={(e) =>
                      setExact((s) => ({ ...s, [m.user_id]: e.target.value }))
                    }
                    disabled={!enabled[m.user_id]}
                  />
                )}

                {method === "percent" && (
                  <input
                    type="number"
                    className="border rounded-lg p-2 w-40"
                    placeholder="%"
                    value={percent[m.user_id] ?? ""}
                    onChange={(e) =>
                      setPercent((s) => ({ ...s, [m.user_id]: e.target.value }))
                    }
                    disabled={!enabled[m.user_id]}
                  />
                )}

              </div>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            Split total: <b>{sumPreview.toFixed(2)}</b> / {amount.toFixed(2)}{" "}
            {splitState.payload ? (
              <span className="text-green-600">OK</span>
            ) : (
              <span className="text-red-600">X</span>
            )}
          </div>

          {!splitState.payload && splitState.error && (
            <div className="text-xs text-red-600">{splitState.error}</div>
          )}
        </div>
      )}
    </div>
  )
}
