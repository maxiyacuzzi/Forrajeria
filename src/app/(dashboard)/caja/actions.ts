"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  openCashRegisterSchema,
  closeCashRegisterSchema,
  type OpenCashRegisterValues,
  type CloseCashRegisterValues,
} from "@/lib/validations/cash-register"

export type CashRegisterActionState = { error: string | null }

export async function openCashRegister(
  values: OpenCashRegisterValues
): Promise<CashRegisterActionState> {
  const parsed = openCashRegisterSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("open_cash_register", {
    p_opening_amount: parsed.data.opening_amount,
    p_note: parsed.data.note || undefined,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/caja")
  return { error: null }
}

export async function closeCashRegister(
  cashRegisterId: string,
  values: CloseCashRegisterValues
): Promise<CashRegisterActionState> {
  const parsed = closeCashRegisterSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("close_cash_register", {
    p_cash_register_id: cashRegisterId,
    p_counted_amount: parsed.data.counted_amount,
    p_note: parsed.data.note || undefined,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/caja")
  return { error: null }
}
