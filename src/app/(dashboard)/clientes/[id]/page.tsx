import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
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
import { CustomerForm } from "../customer-form"
import { CustomerMap } from "./customer-map"
import { LoyaltyAdjustDialog } from "./loyalty-adjust-dialog"
import { getProductLoyaltyStatus, loyaltyProgressLabel } from "@/lib/loyalty"
import { formatMoney } from "@/lib/pricing"
import { formatPurchaseLabel } from "@/lib/stock-format"

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: customer }, { data: sales }, { data: loyaltyRows }, { data: products }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase
        .from("sales")
        .select(
          "id, total_amount, note, created_at, sale_items(quantity, unit, products(id, name, unit_type, conversion_factor, purchase_unit_label, sale_unit_label))"
        )
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("customer_product_loyalty")
        .select("progress_qty, last_purchase_at, last_purchase_unit, products(id, name)")
        .eq("customer_id", id),
      supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .eq("earns_loyalty", true)
        .order("name"),
    ])

  if (!customer) {
    notFound()
  }

  const loyaltyByProduct = (loyaltyRows ?? [])
    .filter((row) => row.products)
    .map((row) => ({
      product: row.products!,
      status: getProductLoyaltyStatus(row),
    }))
    .sort((a, b) => b.status.progress - a.status.progress)

  return (
    <div className="grid gap-8">
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">{customer.name}</h1>

        <div className="grid max-w-lg gap-2 rounded-lg border p-4">
          <p className="text-sm font-medium">Fidelidad por producto</p>
          {loyaltyByProduct.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no compró ningún producto que sume para fidelidad.
            </p>
          ) : (
            <div className="grid gap-2">
              {loyaltyByProduct.map(({ product, status }) => (
                <div key={product.id} className="grid gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm">{product.name}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      {status.ready ? (
                        <Badge>50% en la próxima</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {loyaltyProgressLabel(status.progress)}
                        </span>
                      )}
                      <LoyaltyAdjustDialog
                        customerId={customer.id}
                        products={products ?? []}
                        existingProductId={product.id}
                        currentProgressQty={status.progress}
                      />
                    </div>
                  </div>
                  {status.expiresAt && !status.ready && (
                    <p className="text-xs text-muted-foreground">
                      Se pierde si no compra antes del{" "}
                      {status.expiresAt.toLocaleDateString("es-AR")}.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div>
            <LoyaltyAdjustDialog customerId={customer.id} products={products ?? []} />
          </div>
        </div>

        <CustomerForm
          customer={{
            id: customer.id,
            dni: customer.dni ?? undefined,
            name: customer.name,
            address: customer.address ?? "",
            whatsapp: customer.whatsapp ?? "",
          }}
        />

        <CustomerMap address={customer.address ?? ""} />
      </div>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Ventas</h2>
        {sales && sales.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <ClickableTableRow key={sale.id} href={`/ventas/${sale.id}`}>
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.sale_items
                        .map((item) =>
                          item.products
                            ? `${item.products.name} (${formatPurchaseLabel(item.products, item.unit as "purchase" | "sale", item.quantity)})`
                            : null
                        )
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.note ?? "—"}
                    </TableCell>
                    <TableCell>${formatMoney(sale.total_amount)}</TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este cliente todavía no tiene ventas registradas.
          </p>
        )}
      </div>
    </div>
  )
}
