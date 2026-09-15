"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer"

export type CustomerActionState = { error: string | null }

export async function createCustomer(
  values: CustomerFormValues
): Promise<CustomerActionState> {
  const parsed = customerSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .single()

  if (!profile?.org_id) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { error } = await supabase.from("customers").insert({
    ...parsed.data,
    dni: parsed.data.dni ? parsed.data.dni.replace(/\D/g, "") : null,
    org_id: profile.org_id,
  })

  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe un cliente con ese DNI" : error.message,
    }
  }

  revalidatePath("/clientes")
  redirect("/clientes")
}

export async function updateCustomer(
  customerId: string,
  values: CustomerFormValues
): Promise<CustomerActionState> {
  const parsed = customerSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("customers")
    .update({
      ...parsed.data,
      dni: parsed.data.dni ? parsed.data.dni.replace(/\D/g, "") : null,
    })
    .eq("id", customerId)

  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe un cliente con ese DNI" : error.message,
    }
  }

  revalidatePath("/clientes")
  redirect("/clientes")
}

export async function adjustCustomerProductLoyalty(
  customerId: string,
  productId: string,
  progressQty: number
): Promise<CustomerActionState> {
  if (!productId) {
    return { error: "Elegí un producto" }
  }
  if (progressQty < 0) {
    return { error: "No puede ser negativo" }
  }

  const supabase = await createClient()
  const { data: profile } = await supabase.from("profiles").select("org_id").single()
  if (!profile?.org_id) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { error } = await supabase.from("customer_product_loyalty").upsert(
    {
      org_id: profile.org_id,
      customer_id: customerId,
      product_id: productId,
      progress_qty: progressQty,
      last_purchase_at: new Date().toISOString(),
    },
    { onConflict: "customer_id,product_id" }
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/clientes/${customerId}`)
  revalidatePath("/fidelidad")
  return { error: null }
}
