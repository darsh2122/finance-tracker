'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AccountType, AccountNature } from '@/types/database'
import { useCurrency } from '@/lib/context/CurrencyContext'

const supabase = createClient()

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string; gradient: string; desc: string }[] = [
  { value: 'bank', label: 'Bank Account', icon: '🏦', gradient: 'linear-gradient(135deg,#60a5fa,#2563eb)', desc: 'Chequing / savings' },
  { value: 'cash', label: 'Cash', icon: '💵', gradient: 'linear-gradient(145deg,#34d399,#059669)', desc: 'Physical cash' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳', gradient: 'linear-gradient(145deg,#f87171,#dc2626)', desc: 'Credit / debit card' },
  { value: 'investment', label: 'Investment', icon: '📈', gradient: 'linear-gradient(135deg,#818cf8,#4f46e5)', desc: 'Stocks, ETFs, RRSP' },
  { value: 'digital_wallet', label: 'Digital Wallet', icon: '📱', gradient: 'linear-gradient(135deg,#a78bfa,#7c3aed)', desc: 'PayPal, Venmo, etc.' },
  { value: 'mortgage', label: 'Mortgage', icon: '🏠', gradient: 'linear-gradient(145deg,#fbbf24,#d97706)', desc: 'Home loan' },
  { value: 'internal', label: 'Internal', icon: '🔧', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)', desc: 'Virtual / tracking' },
]

const styles = `
  .na-page { min-height:100vh; background:var(--bg); color:var(--text); }

  .na-header {
    background: linear-gradient(135deg,#7c3aed 0%,#a855f7 60%,#6366f1 100%);
    padding: 20px 16px 36px;
    position: relative; overflow: hidden;
  }
  .na-header::before { content:''; position:absolute; top:-50%; right:-10%; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.08); pointer-events:none; }
  .na-header::after  { content:''; position:absolute; bottom:-40%; left:-8%;  width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.06); pointer-events:none; }

  .na-back-btn {
    width:40px; height:40px; border-radius:13px;
    background:rgba(255,255,255,0.2); border:none;
    display:flex; align-items:center; justify-content:center;
    font-size:18px; cursor:pointer; color:white; margin-bottom:18px;
    box-shadow: inset 0 -2px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18);
    transition: transform 0.15s;
  }
  .na-back-btn:active { transform:scale(0.92); }
  .na-header-title { font-size:24px; font-weight:900; color:white; position:relative; }
  .na-header-sub   { font-size:13px; color:rgba(255,255,255,0.65); font-weight:500; margin-top:5px; position:relative; }

  .na-body { padding:0 16px 40px; margin-top:-16px; }

  .na-section {
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:24px; padding:20px;
    margin-bottom:14px;
    box-shadow:var(--clay-card-sm);
  }
  .na-section-title {
    font-size:11px; font-weight:800; color:var(--text-faint);
    text-transform:uppercase; letter-spacing:0.7px; margin-bottom:16px;
  }

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
  .na-nature-btn.asset    { border-color:rgba(52,211,153,0.5); background:var(--green-grad); color:white; }
  .na-nature-btn.liability{ border-color:rgba(248,113,113,0.5); background:var(--red-grad);   color:white; }

  .na-field { display:flex; flex-direction:column; gap:7px; margin-bottom:14px; }
  .na-field:last-child { margin-bottom:0; }
  .na-label { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.6px; }
  .na-input, .na-select {
    width:100%; padding:14px 16px; border-radius:16px;
    background:var(--surface); border:1.5px solid var(--border);
    color:var(--text); font-family:'Nunito',sans-serif;
    font-size:15px; font-weight:700; outline:none;
    box-shadow:var(--clay-inset); transition:border-color 0.18s;
    -webkit-appearance:none; appearance:none;
  }
  .na-input::placeholder { color:var(--text-faint); font-weight:500; }
  .na-input:focus, .na-select:focus { border-color:var(--purple-mid); box-shadow:var(--clay-inset), 0 0 0 3px rgba(124,58,237,0.12); }
  .na-select {
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%238b5cf6'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 14px center; background-size:18px;
    padding-right:44px; cursor:pointer;
  }
  .na-select option { background:var(--surface); color:var(--text); }

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

  .na-create-btn {
    width:100%; padding:18px; border-radius:22px;
    font-family:'Nunito',sans-serif; font-size:16px; font-weight:900;
    cursor:pointer; border:none; display:flex; align-items:center;
    justify-content:center; gap:10px; margin-bottom:12px;
    transition: transform 0.15s, filter 0.15s;
  }
  .na-create-btn:active { transform:scale(0.97); }
  .na-create-btn:disabled { opacity:0.45; cursor:not-allowed; transform:none; }
  .na-cancel-btn {
    width:100%; padding:15px; border-radius:18px;
    background:var(--surface-soft); border:1px solid var(--border);
    color:var(--text-muted); font-family:'Nunito',sans-serif;
    font-size:14px; font-weight:800; cursor:pointer; transition:background 0.18s;
  }

  .na-preview {
    border-radius:20px; padding:16px 18px;
    display:flex; align-items:center; gap:14px;
    margin-bottom:6px; box-shadow:var(--clay-card-sm);
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
`


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
    <>
      <style>{styles}</style>
      <div className="na-page">

        {/* Colored header */}
        <div style={{
          position: "sticky", top: "calc(var(--nav-h) - 6px)", zIndex: 100,
          marginTop: 4,
          background: "linear-gradient(135deg,#94a3b8,#64748b)",
          padding: "18px 24px",
          borderRadius: 20, margin: "0 16px",
          width: "calc(100% - 32px)",
          boxShadow: "0 10px 28px -10px rgba(0,0,0,0.35)",
          overflow: "hidden",
          transition: "background 0.4s ease",
        }}>
          <div className="na-header-title" style={{ position: 'relative', zIndex: 1 }}>
            {selectedType.icon} New Account
          </div>
          <div className="na-header-sub" style={{ position: 'relative', zIndex: 1 }}>
            Set up a new account to track
          </div>
        </div>

        <div className="na-body">

          {/* Live preview */}
          {name.trim() && (
            <div className="na-preview" style={{ background: 'var(--surface)', border: '1px solid var(--border)', marginTop: 0, marginBottom: 14 }}>
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
          <div className="na-section">
            <div className="na-section-title">Account Type</div>
            <div className="na-type-grid">
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`na-type-card ${type === t.value ? 'selected' : ''}`}
                  onClick={() => setType(t.value)}
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

          {/* Nature */}
          <div className="na-section">
            <div className="na-section-title">Nature</div>
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
                📉 Liability
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="na-section">
            <div className="na-section-title">Details</div>

            <div className="na-field">
              <label className="na-label">Account Name</label>
              <input
                className="na-input"
                placeholder="e.g. TD Main Bank, Cash Wallet…"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="na-field">
              <label className="na-label">Currency</label>
              <select
                className="na-select"
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

          {/* Default toggle */}
          <div
            className={`na-checkbox-row ${isDefault ? 'checked' : ''}`}
            onClick={() => setIsDefault(v => !v)}
            style={{ marginBottom: 20 }}
          >
            <div
              className="na-checkbox-track"
              style={{ background: isDefault ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'var(--surface-soft)' }}
            >
              <div className="na-checkbox-thumb" style={{ left: isDefault ? '23px' : '3px' }} />
            </div>
            <div className="na-checkbox-text">
              <div className="na-checkbox-label">Set as default account</div>
              <div className="na-checkbox-sub">New transactions will default to this account</div>
            </div>
          </div>

          {/* Actions */}
          <button
            className="na-create-btn"
            onClick={handleCreate}
            disabled={loading || !isReady}
            style={{
              background: isReady ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'var(--surface-soft)',
              color: isReady ? 'white' : 'var(--text-faint)',
              boxShadow: isReady
                ? 'var(--clay-purple)'
                : 'none',
            }}
          >
            {loading ? '⏳ Creating…' : `${selectedType.icon} Create Account`}
          </button>
          <button className="na-cancel-btn" onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </>
  )
}