'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AccountType, AccountNature } from '@/types/database'
import { useCurrency } from '@/lib/context/CurrencyContext'

const supabase = createClient()

// FIX: added 'receivable' and 'loan_payable' so users can create loan-tracking accounts.
// Without these, the /loans page always shows empty because it queries for these types.
const ACCOUNT_TYPES: {
  value: AccountType
  label: string
  icon: string
  gradient: string
  desc: string
  btnCls: string
  accent: string
  defaultNature: AccountNature
}[] = [
    { value: 'bank', label: 'Bank Account', icon: '🏦', gradient: 'var(--blue-grad)', desc: 'Chequing / savings', btnCls: 'clay-btn-blue', accent: 'var(--blue)', defaultNature: 'asset' },
    { value: 'cash', label: 'Cash', icon: '💵', gradient: 'var(--green-grad)', desc: 'Physical cash', btnCls: 'clay-btn-green', accent: 'var(--green)', defaultNature: 'asset' },
    { value: 'credit_card', label: 'Credit Card', icon: '💳', gradient: 'var(--red-grad)', desc: 'Credit card', btnCls: 'clay-btn-red', accent: 'var(--red)', defaultNature: 'liability' },
    { value: 'investment', label: 'Investment', icon: '📈', gradient: 'var(--indigo-grad)', desc: 'Stocks, ETFs, RRSP', btnCls: 'clay-btn-purple', accent: 'var(--purple)', defaultNature: 'asset' },
    { value: 'digital_wallet', label: 'Digital Wallet', icon: '📱', gradient: 'var(--purple-grad)', desc: 'PayPal, Venmo, etc.', btnCls: 'clay-btn-purple', accent: 'var(--purple-mid)', defaultNature: 'asset' },
    { value: 'mortgage', label: 'Mortgage', icon: '🏠', gradient: 'var(--amber-grad)', desc: 'Home loan', btnCls: 'clay-btn-amber', accent: 'var(--amber)', defaultNature: 'liability' },
    // ── Loan accounts ────────────────────────────────────────────────────────────
    { value: 'receivable', label: 'Loan Receivable', icon: '🤝', gradient: 'var(--green-grad)', desc: 'Money someone owes YOU', btnCls: 'clay-btn-green', accent: 'var(--green)', defaultNature: 'asset' },
    { value: 'loan_payable', label: 'Loan Payable', icon: '📋', gradient: 'var(--red-grad)', desc: 'Money YOU owe someone', btnCls: 'clay-btn-red', accent: 'var(--red)', defaultNature: 'liability' },
    // ─────────────────────────────────────────────────────────────────────────────
    { value: 'internal', label: 'Internal', icon: '🔧', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)', desc: 'Virtual / tracking', btnCls: 'clay-btn-white', accent: '#64748b', defaultNature: 'asset' },
  ]

