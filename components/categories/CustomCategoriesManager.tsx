"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"
import { prepareParentCategories, formatParentLabel } from "@/lib/utils/category.utils"
import { ParentCategory } from "@/lib/types/category"

const supabase = createClient()

type Category = {
  id: string; name: string; parent_id: string | null
  is_global: boolean; created_by: string | null; expense_subtype: string | null
}

const GROUP_COLORS: Record<string, string> = {
  income:   "linear-gradient(145deg,#34d399,#059669)",
  expense:  "linear-gradient(145deg,#f87171,#dc2626)",
  transfer: "linear-gradient(135deg,#818cf8,#4f46e5)",
  loan:     "linear-gradient(135deg,#fbbf24,#d97706)",
}
const GROUP_ICONS: Record<string, string> = {
  income: "💰", expense: "📤", transfer: "🔄", loan: "🤝",
}

const styles = `
  .cat-page { min-height:100vh; background:#12091e; color:white; padding-bottom:calc(var(--nav-h,70px) + 20px); }
  .cat-top-bar {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 16px 10px; position:sticky; top:0; z-index:40;
    background:rgba(18,9,30,0.9); backdrop-filter:blur(16px);
    border-bottom:1px solid rgba(139,92,246,0.12);
  }
  .cat-icon-btn {
    width:42px; height:42px; border-radius:13px;
    background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; font-size:18px;
    box-shadow:0 4px 14px rgba(0,0,0,0.3),inset 0 -2px 0 rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.06);
    color:rgba(255,255,255,0.85); text-decoration:none;
  }
  .cat-body { padding:20px 16px; }
  .cat-page-title { font-size:24px; font-weight:900; letter-spacing:-0.5px; }
  .cat-page-sub   { font-size:13px; color:rgba(255,255,255,0.4); font-weight:500; margin-top:3px; }

  /* Parent selector bubbles */
  .cat-groups { display:flex; flex-direction:column; gap:14px; margin:20px 0; }
  .cat-group-label {
    font-size:11px; font-weight:800; color:rgba(255,255,255,0.4);
    text-transform:uppercase; letter-spacing:0.7px; margin-bottom:10px;
    display:flex; align-items:center; gap:8px;
  }
  .cat-group-bubble {
    width:28px; height:28px; border-radius:10px; display:flex;
    align-items:center; justify-content:center; font-size:13px; flex-shrink:0;
    box-shadow:0 3px 10px rgba(0,0,0,0.3),inset 0 -2px 0 rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.28);
  }
  .cat-chips { display:flex; flex-wrap:wrap; gap:8px; }
  .cat-chip {
    padding:9px 16px; border-radius:14px; font-size:13px; font-weight:800;
    cursor:pointer; border:none; font-family:'Nunito',sans-serif;
    transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .cat-chip.active {
    background:linear-gradient(135deg,#7c3aed,#a855f7); color:white;
    box-shadow:0 5px 16px rgba(124,58,237,0.38),inset 0 -2px 0 rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.22);
    transform:scale(1.05) translateY(-1px);
  }
  .cat-chip:not(.active) {
    background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.6);
    border:1px solid rgba(255,255,255,0.1);
  }

  /* Add new section */
  .cat-add-section {
    background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.09);
    border-radius:22px; padding:18px;
    box-shadow:0 4px 20px rgba(0,0,0,0.20),inset 0 -3px 0 rgba(0,0,0,0.14),inset 0 1px 0 rgba(255,255,255,0.04);
    margin-bottom:14px;
  }
  .cat-add-title { font-size:12px; font-weight:800; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.7px; margin-bottom:14px; }
  .cat-input-row { display:flex; gap:10px; }
  .cat-text-input {
    flex:1; padding:13px 16px; border-radius:16px;
    background:rgba(255,255,255,0.07); border:1.5px solid rgba(139,92,246,0.22);
    color:rgba(255,255,255,0.9); font-family:'Nunito',sans-serif;
    font-size:14px; font-weight:700; outline:none;
    box-shadow:inset 0 2px 8px rgba(0,0,0,0.18); transition:border-color 0.18s;
  }
  .cat-text-input::placeholder { color:rgba(255,255,255,0.28); font-weight:500; }
  .cat-text-input:focus { border-color:rgba(139,92,246,0.55); }
  .cat-add-btn {
    padding:13px 18px; border-radius:16px;
    background:linear-gradient(135deg,#7c3aed,#a855f7); color:white;
    font-family:'Nunito',sans-serif; font-size:14px; font-weight:900;
    border:none; cursor:pointer; flex-shrink:0;
    box-shadow:0 5px 14px rgba(124,58,237,0.38),inset 0 -2px 0 rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.22);
    transition:transform 0.15s;
  }
  .cat-add-btn:active { transform:scale(0.95); }
  .cat-add-btn:disabled { opacity:0.5; cursor:not-allowed; }

  /* Alert */
  .cat-alert { padding:12px 14px; border-radius:14px; font-size:13px; font-weight:700; margin-bottom:12px; }
  .cat-alert-green { background:rgba(52,211,153,0.14); color:#6ee7b7; border:1px solid rgba(52,211,153,0.25); }
  .cat-alert-red   { background:rgba(248,113,113,0.14); color:#fca5a5; border:1px solid rgba(248,113,113,0.25); }

  /* Subcategory list */
  .cat-list-section {
    background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.09);
    border-radius:22px; padding:18px;
    box-shadow:0 4px 20px rgba(0,0,0,0.20),inset 0 -3px 0 rgba(0,0,0,0.14),inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .cat-list-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
  .cat-list-title { font-size:12px; font-weight:800; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.7px; }
  .cat-count-badge { font-size:11px; padding:3px 10px; border-radius:100px; background:rgba(139,92,246,0.22); color:#c4b5fd; font-weight:800; }

  .cat-item {
    display:flex; align-items:center; gap:12px; padding:13px 14px;
    border-radius:16px; margin-bottom:8px; cursor:pointer;
    background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.07);
    transition:transform 0.15s;
  }
  .cat-item:active { transform:scale(0.985); }
  .cat-item:last-child { margin-bottom:0; }
  .cat-item-name { flex:1; font-size:14px; font-weight:700; color:rgba(255,255,255,0.88); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .cat-badge { font-size:10px; font-weight:800; padding:3px 9px; border-radius:100px; flex-shrink:0; }
  .cat-badge-custom  { background:rgba(139,92,246,0.22); color:#c4b5fd; }
  .cat-badge-default { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); }
  .cat-badge-inuse   { background:rgba(251,191,36,0.18); color:#fcd34d; }

  /* Edit row */
  .cat-edit-row { display:flex; gap:8px; flex:1; }
  .cat-edit-input {
    flex:1; padding:10px 14px; border-radius:13px;
    background:rgba(255,255,255,0.07); border:1.5px solid rgba(139,92,246,0.3);
    color:white; font-family:'Nunito',sans-serif; font-size:13px; font-weight:700;
    outline:none; box-shadow:inset 0 2px 6px rgba(0,0,0,0.15);
  }
  .cat-edit-save-btn {
    padding:10px 14px; border-radius:13px;
    background:linear-gradient(135deg,#7c3aed,#a855f7); color:white;
    border:none; cursor:pointer; font-family:'Nunito',sans-serif;
    font-size:12px; font-weight:800;
    box-shadow:0 4px 12px rgba(124,58,237,0.35),inset 0 -2px 0 rgba(0,0,0,0.12);
  }
  .cat-edit-cancel-btn {
    padding:10px 14px; border-radius:13px;
    background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.6);
    border:1px solid rgba(255,255,255,0.1); cursor:pointer;
    font-family:'Nunito',sans-serif; font-size:12px; font-weight:800;
  }

  /* Empty */
  .cat-empty { text-align:center; padding:32px 0; }
  .cat-empty-icon { font-size:40px; margin-bottom:10px; }
  .cat-empty-title { font-size:15px; font-weight:700; color:rgba(255,255,255,0.55); }

  /* Tips box */
  .cat-tips {
    background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.2);
    border-radius:20px; padding:16px; margin-top:14px;
  }
  .cat-tips-title { font-size:13px; font-weight:800; color:#c4b5fd; margin-bottom:10px; }
  .cat-tip { display:flex; gap:8px; margin-bottom:8px; font-size:12px; font-weight:500; color:rgba(255,255,255,0.65); line-height:1.5; }
  .cat-tip:last-child { margin-bottom:0; }
  .cat-tip-dot { width:6px; height:6px; border-radius:50%; margin-top:5px; flex-shrink:0; }

  /* Sheet */
  .sheet-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(8px); z-index:200; }
  .sheet-panel {
    position:fixed; bottom:0; left:0; right:0; z-index:201;
    background:#1e1535; border-radius:30px 30px 0 0;
    border-top:1px solid rgba(139,92,246,0.2);
    padding:20px 20px calc(40px + env(safe-area-inset-bottom,0px));
    box-shadow:0 -8px 40px rgba(0,0,0,0.5); max-height:80vh; overflow-y:auto;
  }
  .sheet-handle { width:40px; height:4px; border-radius:100px; background:rgba(255,255,255,0.15); margin:0 auto 22px; }
  .sheet-btn {
    width:100%; padding:15px; border-radius:18px;
    font-family:'Nunito',sans-serif; font-size:14px; font-weight:800;
    cursor:pointer; border:none; display:flex; align-items:center;
    justify-content:center; gap:8px; margin-bottom:10px; transition:transform 0.15s;
  }
  .sheet-btn:active { transform:scale(0.97); }
  .sheet-btn-glass  { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.1); }
  .sheet-btn-danger { background:rgba(248,113,113,0.15); color:#fca5a5; border:1px solid rgba(248,113,113,0.25); }
  .sheet-btn-purple {
    background:linear-gradient(135deg,#7c3aed,#a855f7); color:white;
    box-shadow:0 6px 18px rgba(124,58,237,0.4),inset 0 -3px 0 rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.2);
  }
`

