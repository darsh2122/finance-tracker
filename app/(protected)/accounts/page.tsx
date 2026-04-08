"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"

const supabase = createClient()

type Account = {
  id: string; name: string; type: string; nature: "asset" | "liability"
  currency: string; is_default: boolean; is_archived: boolean
  archived_at: string | null; archived_reason: string | null
}

const TYPE_ICONS: Record<string, string> = {
  cash: "💵", bank: "🏦", investment: "📈", digital_wallet: "📱",
  credit_card: "💳", mortgage: "🏠", internal: "🔧",
  receivable: "🤝", loan_payable: "📋",
}

const TYPE_COLORS: Record<string, string> = {
  cash: "linear-gradient(145deg,#34d399,#059669)",
  bank: "linear-gradient(135deg,#60a5fa,#2563eb)",
  investment: "linear-gradient(135deg,#818cf8,#4f46e5)",
  digital_wallet: "linear-gradient(135deg,#a78bfa,#7c3aed)",
  credit_card: "linear-gradient(145deg,#f87171,#dc2626)",
  mortgage: "linear-gradient(145deg,#fbbf24,#d97706)",
  internal: "linear-gradient(135deg,#94a3b8,#64748b)",
  receivable: "linear-gradient(135deg,#34d399,#059669)",
  loan_payable: "linear-gradient(145deg,#f87171,#dc2626)",
}

