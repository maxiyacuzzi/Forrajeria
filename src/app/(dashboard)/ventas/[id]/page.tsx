import Link from "next/link"
import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import { formatMoney } from "@/lib/pricing"
import { formatPurchaseLabel } from "@/lib/stock-format"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function VentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sale } = await supabase
    .from("sales")
    .select(
      "*, customers(id, name, dni), sale_items(id, quantity, unit, unit_price, subtotal, loyalty_discount, products(name, unit_type, conversion_factor, purchase_unit_label, sale_unit_label))"
    )
    .eq("id", id)
    .single()

  if (!sale) {
    notFound()
  }

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">
            Venta del {new Date(sale.created_at).toLocaleDateString("es-AR")}
          </h1>
          {sale.is_loyalty_reward && <Badge>Fidelidad</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Cliente:{" "}
          <Link href={`/clientes/${sale.customers?.id}`} className="hover:underline">
            {sale.customers?.name}
          </Link>
          {sale.customers?.dni && ` (DNI ${sale.customers.dni})`}
        </p>
        <p className="text-sm text-muted-foreground">
          Pago: {PAYMENT_METHOD_LABEL[sale.payment_method]}
        </p>
        {sale.note && (
          <p className="text-sm text-muted-foreground">Nota: {sale.note}</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Precio unitario</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sale.sale_items.map((item) => {
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.products?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {item.products
                      ? formatPurchaseLabel(
                          item.products,
                          item.unit as "purchase" | "sale",
                          item.quantity
                        )
                      : item.quantity}
                  </TableCell>
                  <TableCell>${formatMoney(item.unit_price)}</TableCell>
                  <TableCell>${formatMoney(item.subtotal ?? 0)}</TableCell>
                  <TableCell>
                    {item.loyalty_discount > 0 && <Badge>50% OFF</Badge>}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-1">
        {(sale.discount_amount > 0 || sale.surcharge_amount > 0) && (
          <p className="text-sm text-muted-foreground">
            Subtotal: ${formatMoney(sale.subtotal_amount)}
          </p>
        )}
        {sale.discount_amount > 0 && (
          <p className="text-sm text-muted-foreground">
            Descuento fidelidad: -${formatMoney(sale.discount_amount)}
          </p>
        )}
        {sale.surcharge_amount > 0 && (
          <p className="text-sm text-muted-foreground">
            Recargo tarjeta (10%): +${formatMoney(sale.surcharge_amount)}
          </p>
        )}
        <p className="text-lg font-semibold">Total: ${formatMoney(sale.total_amount)}</p>
      </div>
    </div>
  )
}
