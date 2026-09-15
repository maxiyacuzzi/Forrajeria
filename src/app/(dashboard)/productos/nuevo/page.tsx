import { createClient } from "@/lib/supabase/server"
import { ProductForm } from "../product-form"

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const [{ data: categories }, { data: suppliers }] = await Promise.all([
    supabase.from("product_categories").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name"),
  ])

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      <ProductForm categories={categories ?? []} suppliers={suppliers ?? []} />
    </div>
  )
}
