"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getUserOrgId } from "@/lib/user-profile"
import {
  expenseSchema,
  expensePaymentSchema,
  type ExpenseFormValues,
  type ExpensePaymentFormValues,
} from "@/lib/validations/expense"

export type ExpenseActionState = { error: string | null }

export async function createExpense(
  values: ExpenseFormValues
): Promise<ExpenseActionState> {
  const parsed = expenseSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const orgId = await getUserOrgId(supabase)

  if (!orgId || !user) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "open")
    .maybeSingle()

  const { paid_amount, ...expenseValues } = parsed.data

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      ...expenseValues,
      org_id: orgId,
      created_by: user.id,
      cash_register_id: openRegister?.id ?? null,
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  if (paid_amount > 0) {
    const { error: paymentError } = await supabase.rpc("register_expense_payment", {
      p_expense_id: expense.id,
      p_amount: paid_amount,
      p_payment_method: parsed.data.payment_method,
    })
    if (paymentError) {
      return { error: paymentError.message }
    }
  }

  revalidatePath("/gastos")
  revalidatePath("/caja")
  revalidatePath("/proveedores")
  return { error: null }
}

export async function registerExpensePayment(
  values: ExpensePaymentFormValues
): Promise<ExpenseActionState> {
  const parsed = expensePaymentSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("register_expense_payment", {
    p_expense_id: parsed.data.expense_id,
    p_amount: parsed.data.amount,
    p_payment_method: parsed.data.payment_method,
    p_note: parsed.data.note || undefined,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/gastos")
  revalidatePath("/caja")
  revalidatePath("/proveedores")
  return { error: null }
}

export async function deleteExpense(expenseId: string): Promise<ExpenseActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/gastos")
  revalidatePath("/caja")
  return { error: null }
}
