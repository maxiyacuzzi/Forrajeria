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
  const [{ data: product }, { data: categories }, { data: suppliers }, { data: productSuppliers }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase.from("product_categories").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("product_suppliers").select("supplier_id").eq("product_id", id),
    ])

  if (!product) {
    notFound()
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      <ProductForm
        categories={categories ?? []}
        suppliers={suppliers ?? []}
        product={{
          id: product.id,
          name: product.name,
          brand: product.brand ?? "",
          unit_type: product.unit_type,
          purchase_unit_label: product.purchase_unit_label,
          sale_unit_label: product.sale_unit_label,
          conversion_factor: product.conversion_factor,
          controls_expiration: product.controls_expiration,
          earns_loyalty: product.earns_loyalty,
          min_stock_alert: product.min_stock_alert,
          cost_price: product.cost_price,
          margin_suelto_pct: product.margin_suelto_pct,
          margin_bolsa_pct: product.margin_bolsa_pct,
          sale_price: product.sale_price,
          bag_price: product.bag_price,
          category_id: product.category_id,
          supplier_ids: (productSuppliers ?? []).map((ps) => ps.supplier_id),
          image_url: product.image_url,
        }}
      />
    </div>
  )
}
