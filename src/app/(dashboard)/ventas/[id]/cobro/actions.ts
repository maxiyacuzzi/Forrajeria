"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  closeOpenMercadoPagoOrder as closeOpenOrder,
  createMercadoPagoPointOrder,
  createMercadoPagoQrOrder,
  getMercadoPagoConnection,
  MercadoPagoApiError,
  orderExternalReference,
  syncMercadoPagoPayment,
  type MercadoPagoPaymentKind,
} from "@/lib/mercadopago-orders"

// Order statuses after which the order can no longer be paid.
const CLOSED_STATUSES = ["processed", "expired", "canceled", "failed", "refunded"]
const OPEN_STATUSES = ["created", "at_terminal", "action_required"]

export type MpPaymentState = { status: string | null; error: string | null }

function paymentKind(paymentMethod: string): MercadoPagoPaymentKind | null {
  if (paymentMethod === "qr_mp") return "qr"
  if (paymentMethod === "posnet_mp") return "point"
  return null
}

async function loadPendingSale(saleId: string) {
  const supabase = await createClient()
  // RLS scopes the sale to the user's organization.
  const { data: sale } = await supabase
    .from("sales")
    .select("id, org_id, total_amount, payment_method, awaiting_mp_payment")
    .eq("id", saleId)
    .single()

  const kind = sale && paymentKind(sale.payment_method)
  if (!sale || !kind) return null

  const { data: payment } = await supabase
    .from("mercadopago_payments")
    .select("mp_order_id, status")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return { sale, kind, payment }
}

/**
 * The QR (one per store) and the Point take one order at a time, and a newer
 * order on the same QR coexists with the older one — canceling the older one
 * afterwards can wipe the newer off the QR. So before charging a sale, open
 * orders of *other* sales on the same channel are closed first.
 * Returns an error when another sale is being paid at this very moment.
 */
async function closeOtherSalesOrders(
  orgId: string,
  accessToken: string,
  kind: MercadoPagoPaymentKind,
  saleId: string
) {
  const { data: others } = await createServiceRoleClient()
    .from("mercadopago_payments")
    .select("mp_order_id")
    .eq("org_id", orgId)
    .eq("kind", kind)
    .neq("sale_id", saleId)
    .in("status", OPEN_STATUSES)

  for (const other of others ?? []) {
    const status = await closeOpenOrder(orgId, accessToken, other.mp_order_id)
    if (status === "at_terminal") {
      return kind === "point"
        ? "El posnet está cobrando otra venta en este momento. Esperá a que termine o cancelala."
        : "Otro cliente está pagando con el QR en este momento. Esperá a que termine."
    }
  }
  revalidatePath("/ventas")
  return null
}

/** Sends the sale's total to the store's QR or Point (a new order, if none is open). */
export async function startMpPayment(saleId: string): Promise<MpPaymentState> {
  const loaded = await loadPendingSale(saleId)
  if (!loaded) return { status: null, error: "Venta no encontrada" }
  const { sale, kind, payment } = loaded

  if (!sale.awaiting_mp_payment) return { status: payment?.status ?? null, error: null }
  if (payment && !CLOSED_STATUSES.includes(payment.status)) {
    return { status: payment.status, error: null }
  }

  try {
    const connection = await getMercadoPagoConnection(sale.org_id)
    const target = kind === "qr" ? connection?.external_pos_id : connection?.point_terminal_id
    if (!connection || !target) {
      return {
        status: null,
        error: kind === "qr" ? "El cobro con QR no está configurado." : "No hay un posnet Point configurado.",
      }
    }

    const busy = await closeOtherSalesOrders(sale.org_id, connection.access_token, kind, sale.id)
    if (busy) return { status: null, error: busy }

    const orderInput = {
      amount: sale.total_amount,
      externalReference: orderExternalReference(sale.id),
      description: "Venta Forrajeria",
    }
    const order =
      kind === "qr"
        ? await createMercadoPagoQrOrder(connection.access_token, {
            ...orderInput,
            externalPosId: target,
          })
        : await createMercadoPagoPointOrder(connection.access_token, {
            ...orderInput,
            terminalId: target,
          })

    const { error } = await createServiceRoleClient().from("mercadopago_payments").insert({
      org_id: sale.org_id,
      sale_id: sale.id,
      kind,
      mp_order_id: order.id,
      amount: sale.total_amount,
      status: order.status,
      status_detail: order.status_detail,
    })
    if (error) throw error

    return { status: order.status, error: null }
  } catch (err) {
    console.error("startMpPayment", kind, err)
    const reason = err instanceof MercadoPagoApiError ? ` Motivo: ${err.reason}` : ""
    return {
      status: null,
      error:
        (kind === "point"
          ? "No se pudo enviar el cobro al posnet. Revisá que esté prendido y en modo integrado."
          : "No se pudo generar el cobro en Mercado Pago.") + reason,
    }
  }
}

