"use client"
// components/onboarding/OnboardingWizard.tsx
// Full-page VERTICAL snap scroll — each step is a full viewport height snap section.

import Link from "next/link"
import { useEffect, useRef, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCurrency } from "@/lib/context/CurrencyContext"

const supabase = createClient()

type Init = {
  name: string; onboarding_completed: boolean; onboarding_step: number
  accountsCount: number; transactionsCount: number
}
type LiveState = { name: string; accountsCount: number; transactionsCount: number; baseCurrency: string }

const MAX_STEP = 6
const clamp = (v: number) => Math.max(0, Math.min(v, MAX_STEP))

type Step = {
  emoji: string; title: string; goal: string
  gradient: string; accent: string
  check: (s: LiveState) => boolean
}

const STEPS: Step[] = [
  { emoji: "💱", title: "Choose your currency", goal: "Pick your primary currency", gradient: "linear-gradient(135deg,#818cf8,#4f46e5)", accent: "#818cf8", check: () => true },
  { emoji: "👋", title: "Welcome!", goal: "Understand how My Wallet works", gradient: "linear-gradient(135deg,#7c3aed,#a855f7)", accent: "#a855f7", check: () => true },
  { emoji: "🏦", title: "Create your accounts", goal: "Add at least 1 account", gradient: "linear-gradient(135deg,#60a5fa,#2563eb)", accent: "#60a5fa", check: s => s.accountsCount >= 1 },
  { emoji: "💰", title: "Add your first income", goal: "Log 1 income transaction", gradient: "linear-gradient(145deg,#34d399,#059669)", accent: "#34d399", check: s => s.transactionsCount >= 1 },
  { emoji: "📤", title: "Add an expense", goal: "Log 1 expense transaction", gradient: "linear-gradient(145deg,#f87171,#dc2626)", accent: "#f87171", check: s => s.transactionsCount >= 2 },
  { emoji: "🔄", title: "Try a transfer", goal: "Move money between accounts", gradient: "linear-gradient(135deg,#818cf8,#4f46e5)", accent: "#818cf8", check: s => s.transactionsCount >= 3 },
  { emoji: "🤝", title: "Loans & repayments", goal: "Log 1 loan transaction", gradient: "linear-gradient(135deg,#fbbf24,#d97706)", accent: "#fbbf24", check: s => s.transactionsCount >= 4 },
]

const STEP_ACTIONS: Record<number, { href: string; label: string } | null> = {
  2: { href: "/accounts/new", label: "🏦 Create Account" },
  3: { href: "/transactions/new", label: "💰 Add Income" },
  4: { href: "/transactions/new", label: "📤 Add Expense" },
  5: { href: "/transactions/new", label: "🔄 Add Transfer" },
  6: { href: "/transactions/new", label: "🤝 Add Loan" },
}

