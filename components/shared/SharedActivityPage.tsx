"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

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

export default function SharedActivityPage({
  activities,
  groupNameMap,
  nameMap,
}: {
  activities: ActivityItem[]
  groupNameMap: Record<string, string>
  nameMap: Record<string, string>
}) {
  const [type, setType] = useState<"all" | "expense" | "settlement">("all")

  const filtered = useMemo(() => {
    if (type === "all") return activities
    return activities.filter((a) => a.activity_type === type)
  }, [activities, type])

  return (
    <div className="max-w-4xl space-y-4 p-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">Shared Activity</div>
          <div className="text-sm text-gray-500">Only activities you are involved in</div>
        </div>
        <Link href="/shared" className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">
          Back
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-3 flex gap-2">
        {(["all", "expense", "settlement"] as const).map((t) => (
          <button
            key={t}
            className={`rounded-lg px-3 py-2 text-sm ${
              type === t ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => setType(t)}
            type="button"
          >
            {t === "all" ? "All" : t === "expense" ? "Expenses" : "Settlements"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-gray-500">No activity.</div>
        ) : (
          <div className="divide-y">
            {filtered.map((a) => (
              <div key={`${a.activity_type}-${a.activity_id}`} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
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