export default function NewAccountPage() {
  const router = useRouter()
  const { baseCurrency, currencies } = useCurrency()

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [nature, setNature] = useState<AccountNature>('asset')
  const [currency, setCurrency] = useState(baseCurrency || 'CAD')
  const [isDefault, setIsDefault] = useState(false)
  const [loading, setLoading] = useState(false)

  // Sync currency when baseCurrency loads
  if (baseCurrency && currency === 'CAD' && baseCurrency !== 'CAD') setCurrency(baseCurrency)

  const selectedType = ACCOUNT_TYPES.find(t => t.value === type) ?? ACCOUNT_TYPES[0]

  // Auto-set nature when user picks a type that has a sensible default
  function handleTypeSelect(value: AccountType) {
    setType(value)
    const def = ACCOUNT_TYPES.find(t => t.value === value)
    if (def) setNature(def.defaultNature)
  }

  async function handleCreate() {
    if (!name.trim()) return alert('Account name is required')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Not authenticated'); setLoading(false); return }
    const { error } = await supabase.from('accounts').insert({
      user_id: user.id, name: name.trim(), type, nature, currency, is_default: isDefault,
    })
    if (error) alert(error.message)
    else router.push('/accounts')
    setLoading(false)
  }

  const isReady = name.trim().length > 0

  return (
    <div style={{ paddingBottom: "calc(var(--nav-h) + 20px)", maxWidth: 560, margin: "0 auto" }} className="new-txn-pad">
      <style>{`
        @media(min-width:768px){ .new-txn-pad{ padding-bottom:28px!important; } }

        .na-type-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .na-type-card {
          padding:14px 12px; border-radius:18px; cursor:pointer; border:2px solid transparent;
          background:var(--surface-soft); text-align:left;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          display:flex; align-items:center; gap:12px;
          box-shadow:var(--clay-card-sm);
        }
        .na-type-card.selected {
          border-color:var(--border-mid);
          background:var(--purple-pale);
          box-shadow: 0 6px 20px rgba(124,58,237,0.18), inset 0 -2px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5);
          transform:scale(1.02);
        }
        .na-type-bubble {
          width:38px; height:38px; border-radius:13px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:18px;
          box-shadow:var(--clay-icon);
        }
        .na-type-label { font-size:12px; font-weight:800; color:var(--text); line-height:1.3; }
        .na-type-desc  { font-size:10px; color:var(--text-faint); font-weight:600; margin-top:2px; }

        .na-nature-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .na-nature-btn {
          padding:14px 12px; border-radius:18px; cursor:pointer; border:2px solid var(--border);
          background:var(--surface-soft); font-family:'Nunito',sans-serif;
          font-size:14px; font-weight:800; color:var(--text-muted);
          display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow:var(--clay-card-sm);
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .na-nature-btn.asset { border-color:rgba(52,211,153,0.5); background:var(--green-grad); color:white; box-shadow: 0 5px 16px rgba(5,150,105,0.35); }
        .na-nature-btn.liability { border-color:rgba(248,113,113,0.5); background:var(--red-grad); color:white; box-shadow: 0 5px 16px rgba(220,38,38,0.32); }

        .na-checkbox-row {
          display:flex; align-items:center; gap:14px; padding:16px;
          background:var(--surface-soft); border:1px solid var(--border);
          border-radius:18px; cursor:pointer;
          box-shadow:var(--clay-card-sm);
          transition:background 0.18s;
        }
        .na-checkbox-row.checked { background:var(--purple-pale); border-color:var(--border-mid); }
        .na-checkbox-track {
          width:46px; height:26px; border-radius:100px; flex-shrink:0; transition:background 0.22s;
          position:relative; box-shadow:var(--clay-inset);
        }
        .na-checkbox-thumb {
          position:absolute; top:3px; width:20px; height:20px; border-radius:50%; background:white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: left 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .na-checkbox-text { flex:1; }
        .na-checkbox-label { font-size:14px; font-weight:800; color:var(--text); }
        .na-checkbox-sub   { font-size:11px; color:var(--text-muted); font-weight:500; margin-top:2px; }

        .na-preview {
          border-radius:var(--r-lg); padding:16px 18px;
          display:flex; align-items:center; gap:14px;
          box-shadow:var(--clay-card-sm);
        }
        .na-preview-bubble {
          width:48px; height:48px; border-radius:16px;
          display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;
          box-shadow:var(--clay-icon);
        }
        .na-preview-name { font-size:16px; font-weight:900; color:var(--text); }
        .na-preview-sub  { font-size:12px; color:var(--text-muted); font-weight:600; margin-top:3px; }
        .na-preview-badge {
          margin-left:auto; padding:4px 10px; border-radius:100px;
          font-size:10px; font-weight:800; flex-shrink:0;
        }
        
        /* Loan section divider */
        .na-section-divider {
          font-size:10px; font-weight:800; color:var(--text-faint);
          text-transform:uppercase; letter-spacing:0.8px;
          padding:4px 0 8px; grid-column: 1 / -1;
        }

        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .anim-slide-up { animation: fadeSlideUp 0.25s ease forwards; }
      `}</style>

      {/* ── Sticky coloured header ── */}
      <div
        style={{
          position: "sticky", top: "calc(var(--nav-h) - 6px)", zIndex: 100,
          marginTop: 4,
          background: selectedType ? selectedType.gradient : "var(--surface-tinted)",
          padding: "18px 24px",
          borderRadius: 20, margin: "0 16px",
          width: "calc(100% - 32px)",
          boxShadow: "0 10px 28px -10px rgba(0,0,0,0.35)",
          overflow: "hidden",
          transition: "background 0.4s ease",
        }}
      >
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "white", letterSpacing: "-0.3px", textShadow: "0 2px 10px rgba(0,0,0,0.18)" }}>
              {selectedType.icon} New Account
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600, marginTop: 2 }}>
              Set up a new account to track
            </div>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Live preview */}
        {name.trim() && (
          <div className="na-preview anim-slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', marginTop: -6, marginBottom: 0 }}>
            <div className="na-preview-bubble" style={{ background: selectedType.gradient }}>{selectedType.icon}</div>
            <div>
              <div className="na-preview-name">{name}</div>
              <div className="na-preview-sub">{selectedType.label} · {nature} · {currency}</div>
            </div>
            {isDefault && (
              <span className="na-preview-badge" style={{ background: 'var(--purple-pale)', color: 'var(--purple)' }}>⭐ Default</span>
            )}
          </div>
        )}

        {/* Type selector */}
        <div className="clay-card">
          <div className="clay-label" style={{ marginBottom: 14 }}>Account Type</div>
          <div className="na-type-grid">
            {/* Standard accounts */}
            {ACCOUNT_TYPES.filter(t => !['receivable', 'loan_payable'].includes(t.value)).map(t => (
              <button
                key={t.value}
                className={`na-type-card ${type === t.value ? 'selected' : ''}`}
                onClick={() => handleTypeSelect(t.value)}
              >
                <div className="na-type-bubble" style={{ background: t.gradient }}>{t.icon}</div>
                <div>
                  <div className="na-type-label">{t.label}</div>
                  <div className="na-type-desc">{t.desc}</div>
                </div>
              </button>
            ))}

            {/* Loan accounts — with a section label */}
            <div className="na-section-divider">🤝 Loan Accounts</div>
            {ACCOUNT_TYPES.filter(t => ['receivable', 'loan_payable'].includes(t.value)).map(t => (
              <button
                key={t.value}
                className={`na-type-card ${type === t.value ? 'selected' : ''}`}
                onClick={() => handleTypeSelect(t.value)}
              >
                <div className="na-type-bubble" style={{ background: t.gradient }}>{t.icon}</div>
                <div>
                  <div className="na-type-label">{t.label}</div>
                  <div className="na-type-desc">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Nature — auto-set but still editable */}
        <div className="clay-card">
          <div className="clay-label" style={{ marginBottom: 14 }}>Nature</div>
          <div className="na-nature-row">
            <button
              className={`na-nature-btn ${nature === 'asset' ? 'asset' : ''}`}
              onClick={() => setNature('asset')}
            >
              📈 Asset
            </button>
            <button
              className={`na-nature-btn ${nature === 'liability' ? 'liability' : ''}`}
              onClick={() => setNature('liability')}
            >
              📉 Debt
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="clay-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="clay-label" style={{ marginBottom: 0 }}>Details</div>
          <div className="clay-form-group">
            <label className="clay-label" style={{ fontSize: 11 }}>Account Name</label>
            <input
              className="clay-input"
              placeholder={
                type === 'receivable' ? 'e.g. John — owes me' :
                  type === 'loan_payable' ? 'e.g. Student Loan' :
                    'e.g. TD Main Bank, Cash Wallet…'
              }
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="clay-form-group">
            <label className="clay-label" style={{ fontSize: 11 }}>Currency</label>
            <select
              className="clay-select"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              {currencies.length === 0
                ? <option value={currency}>{currency}</option>
                : currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
                ))}
            </select>
          </div>
        </div>

        {/* Default toggle — hide for loan accounts (they shouldn't be the default) */}
        {!['receivable', 'loan_payable'].includes(type) && (
          <div
            className={`na-checkbox-row ${isDefault ? 'checked' : ''}`}
            onClick={() => setIsDefault(v => !v)}
          >
            <div
              className="na-checkbox-track"
              style={{ background: isDefault ? 'var(--purple-grad)' : 'var(--surface-tinted)' }}
            >
              <div className="na-checkbox-thumb" style={{ left: isDefault ? '23px' : '3px' }} />
            </div>
            <div className="na-checkbox-text">
              <div className="na-checkbox-label">Set as default account</div>
              <div className="na-checkbox-sub">New transactions will default to this account</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          <button
            className={`clay-btn clay-btn-lg ${isReady ? selectedType.btnCls : "clay-btn-white"}`}
            onClick={handleCreate}
            disabled={loading || !isReady}
            style={{
              width: "100%",
              background: isReady ? selectedType.gradient : undefined,
              color: isReady ? "white" : undefined,
              opacity: isReady ? 1 : 0.55,
              textShadow: isReady ? "0 2px 10px rgba(0,0,0,0.18)" : undefined,
              boxShadow: isReady
                ? `0 8px 20px -6px ${selectedType.accent}88, inset 1px 1px 2px rgba(255,255,255,0.25)`
                : "var(--clay-card-sm)",
              transition: "all 0.35s cubic-bezier(.34,1.56,.64,1)",
              transform: isReady ? "scale(1.01)" : "scale(1)",
            }}
          >
            {loading ? '⏳ Creating…' : `${selectedType.icon} Create Account`}
          </button>

          <button className="clay-btn clay-btn-lg clay-btn-white" style={{ width: "100%" }} onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </div>
  )
}