import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils/currency"

const DIR_CONFIG = {
  income:   { icon: "💰", color: "var(--green)", bg: "bubble-green", label: "Income",   pill: "pill-green" },
  expense:  { icon: "📤", color: "var(--red)", bg: "bubble-red", label: "Expense",  pill: "pill-red" },
  transfer: { icon: "🔄", color: "var(--purple)", bg: "bubble-purple", label: "Transfer", pill: "pill-purple" },
  loan:     { icon: "🤝", color: "var(--amber)", bg: "bubble-amber", label: "Loan",     pill: "pill-amber" },
}

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: t, error } = await supabase
    .from("v_transactions_list")
    .select(`
      id, direction, amount, description, occurred_at,
      account_from_id, account_from_name, account_from_currency,
      account_to_id, account_to_name, account_to_currency,
      category_id, category_name, category_group_type, category_expense_subtype
    `)
    .eq("id", id)
    .single()

  if (error || !t) {
    console.error("Error fetching transaction:", error)
    return notFound()
  }

  const cfg = DIR_CONFIG[t.direction as keyof typeof DIR_CONFIG] || DIR_CONFIG.expense
  const currency = t.direction === "income" ? t.account_to_currency : t.account_from_currency
  const amtStr = formatCurrency(t.amount, currency)

  return (
    <div className="clay-page" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/transactions" className="clay-btn clay-btn-white clay-btn-icon" style={{ textDecoration: "none" }}>
          ‹
        </Link>
        <h1 className="page-title" style={{ margin: 0 }}>Detail</h1>
      </div>

      <div className="clay-card-lg anim-slide-up" style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{cfg.icon}</div>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-2px", color: cfg.color }}>
          {t.direction === "income" ? "+" : t.direction === "expense" ? "−" : ""}
          {amtStr}
        </div>
        <div className={`clay-pill ${cfg.pill}`} style={{ marginTop: 12, padding: "8px 18px", fontSize: 13 }}>
          {cfg.label}
        </div>
      </div>

      <div className="clay-card anim-slide-up" style={{ animationDelay: "0.1s", display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
        {[
          { label: "Date",     val: new Date(t.occurred_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
          { label: "Category", val: t.category_name },
          ...(t.category_expense_subtype ? [{ label: "Type", val: t.category_expense_subtype }] : []),
          ...(t.description ? [{ label: "Note", val: t.description }] : []),
          ...(t.account_from_name ? [{ label: "From",  val: t.account_from_name }] : []),
          ...(t.account_to_name   ? [{ label: "To",    val: t.account_to_name }]   : []),
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
            <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 700 }}>{row.label}</span>
            <span style={{ fontSize: 14, color: "var(--text-soft)", fontWeight: 800, textAlign: "right", maxWidth: "65%" }}>{row.val}</span>
          </div>
        ))}
      </div>

      <div className="anim-slide-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24, animationDelay: "0.2s" }}>
        <Link href={`/transactions/${t.id}/edit`} className="clay-btn clay-btn-white" style={{ textDecoration: "none" }}>
          ✏️ Edit
        </Link>
        {/* Delete would need a client component or server action, leaving for now as user only asked for design alignment */}
        <button className="clay-btn clay-btn-ghost" onClick={() => {}}>
          More Actions
        </button>
      </div>
    </div>
  )
}
