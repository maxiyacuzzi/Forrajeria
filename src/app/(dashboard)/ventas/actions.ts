"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale"
import {
  closeOpenMercadoPagoOrder,
  getMercadoPagoConnection,
  syncMercadoPagoPayment,
} from "@/lib/mercadopago-orders"
import { startMpPayment } from "./[id]/cobro/actions"

export type SaleActionState = { error: string | null }

export async function createSale(values: SaleFormValues): Promise<SaleActionState> {
  const parsed = saleSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const method = parsed.data.payment_method
  // QR always goes through Mercado Pago; "posnet_mp" only once a Point is set
  // up — until then it stays a manual method, as before.
  let chargeThroughMp = false

  if (method === "qr_mp" || method === "posnet_mp") {
    const { data: status } = await supabase.rpc("mercadopago_connection_status").single()
    if (method === "qr_mp" && !status?.qr_ready) {
      return { error: "El cobro con QR no está configurado (Configuración > Mercado Pago)" }
    }
    chargeThroughMp = method === "qr_mp" || Boolean(status?.point_terminal_id)
  }

  const { data: sale, error } = await supabase.rpc("create_sale", {
    p_customer_id: parsed.data.customer_id,
    p_items: parsed.data.items,
    p_note: parsed.data.note || undefined,
    p_payment_method: parsed.data.payment_method,
  })

  if (error || !sale) {
    return { error: error?.message ?? "No se pudo registrar la venta" }
  }

  revalidatePath("/ventas")
  revalidatePath("/stock")
  revalidatePath("/clientes")

  if (chargeThroughMp) {
    const { error: flagError } = await createServiceRoleClient()
      .from("sales")
      .update({ awaiting_mp_payment: true })
      .eq("id", sale.id)
    if (flagError) {
      return { error: "La venta se registró pero no se pudo iniciar el cobro con Mercado Pago." }
    }
    // The payment screen shows any error and lets the cashier retry.
    await startMpPayment(sale.id)
    redirect(`/ventas/${sale.id}/cobro`)
  }
  redirect(`/ventas/${sale.id}`)
}

export type CustomerLoyaltyProgress = {
  product_id: string
  progress_qty: number
  last_purchase_at: string | null
  last_purchase_unit: string | null
}

export async function getCustomerLoyalty(
  customerId: string
): Promise<CustomerLoyaltyProgress[]> {
  if (!customerId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from("customer_product_loyalty")
    .select("product_id, progress_qty, last_purchase_at, last_purchase_unit")
    .eq("customer_id", customerId)

  return data ?? []
}

/**
 * Voids a sale (owner only; void_sale enforces the rules). Mercado Pago comes
 * first: an open charge is canceled, and paid charges are re-read so one
 * refunded by hand in Mercado Pago is seen as refunded.
 */
export async function voidSale(saleId: string, reason: string): Promise<SaleActionState> {
  const supabase = await createClient()
  const { data: sale } = await supabase
    .from("sales")
    .select("id, org_id, voided_at")
    .eq("id", saleId)
    .single()
  if (!sale) return { error: "Venta no encontrada" }
  if (sale.voided_at) return { error: "La venta ya está anulada" }

  const { data: payments } = await supabase
    .from("mercadopago_payments")
    .select("mp_order_id, status")
    .eq("sale_id", saleId)
    .in("status", ["created", "at_terminal", "action_required", "processed"])

  if (payments?.length) {
    const connection = await getMercadoPagoConnection(sale.org_id).catch(() => null)
    if (!connection) return { error: "No se pudo consultar Mercado Pago. Probá de nuevo." }

    for (const payment of payments) {
      const status =
        payment.status === "processed"
          ? (await syncMercadoPagoPayment(sale.org_id, payment.mp_order_id).catch(() => null))
              ?.status
          : await closeOpenMercadoPagoOrder(sale.org_id, connection.access_token, payment.mp_order_id)

      if (status === "processed") {
        return {
          error:
            "La venta se cobró con Mercado Pago: primero devolvé el pago desde Mercado Pago y después anulala.",
        }
      }
      if (status === "at_terminal") {
        return { error: "El cliente está pagando en este momento. Esperá a que termine." }
      }
    }
  }

  const { error } = await supabase.rpc("void_sale", {
    p_sale_id: saleId,
    p_reason: reason.trim() || undefined,
  })
  if (error) return { error: error.message }

  for (const path of ["/ventas", `/ventas/${saleId}`, "/stock", "/caja", "/clientes", "/reportes", "/"]) {
    revalidatePath(path)
  }
  return { error: null }
}
