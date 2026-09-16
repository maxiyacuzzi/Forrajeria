"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getUserOrgId } from "@/lib/user-profile"
import { productSchema, type ProductFormValues } from "@/lib/validations/product"

export type ProductActionState = { error: string | null }

export async function createProduct(
  values: ProductFormValues
): Promise<ProductActionState> {
  const parsed = productSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const orgId = await getUserOrgId(supabase)

  if (!orgId) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { supplier_ids, ...productValues } = parsed.data

  const { data: product, error } = await supabase
    .from("products")
    .insert({ ...productValues, org_id: orgId })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  if (supplier_ids.length > 0) {
    const { error: supplierError } = await supabase.from("product_suppliers").insert(
      supplier_ids.map((supplier_id) => ({
        org_id: orgId,
        product_id: product.id,
        supplier_id,
      }))
    )
    if (supplierError) {
      return { error: supplierError.message }
    }
  }

  revalidatePath("/productos")
  redirect("/productos")
}

export async function updateProduct(
  productId: string,
  values: ProductFormValues
): Promise<ProductActionState> {
  const parsed = productSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const orgId = await getUserOrgId(supabase)

  if (!orgId) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { supplier_ids, ...productValues } = parsed.data

  const { error } = await supabase
    .from("products")
    .update(productValues)
    .eq("id", productId)

  if (error) {
    return { error: error.message }
  }

  // Replace the product's supplier links wholesale, simplest way to keep them
  // in sync with whatever the checkboxes ended up as.
  const { error: deleteError } = await supabase
    .from("product_suppliers")
    .delete()
    .eq("product_id", productId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (supplier_ids.length > 0) {
    const { error: supplierError } = await supabase.from("product_suppliers").insert(
      supplier_ids.map((supplier_id) => ({
        org_id: orgId,
        product_id: productId,
        supplier_id,
      }))
    )
    if (supplierError) {
      return { error: supplierError.message }
    }
  }

  revalidatePath("/productos")
  redirect("/productos")
}

export async function deleteProduct(productId: string): Promise<ProductActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from("products").delete().eq("id", productId)

  if (error) {
    return {
      error:
        error.code === "23503"
          ? "No se puede eliminar: este producto tiene ventas registradas."
          : error.message,
    }
  }

  revalidatePath("/productos")
  return { error: null }
}
