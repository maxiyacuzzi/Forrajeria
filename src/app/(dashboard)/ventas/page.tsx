import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import { formatMoney } from "@/lib/pricing"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function VentasPage() {
  const supabase = await createClient()

  const { data: sales } = await supabase
    .from("sales")
    .select("id, total_amount, is_loyalty_reward, payment_method, created_at, customers(name, dni)")
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

      {sales && sales.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <ClickableTableRow key={sale.id} href={`/ventas/${sale.id}`}>
                  <TableCell>
                    {new Date(sale.created_at).toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {sale.customers?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {PAYMENT_METHOD_LABEL[sale.payment_method]}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      ${formatMoney(sale.total_amount)}
                      {sale.is_loyalty_reward && <Badge>Fidelidad</Badge>}
                    </div>
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavía no hay ventas registradas.
        </p>
      )}
    </div>
  )
}
