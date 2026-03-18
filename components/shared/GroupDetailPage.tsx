"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export default function GroupDetailPage({
  groupId,
  group,
  expenses,
  mySplits,
  meId,
  edges,
  nameMap,
}: {
  groupId: string
  group: { id: string; name: string }
  expenses: {
    id: string
    amount: number | string
    occurred_at: string
    note: string | null
    category_name: string | null
    paid_by_user_id: string
    payer_name: string | null
  }[]
  mySplits: { expense_id: string; share_amount: number | string }[]
  meId: string
  edges: { debtor: string; creditor: string; amount: number | string }[]
  nameMap: Record<string, string>
}) {
  const mySplitMap = useMemo(() => {
    const m = new Map<string, number>()
    mySplits.forEach((s) => m.set(s.expense_id, Number(s.share_amount)))
    return m
  }, [mySplits])

  const summary = useMemo(() => {
    let youOwe = 0
    let youAreOwed = 0

    expenses.forEach((e) => {
      const myShare = mySplitMap.get(e.id) ?? 0
      const paidByMe = e.paid_by_user_id === meId

      if (paidByMe) {
        youAreOwed += Number(e.amount) - myShare
      } else {
        youOwe += myShare
      }
    })

    return { youOwe, youAreOwed }
  }, [expenses, mySplitMap, meId])

  const [simp, setSimp] = useState<{ from_user: string; to_user: string; amount: number }[] | null>(null)
  const [simpBusy, setSimpBusy] = useState(false)

  return (
    <div className="max-w-4xl space-y-4 p-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Group</div>
          <div className="text-2xl font-bold">{group?.name}</div>
        </div>
        <div className="flex space-x-2">
          <Link className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href={`/shared/settle-up?groupId=${group.id}`}>
            Settle up
          </Link>
          <Link className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href={`/shared/groups/${group.id}/members`}>
            Members
          </Link>
          <Link className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href={`/shared`}>
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">You owe</div>
          <div className="text-2xl font-bold text-red-600">{summary.youOwe.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">You are owed</div>
          <div className="text-2xl font-bold text-green-600">{summary.youAreOwed.toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-6 text-gray-500">No shared expenses yet.</div>
        ) : (
          <div className="divide-y">
            {expenses.map((e) => {
              const payerName = e.payer_name ?? e.paid_by_user_id.slice(0, 8)
              const myShare = mySplitMap.get(e.id) ?? 0

              return (
                <div key={e.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{e.note || e.category_name || "Shared expense"}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {e.occurred_at} • Paid by {payerName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{Number(e.amount).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Your share: {Number(myShare).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-2">
        <div className="font-semibold">Who owes whom</div>

        {edges.length === 0 ? (
          <div className="text-sm text-gray-500">No balances yet.</div>
        ) : (
          <div className="space-y-2">
            {edges.map((e, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="text-gray-700">
                  <b>{nameMap[e.debtor] ?? e.debtor.slice(0, 8)}</b> owes <b>{nameMap[e.creditor] ?? e.creditor.slice(0, 8)}</b>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold">{Number(e.amount).toFixed(2)}</div>
                  {e.debtor === meId && (
                    <Link
                      href={`/shared/settle-up?groupId=${groupId}&to=${e.creditor}`}
                      className="rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Settle
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Simplify debts</div>
          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            disabled={simpBusy}
            onClick={async () => {
              setSimpBusy(true)
              try {
                const { data, error } = await supabase.rpc("sw_simplify_debts_me", { p_group_id: groupId })
                if (error) return alert(error.message)
                setSimp(
                  (data || []).map((r: { from_user: string; to_user: string; amount: number | string }) => ({
                    from_user: r.from_user,
                    to_user: r.to_user,
                    amount: Number(r.amount),
                  })),
                )
              } finally {
                setSimpBusy(false)
              }
            }}
            type="button"
          >
            {simpBusy ? "Calculating..." : "Simplify"}
          </button>
        </div>

        {!simp ? (
          <div className="text-sm text-gray-500">
            Click simplify to get the minimum set of payments to settle the group.
          </div>
        ) : simp.length === 0 ? (
          <div className="text-sm text-gray-500">Already settled.</div>
        ) : (
          <div className="space-y-2">
            {simp.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div>
                  <b>{nameMap[s.from_user] ?? s.from_user.slice(0, 8)}</b> pays{" "}
                  <b>{nameMap[s.to_user] ?? s.to_user.slice(0, 8)}</b>
                </div>
                <div className="font-semibold">{s.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
