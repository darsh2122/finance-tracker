'use client'

import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

export default function PushNotificationSettings() {
    const { state, error, subscribe, unsubscribe } = usePushNotifications()

    if (state === 'unsupported') {
        return (
            <div className="settings-alert" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                ⚠️ Push notifications aren't supported in this browser.
            </div>
        )
    }

    if (state === 'denied') {
        return (
            <div className="settings-alert settings-alert-red">
                🔇 Notifications blocked. Go to your browser settings to re-enable them.
            </div>
        )
    }

    const isOn = state === 'subscribed'
    const isLoading = state === 'loading'

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
                className="settings-row"
                onClick={() => !isLoading && (isOn ? unsubscribe() : subscribe())}
                style={{ cursor: isLoading ? 'wait' : 'pointer' }}
            >
                <div 
                    className="settings-row-bubble" 
                    style={{ background: isOn ? 'var(--purple-grad)' : 'var(--surface-soft)' }}
                >
                    <span style={{ fontSize: 18 }}>{isOn ? '🔔' : '🔕'}</span>
                </div>

                <div style={{ flex: 1 }}>
                    <div className="settings-row-label">
                        {isLoading ? '⏳ Updating…' : isOn ? 'Push Notifications' : 'Push Notifications'}
                    </div>
                    <div className="settings-row-sub">
                        {isOn
                            ? 'You\'ll get alerts for new transactions'
                            : 'Enable to stay updated on your activity'}
                    </div>
                </div>

                <div className="settings-row-right">
                    <div 
                        className="settings-toggle-track"
                        style={{ background: isOn ? 'var(--purple-grad)' : 'var(--surface-tinted)' }}
                    >
                        <div 
                            className="settings-toggle-thumb"
                            style={{ left: isOn ? 22 : 3 }}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="settings-alert settings-alert-red" style={{ margin: '14px 18px' }}>
                    ⚠️ {error}
                </div>
            )}

            {isOn && (
                <div className="settings-alert settings-alert-green" style={{ margin: '14px 18px', fontSize: 11, opacity: 0.9 }}>
                    💡 You'll be notified when you add a transaction, receive a loan repayment, or when daily summaries are ready.
                </div>
            )}
        </div>
    )
}