import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { getProductLoyaltyStatus, loyaltyProgressLabel } from "@/lib/loyalty"
import { Badge } from "@/components/ui/badge"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Racha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ customer, product, status }) => (
                <ClickableTableRow
                  key={`${customer.id}-${product.id}`}
                  href={`/clientes/${customer.id}`}
                >
                  <TableCell className="font-medium">
                    <Link href={`/clientes/${customer.id}`} className="hover:underline">
                      {customer.name}
                    </Link>
                    {customer.dni && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (DNI {customer.dni})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/productos/${product.id}`} className="hover:underline">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {loyaltyProgressLabel(status.progress)}
                  </TableCell>
                  <TableCell>
                    {status.ready ? (
                      <Badge>50% en la próxima</Badge>
                    ) : status.expiresAt ? (
                      <span className="text-xs text-muted-foreground">
                        Vence el {status.expiresAt.toLocaleDateString("es-AR")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavía no hay compras que sumen para fidelidad.
        </p>
      )}
    </div>
  )
}
