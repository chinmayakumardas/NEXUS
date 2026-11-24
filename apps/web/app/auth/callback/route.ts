import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?setup=required", requestUrl.origin)
    )
  }
  const code = requestUrl.searchParams.get("code")
  const requestedNext = requestUrl.searchParams.get("next")
  const isPasswordReset = requestedNext?.split("?")[0] === "/reset-password"
  const candidate = requestedNext?.startsWith("/")
    ? new URL(requestedNext, requestUrl.origin)
    : null
  const next =
    candidate?.origin === requestUrl.origin
      ? `${candidate.pathname}${candidate.search}${candidate.hash}`
      : "/"
  const error =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error")
  if (error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
    )
  if (!code)
    return NextResponse.redirect(
      new URL(
        isPasswordReset
          ? "/login?reset=expired"
          : "/login?error=Authentication%20link%20is%20invalid%20or%20expired",
        requestUrl.origin
      )
    )
  const supabase = await createClient()
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError)
    return NextResponse.redirect(
      new URL(
        isPasswordReset
          ? "/login?reset=expired"
          : `/login?error=${encodeURIComponent(exchangeError.message)}`,
        requestUrl.origin
      )
    )
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
