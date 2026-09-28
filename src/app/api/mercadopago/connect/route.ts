import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { OAUTH_STATE_COOKIE, getMercadoPagoAuthorizationUrl } from "@/lib/mercadopago"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin))
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "owner") {
    return NextResponse.redirect(
      new URL("/configuracion/mercadopago?error=forbidden", request.nextUrl.origin)
    )
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    // Safari drops Secure cookies on http://localhost, breaking the state check in dev.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })

  return NextResponse.redirect(getMercadoPagoAuthorizationUrl(state))
}
