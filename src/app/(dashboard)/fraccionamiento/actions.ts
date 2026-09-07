"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  openFractioningSchema,
  closeFractioningSchema,
} from "@/lib/validations/fractioning"

export type FractioningActionState = { error: string | null }

export async function openFractioning(
  values: unknown
): Promise<FractioningActionState> {
  const parsed = openFractioningSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("open_fractioning", {
    p_product_id: parsed.data.product_id,
    p_bags_opened: parsed.data.bags_opened,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/fraccionamiento")
  revalidatePath("/stock")
  return { error: null }
}

export async function closeFractioning(
  fractioningId: string,
  values: unknown
): Promise<FractioningActionState> {
  const parsed = closeFractioningSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("close_fractioning", {
    p_fractioning_id: fractioningId,
    p_actual_qty: parsed.data.actual_qty,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/fraccionamiento")
  revalidatePath("/stock")
  return { error: null }
}
