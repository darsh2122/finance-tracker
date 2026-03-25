"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"

const supabase = createClient()

type Parent = {
  id: string
  name: string
  group_type: string | null
  expense_subtype: string | null
}

type Category = {
  id: string
  name: string
  parent_id: string | null
  is_global: boolean
  created_by: string | null
  expense_subtype: string | null
}

export default function CustomCategoriesManager({
  parents,
  allCategories,
  currentUserId,
  usedCategoryIds,
}: {
  parents: Parent[]
  allCategories: Category[]
  currentUserId: string
  usedCategoryIds: Set<string>
}) {
  const router = useRouter()

  const [selectedParentId, setSelectedParentId] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const selectedParent = parents.find((p) => p.id === selectedParentId)

  const subcategories = selectedParentId
    ? allCategories.filter((c) => c.parent_id === selectedParentId)
    : []
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const [originY, setOriginY] = useState(0.5)
const sortedSubcategories = [...subcategories].sort((a, b) => {
  const isOwnA = a.created_by === currentUserId && !a.is_global
  const isOwnB = b.created_by === currentUserId && !b.is_global

  if (isOwnA !== isOwnB) return isOwnA ? 1 : -1

  const inUseA = usedCategoryIds.has(a.id)
  const inUseB = usedCategoryIds.has(b.id)

  if (inUseA !== inUseB) return inUseA ? -1 : 1

  return a.name.localeCompare(b.name)
})

  function clearMessages() {
    setError("")
    setSuccess("")
  }

  async function handleAdd() {
    const name = newCategoryName.trim()
    if (!name) return setError("Please enter a category name")
    if (!selectedParentId) return setError("Please select a parent category")

    const exists = subcategories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) return setError(`"${name}" already exists in this group`)

    setLoading(true)
    clearMessages()

    const { error: insertError } = await supabase.from("categories").insert({
      name,
      parent_id: selectedParentId,
      group_type: null,
      expense_subtype: selectedParent?.expense_subtype ?? null,
      is_global: false,
      created_by: currentUserId,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(`"${name}" added successfully!`)
      setNewCategoryName("")
      router.refresh()
    }

    setLoading(false)
  }

  async function handleSaveEdit(category: Category) {
    const name = editingName.trim()
    if (!name) return setError("Name cannot be empty")

    const exists = subcategories.some(
      (c) =>
        c.id !== category.id && c.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) return setError(`"${name}" already exists in this group`)

    setLoading(true)
    clearMessages()

    const { error: updateError } = await supabase
      .from("categories")
      .update({ name })
      .eq("id", category.id)
      .eq("created_by", currentUserId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(`Renamed to "${name}" successfully!`)
      setEditingId(null)
      setEditingName("")
      router.refresh()
    }

    setLoading(false)
  }

  async function handleDelete(category: Category) {
    // Double-check in case page data is stale
    if (usedCategoryIds.has(category.id)) {
      setError(
        `Cannot delete "${category.name}" — it has existing transactions. Reassign those transactions first.`
      )
      return
    }

    const confirmed = confirm(
      `Delete "${category.name}"?\n\nThis cannot be undone.`
    )
    if (!confirmed) return

    setLoading(true)
    clearMessages()

    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id)
      .eq("created_by", currentUserId)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setSuccess(`"${category.name}" deleted.`)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Manage Categories</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add your own subcategories (like "Citizenship Fees") under any existing group.
        </p>
      </div>

      {/* Step 1: Pick a parent group */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="font-semibold text-sm text-gray-700">
          Step 1 — Pick a category group
        </div>
        <select
          className="w-full border rounded-lg p-2 text-sm"
          value={selectedParentId}
          onChange={(e) => {
            setSelectedParentId(e.target.value)
            setEditingId(null)
            clearMessages()
          }}
        >
          <option value="">Choose a group...</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.expense_subtype ? ` — ${p.expense_subtype}` : ""}
              {p.group_type ? ` (${p.group_type})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Add new subcategory */}
      {selectedParentId && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="font-semibold text-sm text-gray-700">
            Step 2 — Add a new subcategory under "{selectedParent?.name}"
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-lg p-2 text-sm"
              placeholder="e.g. Citizenship Fees, Pet Food, HOA Dues..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
              disabled={loading}
            />
            <button
              className="bg-black text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 shrink-0"
              onClick={handleAdd}
              disabled={loading || !newCategoryName.trim()}
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Feedback messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          ✓ {success}
        </div>
      )}

      {/* Step 3: List subcategories */}
      {selectedParentId && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm text-gray-700">
              All subcategories under "{selectedParent?.name}"
            </div>
            <div className="text-xs text-gray-400">
              {subcategories.length} total
            </div>
          </div>

          {subcategories.length === 0 ? (
            <div className="text-sm text-gray-400 py-2">
              No subcategories yet. Add one above!
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSubcategories.map((cat) => {
                const isOwn =
                  cat.created_by === currentUserId && !cat.is_global
                const isEditing = editingId === cat.id
                const isInUse = usedCategoryIds.has(cat.id)

                return (
                 <div
                    key={cat.id}
                    className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-gray-50"
                    onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        const centerY = rect.top + rect.height / 2
                        setOriginY(centerY / window.innerHeight)
                        setSelectedCategory(cat)
                    }}>
                    {isEditing ? (
                      /* ---- EDIT MODE ---- */
                      <div className="flex flex-1 gap-2 flex-wrap">
                        <input
                          className="flex-1 border rounded-lg p-1.5 text-sm min-w-0"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(cat)
                            if (e.key === "Escape") {
                              setEditingId(null)
                              setEditingName("")
                            }
                          }}
                          autoFocus
                          disabled={loading}
                        />
                        <button
                          className="bg-black text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
                          onClick={() => handleSaveEdit(cat)}
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          className="border px-3 py-1.5 rounded-lg text-sm"
                          onClick={() => {
                            setEditingId(null)
                            setEditingName("")
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      /* ---- VIEW MODE ---- */
                      <>
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="font-medium text-sm truncate">
                            {cat.name}
                          </span>
                           <div className="flex items-center gap-2 ml-4 shrink-0">
                          {isOwn ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0 dark:bg-blue-300">
                              Custom
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0 dark:bg-gray-600">
                              Default
                            </span>
                          )}
                          {/* Show "In Use" badge if this category has transactions */}
                          {isInUse && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0 dark:bg-amber-100">
                              In Use
                            </span>
                          )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {typeof window !== "undefined" && createPortal(
  <AnimatePresence>
    {selectedCategory && (
      <>
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setSelectedCategory(null)}
        />

        {/* Modal */}
        <motion.div
          className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
          style={{
            top: "50%",
            transformOrigin: `50% ${originY * 100}%`,
          }}
          initial={{ opacity: 0, x: "-50%", y: "-50%", scale: 0.7 }}
          animate={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
          exit={{ opacity: 0, x: "-50%", y: "-50%", scale: 0.65 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Category Details</h2>
            <button
              onClick={() => setSelectedCategory(null)}
              className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
            <div className="px-6 py-5 space-y-5">
            {/* Info Card */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl divide-y divide-gray-200 dark:divide-gray-700">
                <DetailRow label="Sub-Category Name" value={selectedCategory.name} />
                <DetailRow label="Category Name" value={selectedParent?.name || ""} />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
                {selectedCategory.created_by === currentUserId ? (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
                    Custom
                </span>
                ) : (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                    Default
                </span>
                )}

                {usedCategoryIds.has(selectedCategory.id) && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
                    In Use
                </span>
                )}
            </div>

            {/* Warning */}
            {selectedCategory.created_by === currentUserId &&
                usedCategoryIds.has(selectedCategory.id) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300">
                    <div className="font-semibold">Cannot delete this category</div>
                    <div className="mt-1 text-xs opacity-90">
                    This category has existing transactions. Reassign them before deleting.
                    </div>
                </div>
                )}

            {/* Actions */}
            {selectedCategory.created_by === currentUserId && (
                <div className="flex gap-3 pt-2 pb-4">
                {!usedCategoryIds.has(selectedCategory.id) && (
                    <button
                    className="flex-1 rounded-xl border border-red-200 dark:border-red-900 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => {
                        handleDelete(selectedCategory)
                        setSelectedCategory(null)
                    }}
                    >
                    Delete Category
                    </button>
                )}

                <button
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedCategory(null)}
                >
                    Close
                </button>
                </div>
            )}
            </div>
            </motion.div>
        </>
    )}
    </AnimatePresence>,
document.body
)}

      {/* Tips box */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="font-semibold">How this works</div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm dark:bg-gray-900">
          <li>
            <strong>Custom</strong> (blue) — categories you created. You can
            edit or delete them.
          </li>
          <li>
            <strong>Built-in</strong> (gray) — system categories that can't be
            changed.
          </li>
          <li>
            <strong>In Use</strong> (amber) — has existing transactions. Edit the
            name is fine, but you must reassign those transactions before
            deleting.
          </li>
        </ul>
      </div>
    </div>
  )
}

function DetailRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  )
}
