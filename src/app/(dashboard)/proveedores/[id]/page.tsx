import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SupplierForm } from "../supplier-form"
import { PriceIncreaseForm } from "./price-increase-form"
import { Badge } from "@/components/ui/badge"
import { PayExpenseDialog } from "../../gastos/pay-expense-dialog"
import { PAYMENT_STATUS_LABEL, paymentStatus } from "@/lib/expense-status"
import { formatMoney } from "@/lib/pricing"

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: supplier }, { data: links }, { data: expenses }] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", id).single(),
    supabase
      .from("product_suppliers")
      .select("products(id, name, cost_price, sale_price)")
      .eq("supplier_id", id),
    supabase
      .from("expenses")
      .select("*")
      .eq("supplier_id", id)
      .order("created_at", { ascending: false }),
  ])

  const products = (links ?? [])
    .map((l) => l.products)
    .filter((p): p is NonNullable<typeof p> => p != null)
    .sort((a, b) => a.name.localeCompare(b.name))

  const debts = (expenses ?? []).filter((e) => e.paid_amount < e.amount)
  const totalOwed = debts.reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

  if (!supplier) {
    notFound()
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">{supplier.name}</h1>
        <SupplierForm
          supplier={{
            id: supplier.id,
            name: supplier.name,
            contact_name: supplier.contact_name ?? "",
            phone: supplier.phone ?? "",
            email: supplier.email ?? "",
            address: supplier.address ?? "",
          }}
        />
      </div>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Cuenta corriente</h2>
        {debts.length > 0 ? (
          <div className="grid gap-3">
            <p className="text-sm font-medium">
              Le debés a este proveedor: ${formatMoney(totalOwed)}
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Pendiente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debts.map((expense) => {
                    const status = paymentStatus(expense.amount, expense.paid_amount)
                    const pendingAmount = expense.amount - expense.paid_amount
                    return (
                      <TableRow key={expense.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(expense.created_at).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>${formatMoney(expense.amount)}</TableCell>
                        <TableCell>${formatMoney(pendingAmount)}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{PAYMENT_STATUS_LABEL[status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <PayExpenseDialog
                            expenseId={expense.id}
                            description={expense.description}
                            pendingAmount={pendingAmount}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No le debés nada a este proveedor.</p>
        )}
      </div>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Productos</h2>

        {products.length > 0 && (
          <PriceIncreaseForm
            supplierId={supplier.id}
            supplierName={supplier.name}
            productCount={products.length}
          />
        )}

        {products && products.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Precio de venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <ClickableTableRow key={product.id} href={`/productos/${product.id}`}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>${formatMoney(product.cost_price)}</TableCell>
                    <TableCell>${formatMoney(product.sale_price)}</TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este proveedor todavía no tiene productos asignados.
          </p>
        )}
      </div>
    </div>
  )
}
