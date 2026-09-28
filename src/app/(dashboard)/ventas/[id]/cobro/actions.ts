"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  cancelMercadoPagoOrder,
  createMercadoPagoPointOrder,
  createMercadoPagoQrOrder,
  getMercadoPagoConnection,
  syncMercadoPagoPayment,
  type MercadoPagoPaymentKind,
} from "@/lib/mercadopago-orders"

// Order statuses after which the order can no longer be paid.
const CLOSED_STATUSES = ["processed", "expired", "canceled", "failed", "refunded"]

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

    const orderInput = {
      amount: sale.total_amount,
      externalReference: sale.id,
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
    console.error("startMpPayment", err)
    return {
      status: null,
      error:
        kind === "point"
          ? "No se pudo enviar el cobro al posnet. Revisá que esté prendido y en modo integrado."
          : "No se pudo generar el cobro en Mercado Pago.",
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
    try {
      const connection = await getMercadoPagoConnection(sale.org_id)
      if (connection) {
        const order = await cancelMercadoPagoOrder(connection.access_token, payment.mp_order_id)
        await createServiceRoleClient()
          .from("mercadopago_payments")
          .update({ status: order.status, updated_at: new Date().toISOString() })
          .eq("mp_order_id", payment.mp_order_id)
      }
    } catch (err) {
      // It may have just been paid: re-check before switching the method.
      console.error("settleMpSaleOtherwise cancel", err)
      const order = await syncMercadoPagoPayment(sale.org_id, payment.mp_order_id).catch(
        () => null
      )
      if (order?.status === "processed") return { status: "processed", error: null }
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
