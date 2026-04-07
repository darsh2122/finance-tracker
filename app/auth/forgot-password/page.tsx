// ─────────────────────────────────────────────────────────────────────────────
// app/auth/forgot-password/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null); setLoading(true)
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) { setMessage({ text: "Please enter your email.", ok: false }); setLoading(false); return }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) setMessage({ text: error.message, ok: false })
      else setMessage({ text: `Password reset email sent to ${cleanEmail}. Check your inbox!`, ok: true })
    } finally { setLoading(false) }
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
              background: "var(--warning-gradient)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28, boxShadow: "var(--clay-sm)",
            }}>🔑</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>Forgot Password?</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, fontWeight: 500 }}>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="clay-form-group">
              <label className="clay-label">Email</label>
              <input className="clay-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <button type="submit" className="clay-btn clay-btn-purple clay-btn-lg" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Sending…" : "📧 Send Reset Link"}
            </button>
          </form>

          {message && (
            <div className={`clay-alert ${message.ok ? "clay-alert-success" : "clay-alert-danger"}`} style={{ marginTop: 16 }}>
              {message.ok ? "✅" : "⚠️"} {message.text}
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
