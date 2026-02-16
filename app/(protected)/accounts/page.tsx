"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

type Account = {
  id: string
  name: string
  type: string
  nature: "asset" | "liability"
  is_default: boolean
  is_archived: boolean
  archived_at: string | null
  archived_reason: string | null
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)

  // menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // rename modal
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameId, setRenameId] = useState<string>("")
  const [renameValue, setRenameValue] = useState<string>("")

  // archive modal
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveId, setArchiveId] = useState<string>("")
  const [archiveReason, setArchiveReason] = useState<string>("")

  useEffect(() => {
    load()
    // close menu on outside click
    const onClick = () => setOpenMenuId(null)
    window.addEventListener("click", onClick)
    return () => window.removeEventListener("click", onClick)
  }, [showArchived])

  async function load() {
    setLoading(true)

    let q = supabase
      .from("accounts")
      .select("id,name,type,nature,is_default,is_archived,archived_at,archived_reason")
      .order("is_archived", { ascending: true })
      .order("is_default", { ascending: false })
      .order("name")

    if (!showArchived) q = q.eq("is_archived", false)

    const { data, error } = await q
    if (error) alert(error.message)
    setAccounts((data || []) as Account[])
    setLoading(false)
  }

  const activeCount = useMemo(
    () => accounts.filter((a) => !a.is_archived).length,
    [accounts]
  )

  function openRename(a: Account) {
    setOpenMenuId(null)
    setRenameId(a.id)
    setRenameValue(a.name)
    setRenameOpen(true)
  }

  function openArchive(a: Account) {
    setOpenMenuId(null)
    if (a.is_default) {
      alert("Set another default before disabling this account.")
      return
    }
    setArchiveId(a.id)
    setArchiveReason(a.archived_reason ?? "")
    setArchiveOpen(true)
  }

  async function saveRename() {
    const name = renameValue.trim()
    if (!name) return alert("Name cannot be empty")

    const { error } = await supabase
      .from("accounts")
      .update({ name })
      .eq("id", renameId)

    if (error) return alert(error.message)

    setRenameOpen(false)
    setRenameId("")
    setRenameValue("")
    load()
  }

  async function setDefault(id: string) {
    setOpenMenuId(null)
    const { error } = await supabase.rpc("set_default_account", {
      p_account_id: id,
    })
    if (error) return alert(error.message)
    load()
  }

  async function confirmArchive() {
    const { error } = await supabase
      .from("accounts")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_reason: archiveReason.trim() ? archiveReason.trim() : null,
        is_default: false, // safety
      })
      .eq("id", archiveId)

    if (error) return alert(error.message)

    setArchiveOpen(false)
    setArchiveId("")
    setArchiveReason("")
    load()
  }

  async function unarchive(a: Account) {
    setOpenMenuId(null)

    const { error } = await supabase
      .from("accounts")
      .update({
        is_archived: false,
        archived_at: null,
        archived_reason: null,
      })
      .eq("id", a.id)

    if (error) return alert(error.message)
    load()
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <div className="text-sm text-gray-500">
            {activeCount} active account{activeCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show disabled
          </label>

          <Link
            href="/accounts/new"
            className="rounded-lg bg-black text-white px-4 py-2"
          >
            New account
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {accounts.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border bg-white px-4 py-3 flex items-center justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="font-semibold truncate">{a.name}</div>

                {a.is_default && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    Default
                  </span>
                )}

                {a.is_archived && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    Disabled
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {a.type} • {a.nature}
                {a.is_archived && a.archived_reason ? (
                  <span className="text-gray-400"> • {a.archived_reason}</span>
                ) : null}
              </div>
            </div>

            {/* Kebab menu */}
            <div className="relative">
              <button
                className="h-9 w-9 rounded-lg border bg-white hover:bg-gray-50 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId(openMenuId === a.id ? null : a.id)
                }}
                aria-label="Account actions"
              >
                ⋯
              </button>

              {openMenuId === a.id && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg overflow-hidden z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MenuItem onClick={() => openRename(a)}>Rename</MenuItem>

                  {!a.is_archived && !a.is_default && (
                    <MenuItem onClick={() => setDefault(a.id)}>
                      Set as default
                    </MenuItem>
                  )}

                  {!a.is_archived ? (
                    <>
                      <div className="h-px bg-gray-100" />
                      <MenuItem danger onClick={() => openArchive(a)}>
                        Disable...
                      </MenuItem>
                    </>
                  ) : (
                    <>
                      <div className="h-px bg-gray-100" />
                      <MenuItem onClick={() => unarchive(a)}>Enable</MenuItem>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rename Modal */}
      {renameOpen && (
        <Modal title="Rename account" onClose={() => setRenameOpen(false)}>
          <input
            className="w-full border rounded-lg p-2"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Account name"
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-4 py-2 rounded-lg border"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-black text-white"
              onClick={saveRename}
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* Disable Modal */}
      {archiveOpen && (
        <Modal title="Disable account" onClose={() => setArchiveOpen(false)}>
          <div className="text-sm text-gray-600">
            This account will be hidden from transaction forms. Existing transactions stay.
          </div>

          <div className="mt-3">
            <label className="text-sm text-gray-600">Disable reason (optional)</label>
            <input
              className="w-full border rounded-lg p-2 mt-1"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="e.g., closed account / mistake"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-4 py-2 rounded-lg border"
              onClick={() => setArchiveOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white"
              onClick={confirmArchive}
            >
              Disable
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
        danger ? "text-red-600" : "text-gray-800"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{title}</div>
          <button className="h-8 w-8 rounded-lg hover:bg-gray-100" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
