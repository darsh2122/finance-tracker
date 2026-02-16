import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: req,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Rebuild response when Supabase refreshes auth cookies.
          res = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()
  const user = data.user

  const path = req.nextUrl.pathname
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/transactions") ||
    path.startsWith("/accounts") ||
    path.startsWith("/categories")

  if (isProtected && !user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/auth/login"
    redirectUrl.searchParams.set("next", path)
    const redirectRes = NextResponse.redirect(redirectUrl)
    const setCookieHeader = res.headers.get("set-cookie")
    if (setCookieHeader) {
      redirectRes.headers.set("set-cookie", setCookieHeader)
    }
    return redirectRes
  }

  // If user is logged in and tries to access auth page, optionally send them to dashboard
  if (user && path.startsWith("/auth/login")) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    redirectUrl.search = ""
    const redirectRes = NextResponse.redirect(redirectUrl)
    const setCookieHeader = res.headers.get("set-cookie")
    if (setCookieHeader) {
      redirectRes.headers.set("set-cookie", setCookieHeader)
    }
    return redirectRes
  }

  return res
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/accounts/:path*",
    "/categories/:path*",
    "/auth/login",
  ],
}
