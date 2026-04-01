import { createClient } from "@/lib/supabase/server"
import TransactionsDashboard from "@/components/dashboard/TransactionsDashboard"
import { redirect } from "next/navigation"

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")

  const now = new Date()
  const start12 = monthStart(addMonths(now, -11))
  const startNext = monthStart(addMonths(now, 1))

  // ↓ currency added to the select
  const { data: txns, error } = await supabase
    .from("transactions")
    .select(`
      id,
      direction,
      amount,
      currency,
      description,
      occurred_at,
      category_id
    `)
    .gte("occurred_at", isoDate(start12))
    .lt("occurred_at", isoDate(startNext))
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) return <div className="p-6">Failed to load dashboard</div>

  const categoryIds = Array.from(
    new Set((txns || []).map((t: any) => t.category_id).filter(Boolean))
  )

  const { data: catInfo } = await supabase
    .from("v_category_leaf_info")
    .select("category_id,leaf_name,group_type,expense_subtype")
    .in("category_id", categoryIds)

  const catMap = new Map<string, any>()
  ;(catInfo || []).forEach((c: any) => catMap.set(c.category_id, c))

  // Also fetch the user's base_currency so the dashboard can use it for
  // filtering aggregates (totals only count base_currency transactions).
  const { data: profile } = await supabase
    .from("profiles")
    .select("base_currency")
    .single()

  const baseCurrency = profile?.base_currency ?? "CAD"

  const enriched = (txns || []).map((t: any) => {
    const c = catMap.get(t.category_id)
    return {
      id: t.id,
      direction: t.direction,
      amount: Number(t.amount),
      currency: t.currency ?? baseCurrency,   // ← NEW field
      description: t.description ?? "",
      occurred_at: t.occurred_at,
      leaf_name: c?.leaf_name ?? "Unknown",
      group_type: c?.group_type ?? null,
      expense_subtype: c?.expense_subtype ?? null,
    }
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <TransactionsDashboard data={enriched} baseCurrency={baseCurrency} />
    </div>
  )
}
