"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { categorySchema, type CategoryFormValues } from "@/lib/validations/category"

export type CategoryActionState = { error: string | null }

export async function createCategory(
  values: CategoryFormValues
): Promise<CategoryActionState> {
  const parsed = categorySchema.safeParse(values)
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
    .from("product_categories")
    .insert({ ...parsed.data, org_id: profile.org_id })

  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe una categoría con ese nombre" : error.message,
    }
  }

  revalidatePath("/productos/categorias")
  revalidatePath("/productos")
  return { error: null }
}

export async function updateCategory(
  categoryId: string,
  values: CategoryFormValues
): Promise<CategoryActionState> {
  const parsed = categorySchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("product_categories")
    .update(parsed.data)
    .eq("id", categoryId)

  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe una categoría con ese nombre" : error.message,
    }
  }

  revalidatePath("/productos/categorias")
  revalidatePath("/productos")
  return { error: null }
}

export async function deleteCategory(categoryId: string): Promise<CategoryActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from("product_categories").delete().eq("id", categoryId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/productos/categorias")
  revalidatePath("/productos")
  return { error: null }
}