const styles = `
  .accounts-page {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    padding: 0 0 calc(var(--nav-h, 70px) + 20px);
  }
  .acc-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 10px;
    position: sticky;
    top: 0;
    z-index: 40;
    background: var(--surface);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }
  .acc-icon-btn {
    width: 42px; height: 42px; border-radius: 13px;
    background: var(--surface-soft);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 18px;
    box-shadow: var(--clay-card-sm);
    color: var(--text-muted);
    text-decoration: none;
    transition: transform 0.15s;
  }
  .acc-icon-btn:active { transform: scale(0.93); }
  .acc-add-btn {
    background: var(--purple-grad);
    color: white; border-radius: 13px;
    padding: 10px 16px; font-size: 13px; font-weight: 800;
    border: none; cursor: pointer;
    box-shadow: var(--clay-purple);
    display: flex; align-items: center; gap: 6px;
    font-family: 'Nunito', sans-serif;
    text-decoration: none;
    transition: transform 0.15s;
  }
  .acc-add-btn:active { transform: scale(0.95); }
  .acc-body { padding: 20px 16px; }
  .acc-page-title { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: var(--text); }
  .acc-page-sub { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-top: 3px; }

  /* Summary hero — stays the purple gradient in both modes */
  .acc-hero {
    background: var(--green-grad);
    border-radius: 26px; padding: 22px 20px;
    box-shadow: var(--clay-green);
    margin: 16px 0; position: relative; overflow: hidden;
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
  }
  .acc-hero::before { content:''; position:absolute; top:-40%; right:-10%; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.08); pointer-events: none; }
  .acc-hero-pills { display: flex; gap: 10px; flex-wrap: wrap; position: relative; z-index: 1; }
  .acc-mini-pill {
    background: rgba(255, 255, 255, 0.16);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 18px; padding: 12px 14px;
    text-align: center; min-width: 80px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s;
  }
  .acc-mini-pill:active { transform: scale(0.95); }
  .acc-pill-val { font-size: 20px; font-weight: 800; color: white; line-height: 1; }
  .acc-pill-lbl { font-size: 9px; font-weight: 700; color: rgba(255, 255, 255, 0.72); text-transform: uppercase; letter-spacing: 0.6px; margin-top: 4px; }

  /* Section header */
  .acc-section-hdr { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 12px; }
  .acc-section-title { font-size: 13px; font-weight: 800; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.8px; }

  /* Account card */
  .acc-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 22px; padding: 16px 18px;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 10px; cursor: pointer;
    box-shadow: var(--clay-card-sm);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .acc-card:active { transform: scale(0.985); }
  .acc-card.archived { opacity: 0.5; }

  /* Icon bubble */
  .acc-bubble {
    width: 46px; height: 46px; border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; flex-shrink: 0;
    box-shadow: var(--clay-icon);
  }
  .acc-card-name { font-size: 15px; font-weight: 800; color: var(--text); }
  .acc-card-sub  { font-size: 12px; color: var(--text-muted); font-weight: 600; margin-top: 3px; }
  .acc-card-chevron { font-size: 20px; color: var(--text-faint); margin-left: auto; }

  .acc-badge {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 3px 9px; border-radius: 100px; font-size: 10px; font-weight: 800;
    margin-left: 8px;
  }
  .badge-default { background: var(--purple-pale); color: var(--purple); }
  .badge-archived { background: rgba(251,191,36,0.2); color: var(--amber); }

  /* Empty state */
  .acc-empty { text-align: center; padding: 50px 20px; }
  .acc-empty-icon { font-size: 52px; margin-bottom: 16px; }
  .acc-empty-title { font-size: 18px; font-weight: 800; color: var(--text-soft); }
  .acc-empty-sub { font-size: 13px; color: var(--text-muted); margin-top: 6px; font-weight: 500; }

  /* Toggle archived */
  .acc-toggle-btn {
    padding: 8px 16px; border-radius: 100px; border: 1px solid var(--border);
    background: var(--surface-soft); color: var(--text-muted);
    font-size: 12px; font-weight: 700; cursor: pointer;
    font-family: 'Nunito', sans-serif;
    transition: all 0.18s;
  }
  .acc-toggle-btn.on { background: var(--purple-pale); border-color: var(--border-mid); color: var(--purple); }

  /* Bottom sheet */
  .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); z-index: 200; }
  .sheet-panel {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 201;
    background: var(--surface-tinted);
    border-radius: 30px 30px 0 0;
    border-top: 1px solid var(--border-mid);
    padding: 20px 20px calc(40px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -8px 40px rgba(0,0,0,0.35);
    max-height: 85vh; overflow-y: auto;
  }
  .sheet-handle {
    width: 40px; height: 4px; border-radius: 100px;
    background: var(--border-mid); margin: 0 auto 22px;
  }
  .sheet-action-btn {
    width: 100%; padding: 15px; border-radius: 18px;
    font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800;
    cursor: pointer; border: none; display: flex; align-items: center;
    justify-content: center; gap: 8px; margin-bottom: 10px;
    transition: transform 0.15s;
  }
  .sheet-action-btn:active { transform: scale(0.97); }
  .btn-purple {
    background: var(--purple-grad); color: white;
    box-shadow: var(--clay-purple);
  }
  .btn-glass {
    background: var(--surface-soft); color: var(--text-muted);
    border: 1px solid var(--border);
  }
  .btn-danger {
    background: rgba(248,113,113,0.15); color: var(--red-light);
    border: 1px solid rgba(248,113,113,0.25);
  }
  .btn-success {
    background: rgba(52,211,153,0.15); color: var(--green-light);
    border: 1px solid rgba(52,211,153,0.25);
  }
  .sheet-input {
    width: 100%; padding: 14px 16px; border-radius: 16px;
    background: var(--surface); border: 1.5px solid var(--border-mid);
    color: var(--text); font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 700;
    box-shadow: var(--clay-inset); outline: none;
    transition: border-color 0.18s;
  }
  .sheet-input::placeholder { color: var(--text-faint); font-weight: 500; }
  .sheet-input:focus { border-color: var(--purple-mid); box-shadow: var(--clay-inset), 0 0 0 3px rgba(124,58,237,0.12); }
  .sheet-label { font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; display: block; }
  .sheet-info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .sheet-info-label { font-size: 13px; color: var(--text-muted); font-weight: 600; }
  .sheet-info-val   { font-size: 13px; color: var(--text); font-weight: 700; text-transform: capitalize; }
`

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedAcc, setSelectedAcc] = useState<Account | null>(null)
  const [mode, setMode] = useState<"view" | "rename" | "archive">("view")
  const [renameVal, setRenameVal] = useState("")
  const [archiveReason, setArchiveReason] = useState("")
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    let q = supabase
      .from("accounts")
      .select("id,name,type,nature,currency,is_default,is_archived,archived_at,archived_reason")
      .order("is_default", { ascending: false })
      .order("name")
    if (!showArchived) q = q.eq("is_archived", false)
    const { data, error } = await q
    if (error) console.error(error)
    setAccounts((data || []) as Account[])
    setLoading(false)
  }

  useEffect(() => { load() }, [showArchived])

  const active = useMemo(() => accounts.filter(a => !a.is_archived), [accounts])
  const assets = useMemo(() => active.filter(a => a.nature === "asset").length, [active])
  const liabs = useMemo(() => active.filter(a => a.nature === "liability").length, [active])

  function openSheet(acc: Account) { setSelectedAcc(acc); setMode("view"); setRenameVal(acc.name); setArchiveReason("") }
  function closeSheet() { setSelectedAcc(null); setMode("view") }

  async function saveRename() {
    if (!renameVal.trim() || !selectedAcc) return
    setBusy(true)
    const { error } = await supabase.from("accounts").update({ name: renameVal.trim() }).eq("id", selectedAcc.id)
    if (error) alert(error.message)
    else { closeSheet(); load() }
    setBusy(false)
  }

  async function setDefault(id: string) {
    setBusy(true)
    const { error } = await supabase.rpc("set_default_account", { p_account_id: id })
    if (error) alert(error.message)
    else { closeSheet(); load() }
    setBusy(false)
  }

  async function confirmArchive() {
    if (!selectedAcc) return
    setBusy(true)
    const { error } = await supabase.from("accounts").update({
      is_archived: true, archived_at: new Date().toISOString(),
      archived_reason: archiveReason.trim() || null, is_default: false,
    }).eq("id", selectedAcc.id)
    if (error) alert(error.message)
    else { closeSheet(); load() }
    setBusy(false)
  }

  async function unarchive(id: string) {
    setBusy(true)
    const { error } = await supabase.from("accounts").update({ is_archived: false, archived_at: null, archived_reason: null }).eq("id", id)
    if (error) alert(error.message)
    else { closeSheet(); load() }
    setBusy(false)
  }

  return (
    <>
      <style>{styles}</style>
      <div className="accounts-page">

        {/* Top bar */}
        <div className="acc-top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🏦</span>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Accounts</span>
          </div>
          <Link href="/accounts/new" className="acc-add-btn">
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Account
          </Link>
        </div>

        <div className="acc-body">
          {/* Hero summary */}
          <div className="acc-hero">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.78)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
                🏦 OVERVIEW
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: "white", letterSpacing: "-1px" }}>{active.length}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>active accounts</div>
            </div>
            <div className="acc-hero-pills">
              <div className="acc-mini-pill">
                <div className="acc-pill-val">{assets}</div>
                <div className="acc-pill-lbl">Assets</div>
              </div>
              <div className="acc-mini-pill">
                <div className="acc-pill-val">{liabs}</div>
                <div className="acc-pill-lbl">Debts</div>
              </div>
            </div>
          </div>

          {/* Toggle archived */}
          <div style={{ marginBottom: 16 }}>
            <button
              className={`acc-toggle-btn ${showArchived ? "on" : ""}`}
              onClick={() => setShowArchived(v => !v)}
            >
              {showArchived ? "✓ Showing disabled" : "Show disabled accounts"}
            </button>
          </div>

          {/* Account list */}
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="acc-card" style={{ height: 78, background: "rgba(255,255,255,0.04)", cursor: "default" }} />
            ))
          ) : accounts.length === 0 ? (
            <div className="acc-empty">
              <div className="acc-empty-icon">🏦</div>
              <div className="acc-empty-title">No accounts yet</div>
              <div className="acc-empty-sub">Add your first account to start tracking</div>
              <Link href="/accounts/new" className="acc-add-btn" style={{ marginTop: 20, display: "inline-flex" }}>
                + Create Account
              </Link>
            </div>
          ) : (
            <>
              {/* Active */}
              {accounts.filter(a => !a.is_archived).length > 0 && (
                <>
                  <div className="acc-section-hdr">
                    <div className="acc-section-title">Active</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{accounts.filter(a => !a.is_archived).length}</div>
                  </div>
                  {accounts.filter(a => !a.is_archived).map(acc => (
                    <div key={acc.id} className="acc-card" onClick={() => openSheet(acc)}>
                      <div className="acc-bubble" style={{ background: TYPE_COLORS[acc.type] ?? TYPE_COLORS.bank }}>
                        {TYPE_ICONS[acc.type] ?? "💰"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="acc-card-name" style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                          {acc.name}
                          {acc.is_default && <span className="acc-badge badge-default">⭐ Default</span>}
                        </div>
                        <div className="acc-card-sub">
                          {acc.type.replace("_", " ")} · {acc.nature} · {acc.currency}
                        </div>
                      </div>
                      <div className="acc-card-chevron">›</div>
                    </div>
                  ))}
                </>
              )}
              {/* Archived */}
              {showArchived && accounts.filter(a => a.is_archived).length > 0 && (
                <>
                  <div className="acc-section-hdr" style={{ marginTop: 24 }}>
                    <div className="acc-section-title">Disabled</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{accounts.filter(a => a.is_archived).length}</div>
                  </div>
                  {accounts.filter(a => a.is_archived).map(acc => (
                    <div key={acc.id} className="acc-card archived" onClick={() => openSheet(acc)}>
                      <div className="acc-bubble" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {TYPE_ICONS[acc.type] ?? "💰"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="acc-card-name" style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                          {acc.name}
                          <span className="acc-badge badge-archived">Disabled</span>
                        </div>
                        <div className="acc-card-sub">{acc.type.replace("_", " ")} · {acc.currency}</div>
                      </div>
                      <div className="acc-card-chevron">›</div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom sheet */}
      {typeof window !== "undefined" && selectedAcc && createPortal(
        <AnimatePresence>
          <motion.div key="overlay" className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSheet} />
          <motion.div key="sheet" className="sheet-panel"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="sheet-handle" />

            {mode === "rename" ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 900, color: "white", marginBottom: 20 }}>✏️ Rename Account</div>
                <label className="sheet-label">Account Name</label>
                <input className="sheet-input" value={renameVal} onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveRename()} autoFocus />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                  <button className="sheet-action-btn btn-glass" onClick={() => setMode("view")}>Cancel</button>
                  <button className="sheet-action-btn btn-purple" onClick={saveRename} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                </div>
              </>
            ) : mode === "archive" ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 900, color: "white", marginBottom: 8 }}>🗑️ Disable Account</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500, marginBottom: 20, lineHeight: 1.6 }}>
                  This account will be hidden from transaction forms. Existing transactions stay.
                </p>
                <label className="sheet-label">Reason (optional)</label>
                <input className="sheet-input" value={archiveReason} onChange={e => setArchiveReason(e.target.value)} placeholder="e.g. closed account" style={{ marginBottom: 14 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button className="sheet-action-btn btn-glass" onClick={() => setMode("view")}>Cancel</button>
                  <button className="sheet-action-btn btn-danger" onClick={confirmArchive} disabled={busy}>{busy ? "Disabling…" : "Disable"}</button>
                </div>
              </>
            ) : (
              <>
                {/* Account info header */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
                  <div className="acc-bubble" style={{ width: 56, height: 56, borderRadius: 20, fontSize: 26, background: TYPE_COLORS[selectedAcc.type] ?? TYPE_COLORS.bank }}>
                    {TYPE_ICONS[selectedAcc.type] ?? "💰"}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>{selectedAcc.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 3, fontWeight: 600 }}>
                      {selectedAcc.type.replace("_", " ")} · {selectedAcc.nature} · {selectedAcc.currency}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {selectedAcc.is_default && <span className="acc-badge badge-default">⭐ Default</span>}
                      {selectedAcc.is_archived && <span className="acc-badge badge-archived">Disabled</span>}
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: "0 16px", marginBottom: 20 }}>
                  {[
                    { label: "Type", val: selectedAcc.type.replace("_", " ") },
                    { label: "Nature", val: selectedAcc.nature },
                    { label: "Currency", val: selectedAcc.currency },
                    { label: "Default", val: selectedAcc.is_default ? "Yes" : "No" },
                    { label: "Status", val: selectedAcc.is_archived ? "Disabled" : "Active" },
                  ].map(row => (
                    <div key={row.label} className="sheet-info-row">
                      <span className="sheet-info-label">{row.label}</span>
                      <span className="sheet-info-val">{row.val}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <button className="sheet-action-btn btn-glass" onClick={() => setMode("rename")}>✏️ Rename Account</button>
                {!selectedAcc.is_archived && !selectedAcc.is_default && (
                  <button className="sheet-action-btn btn-glass" onClick={() => setDefault(selectedAcc.id)} disabled={busy}>⭐ Set as Default</button>
                )}
                {!selectedAcc.is_archived ? (
                  <button className="sheet-action-btn btn-danger" onClick={() => {
                    if (selectedAcc.is_default) { alert("Please set another default account first."); return }
                    setMode("archive")
                  }}>🗑️ Disable Account</button>
                ) : (
                  <button className="sheet-action-btn btn-success" onClick={() => unarchive(selectedAcc.id)} disabled={busy}>✅ Re-enable Account</button>
                )}
                <button className="sheet-action-btn btn-glass" style={{ marginTop: 4 }} onClick={closeSheet}>Close</button>
              </>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}