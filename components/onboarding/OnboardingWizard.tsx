"use client"

import Link from "next/link"
import { useEffect, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

type Init = {
  name: string
  onboarding_completed: boolean
  onboarding_step: number
  accountsCount: number
  transactionsCount: number
}

type Step = {
  title: string
  goal: string
  check: (state: LiveState) => boolean
  body: (state: LiveState) => React.ReactNode
}

type LiveState = {
  name: string
  accountsCount: number
  transactionsCount: number
}

const MAX_STEP_INDEX = 5
const clampStep = (value: number) => Math.max(0, Math.min(value, MAX_STEP_INDEX))

export default function OnboardingWizard({ initial }: { initial: Init }) {
  const router = useRouter()

  const [stepIndex, setStepIndex] = useState<number>(
    clampStep(initial.onboarding_completed ? 0 : initial.onboarding_step)
  )
  const [displayName, setDisplayName] = useState<string>(initial.name)
  const state: LiveState = {
    name: displayName,
    accountsCount: initial.accountsCount,
    transactionsCount: initial.transactionsCount,
  }
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const user = auth.user

      const metaName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined)
      if (active && metaName?.trim()) setDisplayName(metaName.trim())

      const { data: nameProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()

      if (active && nameProfile?.full_name?.trim()) {
        setDisplayName(nameProfile.full_name.trim())
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_step,onboarding_completed")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.warn("Onboarding profile fetch failed", {
          code: profileError.code,
          message: profileError.message,
          userId: user.id,
        })
      }

      if (!active) return
      if (!nameProfile?.full_name?.trim()) {
        const nextName = (metaName ?? user.email?.split("@")[0] ?? "").trim()
        if (nextName) setDisplayName(nextName)
      }
      if (typeof profile?.onboarding_step !== "number") return
      setStepIndex(clampStep(profile.onboarding_completed ? 0 : profile.onboarding_step))
    })()

    return () => {
      active = false
    }
  }, [])

  const steps: Step[] = [
      {
        title: `Welcome${state.name ? `, ${state.name}` : ""} 👋`,
        goal: "Understand how My Wallet works: Goal is to track money movement.",
        check: () => true,
        body: () => (
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              My Wallet is simple: you only log a transaction when <b>money enters</b> or <b>leaves</b> an account.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Income</b>: money enters your account (Salary, Cash)</li>
              <li><b>Expense</b>: money leaves your account (Dinner, Gas, Phone bill)</li>
              <li><b>Transfer</b>: move between your accounts (Bank → Cash)</li>
              <li><b>Loan</b>: money owed / repaid (Friend paid back)</li>
              <li><b>Shared</b> is an <b>expense subtype</b> (you track split details in Splitwise)</li>
            </ul>
            <div className="rounded-xl border bg-gray-50 p-3">
              <b>Good habit:</b> log it daily so nothing is missed.
            </div>
          </div>
        ),
      },
      {
        title: "Step 1 — Create your accounts",
        goal: "Create at least 1 account (Bank or Cash).",
        check: (s: { accountsCount: number }) => s.accountsCount >= 1,
        body: (s) => (
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Accounts are where your money “lives” (Bank, Cash, Credit Card, Mortgage).
            </p>

            <div className="rounded-xl border bg-white p-3">
              <div className="font-semibold">You currently have</div>
              <div className="text-gray-600">{s.accountsCount} active account(s)</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-lg bg-black text-white px-4 py-2"
                href="/accounts"
                onClick={(e) => {
                  void navigateWithSavedStep(e, "/accounts")
                }}
              >
                Go to Accounts
              </Link>
              <Link
                className="rounded-lg border bg-white px-4 py-2"
                href="/accounts/new"
                onClick={(e) => {
                  void navigateWithSavedStep(e, "/accounts/new")
                }}
              >
                New account
              </Link>
            </div>

            <div className="rounded-xl border bg-gray-50 p-3">
              Suggested starter set (manual): <b>Main Bank</b>, <b>Cash</b>, (optional) <b>Credit Card</b>.
            </div>
          </div>
        ),
      },
      {
        title: "Step 2 — Add income (Salary example)",
        goal: "Create 1 income transaction (Salary).",
        check: (s) => s.transactionsCount >= 1,
        body: () => (
          <div className="space-y-3 text-sm text-gray-700">
            <p>Now add your first transaction.</p>

            <div className="rounded-xl border bg-gray-50 p-3 space-y-1">
              <div><b>Type:</b> Income</div>
              <div><b>Category:</b> Salary</div>
              <div><b>To account:</b> Main Bank</div>
              <div><b>Amount:</b> 3000</div>
              <div><b>Date:</b> today (or last payday)</div>
            </div>

            <Link
              className="rounded-lg bg-black text-white px-4 py-2 inline-block"
              href="/transactions/new"
              onClick={(e) => {
                void navigateWithSavedStep(e, "/transactions/new")
              }}
            >
              Add Transaction
            </Link>
          </div>
        ),
      },
      {
        title: "Step 3 — Add an expense (Dinner example)",
        goal: "Record one expense (Eating Out / Shared Dinner).",
        check: (s: { transactionsCount: number }) => s.transactionsCount >= 2,
        body: () => (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-xl border bg-gray-50 p-3 space-y-1">
              <div><b>Type:</b> Expense</div>
              <div><b>Subtype:</b> Variable (or Shared if you paid for group dinner)</div>
              <div><b>Category:</b> Eating Out (or Shared Dinner)</div>
              <div><b>From account:</b> Main Bank / Credit Card</div>
              <div><b>Amount:</b> 30 (or 120 if shared)</div>
              <div><b>Note:</b> “Logged in Splitwise”</div>
            </div>

            <Link
              className="rounded-lg bg-black text-white px-4 py-2 inline-block"
              href="/transactions/new"
              onClick={(e) => {
                void navigateWithSavedStep(e, "/transactions/new")
              }}
            >
              Add Transaction
            </Link>
          </div>
        ),
      },
      {
        title: "Step 4 — Transfers (Bank → Cash)",
        goal: "Create a transfer transaction.",
        check: (s) => s.transactionsCount >= 3,
        body: () => (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-xl border bg-gray-50 p-3 space-y-1">
              <div><b>Type:</b> Transfer</div>
              <div><b>From:</b> Main Bank</div>
              <div><b>To:</b> Cash</div>
              <div><b>Amount:</b> 100</div>
              <div className="text-gray-600">
                Transfers don’t mean spending — they just move money between your own accounts.
              </div>
            </div>

            <Link
              className="rounded-lg bg-black text-white px-4 py-2 inline-block"
              href="/transactions/new"
              onClick={(e) => {
                void navigateWithSavedStep(e, "/transactions/new")
              }}
            >
              Add Transaction
            </Link>
          </div>
        ),
      },
      {
        title: "Step 5 — Loans (repayment example)",
        goal: "Create a loan transaction (money received back).",
        check: (s: { transactionsCount: number }) => s.transactionsCount >= 4,
        body: () => (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-xl border bg-gray-50 p-3 space-y-1">
              <div><b>Scenario:</b> friend pays you back</div>
              <div><b>Type:</b> Loan</div>
              <div><b>From:</b> Receivable</div>
              <div><b>To:</b> Main Bank</div>
              <div><b>Amount:</b> 50</div>
              <div><b>Description:</b> “Paid back for dinner”</div>
            </div>

            <Link
              className="rounded-lg bg-black text-white px-4 py-2 inline-block"
              href="/transactions/new"
              onClick={(e) => {
                void navigateWithSavedStep(e, "/transactions/new")
              }}
            >
              Add Transaction
            </Link>
          </div>
        ),
      },
  ]

  const step = steps[stepIndex]
  const stepComplete = step.check(state)

  async function saveStep(nextIndex: number, opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setBusy(true)
      setMsg(null)
    }
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        if (!opts?.silent) {
          router.push("/auth/login")
        }
        return false
      }
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_step: nextIndex })
        .eq("id", auth.user.id)

      if (error) {
        if (!opts?.silent) setMsg(error.message)
        return false
      }
      return true
    } finally {
      if (!opts?.silent) {
        setBusy(false)
      }
    }
  }

  async function navigateWithSavedStep(e: MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    const resumeAt = Math.min(stepIndex + 1, steps.length - 1)
    const ok = await saveStep(resumeAt)
    if (ok) router.push(href)
  }

  async function complete() {
    setBusy(true)
    setMsg(null)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.push("/auth/login")
        return
      }

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true, onboarding_step: steps.length - 1 })
        .eq("id", auth.user.id)

      if (error) {
        setMsg(error.message)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">
              Step {stepIndex + 1} of {steps.length}
            </div>
            <div className="text-2xl font-bold">{step.title}</div>
            <div className="text-sm text-gray-600 mt-1">{step.goal}</div>
            <div className="text-xs mt-1">
              {stepComplete ? (
                <span className="text-green-700">Completed</span>
              ) : (
                <span className="text-amber-700">Not completed yet (you can still continue)</span>
              )}
            </div>
          </div>

        </div>

        <div className="mt-4">{step.body(state)}</div>

        {msg && (
          <div className="mt-3 rounded-xl border bg-red-50 p-3 text-sm text-red-700">
            {msg}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={stepIndex === 0 || busy}
            onClick={async () => {
              const next = stepIndex - 1
              setStepIndex(next)
              await saveStep(next)
            }}
            type="button"
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            {initial.onboarding_completed && (
              <Link
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                href="/dashboard"
                onClick={(e) => {
                  void navigateWithSavedStep(e, "/dashboard")
                }}
              >
                Skip for now
              </Link>
            )}

            {stepIndex < steps.length - 1 ? (
              <button
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  const next = stepIndex + 1
                  setStepIndex(next)
                  await saveStep(next)
                }}
                type="button"
              >
                Continue
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
        Tip: You can reopen this tutorial anytime from the sidebar “Tutorial”.
      </div>
    </div>
  )
}
