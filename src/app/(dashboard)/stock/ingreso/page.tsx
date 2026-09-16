import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/user-profile"
import { StockEntryForm } from "./stock-entry-form"

export default async function IngresoStockPage() {
  const supabase = await createClient()

  const role = await getUserRole(supabase)
  if (role !== "owner" && role !== "deposito") {
    redirect("/stock")
  }

  const [{ data: suppliers }, { data: products }] = await Promise.all([
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("products").select("*").eq("is_active", true).order("name"),
  ])

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ingreso de mercadería</h1>
        <p className="text-sm text-muted-foreground">
          Registrá lo que llegó de un proveedor: suma stock y, si cargás el costo, actualiza
          el precio del producto.
        </p>
      </div>

      <StockEntryForm suppliers={suppliers ?? []} products={products ?? []} />
    </div>
  )
}