export default function CustomCategoriesManager({
  parents, allCategories, currentUserId, usedCategoryIds,
}: {
  parents: ParentCategory[]
  allCategories: Category[]
  currentUserId: string
  usedCategoryIds: Set<string>
}) {
  const router = useRouter()
  const [selectedParentId, setSelectedParentId] = useState("")
  const [newName, setNewName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)

  const cleanParents = prepareParentCategories(parents)
  const selectedParent = parents.find(p => p.id === selectedParentId)
  const subcategories = selectedParentId ? allCategories.filter(c => c.parent_id === selectedParentId) : []

  const sortedSubs = [...subcategories].sort((a, b) => {
    const aOwn = a.created_by === currentUserId && !a.is_global
    const bOwn = b.created_by === currentUserId && !b.is_global
    if (aOwn !== bOwn) return aOwn ? 1 : -1
    const aU = usedCategoryIds.has(a.id), bU = usedCategoryIds.has(b.id)
    if (aU !== bU) return aU ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  function clear() { setError(""); setSuccess("") }

  async function handleAdd() {
    const name = newName.trim()
    if (!name)             return setError("Please enter a category name")
    if (!selectedParentId) return setError("Please select a category group first")
    if (subcategories.some(c => c.name.toLowerCase() === name.toLowerCase())) return setError(`"${name}" already exists`)
    setLoading(true); clear()
    const { error: e } = await supabase.from("categories").insert({
      name, parent_id: selectedParentId, group_type: null,
      expense_subtype: selectedParent?.expense_subtype ?? null,
      is_global: false, created_by: currentUserId,
    })
    if (e) setError(e.message)
    else { setSuccess(`"${name}" added!`); setNewName(""); router.refresh() }
    setLoading(false)
  }

  async function handleSaveEdit(cat: Category) {
    const name = editingName.trim()
    if (!name) return setError("Name cannot be empty")
    if (subcategories.some(c => c.id !== cat.id && c.name.toLowerCase() === name.toLowerCase())) return setError(`"${name}" already exists`)
    setLoading(true); clear()
    const { error: e } = await supabase.from("categories").update({ name }).eq("id", cat.id).eq("created_by", currentUserId)
    if (e) setError(e.message)
    else { setSuccess(`Renamed to "${name}"`); setEditingId(null); router.refresh() }
    setLoading(false)
  }

  async function handleDelete(cat: Category) {
    if (usedCategoryIds.has(cat.id)) { setError(`Cannot delete "${cat.name}" — reassign its transactions first.`); return }
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return
    setLoading(true); clear()
    const { error: e } = await supabase.from("categories").delete().eq("id", cat.id).eq("created_by", currentUserId)
    if (e) setError(e.message)
    else { setSuccess(`"${cat.name}" deleted.`); setSelectedCat(null); router.refresh() }
    setLoading(false)
  }

  // Group parents by type
  const groupedParents: Record<string, ParentCategory[]> = { income: [], expense: [], transfer: [], loan: [] }
  cleanParents.forEach(p => { if (p.group_type && groupedParents[p.group_type]) groupedParents[p.group_type].push(p) })

  return (
    <>
      <style>{styles}</style>
      <div className="cat-page">
        <div className="cat-top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🏷️</span>
            <span style={{ fontSize: 25, fontWeight: 900 }}>Categories</span>
          </div>
          <div style={{ width: 42 }} />
        </div>

        <div className="cat-body">
          <div className="cat-page-sub">Add custom subcategories to any group</div>
          {/* Parent group selector */}
          <div className="cat-groups">
            {Object.entries(groupedParents).filter(([, items]) => items.length > 0).map(([key, items]) => (
              <div key={key}>
                <div className="cat-group-label">
                  <div className="cat-group-bubble" style={{ background: GROUP_COLORS[key] || "linear-gradient(135deg,#818cf8,#4f46e5)" }}>
                    {GROUP_ICONS[key]}
                  </div>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </div>
                <div className="cat-chips">
                  {items.map(p => (
                    <button
                      key={p.id}
                      className={`cat-chip ${selectedParentId === p.id ? "active" : ""}`}
                      onClick={() => { setSelectedParentId(p.id); setEditingId(null); clear() }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Feedback */}
          {error   && <div className="cat-alert cat-alert-red">⚠️ {error}</div>}
          {success && <div className="cat-alert cat-alert-green">✅ {success}</div>}

          {/* Add new */}
          {selectedParentId && (
            <div className="cat-add-section">
              <div className="cat-add-title">Add to "{selectedParent?.name}"</div>
              <div className="cat-input-row">
                <input
                  className="cat-text-input"
                  placeholder="e.g. Pet Food, Gym…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  disabled={loading}
                />
                <button className="cat-add-btn" onClick={handleAdd} disabled={loading || !newName.trim()}>
                  {loading ? "…" : "Add"}
                </button>
              </div>
            </div>
          )}

          {/* Subcategory list */}
          {selectedParentId && (
            <div className="cat-list-section">
              <div className="cat-list-hdr">
                <div className="cat-list-title">All subcategories</div>
                <span className="cat-count-badge">{subcategories.length}</span>
              </div>

              {subcategories.length === 0 ? (
                <div className="cat-empty">
                  <div className="cat-empty-icon">🏷️</div>
                  <div className="cat-empty-title">No subcategories yet</div>
                </div>
              ) : (
                sortedSubs.map(cat => {
                  const isOwn    = cat.created_by === currentUserId && !cat.is_global
                  const isEditing = editingId === cat.id
                  const isInUse  = usedCategoryIds.has(cat.id)

                  return (
                    <div key={cat.id} className="cat-item" onClick={() => { if (!isEditing) setSelectedCat(cat) }}>
                      {isEditing ? (
                        <div className="cat-edit-row" onClick={e => e.stopPropagation()}>
                          <input
                            className="cat-edit-input"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(cat); if (e.key === "Escape") setEditingId(null) }}
                            autoFocus disabled={loading}
                          />
                          <button className="cat-edit-save-btn" onClick={() => handleSaveEdit(cat)} disabled={loading}>Save</button>
                          <button className="cat-edit-cancel-btn" onClick={() => setEditingId(null)}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div className="cat-item-name">{cat.name}</div>
                          <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                            {isOwn    && <span className="cat-badge cat-badge-custom">Custom</span>}
                            {isInUse  && <span className="cat-badge cat-badge-inuse">In Use</span>}
                            {!isOwn   && <span className="cat-badge cat-badge-default">Built-in</span>}
                          </div>
                          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 18, marginLeft: 4 }}>›</span>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Tips */}
          <div className="cat-tips">
            <div className="cat-tips-title">💡 How it works</div>
            <div className="cat-tip">
              <div className="cat-tip-dot" style={{ background: "#c4b5fd" }} />
              <span><strong style={{ color: "#c4b5fd" }}>Custom</strong> — your own categories. Edit or delete anytime.</span>
            </div>
            <div className="cat-tip">
              <div className="cat-tip-dot" style={{ background: "rgba(255,255,255,0.3)" }} />
              <span><strong style={{ color: "rgba(255,255,255,0.6)" }}>Built-in</strong> — system defaults that cannot be changed.</span>
            </div>
            <div className="cat-tip">
              <div className="cat-tip-dot" style={{ background: "#fcd34d" }} />
              <span><strong style={{ color: "#fcd34d" }}>In Use</strong> — has transactions. Rename freely; reassign before deleting.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category detail bottom sheet */}
      {typeof window !== "undefined" && selectedCat && createPortal(
        <AnimatePresence>
          <motion.div key="overlay" className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCat(null)} />
          <motion.div key="sheet" className="sheet-panel"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="sheet-handle" />

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>
                {selectedParent?.name}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>{selectedCat.name}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {selectedCat.created_by === currentUserId && !selectedCat.is_global
                  ? <span className="cat-badge cat-badge-custom" style={{ padding: "5px 12px", fontSize: 11 }}>Custom</span>
                  : <span className="cat-badge cat-badge-default" style={{ padding: "5px 12px", fontSize: 11 }}>Built-in</span>}
                {usedCategoryIds.has(selectedCat.id) && <span className="cat-badge cat-badge-inuse" style={{ padding: "5px 12px", fontSize: 11 }}>In Use</span>}
              </div>
            </div>

            {selectedCat.created_by === currentUserId && usedCategoryIds.has(selectedCat.id) && (
              <div style={{
                background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)",
                borderRadius: 14, padding: "12px 14px", marginBottom: 16,
                fontSize: 13, fontWeight: 600, color: "#fcd34d", lineHeight: 1.6,
              }}>
                ⚠️ This category has existing transactions. Reassign them before deleting.
              </div>
            )}

            {selectedCat.created_by === currentUserId && !selectedCat.is_global && (
              <>
                <button className="sheet-btn sheet-btn-glass" onClick={() => {
                  setEditingId(selectedCat.id); setEditingName(selectedCat.name); setSelectedCat(null)
                }}>✏️ Rename</button>
                {!usedCategoryIds.has(selectedCat.id) && (
                  <button className="sheet-btn sheet-btn-danger" onClick={() => handleDelete(selectedCat)} disabled={loading}>
                    🗑️ Delete
                  </button>
                )}
              </>
            )}
            <button className="sheet-btn sheet-btn-glass" onClick={() => setSelectedCat(null)}>Close</button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}