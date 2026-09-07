import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { ProductForm } from "../product-form"

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  if (!product) {
    notFound()
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          brand: product.brand ?? "",
          unit_type: product.unit_type,
          purchase_unit_label: product.purchase_unit_label,
          sale_unit_label: product.sale_unit_label,
          conversion_factor: product.conversion_factor,
          reference_weight: product.reference_weight,
          controls_expiration: product.controls_expiration,
          min_stock_alert: product.min_stock_alert,
          cost_price: product.cost_price,
          category_id: product.category_id,
        }}
      />
    </div>
  )
}
