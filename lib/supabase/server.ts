import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies() // read-only in Server Components

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // No-op in Server Components
        },
      },
    }
  )
}

// New: create a server client that can write cookies using a NextResponse
export function createClientForRoute(res: NextResponse) {
  // read request cookies via next/headers (works in route handlers too)
  const reqCookies = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await reqCookies).getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c: any) => {
            // c shape: { name, value, options? } — map to NextResponse.cookies.set
            res.cookies.set(c.name, c.value, {
              path: c.options?.path ?? '/',
              httpOnly: c.options?.httpOnly ?? true,
              sameSite: (c.options?.sameSite as any) ?? 'lax',
              maxAge: c.options?.maxAge,
              secure: c.options?.secure ?? process.env.NODE_ENV === 'production',
              domain: c.options?.domain,
            })
          })
        },
      },
    }
  )
}
