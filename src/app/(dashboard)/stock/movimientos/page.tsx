import { createClient } from "@/lib/supabase/server"
import { MovementsTable } from "./movements-table"

export default async function MovimientosPage() {
  const supabase = await createClient()
  const { data: movements } = await supabase
    .from("stock_movements")
    .select(
      "*, products(name, purchase_unit_label, sale_unit_label), suppliers(name)"
    )
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Movimientos de stock</h1>
        <p className="text-sm text-muted-foreground">
          Historial completo: ingresos, egresos, fraccionamientos y ajustes.
        </p>
      </div>

      <MovementsTable movements={movements ?? []} />
    </div>
  )
}
