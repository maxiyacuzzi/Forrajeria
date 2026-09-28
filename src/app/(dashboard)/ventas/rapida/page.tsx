import { createClient } from "@/lib/supabase/server"
import { QuickSaleScreen } from "./quick-sale-screen"

export default async function VentaRapidaPage() {
  const supabase = await createClient()

  const [
    { data: customers },
    { data: products },
    { data: categories },
    { data: mercadoPago },
  ] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("products").select("*").eq("is_active", true).order("name"),
    supabase.from("product_categories").select("*"),
    supabase.rpc("mercadopago_connection_status").single(),
  ])

  return (
    <QuickSaleScreen
      customers={customers ?? []}
      products={products ?? []}
      categories={categories ?? []}
      qrEnabled={mercadoPago?.qr_ready ?? false}
    />
  )
}
