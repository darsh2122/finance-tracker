'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)))
}

export type PushState = 'unsupported' | 'denied' | 'prompt' | 'subscribed' | 'loading'

export function usePushNotifications() {
    const [state, setState] = useState<PushState>('loading')
    const [error, setError] = useState<string | null>(null)

    // Check current state on mount
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setState('unsupported')
            return
        }

        const perm = Notification.permission
        if (perm === 'denied') { setState('denied'); return }

        // Check if we already have an active subscription
        navigator.serviceWorker.ready.then(async (reg) => {
            const existing = await reg.pushManager.getSubscription()
            if (existing) {
                // Verify it's saved in Supabase (could have been cleared)
                const { data: auth } = await supabase.auth.getUser()
                if (auth.user) {
                    const { data } = await supabase
                        .from('push_subscriptions')
                        .select('id')
                        .eq('user_id', auth.user.id)
                        .eq('endpoint', existing.endpoint)
                        .maybeSingle()
                    setState(data ? 'subscribed' : 'prompt')
                } else {
                    setState('prompt')
                }
            } else {
                setState(perm === 'granted' ? 'prompt' : 'prompt')
            }
        })
    }, [])

    const subscribe = useCallback(async () => {
        setError(null)
        setState('loading')
        try {
            const { data: auth } = await supabase.auth.getUser()
            if (!auth.user) throw new Error('Not authenticated')

            // Register service worker if not already
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
            await navigator.serviceWorker.ready

            // Request permission
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                setState('denied')
                return
            }

            // Subscribe to push
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            })

            const subJson = sub.toJSON()
            const { error: dbErr } = await supabase.from('push_subscriptions').upsert(
                {
                    user_id: auth.user.id,
                    endpoint: subJson.endpoint!,
                    p256dh: subJson.keys!.p256dh,
                    auth: subJson.keys!.auth,
                },
                { onConflict: 'user_id,endpoint' }
            )
            if (dbErr) throw dbErr

            setState('subscribed')
        } catch (e: any) {
            setError(e.message ?? 'Failed to enable notifications')
            setState('prompt')
        }
    }, [])

    const unsubscribe = useCallback(async () => {
        setError(null)
        setState('loading')
        try {
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()

            if (sub) {
                const { data: auth } = await supabase.auth.getUser()
                if (auth.user) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('user_id', auth.user.id)
                        .eq('endpoint', sub.endpoint)
                }
                await sub.unsubscribe()
            }

            setState('prompt')
        } catch (e: any) {
            setError(e.message ?? 'Failed to disable notifications')
            setState('subscribed')
        }
    }, [])

    return { state, error, subscribe, unsubscribe }
}