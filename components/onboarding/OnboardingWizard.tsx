"use client"

/**
 * OnboardingWizard
 *
 * Currency changes:
 * - Step 0 is now a currency selection step (was the "Welcome" step).
 * - "Welcome" is now Step 1.
 * - The currency selection saves via the set_user_base_currency RPC.
 * - The rest of the steps are unchanged.
 *
 * Why add currency to onboarding?
 *   Without it, every user's first account defaults to CAD even if they're
 *   in the UK or India. By asking upfront, the new account form will
 *   pre-fill with the right currency from the very first time.
 */

import Link from "next/link"
import { useEffect, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCurrency } from "@/lib/context/CurrencyContext"

const supabase = createClient()

type Init = {
  name: string
  onboarding_completed: boolean
  onboarding_step: number
  accountsCount: number
  transactionsCount: number
}

type LiveState = {
  name: string
  accountsCount: number
  transactionsCount: number
  baseCurrency: string
}

type Step = {
  title: string
  goal: string
  check: (state: LiveState) => boolean
  body: (state: LiveState) => React.ReactNode
}

const MAX_STEP_INDEX = 6       // 7 steps: 0–6
const clampStep = (value: number) => Math.max(0, Math.min(value, MAX_STEP_INDEX))

export default function OnboardingWizard({ initial }: { initial: Init }) {
  const router = useRouter()
  const { currencies } = useCurrency()

  const [stepIndex, setStepIndex] = useState<number>(
    clampStep(initial.onboarding_completed ? 0 : initial.onboarding_step)
  )
  const [displayName, setDisplayName] = useState<string>(initial.name)
  const [baseCurrency, setBaseCurrency] = useState<string>("CAD")
  const [localCurrency, setLocalCurrency] = useState<string>("CAD")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Load profile data on mount
  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const metaName =
        (auth.user.user_metadata?.full_name as string | undefined) ??
        (auth.user.user_metadata?.name as string | undefined)

      const [{ data: profile }, { data: onboardingProf }] = await Promise.all([
        supabase.from("profiles").select("full_name,base_currency").eq("id", auth.user.id).single(),
        supabase.from("profiles").select("onboarding_step,onboarding_completed").eq("id", auth.user.id).maybeSingle(),
      ])

      if (!active) return

      if (profile?.full_name) setDisplayName(profile.full_name)
      else if (metaName) setDisplayName(metaName)

      if (profile?.base_currency) {
        setBaseCurrency(profile.base_currency)
        setLocalCurrency(profile.base_currency)
      }

      if (typeof onboardingProf?.onboarding_step === "number") {
        setStepIndex(clampStep(onboardingProf.onboarding_completed ? 0 : onboardingProf.onboarding_step))
      }
    })()
    return () => { active = false }
  }, [])

  const state: LiveState = {
    name: displayName,
    accountsCount: initial.accountsCount,
    transactionsCount: initial.transactionsCount,
    baseCurrency,
  }

  // ── Currency save helper ────────────────────────────────────────────────────
  async function saveCurrency(code: string): Promise<boolean> {
    const { error } = await supabase.rpc("set_user_base_currency", { p_currency: code })
    if (error) { setMsg(error.message); return false }
    setBaseCurrency(code)
    return true
  }

  // ── Steps ───────────────────────────────────────────────────────────────────
  const steps: Step[] = [
    // ── Step 0: Currency selection (NEW) ─────────────────────────────────────
    {
      title: "Choose your currency 💱",
      goal: "Pick the currency you use for most transactions.",
      check: () => true,   // always considered complete
      body: () => (
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            This will be the default currency for your accounts and dashboard
            summaries. You can always change it later in{" "}
            <strong>Settings → Display Currency</strong>.
          </p>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Your primary currency
            </label>
            <select
              className="w-full border rounded-lg p-2"
              value={localCurrency}
              onChange={(e) => setLocalCurrency(e.target.value)}
            >
              {currencies.length === 0 && (
                <option value={localCurrency}>{localCurrency}</option>
              )}
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border bg-gray-50 p-3">
            <strong>Note:</strong> Picking your currency here does not convert
            any amounts. Each account can still hold a different currency if
            needed.
          </div>
        </div>
      ),
    },

    // ── Step 1: Welcome ───────────────────────────────────────────────────────
    {
      title: `Welcome${state.name ? `, ${state.name}` : ""} 👋`,
      goal: "Understand how My Wallet works.",
      check: () => true,
      body: () => (
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            My Wallet is simple: you only log a transaction when{" "}
            <b>money enters</b> or <b>leaves</b> an account.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Income</b>: money enters your account (Salary, Cash)</li>
            <li><b>Expense</b>: money leaves your account (Dinner, Gas)</li>
            <li><b>Transfer</b>: move between your accounts (Bank → Cash)</li>
            <li><b>Loan</b>: money owed / repaid (Friend paid back)</li>
            <li><b>Shared</b>: an expense subtype — you paid for others</li>
          </ul>
          <div className="rounded-xl border bg-gray-50 p-3">
            <b>Good habit:</b> log it daily so nothing is missed.
          </div>
        </div>
      ),
    },

    // ── Step 2: Create accounts ───────────────────────────────────────────────
    {
      title: "Step 1 — Create your accounts",
      goal: "Create at least 1 account (Bank or Cash).",
      check: (s) => s.accountsCount >= 1,
      body: (s) => (
        <div className="space-y-3 text-sm text-gray-700">
          <p>Accounts are where your money "lives" (Bank, Cash, Credit Card).</p>
          <div className="rounded-xl border bg-white p-3">
            <div className="font-semibold">You currently have</div>
            <div className="text-gray-600">{s.accountsCount} active account(s)</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-lg bg-black text-white px-4 py-2"
              href="/accounts"
              onClick={(e) => { void navigateWithSavedStep(e, "/accounts") }}
            >
              Go to Accounts
            </Link>
            <Link
              className="rounded-lg border bg-white px-4 py-2"
              href="/accounts/new"
              onClick={(e) => { void navigateWithSavedStep(e, "/accounts/new") }}
            >
              New account
            </Link>
          </div>
          <div className="rounded-xl border bg-gray-50 p-3">
            Suggested starter set: <b>Main Bank</b>, <b>Cash</b>,{" "}
            (optional) <b>Credit Card</b>. Each will default to{" "}
            <b>{s.baseCurrency}</b>.
          </div>
        </div>
      ),
    },

    // ── Step 3: Add income ────────────────────────────────────────────────────
    {
      title: "Step 2 — Add income (Salary example)",
      goal: "Create 1 income transaction.",
      check: (s) => s.transactionsCount >= 1,
      body: () => (
        <div className="space-y-3 text-sm text-gray-700">
          <p>Now add your first transaction.</p>
          <div className="rounded-xl border bg-gray-50 p-3 space-y-1">
            <div><b>Category:</b> Income → Salary</div>
            <div><b>To account:</b> Main Bank</div>
            <div><b>Amount:</b> 3000</div>
            <div><b>Date:</b> today (or last payday)</div>
          </div>
          <Link
            className="rounded-lg bg-black text-white px-4 py-2 inline-block"
            href="/transactions/new"
            onClick={(e) => { void navigateWithSavedStep(e, "/transactions/new") }}
          >
            Add Transaction
          </Link>
        </div>
      ),
    },

    // ── Step 4: Add an expense ────────────────────────────────────────────────
    {
      title: "Step 3 — Add an expense",
      goal: "Record one expense.",
      check: (s) => s.transactionsCount >= 2,
      body: () => (
        <div className="space-y-3 text-sm text-gray-700">
          <div className="rounded-xl border bg-gray-50 p-3 space-y-1">
            <div><b>Category:</b> Expense → Variable → Eating Out</div>
            <div><b>From account:</b> Main Bank / Credit Card</div>
            <div><b>Amount:</b> 30</div>
          </div>
          <Link
            className="rounded-lg bg-black text-white px-4 py-2 inline-block"
            href="/transactions/new"
            onClick={(e) => { void navigateWithSavedStep(e, "/transactions/new") }}
          >
            Add Transaction
          </Link>
        </div>
      ),
    },

    // ── Step 5: Transfers ─────────────────────────────────────────────────────
    {
      title: "Step 4 — Transfers (Bank → Cash)",
      goal: "Create a transfer transaction.",
      check: (s) => s.transactionsCount >= 3,
      body: () => (
        <div className="space-y-3 text-sm text-gray-700">
          <div className="rounded-xl border bg-gray-50 p-3 space-y-1">
            <div><b>Category:</b> Transfer</div>
            <div><b>From:</b> Main Bank</div>
            <div><b>To:</b> Cash</div>
            <div><b>Amount:</b> 100</div>
            <div className="text-gray-500 text-xs">
              Both accounts must be in the same currency.
            </div>
          </div>
          <Link
            className="rounded-lg bg-black text-white px-4 py-2 inline-block"
            href="/transactions/new"
            onClick={(e) => { void navigateWithSavedStep(e, "/transactions/new") }}
          >
            Add Transaction
          </Link>
        </div>
      ),
    },

    // ── Step 6: Loans ─────────────────────────────────────────────────────────
    {
      title: "Step 5 — Loans (repayment example)",
      goal: "Create a loan transaction.",
      check: (s) => s.transactionsCount >= 4,
      body: () => (
        <div className="space-y-3 text-sm text-gray-700">
          <div className="rounded-xl border bg-gray-50 p-3 space-y-1">
            <div><b>Scenario:</b> friend pays you back</div>
            <div><b>Category:</b> Loan → Receivable repayment</div>
            <div><b>From:</b> Receivable account</div>
            <div><b>To:</b> Main Bank</div>
            <div><b>Amount:</b> 50</div>
          </div>
          <Link
            className="rounded-lg bg-black text-white px-4 py-2 inline-block"
            href="/transactions/new"
            onClick={(e) => { void navigateWithSavedStep(e, "/transactions/new") }}
          >
            Add Transaction
          </Link>
        </div>
      ),
    },
  ]

  // ── Step persistence helpers ────────────────────────────────────────────────

  async function saveStep(nextIndex: number, opts?: { silent?: boolean }) {
    if (!opts?.silent) { setBusy(true); setMsg(null) }
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { if (!opts?.silent) router.push("/auth/login"); return false }

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_step: nextIndex })
        .eq("id", auth.user.id)

      if (error) { if (!opts?.silent) setMsg(error.message); return false }
      return true
    } finally {
      if (!opts?.silent) setBusy(false)
    }
  }

  async function navigateWithSavedStep(e: MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    const resumeAt = Math.min(stepIndex + 1, steps.length - 1)
    const ok = await saveStep(resumeAt)
    if (ok) router.push(href)
  }

  async function complete() {
    setBusy(true); setMsg(null)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { router.push("/auth/login"); return }
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true, onboarding_step: steps.length - 1 })
        .eq("id", auth.user.id)
      if (error) { setMsg(error.message); return }
      router.push("/dashboard")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  // ── Step navigation ─────────────────────────────────────────────────────────

  async function goNext() {
    // On step 0 (currency selection), save the chosen currency first
    if (stepIndex === 0) {
      setBusy(true)
      const ok = await saveCurrency(localCurrency)
      setBusy(false)
      if (!ok) return
    }
    const next = stepIndex + 1
    setStepIndex(next)
    await saveStep(next)
  }

  async function goBack() {
    const next = stepIndex - 1
    setStepIndex(next)
    await saveStep(next)
  }

  const step = steps[stepIndex]
  const stepComplete = step.check(state)

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div>
          <div className="text-xs text-gray-500">
            Step {stepIndex + 1} of {steps.length}
          </div>
          <div className="text-2xl font-bold">{step.title}</div>
          <div className="text-sm text-gray-600 mt-1">{step.goal}</div>
          <div className="text-xs mt-1">
            {stepComplete ? (
              <span className="text-green-700">✓ Completed</span>
            ) : (
              <span className="text-amber-700">Not completed yet (you can still continue)</span>
            )}
          </div>
        </div>

        <div className="mt-4">{step.body(state)}</div>

        {msg && (
          <div className="mt-3 rounded-xl border bg-red-50 p-3 text-sm text-red-700">{msg}</div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={stepIndex === 0 || busy}
            onClick={goBack}
            type="button"
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            {initial.onboarding_completed && (
              <Link
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                href="/dashboard"
                onClick={(e) => { void navigateWithSavedStep(e, "/dashboard") }}
              >
                Skip for now
              </Link>
            )}

            {stepIndex < steps.length - 1 ? (
              <button
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy}
                onClick={goNext}
                type="button"
              >
                {stepIndex === 0 ? "Save & Continue" : "Continue"}
              </button>
            ) : (
              <button
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy}
                onClick={complete}
                type="button"
              >
                Finish & Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Tip: You can reopen this tutorial anytime from the sidebar "Tutorial".
      </div>
    </div>
  )
}
