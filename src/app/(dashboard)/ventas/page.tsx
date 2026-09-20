import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { SalesTable } from "./sales-table"

export default async function VentasPage() {
  const supabase = await createClient()

  const { data: sales } = await supabase
    .from("sales")
    .select(
      "id, total_amount, is_loyalty_reward, payment_method, created_at, customers(name, dni)"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            Historial de ventas por cliente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/ventas/nuevo" />}
          >
            Nueva venta
          </Button>
          <Button nativeButton={false} render={<Link href="/ventas/rapida" />}>
            Venta rápida
          </Button>
        </div>
      </div>

      <SalesTable sales={sales ?? []} />
    </div>
  )
}
