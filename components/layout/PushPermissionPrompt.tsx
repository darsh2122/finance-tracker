'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

export function PushPermissionPrompt() {
    const { state, subscribe } = usePushNotifications()
    const [isVisible, setIsVisible] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    useEffect(() => {
        // Only show if the state is 'prompt' (meaning we can ask)
        // AND it hasn't been dismissed in this session
        const sessionDismissed = sessionStorage.getItem('push-prompt-dismissed')
        if (state === 'prompt' && !sessionDismissed && !isDismissed) {
            // Delay slightly for a better entrance
            const timer = setTimeout(() => setIsVisible(true), 2000)
            return () => clearTimeout(timer)
        } else {
            setIsVisible(false)
        }
    }, [state, isDismissed])

    const handleDismiss = () => {
        setIsVisible(false)
        setIsDismissed(true)
        sessionStorage.setItem('push-prompt-dismissed', 'true')
    }

    const handleEnable = async () => {
        await subscribe()
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="push-prompt-wrapper">
            <style>{`
                .push-prompt-wrapper {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 20px;
                }

                .push-prompt-backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(30, 21, 53, 0.45);
                    backdrop-filter: blur(8px);
                    animation: clay-fade-in 0.2s ease both;
                }

                .push-prompt-card {
                    position: relative;
                    width: 100%;
                    max-width: 360px;
                    background: var(--surface);
                    border-radius: var(--r-2xl);
                    padding: 28px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    border: 1px solid var(--border);
                    box-shadow: 0 30px 60px rgba(0,0,0,0.25), var(--clay-card);
                    animation: clay-zoom-in 0.4s var(--spring) both;
                }

                .push-prompt-header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 16px;
                }

                .push-prompt-icon {
                    width: 64px;
                    height: 64px;
                    border-radius: 20px;
                    background: var(--purple-grad);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    box-shadow: var(--clay-icon);
                    flex-shrink: 0;
                }

                .push-prompt-title {
                    font-size: 20px;
                    font-weight: 900;
                    color: var(--text);
                    margin-bottom: 4px;
                }

                .push-prompt-desc {
                    font-size: 14px;
                    color: var(--text-muted);
                    line-height: 1.6;
                    font-weight: 500;
                }

                .push-prompt-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 8px;
                }

                .push-btn-enable {
                    padding: 16px;
                    border-radius: 18px;
                    background: var(--purple-grad);
                    border: none;
                    color: white;
                    font-size: 15px;
                    font-weight: 900;
                    cursor: pointer;
                    box-shadow: var(--clay-purple);
                    transition: all 0.2s;
                }

                .push-btn-enable:active { transform: scale(0.96); }

                .push-btn-dismiss {
                    padding: 14px;
                    border-radius: 18px;
                    background: var(--surface-soft);
                    border: 1px solid var(--border);
                    color: var(--text-muted);
                    font-size: 14px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .push-btn-dismiss:active { transform: scale(0.96); }

                @keyframes clay-fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes clay-zoom-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
            `}</style>

            <div className="push-prompt-backdrop" onClick={handleDismiss} />

            <div className="push-prompt-card">
                <div className="push-prompt-header">
                    <div className="push-prompt-icon">🔔</div>
                    <div>
                        <div className="push-prompt-title">Enable Notifications</div>
                        <div className="push-prompt-desc">Stay updated with transaction alerts and daily summaries delivered to your phone.</div>
                    </div>
                </div>

                <div className="push-prompt-actions">
                    <button onClick={handleEnable} className="push-btn-enable">Enable Now</button>
                    <button onClick={handleDismiss} className="push-btn-dismiss">Skip for now</button>
                </div>
            </div>
        </div>
    )
}
