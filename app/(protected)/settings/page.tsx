'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCurrency } from '@/lib/context/CurrencyContext'
import { useUserBaseCurrency } from '@/lib/hooks/useCurrencies'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

const styles = `
  .settings-page { min-height:100vh; background:#12091e; color:white; padding-bottom:calc(var(--nav-h,70px)+20px); }

  /* Top bar */
  .settings-top-bar {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 16px 10px; position:sticky; top:0; z-index:40;
    background:rgba(18,9,30,0.9); backdrop-filter:blur(16px);
    border-bottom:1px solid rgba(139,92,246,0.12);
  }
  .settings-icon-btn {
    width:42px; height:42px; border-radius:13px;
    background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; font-size:18px; color:rgba(255,255,255,0.85);
    box-shadow:0 4px 14px rgba(0,0,0,0.3),inset 0 -2px 0 rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.06);
    text-decoration:none; transition:transform 0.15s;
  }
  .settings-icon-btn:active { transform:scale(0.93); }

  /* Body */
  .settings-body { padding:20px 16px; }
  .settings-page-title { font-size:24px; font-weight:900; letter-spacing:-0.5px; }
  .settings-page-sub   { font-size:13px; color:rgba(255,255,255,0.4); font-weight:500; margin-top:3px; margin-bottom:24px; }

  /* Profile hero */
  .settings-profile-hero {
    background:linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%);
    border-radius:26px; padding:22px 20px;
    box-shadow:0 12px 40px rgba(124,58,237,0.38),inset 0 -5px 0 rgba(0,0,0,0.18),inset 0 2px 0 rgba(255,255,255,0.22);
    display:flex; align-items:center; gap:16px; margin-bottom:20px;
    position:relative; overflow:hidden;
  }
  .settings-profile-hero::before { content:''; position:absolute; top:-40%; right:-10%; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.09); pointer-events:none; }
  .settings-avatar {
    width:60px; height:60px; border-radius:20px;
    background:rgba(255,255,255,0.2);
    display:flex; align-items:center; justify-content:center; font-size:28px; flex-shrink:0;
    box-shadow:0 4px 16px rgba(0,0,0,0.3),inset 0 -2px 0 rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.28);
  }
  .settings-profile-name    { font-size:20px; font-weight:900; color:white; }
  .settings-profile-sub     { font-size:12px; color:rgba(255,255,255,0.62); font-weight:600; margin-top:4px; }
  .settings-profile-badge {
    display:inline-flex; align-items:center; padding:4px 12px; border-radius:100px;
    background:rgba(255,255,255,0.18); color:white; font-size:10px; font-weight:800;
    margin-top:8px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.25);
  }

  /* Section */
  .settings-section { margin-bottom:20px; }
  .settings-section-label {
    font-size:11px; font-weight:800; color:rgba(255,255,255,0.38);
    text-transform:uppercase; letter-spacing:0.8px;
    padding:0 4px; margin-bottom:10px; display:block;
  }
  .settings-card {
    background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.09); border-radius:24px;
    overflow:hidden;
    box-shadow:0 4px 20px rgba(0,0,0,0.22),inset 0 -3px 0 rgba(0,0,0,0.16),inset 0 1px 0 rgba(255,255,255,0.05);
  }

  /* Setting row */
  .settings-row {
    display:flex; align-items:center; gap:14px; padding:16px 18px;
    border-bottom:1px solid rgba(255,255,255,0.06); cursor:pointer;
    transition:background 0.15s; text-decoration:none; color:inherit;
    position:relative;
  }
  .settings-row:last-child { border-bottom:none; }
  .settings-row:active { background:rgba(255,255,255,0.04); }
  .settings-row-bubble {
    width:40px; height:40px; border-radius:14px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center; font-size:18px;
    box-shadow:0 3px 10px rgba(0,0,0,0.3),inset 0 -2px 0 rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.28);
  }
  .settings-row-label { font-size:14px; font-weight:800; color:rgba(255,255,255,0.88); }
  .settings-row-sub   { font-size:12px; color:rgba(255,255,255,0.38); font-weight:500; margin-top:2px; }
  .settings-row-right { margin-left:auto; display:flex; align-items:center; gap:8px; }
  .settings-row-chevron { font-size:18px; color:rgba(255,255,255,0.22); }
  .settings-row-value {
    font-size:12px; font-weight:700; color:rgba(255,255,255,0.45);
    background:rgba(255,255,255,0.07); padding:4px 10px; border-radius:100px;
    border:1px solid rgba(255,255,255,0.1);
  }

  /* Currency inline selector */
  .settings-currency-expanded {
    padding:16px 18px;
    border-top:1px solid rgba(255,255,255,0.06);
    background:rgba(0,0,0,0.15);
  }
  .settings-select {
    width:100%; padding:13px 16px; border-radius:16px;
    background:rgba(255,255,255,0.07); border:1.5px solid rgba(139,92,246,0.25);
    color:rgba(255,255,255,0.9); font-family:'Nunito',sans-serif;
    font-size:14px; font-weight:700; outline:none;
    box-shadow:inset 0 2px 8px rgba(0,0,0,0.18); transition:border-color 0.18s;
    -webkit-appearance:none; appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23a78bfa'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 14px center; background-size:18px;
    padding-right:44px; cursor:pointer; margin-bottom:12px;
  }
  .settings-select option { background:#1e1535; color:white; }
  .settings-select:focus { border-color:rgba(139,92,246,0.55); }
  .settings-save-btn {
    padding:13px 20px; border-radius:16px;
    background:linear-gradient(135deg,#7c3aed,#a855f7); color:white;
    font-family:'Nunito',sans-serif; font-size:13px; font-weight:800;
    border:none; cursor:pointer; width:100%;
    box-shadow:0 5px 16px rgba(124,58,237,0.38),inset 0 -2px 0 rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.2);
    transition:transform 0.15s;
  }
  .settings-save-btn:active { transform:scale(0.97); }
  .settings-save-btn:disabled { opacity:0.5; cursor:not-allowed; }

  /* Alert inline */
  .settings-alert { padding:10px 14px; border-radius:12px; font-size:12px; font-weight:700; margin-top:10px; }
  .settings-alert-green { background:rgba(52,211,153,0.14); color:#6ee7b7; border:1px solid rgba(52,211,153,0.22); }
  .settings-alert-red   { background:rgba(248,113,113,0.14); color:#fca5a5; border:1px solid rgba(248,113,113,0.22); }

  /* Danger zone */
  .settings-danger-row {
    display:flex; align-items:center; gap:14px; padding:16px 18px;
    border-bottom:1px solid rgba(248,113,113,0.08); cursor:pointer;
    transition:background 0.15s; text-decoration:none;
  }
  .settings-danger-row:last-child { border-bottom:none; }
  .settings-danger-row:active { background:rgba(248,113,113,0.05); }
  .settings-danger-label { font-size:14px; font-weight:800; color:#fca5a5; }
  .settings-danger-sub   { font-size:12px; color:rgba(248,113,113,0.5); font-weight:500; margin-top:2px; }

  /* App version footer */
  .settings-footer {
    text-align:center; padding:24px 0 8px;
    font-size:12px; color:rgba(255,255,255,0.2); font-weight:600;
  }

  /* Toggle switch */
  .settings-toggle-track {
    width:44px; height:25px; border-radius:100px; flex-shrink:0;
    position:relative; cursor:pointer;
    box-shadow:inset 0 2px 6px rgba(0,0,0,0.3);
    transition:background 0.22s;
  }
  .settings-toggle-thumb {
    position:absolute; top:3px; width:19px; height:19px; border-radius:50%; background:white;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
    transition:left 0.22s cubic-bezier(0.34,1.56,0.64,1);
  }
`

