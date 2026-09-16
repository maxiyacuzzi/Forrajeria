import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/user-profile"
import { Button } from "@/components/ui/button"
import { StockTable } from "./stock-table"

export default async function StockPage() {
  const supabase = await createClient()

  const [{ data: products }, role] = await Promise.all([
    supabase.from("products").select("*").eq("is_active", true).order("name"),
    getUserRole(supabase),
  ])

  const canManage = role === "owner" || role === "deposito"

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
