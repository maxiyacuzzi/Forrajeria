// In-person payments on the organization's linked Mercado Pago account through
// the Orders API: the store's QR (https://www.mercadopago.com.ar/developers/es/docs/qr-code)
// and integrated Point terminals (https://www.mercadopago.com.ar/developers/es/docs/mp-point).
// Server-only — reads the seller's OAuth tokens with the service-role client.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import { refreshMercadoPagoToken } from "@/lib/mercadopago"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const API_URL = "https://api.mercadopago.com"
// Refresh a bit before the token actually expires, so a request never races it.
const TOKEN_REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000

export type MercadoPagoStoreLocation = {
  street_name: string
  street_number: string
  city_name: string
  state_name: string
  latitude: number
  longitude: number
  reference?: string
}

export type MercadoPagoPaymentKind = "qr" | "point"

export type MercadoPagoTerminal = {
  id: string
  operating_mode: string
  store_id: string | null
  pos_id: number | null
}

export type MercadoPagoOrder = {
  id: string
  status: string
  status_detail: string | null
  external_reference: string
}

/** A non-2xx answer from Mercado Pago, with the reason it gave (safe to show). */
export class MercadoPagoApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly reason: string
  ) {
    super(`Mercado Pago respondió ${status} en ${path}: ${reason}`)
  }
}

function errorReason(body: string) {
  try {
    const data = JSON.parse(body) as {
      message?: string
      error?: string
      cause?: { description?: string; message?: string }[]
      errors?: { message?: string; details?: string[] }[]
    }
    const detail =
      data.cause?.map((c) => c.description ?? c.message).filter(Boolean).join("; ") ||
      data.errors?.map((e) => [e.message, ...(e.details ?? [])].join(": ")).join("; ")
    return [data.message ?? data.error, detail].filter(Boolean).join(" — ") || body.slice(0, 300)
  } catch {
    return body.slice(0, 300)
  }
}

