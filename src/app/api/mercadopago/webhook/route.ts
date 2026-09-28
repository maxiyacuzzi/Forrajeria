import { NextResponse, type NextRequest } from "next/server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { syncMercadoPagoPayment, verifyMercadoPagoSignature } from "@/lib/mercadopago-qr"

// Mercado Pago "order" notifications. The body is only a hint: after checking
// the signature, the order's status is always re-read from the API.
export async function POST(request: NextRequest) {
  const dataId = request.nextUrl.searchParams.get("data.id")

  const valid = verifyMercadoPagoSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  })
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    type?: string
    data?: { id?: string }
  } | null
  const orderId = body?.data?.id ?? dataId
  if (body?.type !== "order" || !orderId) {
    return NextResponse.json({ ok: true })
  }

  const { data: payment } = await createServiceRoleClient()
    .from("mercadopago_payments")
    .select("org_id, mp_order_id")
    .ilike("mp_order_id", orderId)
    .maybeSingle()

  // Not one of ours (or created by another environment sharing the webhook).
  if (!payment) return NextResponse.json({ ok: true })

  try {
    await syncMercadoPagoPayment(payment.org_id, payment.mp_order_id)
  } catch (err) {
    console.error("mercadopago webhook", err)
    // Non-2xx makes Mercado Pago retry the notification later.
    return NextResponse.json({ error: "sync failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
