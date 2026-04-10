// lib/services/push.server.ts
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Configure VAPID once at module load
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

// Service-role client — bypasses RLS to read all subscriptions
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type PushPayload = {
    title: string
    body: string
    url?: string
    tag?: string
    icon?: string
}

/**
 * Send a push notification to a single user.
 * Automatically cleans up expired/invalid subscriptions.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
    const { data: subs, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId)

    if (error || !subs?.length) return { sent: 0, errors: [] }

    const results = await Promise.allSettled(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    JSON.stringify({
                        title: payload.title,
                        body: payload.body,
                        url: payload.url ?? '/dashboard',
                        tag: payload.tag ?? 'wallet',
                        icon: payload.icon ?? '/icons/icon-192x192.png',
                    }),
                    { TTL: 86400 } // Deliver within 24h or drop
                )
            } catch (e: any) {
                // 410 Gone = subscription expired. Clean it up.
                if (e.statusCode === 410 || e.statusCode === 404) {
                    await supabaseAdmin
                        .from('push_subscriptions')
                        .delete()
                        .eq('id', sub.id)
                }
                throw e
            }
        })
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r) => (r as PromiseRejectedResult).reason?.message)

    return { sent, errors }
}

/**
 * Broadcast to ALL users (e.g. for announcements).
 * Batched in groups of 50 to avoid rate limits.
 */
export async function broadcastPush(payload: PushPayload) {
    const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')

    if (!subs?.length) return { sent: 0 }

    const BATCH = 50
    let sent = 0
    for (let i = 0; i < subs.length; i += BATCH) {
        const batch = subs.slice(i, i + BATCH)
        const results = await Promise.allSettled(
            batch.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                        JSON.stringify(payload),
                        { TTL: 86400 }
                    )
                    sent++
                } catch (e: any) {
                    if (e.statusCode === 410 || e.statusCode === 404) {
                        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
                    }
                }
            })
        )
    }
    return { sent }
}