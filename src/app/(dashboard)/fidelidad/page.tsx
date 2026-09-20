import { createClient } from "@/lib/supabase/server"
import { getProductLoyaltyStatus } from "@/lib/loyalty"
import { LoyaltyTable } from "./loyalty-table"

export default async function FidelidadPage() {
  const supabase = await createClient()

  const { data: loyaltyRows } = await supabase
    .from("customer_product_loyalty")
    .select(
      "customer_id, progress_qty, last_purchase_at, last_purchase_unit, customers(id, name, dni), products(id, name)"
    )

  const rows = (loyaltyRows ?? [])
    .filter((row) => row.customers && row.products)
    .map((row) => ({
      customer: row.customers!,
      product: row.products!,
      status: getProductLoyaltyStatus(row),
    }))
    .sort((a, b) => {
      if (a.status.ready !== b.status.ready) return a.status.ready ? -1 : 1
      return b.status.progress - a.status.progress
    })

  const readyCount = rows.filter((r) => r.status.ready).length

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Fidelidad</h1>
        <p className="text-sm text-muted-foreground">
          Racha de cada cliente por producto — {readyCount}{" "}
          {readyCount === 1 ? "premio listo" : "premios listos"}.
        </p>
      </div>

      <LoyaltyTable rows={rows} />
    </div>
  )
}
