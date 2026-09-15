"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale"

export type SaleActionState = { error: string | null }

export async function createSale(values: SaleFormValues): Promise<SaleActionState> {
  const parsed = saleSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
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
