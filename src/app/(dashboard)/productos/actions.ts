"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .single()

  if (!profile?.org_id) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { error } = await supabase
    .from("products")
    .insert({ ...parsed.data, org_id: profile.org_id })

  if (error) {
    return { error: error.message }
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
  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", productId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/productos")
  redirect("/productos")
}
