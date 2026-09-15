"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { supplierSchema, type SupplierFormValues } from "@/lib/validations/supplier"
import { computeAutoPrices, round2 } from "@/lib/pricing"

export type SupplierActionState = { error: string | null }

export async function createSupplier(
  values: SupplierFormValues
): Promise<SupplierActionState> {
  const parsed = supplierSchema.safeParse(values)
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

  const { error } = await supabase.from("suppliers").insert({
    ...parsed.data,
    org_id: profile.org_id,
  })

  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe un proveedor con ese nombre" : error.message,
    }
  }

  revalidatePath("/proveedores")
  redirect("/proveedores")
}

export async function updateSupplier(
  supplierId: string,
  values: SupplierFormValues
): Promise<SupplierActionState> {
  const parsed = supplierSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("suppliers")
    .update(parsed.data)
    .eq("id", supplierId)

  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe un proveedor con ese nombre" : error.message,
    }
  }

  revalidatePath("/proveedores")
  redirect("/proveedores")
}

export async function applySupplierPriceIncrease(
  supplierId: string,
  percentage: number
): Promise<SupplierActionState> {
  if (!percentage) {
    return { error: "Ingresá un porcentaje distinto de cero" }
  }

  const supabase = await createClient()

  const { data: links } = await supabase
    .from("product_suppliers")
    .select("product_id")
    .eq("supplier_id", supplierId)

  const productIds = (links ?? []).map((l) => l.product_id)
  if (productIds.length === 0) {
    return { error: "Este proveedor no tiene productos asignados" }
  }

  const { data: products } = await supabase.from("products").select("*").in("id", productIds)

  for (const product of products ?? []) {
    const newCostPrice = Math.max(0, round2(product.cost_price * (1 + percentage / 100)))
    const autoPrices = computeAutoPrices({
      unit_type: product.unit_type,
      cost_price: newCostPrice,
      conversion_factor: product.conversion_factor,
      margin_suelto_pct: product.margin_suelto_pct,
      margin_bolsa_pct: product.margin_bolsa_pct,
    })

    const { error } = await supabase
      .from("products")
      .update({
        cost_price: newCostPrice,
        sale_price: autoPrices.sale_price,
        bag_price: autoPrices.bag_price,
      })
      .eq("id", product.id)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath(`/proveedores/${supplierId}`)
  revalidatePath("/productos")
  return { error: null }
}

export async function deleteSupplier(supplierId: string): Promise<SupplierActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from("suppliers").delete().eq("id", supplierId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/proveedores")
  revalidatePath("/productos")
  return { error: null }
}
