"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mode = "signin" | "signup"
const supabase = createClient()

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("signin")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null); setLoading(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard"
      if (mode === "signup") {
        if (!username.trim()) { setMessage({ text: "Please enter your name.", ok: false }); return }
        if (password.length < 6) { setMessage({ text: "Password must be at least 6 characters.", ok: false }); return }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { data: { full_name: username.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        })
        if (error) { setMessage({ text: error.message, ok: false }); return }
        if (!data.session) { setMessage({ text: `Check your email at ${data.user?.email ?? cleanEmail} to confirm your account!`, ok: true }); return }
        router.push(next); return
      }
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (error) { setMessage({ text: error.message, ok: false }); return }
      window.location.assign(next)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0ebff",
      backgroundImage: `
        radial-gradient(ellipse at 15% 10%, #ffd6e7 0%, transparent 45%),
        radial-gradient(ellipse at 85% 80%, #d6e8ff 0%, transparent 45%),
        radial-gradient(ellipse at 50% 50%, #e8d6ff 0%, transparent 65%)
      `,
      backgroundAttachment: "fixed",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Card */}
        <div
          className="clay-card-lg anim-pop"
          style={{ padding: "32px 28px" }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: "0 auto 14px",
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30,
              boxShadow: "0 8px 20px rgba(124,58,237,0.40), inset 0 -4px 0 rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,0.28)",
            }}>💸</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>My Wallet</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
              {mode === "signin" ? "Welcome back 👋" : "Create your account 🎉"}
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
            padding: 6, borderRadius: 20, marginBottom: 24,
            background: "var(--surface-soft)",
            boxShadow: "inset 0 2px 6px rgba(109,72,200,0.10), inset 0 1px 3px rgba(0,0,0,0.05)",
          }}>
            {(["signin","signup"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  padding: "11px 10px", borderRadius: 15, border: "none",
                  fontFamily: "Nunito, sans-serif", fontSize: 13, fontWeight: 800,
                  cursor: "pointer", transition: "all 0.22s var(--spring)",
                  background: mode === m ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "transparent",
                  color: mode === m ? "white" : "var(--text-muted)",
                  boxShadow: mode === m
                    ? "0 5px 14px rgba(124,58,237,0.32), inset 0 -2px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.22)"
                    : "none",
                  transform: mode === m ? "scale(1.02)" : "scale(1)",
                }}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div className="clay-form-group">
                <label className="clay-label">Your Name</label>
                <input
                  className="clay-input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="clay-form-group">
              <label className="clay-label">Email</label>
              <input
                className="clay-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="clay-form-group">
              <label className="clay-label">Password</label>
              <input
                className="clay-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            </div>

            <button
              type="submit"
              className="clay-btn clay-btn-purple clay-btn-lg"
              disabled={loading}
              style={{ width: "100%", marginTop: 4 }}
            >
              {loading ? "Please wait…" : mode === "signup" ? "🎉 Create Account" : "🚀 Sign In"}
            </button>
          </form>

          {/* Feedback */}
          {message && (
            <div
              className={`clay-alert ${message.ok ? "alert-green" : "alert-red"}`}
              style={{ marginTop: 16 }}
            >
              {message.ok ? "✅" : "⚠️"} {message.text}
            </div>
          )}

          {/* Forgot password */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="/auth/forgot-password" style={{
              fontSize: 12, color: "var(--text-muted)", fontWeight: 700,
              textDecoration: "none", opacity: 0.8,
            }}>
              Forgot your password?
            </a>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 18, fontWeight: 600 }}>
          🔒 Your data stays private. No ads. Ever.
        </p>
      </div>
    </div>
  )
}
