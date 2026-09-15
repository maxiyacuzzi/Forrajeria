import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isBelowMinStock, formatStockSummary } from "@/lib/stock-format"
import { formatMoney } from "@/lib/pricing"
import { getProductLoyaltyStatus } from "@/lib/loyalty"
import { cn } from "@/lib/utils"

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    { data: todaySales },
    { data: monthSales },
    { data: recentSales },
    { data: products },
    { data: customers },
  ] = await Promise.all([
    supabase.from("sales").select("total_amount").gte("created_at", startOfToday.toISOString()),
    supabase.from("sales").select("total_amount").gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("sales")
      .select("id, total_amount, created_at, customers(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("products").select("*").eq("is_active", true),
    supabase
      .from("customer_product_loyalty")
      .select("customer_id, progress_qty, last_purchase_at, last_purchase_unit"),
  ])

  const todayCount = todaySales?.length ?? 0
  const todayTotal = (todaySales ?? []).reduce((sum, s) => sum + s.total_amount, 0)
  const monthTotal = (monthSales ?? []).reduce((sum, s) => sum + s.total_amount, 0)

  const lowStockProducts = (products ?? []).filter(isBelowMinStock)
  const customersWithReward = new Set(
    (customers ?? [])
      .filter((row) => getProductLoyaltyStatus(row).ready)
      .map((row) => row.customer_id)
  )
  const loyaltyReadyCount = customersWithReward.size

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Inicio</h1>
        <p className="text-sm text-muted-foreground">Resumen del negocio.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Ventas hoy</CardDescription>
            <CardTitle className="text-2xl">${formatMoney(todayTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {todayCount} {todayCount === 1 ? "venta" : "ventas"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Ventas del mes</CardDescription>
            <CardTitle className="text-2xl">${formatMoney(monthTotal)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Stock bajo</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                lowStockProducts.length > 0 && "text-destructive"
              )}
            >
              {lowStockProducts.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/stock" className="text-sm text-muted-foreground hover:underline">
              Ver stock
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Clientes con premio</CardDescription>
            <CardTitle className="text-2xl">{loyaltyReadyCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/clientes" className="text-sm text-muted-foreground hover:underline">
              Ver clientes
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-3">
          <h2 className="text-lg font-semibold">Últimas ventas</h2>
          {recentSales && recentSales.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <ClickableTableRow key={sale.id} href={`/ventas/${sale.id}`}>
                      <TableCell>
                        {new Date(sale.created_at).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.customers?.name ?? "—"}
                      </TableCell>
                      <TableCell>${formatMoney(sale.total_amount)}</TableCell>
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

        <div className="grid gap-3">
          <h2 className="text-lg font-semibold">Productos con stock bajo</h2>
          {lowStockProducts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <ClickableTableRow key={product.id} href={`/productos/${product.id}`}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{formatStockSummary(product)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.min_stock_alert}
                      </TableCell>
                    </ClickableTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todo el stock está por encima del mínimo.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
