import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StockTable } from "./stock-table"

export default async function StockPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: profile }] = await Promise.all([
    supabase.from("products").select("*").eq("is_active", true).order("name"),
    supabase.from("profiles").select("role").single(),
  ])

  const canManage = profile?.role === "owner" || profile?.role === "deposito"

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock</h1>
          <p className="text-sm text-muted-foreground">
            Stock actual por producto, en sus unidades de compra y venta.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/stock/movimientos" />}
          >
            Ver movimientos
          </Button>
          {canManage && (
            <Button nativeButton={false} render={<Link href="/stock/ingreso" />}>
              Registrar ingreso
            </Button>
          )}
        </div>
      </div>

      <StockTable products={products ?? []} canManage={canManage} />
    </div>
  )
}
