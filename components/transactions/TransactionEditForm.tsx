"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Txn = {
  id: string
  direction: "income" | "expense" | "transfer" | "loan"
  amount: number
  description: string | null
  occurred_at: string
  category_id: string
  account_from_id: string | null
  account_to_id: string | null
}

type AccountOpt = { id: string; name: string }
type CatOpt = {
  category_id: string
  leaf_name: string
  group_type: "income" | "expense" | "transfer" | "loan"
  expense_subtype: "fixed" | "variable" | "shared" | null
}

export default function TransactionEditForm({
  txn,
  accounts,
  categories,
}: {
  txn: Txn
  accounts: AccountOpt[]
  categories: CatOpt[]
}) {
  const supabase = createClient()
  const router = useRouter()

  const [amount, setAmount] = useState(String(txn.amount))
  const [occurredAt, setOccurredAt] = useState(txn.occurred_at)
  const [description, setDescription] = useState(txn.description ?? "")
  const [categoryId, setCategoryId] = useState(txn.category_id)
  const [fromId, setFromId] = useState(txn.account_from_id ?? "")
  const [toId, setToId] = useState(txn.account_to_id ?? "")
  const [saving, setSaving] = useState(false)

  const filteredCats = useMemo(() => {
    // keep category list consistent with direction via group_type
    return categories.filter((c) => c.group_type === txn.direction)
  }, [categories, txn.direction])

  async function save() {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return alert("Amount must be > 0")
    if (!occurredAt) return alert("Date is required")

    // basic direction rules for accounts
    if (txn.direction === "income") {
      if (!toId) return alert("To account required")
    }
    if (txn.direction === "expense") {
      if (!fromId) return alert("From account required")
    }
    if (txn.direction === "transfer" || txn.direction === "loan") {
      if (!fromId || !toId) return alert("From and To accounts required")
      if (fromId === toId) return alert("From and To accounts must differ")
    }

    setSaving(true)
    try {
      const patch: any = {
        amount: amt,
        occurred_at: occurredAt,
        description: description.trim() ? description.trim() : null,
        category_id: categoryId,
        account_from_id: fromId ? fromId : null,
        account_to_id: toId ? toId : null,
      }

      const { error } = await supabase
        .from("transactions")
        .update(patch)
        .eq("id", txn.id)

      if (error) {
        alert(error.message)
        return
      }

      router.push("/transactions")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <div className="text-2xl font-bold">Edit Transaction</div>
        <div className="text-sm text-gray-500">Type: {txn.direction}</div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div>
          <label className="text-sm text-gray-600">Amount</label>
          <input className="mt-1 w-full border rounded-lg p-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-gray-600">Date</label>
          <input className="mt-1 w-full border rounded-lg p-2" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-gray-600">Category</label>
          <select className="mt-1 w-full border rounded-lg p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {filteredCats.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.leaf_name}
              </option>
            ))}
          </select>
        </div>

        {txn.direction === "expense" && (
          <div>
            <label className="text-sm text-gray-600">From account</label>
            <select className="mt-1 w-full border rounded-lg p-2" value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {txn.direction === "income" && (
          <div>
            <label className="text-sm text-gray-600">To account</label>
            <select className="mt-1 w-full border rounded-lg p-2" value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {(txn.direction === "transfer" || txn.direction === "loan") && (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm text-gray-600">From account</label>
              <select className="mt-1 w-full border rounded-lg p-2" value={fromId} onChange={(e) => setFromId(e.target.value)}>
                <option value="">Select</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">To account</label>
              <select className="mt-1 w-full border rounded-lg p-2" value={toId} onChange={(e) => setToId(e.target.value)}>
                <option value="">Select</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-gray-600">Description</label>
          <input className="mt-1 w-full border rounded-lg p-2" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button className="px-4 py-2 rounded-lg border" onClick={() => router.back()} type="button">
            Cancel
          </button>
          <button className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60" onClick={save} disabled={saving} type="button">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
