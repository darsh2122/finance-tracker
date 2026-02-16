import { NextResponse } from "next/server"
import { createClientForRoute } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"
  const safeNext = next.startsWith("/") ? next : "/dashboard"
  const response = NextResponse.redirect(new URL(safeNext, origin))

  if (code) {
    const supabase = createClientForRoute(response)
    await supabase.auth.exchangeCodeForSession(code)
  }

  return response
}
