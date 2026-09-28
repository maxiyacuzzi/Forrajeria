"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  cancelMercadoPagoOrder,
  createMercadoPagoQrOrder,
  getMercadoPagoConnection,
  syncMercadoPagoPayment,
} from "@/lib/mercadopago-qr"

// Order statuses after which the order can no longer be paid.
const CLOSED_STATUSES = ["processed", "expired", "canceled", "failed", "refunded"]

export type QrPaymentState = { status: string | null; error: string | null }

async function loadQrSale(saleId: string) {
  const supabase = await createClient()
  // RLS scopes the sale to the user's organization.
  const { data: sale } = await supabase
    .from("sales")
    .select("id, org_id, total_amount, payment_method")
    .eq("id", saleId)
    .single()

  if (!sale || sale.payment_method !== "qr_mp") return null

  const { data: payment } = await supabase
    .from("mercadopago_payments")
    .select("mp_order_id, status")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return { sale, payment }
}

/** Puts the sale's total on the store's QR (a new order, if none is still open). */
export async function startQrPayment(saleId: string): Promise<QrPaymentState> {
  const loaded = await loadQrSale(saleId)
  if (!loaded) return { status: null, error: "Venta no encontrada" }
  const { sale, payment } = loaded

  if (payment && !CLOSED_STATUSES.includes(payment.status)) {
    return { status: payment.status, error: null }
  }
  if (payment?.status === "processed") return { status: "processed", error: null }

  try {
    const connection = await getMercadoPagoConnection(sale.org_id)
    if (!connection?.external_pos_id) {
      return { status: null, error: "El cobro con QR no está configurado." }
    }

    const order = await createMercadoPagoQrOrder(connection.access_token, {
      externalPosId: connection.external_pos_id,
      amount: sale.total_amount,
      externalReference: sale.id,
      description: "Venta Forrajeria",
    })

    const { error } = await createServiceRoleClient().from("mercadopago_payments").insert({
      org_id: sale.org_id,
      sale_id: sale.id,
      mp_order_id: order.id,
      amount: sale.total_amount,
      status: order.status,
      status_detail: order.status_detail,
    })
    if (error) throw error

    return { status: order.status, error: null }
  } catch (err) {
    console.error("startQrPayment", err)
    return { status: null, error: "No se pudo generar el cobro en Mercado Pago." }
  }
}

/** Polled by the payment screen; works even where the webhook can't reach us. */
export async function refreshQrPaymentStatus(saleId: string): Promise<QrPaymentState> {
  const loaded = await loadQrSale(saleId)
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
    console.error("refreshQrPaymentStatus", err)
    return { status: payment.status, error: null }
  }
}

/** The customer pays another way: close the open order and switch the sale's method. */
export async function settleQrSaleOtherwise(
  saleId: string,
  paymentMethod: "efectivo" | "transferencia" | "posnet_mp"
): Promise<QrPaymentState> {
  const loaded = await loadQrSale(saleId)
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
      console.error("settleQrSaleOtherwise cancel", err)
      const order = await syncMercadoPagoPayment(sale.org_id, payment.mp_order_id).catch(
        () => null
      )
      if (order?.status === "processed") return { status: "processed", error: null }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("change_qr_sale_payment_method", {
    p_sale_id: saleId,
    p_payment_method: paymentMethod,
  })
  if (error) return { status: payment?.status ?? null, error: error.message }

  revalidatePath("/ventas")
  redirect(`/ventas/${saleId}`)
}