async function mpRequest<T>(
  path: string,
  accessToken: string,
  {
    method = "GET",
    body,
    headers,
  }: { method?: "GET" | "POST" | "PATCH"; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(method === "POST" ? { "X-Idempotency-Key": randomUUID() } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new MercadoPagoApiError(res.status, path.split("?")[0], errorReason(body))
  }

  return res.json() as Promise<T>
}

/** The org's connection with a usable access token, refreshing it if needed. */
export async function getMercadoPagoConnection(orgId: string) {
  const service = createServiceRoleClient()
  const { data: connection } = await service
    .from("mercadopago_connections")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle()

  if (!connection) return null

  if (new Date(connection.expires_at).getTime() - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return connection
  }

  const tokens = await refreshMercadoPagoToken(connection.refresh_token)
  const { data: refreshed, error } = await service
    .from("mercadopago_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      public_key: tokens.public_key,
      scope: tokens.scope,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("org_id", orgId)
    .select("*")
    .single()

  if (error) throw error
  return refreshed
}

// Alphanumeric and unique per setup, so reconnecting never collides with a
// store/POS left behind in the seller's account by an earlier connection.
function externalId(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}`
}

export async function createMercadoPagoStore(
  accessToken: string,
  mpUserId: number,
  { name, location }: { name: string; location: MercadoPagoStoreLocation }
) {
  const store = await mpRequest<{ id: number }>(`/users/${mpUserId}/stores`, accessToken, {
    method: "POST",
    body: { name, external_id: externalId("FORRAJERIA"), location },
  })
  return String(store.id)
}

/** Creates an attended ("pdv") POS in the store, returning its static QR. */
export async function createMercadoPagoPos(accessToken: string, storeId: string) {
  const externalPosId = externalId("FORRAJERIAPOS")
  const pos = await mpRequest<{
    qr_response?: { image?: string; template_document?: string }
  }>("/v2/pos", accessToken, {
    method: "POST",
    body: {
      name: "Caja 1",
      store_id: storeId,
      external_id: externalPosId,
      config: { qr: { operating_mode: "pdv" } },
    },
  })

  return {
    externalPosId,
    qrImageUrl: pos.qr_response?.image ?? null,
    qrTemplateUrl: pos.qr_response?.template_document ?? null,
  }
}

/** Puts an amount on the POS's static QR; the customer pays by scanning it. */
export function createMercadoPagoQrOrder(
  accessToken: string,
  {
    externalPosId,
    amount,
    externalReference,
    description,
  }: { externalPosId: string; amount: number; externalReference: string; description: string }
) {
  const total = amount.toFixed(2)
  return mpRequest<MercadoPagoOrder>("/v1/orders", accessToken, {
    method: "POST",
    body: {
      type: "qr",
      total_amount: total,
      description,
      external_reference: externalReference,
      expiration_time: "PT10M",
      config: { qr: { external_pos_id: externalPosId, mode: "static" } },
      transactions: { payments: [{ amount: total }] },
    },
  })
}

export async function listMercadoPagoTerminals(accessToken: string) {
  const res = await mpRequest<{ data?: { terminals?: MercadoPagoTerminal[] } }>(
    "/terminals/v1/list?limit=50",
    accessToken
  )
  return res.data?.terminals ?? []
}

/**
 * PDV: the terminal takes its charges from our orders instead of manual entry.
 * STANDALONE: back to manual charging on the device.
 */
export function setMercadoPagoTerminalMode(
  accessToken: string,
  terminalId: string,
  mode: "PDV" | "STANDALONE"
) {
  return mpRequest<unknown>("/terminals/v1/setup", accessToken, {
    method: "PATCH",
    body: { terminals: [{ id: terminalId, operating_mode: mode }] },
  })
}

/** Sends an amount to a Point terminal; the customer pays on the device. */
export function createMercadoPagoPointOrder(
  accessToken: string,
  {
    terminalId,
    amount,
    externalReference,
    description,
  }: { terminalId: string; amount: number; externalReference: string; description: string }
) {
  return mpRequest<MercadoPagoOrder>("/v1/orders", accessToken, {
    method: "POST",
    body: {
      type: "point",
      description,
      external_reference: externalReference,
      expiration_time: "PT10M",
      transactions: { payments: [{ amount: amount.toFixed(2) }] },
      config: { point: { terminal_id: terminalId, print_on_terminal: "no_ticket" } },
    },
  })
}

export function getMercadoPagoOrder(accessToken: string, orderId: string) {
  return mpRequest<MercadoPagoOrder>(`/v1/orders/${orderId}`, accessToken)
}

export function cancelMercadoPagoOrder(accessToken: string, orderId: string) {
  return mpRequest<MercadoPagoOrder>(`/v1/orders/${orderId}/cancel`, accessToken, {
    method: "POST",
    // Without it, an order a Point terminal already picked up can't be canceled.
    headers: { "x-allow-cancelable-status": "at_terminal" },
  })
}

export type MercadoPagoReceivedPayment = {
  id: number
  date_created: string
  date_approved: string | null
  money_release_date: string | null
  status: string
  status_detail: string | null
  payment_type_id: string
  payment_method_id: string
  description: string | null
  external_reference: string | null
  transaction_amount: number
  transaction_amount_refunded: number
  fee_details: { type: string; amount: number }[]
  transaction_details: { net_received_amount: number } | null
}

// Payments search pages; more than this in one range is summarized as partial.
const PAYMENTS_PAGE_SIZE = 100
const PAYMENTS_MAX_PAGES = 5

/** Payments received by the account between two instants, newest first. */
export async function searchMercadoPagoPayments(
  accessToken: string,
  { beginDate, endDate }: { beginDate: string; endDate: string }
) {
  const payments: MercadoPagoReceivedPayment[] = []
  let total = 0

  for (let page = 0; page < PAYMENTS_MAX_PAGES; page++) {
    const params = new URLSearchParams({
      sort: "date_created",
      criteria: "desc",
      range: "date_created",
      begin_date: beginDate,
      end_date: endDate,
      limit: String(PAYMENTS_PAGE_SIZE),
      offset: String(page * PAYMENTS_PAGE_SIZE),
    })
    const res = await mpRequest<{
      results: MercadoPagoReceivedPayment[]
      paging: { total: number }
    }>(`/v1/payments/search?${params}`, accessToken)

    payments.push(...res.results)
    total = res.paging.total
    if (payments.length >= total || res.results.length < PAYMENTS_PAGE_SIZE) break
  }

  return { payments, total, partial: payments.length < total }
}

/** Syncs a stored payment row with the order's current status in Mercado Pago. */
export async function syncMercadoPagoPayment(orgId: string, mpOrderId: string) {
  const connection = await getMercadoPagoConnection(orgId)
  if (!connection) throw new Error("La organización no tiene Mercado Pago conectado")

  const order = await getMercadoPagoOrder(connection.access_token, mpOrderId)
  const service = createServiceRoleClient()
  const { data: payment, error } = await service
    .from("mercadopago_payments")
    .update({
      status: order.status,
      status_detail: order.status_detail,
      updated_at: new Date().toISOString(),
    })
    .eq("mp_order_id", mpOrderId)
    .select("sale_id")
    .single()

  if (error) throw error

  if (order.status === "processed") {
    const { error: saleError } = await service
      .from("sales")
      .update({ awaiting_mp_payment: false })
      .eq("id", payment.sale_id)
    if (saleError) throw saleError
  }

  return order
}

/**
 * Validates the x-signature header of a webhook notification: an HMAC-SHA256
 * over "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" keyed with the
 * application's webhook secret. Missing parts are left out of the manifest.
 */
export function verifyMercadoPagoSignature({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret || !xSignature) return false

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=")
      return [key, value.join("=")]
    })
  )
  const { ts, v1 } = parts
  if (!ts || !v1) return false

  const manifest =
    (dataId ? `id:${dataId.toLowerCase()};` : "") +
    (xRequestId ? `request-id:${xRequestId};` : "") +
    `ts:${ts};`
  const expected = createHmac("sha256", secret).update(manifest).digest("hex")

  return (
    expected.length === v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  )
}
