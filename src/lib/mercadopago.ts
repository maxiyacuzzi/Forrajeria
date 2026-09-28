// Mercado Pago's own OAuth2 "Connect" flow — lets an organization link the
// seller account that will receive its payments. No third-party identity
// provider involved: https://www.mercadopago.com.ar/developers/es/docs/security/oauth/creation

const AUTHORIZATION_URL = "https://auth.mercadopago.com/authorization"
const TOKEN_URL = "https://api.mercadopago.com/oauth/token"

export const OAUTH_STATE_COOKIE = "mp_oauth_state"

export type MercadoPagoTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  user_id: number
  refresh_token: string
  public_key: string
  live_mode: boolean
}

export function getMercadoPagoAuthorizationUrl(state: string) {
  const url = new URL(AUTHORIZATION_URL)
  url.searchParams.set("client_id", process.env.MERCADOPAGO_CLIENT_ID!)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("platform_id", "mp")
  url.searchParams.set("redirect_uri", process.env.MERCADOPAGO_REDIRECT_URI!)
  url.searchParams.set("state", state)
  return url.toString()
}

export async function exchangeMercadoPagoCode(
  code: string
): Promise<MercadoPagoTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MERCADOPAGO_CLIENT_ID,
      client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.MERCADOPAGO_REDIRECT_URI,
    }),
  })

  if (!res.ok) {
    throw new Error(`No se pudo canjear el código de Mercado Pago (${res.status})`)
  }

  return res.json()
}

export async function getMercadoPagoUserInfo(accessToken: string) {
  const res = await fetch("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`No se pudo obtener el usuario de Mercado Pago (${res.status})`)
  }

  const data = (await res.json()) as { nickname: string | null; email: string | null }
  return { nickname: data.nickname, email: data.email }
}

export async function refreshMercadoPagoToken(
  refreshToken: string
): Promise<MercadoPagoTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MERCADOPAGO_CLIENT_ID,
      client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    throw new Error(`No se pudo refrescar el token de Mercado Pago (${res.status})`)
  }

  return res.json()
}