const styles = `
  .ob-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100dvh;
    background: var(--bg);
  }
  @media (min-width: 768px) {
    .ob-wrapper {
      height: 100vh;
      padding: 40px;
    }
  }

  .ob-snap-container {
    width: 100%;
    height: 100%;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    background: var(--bg);
    position: relative;
  }
  @media (min-width: 768px) {
    .ob-snap-container {
      max-width: 440px;
      height: 80vh;
      max-height: 750px;
      border-radius: var(--r-2xl);
      box-shadow: var(--clay-sidebar);
      border: 1px solid var(--border);
      background: var(--surface);
    }
  }
  .ob-snap-container::-webkit-scrollbar { display: none; }

  .ob-snap-slide {
    height: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    display: flex; flex-direction: column;
    position: relative; overflow: hidden;
  }

  .ob-slide-header {
    flex: 0 0 auto; padding: 20px 20px 28px;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; justify-content: flex-end;
    min-height: 5svh;
  }
  .ob-slide-header::before { content:''; position:absolute; top:-50%; right:-10%; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,0.07); pointer-events:none; }
  .ob-slide-header::after  { content:''; position:absolute; bottom:-40%; left:-8%; width:170px; height:170px; border-radius:50%; background:rgba(255,255,255,0.05); pointer-events:none; }

  .ob-step-num { font-size:11px; font-weight:800; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; position:relative; z-index:1; }
  .ob-header-main { display:flex; align-items:center; gap:12px; position:relative; z-index:1; margin-bottom:10px; flex-wrap: wrap; }
  .ob-step-emoji-lg { font-size:40px; filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3)); transition:transform 0.5s var(--spring); flex-shrink:0; }
  .ob-step-emoji-lg.done { transform:scale(1.1); }
  .ob-slide-title { font-size:24px; font-weight:900; color:white; letter-spacing:-0.5px; }
  .ob-slide-goal  { font-size:14px; color:rgba(255,255,255,0.85); font-weight:600; }

  .ob-status-badge { display:inline-flex; align-items:center; gap:6px; padding:5px 13px; border-radius:100px; font-size:11px; font-weight:800; margin-top:12px; width:fit-content; position:relative; z-index:1; }
  .ob-status-done { background:rgba(255,255,255,0.25); color:white; }
  .ob-status-todo { background:rgba(0,0,0,0.15); color:rgba(255,255,255,0.8); }

  .ob-slide-body {
    flex:1; background: var(--surface); border-radius:28px 28px 0 0;
    margin-top:-20px;
    display:flex; flex-direction:column;
    position:relative; z-index:2;
    overflow: hidden;
    box-shadow:0 -8px 30px rgba(0,0,0,0.1);
  }
  @media (prefers-color-scheme: dark) {
    .ob-slide-body { box-shadow:0 -8px 30px rgba(0,0,0,0.45); }
  }

  .ob-slide-content { 
    flex:1; 
    overflow-y: auto; 
    padding: 24px 20px 16px;
  }
  .ob-slide-content::-webkit-scrollbar { width: 4px; }
  .ob-slide-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

  .ob-info-row { display:flex; align-items:center; gap:14px; padding:13px; border-radius:16px; background:var(--surface-soft); border:1px solid var(--border); margin-bottom:10px; box-shadow: var(--clay-row); }
  .ob-info-bubble { width:40px; height:40px; border-radius:14px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow: var(--clay-icon); }
  .ob-info-label { font-size:13px; font-weight:800; color:var(--text); }
  .ob-info-sub   { font-size:11px; color:var(--text-muted); font-weight:500; margin-top:2px; }

  .ob-detail-row { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border); }
  .ob-detail-row:last-child { border-bottom:none; }
  .ob-detail-label { font-size:13px; color:var(--text-muted); font-weight:600; }
  .ob-detail-value { font-size:13px; color:var(--text); font-weight:800; text-align:right; max-width:55%; }

  .ob-data-row { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; background:var(--surface-soft); border-radius:16px; border:1px solid var(--border); margin-bottom:12px; box-shadow: var(--clay-row); }

  .ob-select { width:100%; padding:14px 16px; border-radius:var(--r-md); margin-top:12px; background:var(--surface-soft); border:2px solid var(--border); color:var(--text); font-family:'Nunito',sans-serif; font-size:14px; font-weight:700; outline:none; box-shadow:var(--clay-inset); -webkit-appearance:none; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23a78bfa'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; background-size:18px; padding-right:44px; cursor:pointer; }
  .ob-select option { background:var(--surface); color:var(--text); }

  .ob-alert { padding:13px 16px; border-radius:var(--r-md); font-size:13px; font-weight:600; line-height:1.55; margin-top:12px; box-shadow: var(--clay-card-sm); }
  .ob-alert-purple { background:var(--purple-pale); color:var(--purple); }
  .ob-alert-green  { background:rgba(52,211,153,0.15); color:var(--green); }
  .ob-alert-error  { background:rgba(248,113,113,0.15); color:var(--red); }
  @media (prefers-color-scheme: dark) {
    .ob-alert-green { color:var(--green-light); }
    .ob-alert-error { color:var(--red-light); }
  }

  .ob-nav-row { 
    display:grid; 
    grid-template-columns:1fr 2fr; 
    gap:10px; 
    padding: 16px 20px calc(16px + env(safe-area-inset-bottom, 0));
    border-top:1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }
  .ob-next-btn { padding:16px; border-radius:20px; font-family:'Nunito',sans-serif; font-size:15px; font-weight:900; cursor:pointer; border:none; color:white; display:flex; align-items:center; justify-content:center; gap:8px; transition:transform 0.15s; }
  .ob-next-btn:active { transform:scale(0.97); }
  .ob-next-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; filter: grayscale(1); }
  .ob-back-btn { padding:16px; border-radius:20px; background:var(--surface-soft); border:1px solid var(--border); color:var(--text-muted); font-family:'Nunito',sans-serif; font-size:14px; font-weight:800; cursor:pointer; }
  .ob-back-btn:disabled { opacity:0.5; cursor:not-allowed; }

  .ob-action-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:14px 20px; border-radius:var(--r-md); margin-top:14px; background:var(--purple-grad); color:white; font-family:'Nunito',sans-serif; font-size:14px; font-weight:800; text-decoration:none; border:none; cursor:pointer; width:100%; box-shadow:var(--clay-purple); transition:transform 0.15s; }
  .ob-action-btn:active { transform:scale(0.97); }

  /* Fixed side dots */
  .ob-fixed-dots { position:fixed; right:14px; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:6px; z-index:100; pointer-events:none; }
  @media (min-width: 768px) {
    .ob-fixed-dots { right: max(calc(50vw - 280px), 14px); }
  }
  .ob-fixed-dot  { width:6px; border-radius:100px; transition:all 0.3s var(--spring); }

  /* Fixed progress bar */
  .ob-progress-track { position:fixed; top:0; left:0; right:0; height:3px; background:var(--surface-soft); z-index:101; }
  .ob-progress-fill  { height:100%; background:var(--purple-grad); transition:width 0.5s var(--spring); box-shadow:0 0 8px rgba(168,85,247,0.5); }

  @keyframes ob-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
  @keyframes ob-fade-out { from{opacity:1} to{opacity:0} }

  .ob-swipe-hint { 
    position:fixed; bottom:110px; left:50%; transform:translateX(-50%); 
    font-size:12px; font-weight:700; color:var(--text-faint); 
    display:flex; flex-direction:column; align-items:center; gap:4px; 
    pointer-events:none; z-index:100;
    background: var(--surface-soft);
    padding: 10px 16px;
    border-radius: 20px;
    backdrop-filter: blur(8px);
    border: 1px solid var(--border);
    box-shadow: var(--clay-card-sm);
  }
  .ob-swipe-hint.hiding { animation: ob-fade-out 0.8s ease forwards; }
  .ob-swipe-arrow { animation:ob-bounce 1.6s ease-in-out infinite; }
`

