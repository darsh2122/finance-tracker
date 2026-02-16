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
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanUsername = username.trim()
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard"

      if (mode === "signup") {
        if (!cleanUsername) {
          setMessage("Please enter a username.")
          return
        }

        if (password.length < 6) {
          setMessage("Password must be at least 6 characters.")
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: cleanUsername },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })

        if (error) {
          setMessage(error.message)
          return
        }

        // If email confirmations ON, session will be null
        if (!data.session) {
          const sentAt = data.user?.confirmation_sent_at
          const userEmail = data.user?.email ?? cleanEmail

          setMessage(
            sentAt
              ? `Confirmation email sent to ${userEmail} at ${new Date(sentAt).toLocaleString()}.`
              : `Account created for ${userEmail}. Check your email to confirm.`
          )
          return
        }

        // If confirmations OFF, you may get a session immediately
        router.push(next)
        return

      }

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        setMessage(error.message)
        return
      }

      // Force full navigation so middleware/server always receive latest auth cookies.
      window.location.assign(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">My Wallet</div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className={`flex-1 rounded-xl px-3 py-2 text-sm ${
              mode === "signin" ? "bg-white text-zinc-950 font-semibold" : "bg-white/10"
            }`}
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`flex-1 rounded-xl px-3 py-2 text-sm ${
              mode === "signup" ? "bg-white text-zinc-950 font-semibold" : "bg-white/10"
            }`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-sm text-zinc-300">Your Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your Name"
                autoComplete="username"
                required
              />
            </div>
          )}

          <div>
            <label className="text-sm text-zinc-300">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
            />
          </div>

          <button
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200">
            {message}
          </div>
        )}

        <div className="mt-4 text-xs text-zinc-400">
          {mode === "signup"
            ? "Create your account with your name, email and password."
            : "Sign in with your email and password."}
        </div>

        {/* Forgot password link */}

        <div className="mt-6 text-center text-xs text-zinc-500">
          <a href="/auth/forgot-password" className="hover:underline">
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  )
}
