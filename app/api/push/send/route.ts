import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/services/push.server'

export const dynamic = 'force-dynamic'

// Optional: protect with a shared secret for cron/webhook calls
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET

export async function POST(req: NextRequest) {
    const body = await req.json()
    const { userId, title, message, url, tag, secret } = body

    // Allow either an authenticated user (sending to themselves) OR a secret-bearing caller
    if (secret) {
        if (secret !== INTERNAL_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    } else {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user || auth.user.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    if (!userId || !title || !message) {
        return NextResponse.json({ error: 'userId, title, and message are required' }, { status: 400 })
    }

    const result = await sendPushToUser(userId, {
        title,
        body: message,
        url: url ?? '/dashboard',
        tag: tag ?? 'wallet',
    })

    return NextResponse.json(result)
}