export default function SettingsPage() {
  const router = useRouter()
  const { currencies, loading: listLoading } = useCurrency()
  const { baseCurrency, loading: profileLoading, updateBaseCurrency } = useUserBaseCurrency()

  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [localCurrency, setLocalCurrency] = useState('')
  const [saving, setSaving] = useState(false)
  const [currencyMsg, setCurrencyMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Sync local currency once loaded
  if (!localCurrency && baseCurrency) setLocalCurrency(baseCurrency)

  async function saveCurrency() {
    setSaving(true); setCurrencyMsg(null)
    const error = await updateBaseCurrency(localCurrency)
    if (error) setCurrencyMsg({ text: error.message, ok: false })
    else setCurrencyMsg({ text: 'Currency updated! Refresh to see changes.', ok: true })
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const QUICK_LINKS = [
    { href: '/accounts', icon: '🏦', gradient: 'linear-gradient(135deg,#60a5fa,#2563eb)', label: 'Manage Accounts', sub: 'Add, edit or disable accounts' },
    { href: '/categories', icon: '🏷️', gradient: 'linear-gradient(135deg,#818cf8,#4f46e5)', label: 'Manage Categories', sub: 'Add custom subcategories' },
    { href: '/loans', icon: '🤝', gradient: 'linear-gradient(145deg,#34d399,#059669)', label: 'View Loans', sub: 'Track money owed' },
    { href: '/onboarding', icon: '📚', gradient: 'linear-gradient(135deg,#fbbf24,#d97706)', label: 'Re-open Tutorial', sub: 'Step-by-step onboarding guide' },
    { href: '/contact-us', icon: '📧', gradient: 'linear-gradient(135deg,#f472b6,#ec4899)', label: 'Contact Support', sub: 'Get help or report an issue' },
  ]

  return (
    <>
      <style>{styles}</style>
      <div className="settings-page">

        {/* Top bar */}
        <div className="settings-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Settings</span>
          </div>
          <div style={{ width: 42 }} />
        </div>

        <div className="settings-body">
          {/* Profile hero */}
          <div className="settings-profile-hero">
            <div className="settings-avatar">👤</div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="settings-profile-name">My Wallet</div>
              <div className="settings-profile-sub">Personal Finance Tracker</div>
              <span className="settings-profile-badge">🔒 Private & Secure</span>
            </div>
          </div>

          {/* Preferences section */}
          <div className="settings-section">
            <span className="settings-section-label">Preferences</span>
            <div className="settings-card">

              {/* Currency row — expands inline */}
              <div
                className="settings-row"
                onClick={() => { setCurrencyOpen(v => !v); setCurrencyMsg(null) }}
              >
                <div className="settings-row-bubble" style={{ background: 'linear-gradient(135deg,#818cf8,#4f46e5)' }}>💱</div>
                <div>
                  <div className="settings-row-label">Display Currency</div>
                  <div className="settings-row-sub">Default for new accounts &amp; summaries</div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-row-value">{baseCurrency || '…'}</span>
                  <span className="settings-row-chevron" style={{ transform: currencyOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                </div>
              </div>

              {currencyOpen && (
                <div className="settings-currency-expanded">
                  <select
                    className="settings-select"
                    value={localCurrency}
                    onChange={e => setLocalCurrency(e.target.value)}
                    disabled={listLoading || profileLoading}
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
                    ))}
                  </select>
                  <button className="settings-save-btn" onClick={saveCurrency} disabled={saving || localCurrency === baseCurrency}>
                    {saving ? '⏳ Saving…' : '💾 Save Currency'}
                  </button>
                  {currencyMsg && (
                    <div className={`settings-alert ${currencyMsg.ok ? 'settings-alert-green' : 'settings-alert-red'}`}>
                      {currencyMsg.ok ? '✅' : '⚠️'} {currencyMsg.text}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Quick links section */}
          <div className="settings-section">
            <span className="settings-section-label">Quick Links</span>
            <div className="settings-card">
              {QUICK_LINKS.map(item => (
                <Link key={item.href} href={item.href} className="settings-row">
                  <div className="settings-row-bubble" style={{ background: item.gradient }}>{item.icon}</div>
                  <div>
                    <div className="settings-row-label">{item.label}</div>
                    <div className="settings-row-sub">{item.sub}</div>
                  </div>
                  <div className="settings-row-right">
                    <span className="settings-row-chevron">›</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Account section */}
          <div className="settings-section">
            <span className="settings-section-label">Account</span>
            <div className="settings-card" style={{ borderColor: 'rgba(248,113,113,0.15)' }}>
              <button
                className="settings-danger-row"
                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', fontFamily: 'Nunito,sans-serif', cursor: 'pointer' }}
                onClick={handleLogout}
              >
                <div className="settings-row-bubble" style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)', boxShadow: 'none' }}>🚪</div>
                <div>
                  <div className="settings-danger-label">Sign Out</div>
                  <div className="settings-danger-sub">Log out of your account</div>
                </div>
                <div className="settings-row-right">
                  <span style={{ fontSize: 18, color: 'rgba(248,113,113,0.4)' }}>›</span>
                </div>
              </button>
            </div>
          </div>

          {/* About */}
          <div className="settings-footer">
            <div style={{ fontSize: 28, marginBottom: 8 }}>💸</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>My Wallet</div>
            <div style={{ marginTop: 4 }}>Your data stays private. No ads. Ever. 🔒</div>
          </div>
        </div>
      </div>
    </>
  )
}