export default function OnboardingWizard({ initial }: { initial: Init }) {
  const router = useRouter()
  const { currencies } = useCurrency()
  const containerRef = useRef<HTMLDivElement>(null)

  const [stepIndex, setStepIndex] = useState(clamp(initial.onboarding_completed ? 0 : initial.onboarding_step))
  const [displayName, setDisplayName] = useState(initial.name)
  const [baseCurrency, setBaseCurrency] = useState("CAD")
  const [localCurrency, setLocalCurrency] = useState("CAD")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(true)
  const [hintHiding, setHintHiding] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHintHiding(true), 9200)
    const timer2 = setTimeout(() => setShowHint(false), 10000)
    return () => { clearTimeout(timer); clearTimeout(timer2) }
  }, [])

  useEffect(() => {
    let active = true
      ; (async () => {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return
        const meta = auth.user.user_metadata
        const [{ data: profile }, { data: ob }] = await Promise.all([
          supabase.from("profiles").select("full_name,base_currency").eq("id", auth.user.id).single(),
          supabase.from("profiles").select("onboarding_step,onboarding_completed").eq("id", auth.user.id).maybeSingle(),
        ])
        if (!active) return
        if (profile?.full_name) setDisplayName(profile.full_name)
        else if (meta?.full_name) setDisplayName(meta.full_name as string)
        if (profile?.base_currency) { setBaseCurrency(profile.base_currency); setLocalCurrency(profile.base_currency) }
        if (typeof ob?.onboarding_step === "number") setStepIndex(clamp(ob.onboarding_completed ? 0 : ob.onboarding_step))
      })()
    return () => { active = false }
  }, [])

  // Scroll to active step
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const slides = el.querySelectorAll(".ob-snap-slide")
    const target = slides[stepIndex] as HTMLElement
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [stepIndex])

  // Update stepIndex from scroll position
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let ticking = false
    const handler = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const idx = Math.round(el.scrollTop / el.clientHeight)
        setStepIndex(clamp(idx))
        ticking = false
      })
    }
    el.addEventListener("scroll", handler, { passive: true })
    return () => el.removeEventListener("scroll", handler)
  }, [])

  const state: LiveState = { name: displayName, accountsCount: initial.accountsCount, transactionsCount: initial.transactionsCount, baseCurrency }

  async function saveCurrency(code: string) {
    const { error } = await supabase.rpc("set_user_base_currency", { p_currency: code })
    if (error) { setError(error.message); return false }
    setBaseCurrency(code); return true
  }
  async function saveStep(nextIndex: number) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { router.push("/auth/login"); return false }
    const { error } = await supabase.from("profiles").update({ onboarding_step: nextIndex }).eq("id", auth.user.id)
    if (error) { setError(error.message); return false }
    return true
  }
  async function navigateWithSavedStep(e: MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    const ok = await saveStep(Math.min(stepIndex + 1, STEPS.length - 1))
    if (ok) router.push(href)
  }
  async function goNext() {
    setBusy(true); setError(null)
    if (stepIndex === 0) { const ok = await saveCurrency(localCurrency); if (!ok) { setBusy(false); return } }
    const next = stepIndex + 1
    const ok = await saveStep(next)
    if (ok) setStepIndex(next)
    setBusy(false)
  }
  async function goBack() {
    setBusy(true)
    const ok = await saveStep(stepIndex - 1)
    if (ok) setStepIndex(stepIndex - 1)
    setBusy(false)
  }
  async function complete() {
    setBusy(true); setError(null)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { router.push("/auth/login"); return }
    const { error } = await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: STEPS.length - 1 }).eq("id", auth.user.id)
    if (error) { setError(error.message); setBusy(false); return }
    router.push("/dashboard"); router.refresh()
  }

  function renderBody(idx: number) {
    const s = state
    if (idx === 0) return (
      <div>
        <div className="ob-alert ob-alert-purple" style={{ marginTop: 0 }}>Sets your default currency for accounts and dashboard summaries.</div>
        <select className="ob-select" value={localCurrency} onChange={e => setLocalCurrency(e.target.value)}>
          {currencies.length === 0 && <option value={localCurrency}>{localCurrency}</option>}
          {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>)}
        </select>
      </div>
    )
    if (idx === 1) return (
      <div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 14 }}>Log a transaction whenever money enters or leaves an account.</p>
        {[
          { icon: "💰", bg: "var(--green-grad)", label: "Income", desc: "Money enters — Salary, cash gift" },
          { icon: "📤", bg: "var(--red-grad)", label: "Expense", desc: "Money leaves — Dinner, gas, bills" },
          { icon: "🔄", bg: "var(--indigo-grad)", label: "Transfer", desc: "Between your own accounts" },
          { icon: "🤝", bg: "var(--amber-grad)", label: "Loan", desc: "Money you lent or borrowed" },
          { icon: "👥", bg: "var(--pink-grad)", label: "Shared", desc: "You paid for others" },
        ].map(item => (
          <div key={item.label} className="ob-info-row">
            <div className="ob-info-bubble" style={{ background: item.bg, color: 'white' }}>{item.icon}</div>
            <div><div className="ob-info-label">{item.label}</div><div className="ob-info-sub">{item.desc}</div></div>
          </div>
        ))}
      </div>
    )
    if (idx === 2) return (
      <div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 14 }}>Accounts are where your money lives — Bank, Cash, Credit Card, etc.</p>
        <div className="ob-data-row">
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Active accounts</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: s.accountsCount >= 1 ? "var(--green)" : "var(--text)" }}>{s.accountsCount}</span>
        </div>
        <div className="ob-alert ob-alert-purple">💡 Suggested: <strong style={{ color: "var(--text)" }}>Main Bank</strong>, <strong style={{ color: "var(--text)" }}>Cash Wallet</strong>, optional <strong style={{ color: "var(--text)" }}>Credit Card</strong></div>
      </div>
    )
    const detailRows: Record<number, string[][]> = {
      3: [["Category", "Income → Salary"], ["To account", "Main Bank"], ["Amount", "3000"], ["Date", "Today or last payday"]],
      4: [["Category", "Expense → Variable → Eating Out"], ["From account", "Main Bank or Credit Card"], ["Amount", "30"]],
      5: [["Category", "Transfer"], ["From", "Main Bank"], ["To", "Cash Wallet"], ["Amount", "100"]],
      6: [["Scenario", "Friend pays you back"], ["Category", "Loan → Receivable repayment"], ["From", "Receivable account"], ["To", "Main Bank"], ["Amount", "50"]],
    }
    return (
      <div>
        {detailRows[idx]?.map(([k, v]) => (
          <div key={k} className="ob-detail-row"><span className="ob-detail-label">{k}</span><span className="ob-detail-value">{v}</span></div>
        ))}
      </div>
    )
  }

  const progress = ((stepIndex + 1) / STEPS.length) * 100

  return (
    <>
      <style>{styles}</style>
      <div className="ob-progress-track"><div className="ob-progress-fill" style={{ width: `${progress}%` }} /></div>
      <div className="ob-fixed-dots">
        {STEPS.map((step, i) => (
          <div key={i} className="ob-fixed-dot" style={{
            height: i === stepIndex ? 22 : 6,
            background: i < stepIndex ? "var(--purple-light)" : i === stepIndex ? "var(--purple)" : "var(--border)",
            boxShadow: i === stepIndex ? `0 0 10px ${step.accent}` : "none",
          }} />
        ))}
      </div>
      <div className="ob-wrapper">
        <div ref={containerRef} className="ob-snap-container">
          {STEPS.map((step, idx) => {
            const isDone = step.check(state)
            const action = STEP_ACTIONS[idx] ?? null
            const isLast = idx === STEPS.length - 1
            return (
              <div key={idx} className="ob-snap-slide">
                <div className="ob-slide-header" style={{ background: step.gradient }}>
                  <div className="ob-step-num" style={{ position: "relative", zIndex: 1 }}>Step {idx + 1} of {STEPS.length}</div>
                  <div className="ob-header-main">
                    <span className={`ob-step-emoji-lg ${isDone ? "done" : ""}`}>{isDone ? "✅" : step.emoji}</span>
                    <div className="ob-slide-title">{idx === 1 && displayName ? `Welcome, ${displayName}!` : step.title}</div>
                    <div className="ob-slide-goal">— {step.goal}</div>
                  </div>
                  <div className={`ob-status-badge ${isDone ? "ob-status-done" : "ob-status-todo"}`}>{isDone ? "✓ Completed" : "In progress"}</div>
                </div>
                <div className="ob-slide-body">
                  <div className="ob-slide-content">
                    {renderBody(idx)}
                    {action && (
                      <Link href={action.href} className="ob-action-btn" onClick={(e: MouseEvent<HTMLAnchorElement>) => navigateWithSavedStep(e, action.href)}>
                        {action.label}
                      </Link>
                    )}
                    {error && idx === stepIndex && <div className="ob-alert ob-alert-error" style={{ marginTop: 12 }}>⚠️ {error}</div>}
                  </div>
                  <div className="ob-nav-row">
                    <button className="ob-back-btn" onClick={goBack} disabled={idx === 0 || busy}>← Back</button>
                    {!isLast ? (
                      <button className="ob-next-btn" onClick={goNext} disabled={busy || idx !== stepIndex}
                        style={{ background: step.gradient, boxShadow: `0 6px 20px ${step.accent}44,inset 0 -3px 0 rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.2)`, opacity: idx !== stepIndex ? 0.5 : 1 }}>
                        {busy && idx === stepIndex ? "⏳" : idx === 0 ? "💾 Save & Continue" : "Continue →"}
                      </button>
                    ) : (
                      <button className="ob-next-btn" onClick={complete} disabled={busy || idx !== stepIndex}
                        style={{ background: "linear-gradient(145deg,#34d399,#059669)", boxShadow: "0 6px 20px rgba(52,211,153,0.35),inset 0 -3px 0 rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.2)" }}>
                        {busy && idx === stepIndex ? "⏳" : "🎉 Go to Dashboard!"}
                      </button>
                    )}
                  </div>
                  {initial.onboarding_completed && idx === stepIndex && (
                    <div style={{ background: "var(--surface)", padding: "0 0 12px", borderTop: "none" }}>
                      <Link href="/dashboard" style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textDecoration: "none" }}>Skip for now</Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {showHint && stepIndex === 0 && (
          <div className={`ob-swipe-hint ${hintHiding ? 'hiding' : ''}`}>
            <span>swipe up or use buttons</span>
            <span className="ob-swipe-arrow">↓</span>
          </div>
        )}
      </div>
    </>
  )
}