/** Polled by the payment screen; works even where the webhook can't reach us. */
export async function refreshMpPaymentStatus(saleId: string): Promise<MpPaymentState> {
  const loaded = await loadPendingSale(saleId)
  if (!loaded?.payment) return { status: null, error: null }
  const { sale, payment } = loaded

  if (CLOSED_STATUSES.includes(payment.status)) {
    return { status: payment.status, error: null }
  }

  try {
    const order = await syncMercadoPagoPayment(sale.org_id, payment.mp_order_id)
    if (order.status === "processed") revalidatePath("/ventas")
    return { status: order.status, error: null }
  } catch (err) {
    console.error("refreshMpPaymentStatus", err)
    return { status: payment.status, error: null }
  }
}

/** Cancels the sale's open charge; the sale stays pending, to retry or settle otherwise. */
export async function cancelMpPayment(saleId: string): Promise<MpPaymentState> {
  const loaded = await loadPendingSale(saleId)
  if (!loaded) return { status: null, error: "Venta no encontrada" }
  const { sale, kind, payment } = loaded

  if (!payment || CLOSED_STATUSES.includes(payment.status)) {
    return { status: payment?.status ?? null, error: null }
  }

  const connection = await getMercadoPagoConnection(sale.org_id)
  if (!connection) return { status: payment.status, error: "Mercado Pago no está conectado." }

  const status = await closeOpenOrder(sale.org_id, connection.access_token, payment.mp_order_id)
  if (status === "processed") {
    revalidatePath("/ventas")
    return { status, error: null }
  }
  if (status === null || OPEN_STATUSES.includes(status)) {
    return {
      status: status ?? payment.status,
      error:
        kind === "point"
          ? "No se pudo cancelar: el cliente puede estar pagando en el posnet. Cancelalo desde el posnet."
          : "No se pudo cancelar el cobro. Probá de nuevo.",
    }
  }
  return { status, error: null }
}

/**
 * The sale is settled another way: close the open order, then switch the
 * method. "posnet_mp" means it was charged by hand on the posnet.
 */
export async function settleMpSaleOtherwise(
  saleId: string,
  paymentMethod: "efectivo" | "transferencia" | "posnet_mp"
): Promise<MpPaymentState> {
  const loaded = await loadPendingSale(saleId)
  if (!loaded) return { status: null, error: "Venta no encontrada" }
  const { sale, payment } = loaded

  if (payment && !CLOSED_STATUSES.includes(payment.status)) {
    const connection = await getMercadoPagoConnection(sale.org_id)
    if (connection) {
      // It may have just been paid: then it stays paid instead of switching.
      const status = await closeOpenOrder(sale.org_id, connection.access_token, payment.mp_order_id)
      if (status === "processed") return { status: "processed", error: null }
      if (status === "at_terminal") {
        return {
          status,
          error: "El cliente está pagando en este momento. Esperá a que termine antes de cambiar el medio de pago.",
        }
      }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("settle_mp_sale_otherwise", {
    p_sale_id: saleId,
    p_payment_method: paymentMethod,
  })
  if (error) return { status: payment?.status ?? null, error: error.message }

  revalidatePath("/ventas")
  redirect(`/ventas/${saleId}`)
}
