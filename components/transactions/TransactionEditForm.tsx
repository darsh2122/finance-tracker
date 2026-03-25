"use client"

import { useEffect, useMemo, useState } from "react"
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

type CatRow = {
  id: string
  name: string
  parent_id: string | null
  group_type: "income" | "expense" | "transfer" | "loan" | null
  expense_subtype: "fixed" | "variable" | "shared" | null
  created_by: string | null
  is_global: boolean
}

type ParentCat = {
  id: string
  name: string
  group_type: "income" | "expense" | "transfer" | "loan"
  expense_subtype: "fixed" | "variable" | "shared" | null
}

export default function TransactionEditForm({
  txn,
  accounts,
}: {
  txn: Txn
  accounts: AccountOpt[]
}) {
  const supabase = createClient()
  const router = useRouter()

  const [amount, setAmount] = useState(String(txn.amount))
  const [occurredAt, setOccurredAt] = useState(txn.occurred_at)
  const [description, setDescription] = useState(txn.description ?? "")

  // categories (parent + child)
  const [parents, setParents] = useState<ParentCat[]>([])
  const [children, setChildren] = useState<CatRow[]>([])

  const [parentCategoryId, setParentCategoryId] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>(txn.category_id)

  const [fromId, setFromId] = useState(txn.account_from_id ?? "")
  const [toId, setToId] = useState(txn.account_to_id ?? "")
  const [saving, setSaving] = useState(false)

  const isCustom = (c: CatRow) => c.created_by !== null && !c.is_global

  // Load categories from DB (same shape/logic as New Transaction page)
  useEffect(() => {
    ;(async () => {
      const { data: cats, error } = await supabase
        .from("categories")
        .select("id,name,parent_id,group_type,expense_subtype,created_by,is_global")

      if (error) {
        alert(error.message)
        return
      }

      const rows = (cats || []) as CatRow[]
      const parentRows = rows.filter(
        (c) => c.parent_id === null && c.group_type
      ) as CatRow[]
      const childRows = rows.filter((c) => c.parent_id !== null) as CatRow[]

      setParents(
        parentRows.map((p) => ({
          id: p.id,
          name: p.name,
          group_type: p.group_type!,
          expense_subtype: p.expense_subtype,
        }))
      )
      setChildren(childRows)
    })()
  }, [supabase])

  // Determine the selected parent for the existing txn.category_id
  useEffect(() => {
    if (!children.length || !txn.category_id) return
    const leaf = children.find((c) => c.id === txn.category_id)
    if (leaf?.parent_id) setParentCategoryId(leaf.parent_id)
  }, [children, txn.category_id])

  const orderedParents = useMemo(() => {
    return [...parents].sort((a, b) => {
      const aIsLast = a.group_type === "transfer" || a.group_type === "loan"
      const bIsLast = b.group_type === "transfer" || b.group_type === "loan"
      if (aIsLast !== bIsLast) return aIsLast ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }, [parents])

  // Only show parent categories that match txn.direction rules
  // (expense edit can include shared subtypes; shared isn't a direction in txn)
  const parentsForDirection = useMemo(() => {
    return orderedParents.filter((p) => p.group_type === txn.direction)
  }, [orderedParents, txn.direction])

  const filteredChildrenForParent = useMemo(() => {
    if (!parentCategoryId) return []

    const list = children.filter(
      (c) => c.parent_id === parentCategoryId
    )

    return [...list].sort((a, b) => {
      const aCustom = isCustom(a)
      const bCustom = isCustom(b)

      // custom first
      if (aCustom !== bCustom) return aCustom ? 1 : -1

      // alphabetical within each group
      return a.name.localeCompare(b.name)
    })
  }, [parentCategoryId, children])

  // When parent changes, clear selected child (same as New Transaction page)
  useEffect(() => {
    // Don't wipe out initial state before we derive parent from the existing leaf
    // If user changes parent manually, clear the leaf.
    if (!parentCategoryId) {
      setCategoryId("")
      return
    }
    // If current selected leaf isn't under the selected parent, clear it.
    const leaf = children.find((c) => c.id === categoryId)
    if (leaf && leaf.parent_id !== parentCategoryId) setCategoryId("")
  }, [parentCategoryId, children]) // intentionally not depending on categoryId to avoid loops

  async function save() {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return alert("Amount must be > 0")
    if (!occurredAt) return alert("Date is required")
    if (!parentCategoryId) return alert("Select category")
    if (!categoryId) return alert("Select subcategory")

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
          <input
            className="mt-1 w-full border rounded-lg p-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Date</label>
          <input
            className="mt-1 w-full border rounded-lg p-2"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        {/* Category (parent) */}
        <div>
          <label className="text-sm text-gray-600">Category</label>
          <select
            className="mt-1 w-full border rounded-lg p-2"
            value={parentCategoryId}
            onChange={(e) => setParentCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {parentsForDirection.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory (leaf) */}
        <div>
          <label className="text-sm text-gray-600">Subcategory</label>
          <select
            className="mt-1 w-full border rounded-lg p-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!parentCategoryId}
          >
            <option value="">
              {parentCategoryId ? "Select subcategory" : "Choose category first"}
            </option>
            {filteredChildrenForParent.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {txn.direction === "expense" && (
          <div>
            <label className="text-sm text-gray-600">From account</label>
            <select
              className="mt-1 w-full border rounded-lg p-2"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
            >
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {txn.direction === "income" && (
          <div>
            <label className="text-sm text-gray-600">To account</label>
            <select
              className="mt-1 w-full border rounded-lg p-2"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
            >
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(txn.direction === "transfer" || txn.direction === "loan") && (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm text-gray-600">From account</label>
              <select
                className="mt-1 w-full border rounded-lg p-2"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
              >
                <option value="">Select</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">To account</label>
              <select
                className="mt-1 w-full border rounded-lg p-2"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                <option value="">Select</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-gray-600">Description</label>
          <input
            className="mt-1 w-full border rounded-lg p-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            className="px-4 py-2 rounded-lg border"
            onClick={() => router.back()}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
            onClick={save}
            disabled={saving}
            type="button"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}