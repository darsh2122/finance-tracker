'use client'

import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

export default function PushNotificationSettings() {
    const { state, error, subscribe, unsubscribe } = usePushNotifications()

    if (state === 'unsupported') {
        return (
            <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--surface-soft)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                ⚠️ Push notifications aren't supported in this browser.
            </div>
        )
    }

    if (state === 'denied') {
        return (
            <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.22)', fontSize: 13, color: 'var(--red-light)', fontWeight: 600 }}>
                🔇 Notifications blocked. Go to your browser settings to re-enable them.
            </div>
        )
    }

    const isOn = state === 'subscribed'
    const isLoading = state === 'loading'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
                onClick={() => !isLoading && (isOn ? unsubscribe() : subscribe())}
                style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    background: isOn ? 'var(--purple-pale)' : 'var(--surface-soft)',
                    border: `1px solid ${isOn ? 'var(--border-mid)' : 'var(--border)'}`,
                    borderRadius: 18, cursor: isLoading ? 'wait' : 'pointer',
                    transition: 'all 0.22s',
                }}
            >
                {/* Toggle track */}
                <div style={{
                    width: 46, height: 26, borderRadius: 100, flexShrink: 0, position: 'relative',
                    background: isOn ? 'var(--purple-grad)' : 'var(--surface-tinted)',
                    boxShadow: 'var(--clay-inset)', transition: 'background 0.22s',
                }}>
                    <div style={{
                        position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
                        background: 'white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        left: isOn ? 23 : 3, transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                    }} />
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                        {isLoading ? '⏳ Updating…' : isOn ? '🔔 Notifications on' : '🔕 Notifications off'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                        {isOn
                            ? 'You\'ll get alerts for new transactions and loan reminders'
                            : 'Tap to enable push notifications'}
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.22)', fontSize: 12, fontWeight: 700, color: 'var(--red-light)' }}>
                    ⚠️ {error}
                </div>
            )}

            {isOn && (
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--purple-pale)', border: '1px solid var(--border-mid)', fontSize: 12, fontWeight: 600, color: 'var(--purple)', lineHeight: 1.6 }}>
                    💡 You'll be notified when you add a transaction, receive a loan repayment, or when daily summaries are ready.
                </div>
            )}
        </div>
    )
}