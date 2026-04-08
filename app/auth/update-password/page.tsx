// ─────────────────────────────────────────────────────────────────────────────
// app/auth/update-password/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function UpdatePasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setLoading(false)
    })
  }, [])

  async function handleUpdate() {
    setUpdating(true); setError(""); setMessage("")
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setUpdating(false); return }
    setMessage("Password updated! Redirecting…")
    setTimeout(() => router.push("/auth/login"), 1500)
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-gradient)", backgroundAttachment: "fixed",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="clay-card-lg animate-pop">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "var(--r-lg)", margin: "0 auto 14px",
              background: "var(--success-gradient)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28, boxShadow: "var(--clay-success)",
            }}>🔒</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>Set New Password</h1>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>Loading…</div>
          ) : !hasSession ? (
            <div>
              <div className="clay-alert clay-alert-danger" style={{ marginBottom: 16 }}>
                ⚠️ Invalid or expired reset link.
              </div>
              <Link href="/auth/forgot-password" className="clay-btn clay-btn-primary" style={{ width: "100%", textDecoration: "none", display: "flex", justifyContent: "center" }}>
                Request New Link
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="clay-form-group">
                <label className="clay-label">New Password</label>
                <input className="clay-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <button className="clay-btn clay-btn-purple clay-btn-lg" onClick={handleUpdate} disabled={updating} style={{ width: "100%" }}>
                {updating ? "Updating…" : "🔒 Update Password"}
              </button>
              {error   && <div className="clay-alert clay-alert-danger">⚠️ {error}</div>}
              {message && <div className="clay-alert clay-alert-success">✅ {message}</div>}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Link href="/auth/login" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, textDecoration: "none" }}>
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
