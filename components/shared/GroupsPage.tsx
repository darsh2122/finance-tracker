"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

type GroupItem = { id: string; name: string }

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

type ActivityItem = {
  activity_id: string
  group_id: string
  occurred_at: string
  activity_type: "expense" | "settlement"
  actor_user_id: string
  amount: number | string
  note: string | null
  created_at: string
}

type GroupsPageProps = {
  groups: GroupItem[]
  summary: SharedSummary | null
  counterparties: CounterpartyBalance[]
  nameMap: Record<string, string>
  activities: ActivityItem[]
  groupNameMap: Record<string, string>
}

export default function GroupsPage({
  groups,
  summary,
  counterparties,
  nameMap,
  activities,
  groupNameMap,
}: GroupsPageProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  async function createGroup() {
    const n = name.trim()
    if (!n) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc("sw_create_group", { p_name: n })
      if (error) return alert(error.message)
      setName("")
      router.push(`/shared/groups/${data}`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4 p-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">Shared</div>
          <div className="text-sm text-gray-500">Groups you share with friends</div>
        </div>
        <Link className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/shared/settle-up">
          Settle up
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4 flex gap-2">
        <input
          className="flex-1 border rounded-lg p-2"
          placeholder="Create a new group (e.g., Home, Trip, Roommates)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
          disabled={busy}
          onClick={createGroup}
          type="button"
        >
          {busy ? "Creating..." : "Create"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">You owe</div>
          <div className="text-2xl font-bold text-red-600">
            {Number(summary?.net_you_owe ?? 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Gross: {Number(summary?.gross_you_owe ?? 0).toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">You are owed</div>
          <div className="text-2xl font-bold text-green-600">
            {Number(summary?.net_you_are_owed ?? 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Gross: {Number(summary?.gross_you_are_owed ?? 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-2 dark:border-gray-800 dark:bg-gray-900">
        <div className="font-semibold dark:text-gray-100">Balances</div>

        {counterparties.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No balances yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {counterparties.map((c) => {
              const name = nameMap[c.other_user_id] ?? c.other_user_id.slice(0, 8)
              const youOwe = Number(c.you_owe || 0)
              const owesYou = Number(c.owes_you || 0)
              const net = owesYou - youOwe
              const statusText =
                net > 0 ? `Owes you ${net.toFixed(2)}` : net < 0 ? `You owe ${Math.abs(net).toFixed(2)}` : "Settled"

              return (
                <div key={c.other_user_id} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900 dark:text-gray-100">{name}</div>
                    <div
                      className={`text-xs ${
                        net > 0
                          ? "text-green-700 dark:text-green-400"
                          : net < 0
                            ? "text-red-700 dark:text-red-400"
                            : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {statusText}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {net !== 0 && (
                      <Link
                        href={`/shared/settle-up?to=${c.other_user_id}`}
                        className="rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                      >
                        Settle
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="font-semibold">Groups</div>
        </div>
        {groups.length === 0 ? (
          <div className="p-6 text-gray-500">No groups yet. Create one above.</div>
        ) : (
          <div className="divide-y">
            {groups.map((g) => (
              <Link key={g.id} href={`/shared/groups/${g.id}`} className="block p-4 hover:bg-gray-50">
                <div className="font-semibold">{g.name}</div>
                <div className="text-xs text-gray-500">Open group</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Activities</div>
          <Link href="/shared/activity" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {activities.length === 0 ? (
          <div className="text-sm text-gray-500">No activity yet.</div>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={`${a.activity_type}-${a.activity_id}`} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {a.activity_type === "expense" ? "Expense" : "Settlement"} • {groupNameMap[a.group_id] ?? "Group"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {nameMap[a.actor_user_id] ?? a.actor_user_id.slice(0, 8)}
                    {a.note ? ` - ${a.note}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{Number(a.amount).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{a.occurred_at}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
