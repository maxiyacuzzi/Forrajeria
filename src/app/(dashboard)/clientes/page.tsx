import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { CustomerTable } from "./customer-table"
import { getProductLoyaltyStatus } from "@/lib/loyalty"

export default async function ClientesPage() {
  const supabase = await createClient()

  const [{ data: customers }, { data: loyaltyRows }] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase
      .from("customer_product_loyalty")
      .select("customer_id, progress_qty, last_purchase_at, last_purchase_unit"),
  ])

  const readyCountByCustomer = new Map<string, number>()
  for (const row of loyaltyRows ?? []) {
    const { ready } = getProductLoyaltyStatus(row)
    if (ready) {
      readyCountByCustomer.set(row.customer_id, (readyCountByCustomer.get(row.customer_id) ?? 0) + 1)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Registro de clientes y sus datos de contacto.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/clientes/inactivos" />}
          >
            Clientes inactivos
          </Button>
          <Button nativeButton={false} render={<Link href="/clientes/nuevo" />}>
            Nuevo cliente
          </Button>
        </div>
      </div>

      <CustomerTable customers={customers ?? []} readyCountByCustomer={readyCountByCustomer} />
    </div>
  )
}
