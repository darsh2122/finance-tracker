"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  createExpense,
  createIncome,
  createLoan,
  createTransfer,
} from "@/lib/services/transaction.service"

const supabase = createClient()

type TxnType = "income" | "expense" | "shared" | "transfer" | "loan"

type Account = { id: string; name: string; type: string }

type CatRow = {
  id: string
  name: string
  parent_id: string | null
  group_type: "income" | "expense" | "transfer" | "loan" | null
  expense_subtype: "fixed" | "variable" | "shared" | null
}

type ParentCat = {
  id: string
  name: string
  group_type: "income" | "expense" | "transfer" | "loan"
  expense_subtype: "fixed" | "variable" | "shared" | null
}

export default function NewTransactionPage() {
  const router = useRouter()

  const [accounts, setAccounts] = useState<Account[]>([])

  // store parent categories and children separately
  const [parents, setParents] = useState<ParentCat[]>([])
  const [children, setChildren] = useState<CatRow[]>([])

  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")

  // new: selected parent category id (category group)
  const [parentCategoryId, setParentCategoryId] = useState("")
  // selected leaf category id (subcategory)
  const [categoryId, setCategoryId] = useState("")

  const [amount, setAmount] = useState<number>(0)
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [{ data: acc }, { data: cats }] = await Promise.all([
        supabase
          .from("accounts")
          .select("id,name,type")
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("categories")
          .select("id,name,parent_id,group_type,expense_subtype"),
      ])

      setAccounts((acc || []) as Account[])

      const rows = (cats || []) as CatRow[]
      const parentRows = rows.filter((c) => c.parent_id === null && c.group_type) as CatRow[]
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
  }, [])

  const selectedParent = useMemo(
    () => parents.find((p) => p.id === parentCategoryId) ?? null,
    [parents, parentCategoryId]
  )

  const derivedTxnType = useMemo<TxnType | null>(() => {
    if (!selectedParent) return null
    if (selectedParent.group_type === "income") return "income"
    if (selectedParent.group_type === "transfer") return "transfer"
    if (selectedParent.group_type === "loan") return "loan"
    if (selectedParent.expense_subtype === "shared") return "shared"
    return "expense"
  }, [selectedParent])

  const filteredChildrenForParent = useMemo(() => {
    if (!parentCategoryId) return [] as CatRow[]
    return children.filter((c) => c.parent_id === parentCategoryId)
  }, [parentCategoryId, children])

  const orderedParents = useMemo(() => {
    return [...parents].sort((a, b) => {
      const aIsLast = a.group_type === "transfer" || a.group_type === "loan"
      const bIsLast = b.group_type === "transfer" || b.group_type === "loan"

      if (aIsLast !== bIsLast) return aIsLast ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }, [parents])

  useEffect(() => {
    // reset account selections when category group changes
    setFromAccountId("")
    setToAccountId("")
  }, [derivedTxnType])

  // when parent changes, clear selected child
  useEffect(() => {
    setCategoryId("")
  }, [parentCategoryId])

  async function handleSave() {
    try {
      setLoading(true)

      if (!derivedTxnType) return alert("Select category")
      if (!categoryId) return alert("Select subcategory")
      if (!amount || amount <= 0) return alert("Enter valid amount")

      if (derivedTxnType === "income") {
        if (!toAccountId) return alert("Select To account")
        await createIncome({
          to_account_id: toAccountId,
          category_id: categoryId,
          amount,
          description,
          occurred_at: date,
        })
      }

      if (derivedTxnType === "expense" || derivedTxnType === "shared") {
        if (!fromAccountId) return alert("Select From account")
        await createExpense({
          from_account_id: fromAccountId,
          category_id: categoryId,
          amount,
          description:
            derivedTxnType === "shared"
              ? `${description}${description ? " | " : ""}Shared (tracked in Splitwise)`
              : description,
          occurred_at: date,
        })
      }

      if (derivedTxnType === "transfer") {
        if (!fromAccountId || !toAccountId)
          return alert("Select From + To accounts")
        if (fromAccountId === toAccountId)
          return alert("From and To cannot be same")

        await createTransfer({
          from_account: fromAccountId,
          to_account: toAccountId,
          category_id: categoryId,
          amount,
          description,
          occurred_at: date,
        })
      }

      if (derivedTxnType === "loan") {
        if (!fromAccountId || !toAccountId)
          return alert("Select From + To accounts")
        if (fromAccountId === toAccountId)
          return alert("From and To cannot be same")

        await createLoan({
          from_account: fromAccountId,
          to_account: toAccountId,
          category_id: categoryId,
          amount,
          description,
          occurred_at: date,
        })
      }

      router.push("/transactions")
      router.refresh()
    } catch (e: any) {
      alert(e?.message ?? "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Add Transaction</h1>

      <select
        className="w-full border p-2"
        value={parentCategoryId}
        onChange={(e) => setParentCategoryId(e.target.value)}
      >
        <option value="">Select category</option>
        {orderedParents.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* New: subcategory select */}
      <select
        className="w-full border p-2"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        disabled={!parentCategoryId}
      >
        <option value="">{parentCategoryId ? "Select subcategory" : "Choose category first"}</option>
        {filteredChildrenForParent.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {(derivedTxnType === "expense" ||
        derivedTxnType === "shared" ||
        derivedTxnType === "transfer" ||
        derivedTxnType === "loan") && (
        <select
          className="w-full border p-2"
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
        >
          <option value="">From account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.type})
            </option>
          ))}
        </select>
      )}

      {(derivedTxnType === "income" ||
        derivedTxnType === "transfer" ||
        derivedTxnType === "loan") && (
        <select
          className="w-full border p-2"
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
        >
          <option value="">To account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.type})
            </option>
          ))}
        </select>
      )}
      
      <input
        className="w-full border p-2"
        type="number"
        placeholder="Amount"
        value={amount || ""}
        onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : 0)}
      />

      <input
        className="w-full border p-2"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        className="w-full border p-2"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <button
        className="w-full bg-black text-white p-3 rounded"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  )
}
