import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const TYPE_LABEL: Record<string, string> = {
  ingreso_compra: "Ingreso por compra",
  egreso_venta: "Egreso por venta",
  fraccionamiento_apertura: "Apertura de fraccionamiento",
  fraccionamiento_merma: "Merma de fraccionamiento",
  mezcla_insumo: "Insumo de mezcla",
  mezcla_producto: "Producto de mezcla",
  ajuste_manual: "Ajuste manual",
  rotura_humedad: "Rotura / humedad",
}

export default async function MovimientosPage() {
  const supabase = await createClient()
  const { data: movements } = await supabase
    .from("stock_movements")
    .select("*, products(name, purchase_unit_label, sale_unit_label)")
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

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(movements ?? []).map((movement) => {
              const unitLabel =
                movement.unit === "purchase"
                  ? movement.products?.purchase_unit_label
                  : movement.products?.sale_unit_label

              return (
                <TableRow key={movement.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(movement.created_at).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {movement.products?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {TYPE_LABEL[movement.type] ?? movement.type}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={
                      movement.quantity < 0 ? "text-destructive" : "text-emerald-600"
                    }
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity} {unitLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.note ?? "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
