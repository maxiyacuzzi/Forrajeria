import { createClient } from "@/lib/supabase/server"
import { SaleForm } from "../sale-form"

export default async function NuevaVentaPage() {
  const supabase = await createClient()

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("products").select("*").eq("is_active", true).order("name"),
  ])

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Nueva venta</h1>
      <SaleForm customers={customers ?? []} products={products ?? []} />
    </div>
  )
}
