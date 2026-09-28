import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  OAUTH_STATE_COOKIE,
  exchangeMercadoPagoCode,
  getMercadoPagoUserInfo,
} from "@/lib/mercadopago"

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/configuracion/mercadopago", request.nextUrl.origin)

  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(OAUTH_STATE_COOKIE)

  if (!code || !state || !expectedState || state !== expectedState) {
    settingsUrl.searchParams.set("error", "invalid_state")
    return NextResponse.redirect(settingsUrl)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin))
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "owner" || !profile.org_id) {
    settingsUrl.searchParams.set("error", "forbidden")
    return NextResponse.redirect(settingsUrl)
  }

  try {
    const tokens = await exchangeMercadoPagoCode(code)
    const mpUser = await getMercadoPagoUserInfo(tokens.access_token)

    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient.from("mercadopago_connections").upsert({
      org_id: profile.org_id,
      mp_user_id: tokens.user_id,
      nickname: mpUser.nickname,
      email: mpUser.email,
      live_mode: tokens.live_mode,
      scope: tokens.scope,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      public_key: tokens.public_key,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_by: user.id,
      connected_at: new Date().toISOString(),
    })

    if (error) throw error
  } catch {
    settingsUrl.searchParams.set("error", "exchange_failed")
    return NextResponse.redirect(settingsUrl)
  }

  settingsUrl.searchParams.set("connected", "1")
  return NextResponse.redirect(settingsUrl)
}
