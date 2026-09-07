"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { stockAdjustmentSchema } from "@/lib/validations/fractioning"

export type StockActionState = { error: string | null }

export async function adjustStock(
  values: unknown
): Promise<StockActionState> {
  const parsed = stockAdjustmentSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .single()

  if (!profile?.org_id || !user) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { unit, type, quantity, product_id, note } = parsed.data
  // Una rotura/humedad siempre resta stock; un ajuste manual puede sumar o
  // restar según el signo que cargue quien lo hace (ej: conteo físico > sistema).
  const signedQuantity = type === "rotura_humedad" ? -Math.abs(quantity) : quantity

  const { error } = await supabase.from("stock_movements").insert({
    org_id: profile.org_id,
    product_id,
    unit,
    type,
    quantity: signedQuantity,
    note,
    created_by: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock")
  revalidatePath("/stock/movimientos")
  return { error: null }
}
