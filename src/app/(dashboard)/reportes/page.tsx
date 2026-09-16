import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/user-profile"
import {
  REPORT_RANGES,
  REPORT_RANGE_LABEL,
  resolveReportRange,
  bucketKey,
  bucketLabel,
  generateDayBuckets,
} from "@/lib/reports"
import { formatMoney } from "@/lib/pricing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { BarChart } from "./bar-chart"

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeParam } = await searchParams
  const supabase = await createClient()

  const role = await getUserRole(supabase)
  if (role !== "owner") {
    redirect("/")
  }

  const range = resolveReportRange(rangeParam)

  const [{ data: sales }, { data: expensesInRange }, { data: allExpenses }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, customer_id, total_amount, created_at, customers(name, dni)")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString())
      .order("created_at"),
    supabase
      .from("expenses")
      .select("amount, paid_amount, created_at")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString()),
    supabase.from("expenses").select("amount, paid_amount, supplier_id, suppliers(name)"),
  ])

  const saleIds = (sales ?? []).map((s) => s.id)
  const { data: saleItems } =
    saleIds.length > 0
      ? await supabase
          .from("sale_items")
          .select("product_id, subtotal, products(name)")
          .in("sale_id", saleIds)
      : { data: [] }

  const totalVendido = (sales ?? []).reduce((sum, s) => sum + s.total_amount, 0)
  const totalGastado = (expensesInRange ?? []).reduce((sum, e) => sum + e.amount, 0)
  const balance = totalVendido - totalGastado

  const deudasPorProveedor = new Map<string, { id: string; name: string; total: number }>()
  let totalDeuda = 0
  for (const e of allExpenses ?? []) {
    const pending = e.amount - e.paid_amount
    if (pending <= 0) continue
    totalDeuda += pending
    if (!e.supplier_id) continue
    const existing = deudasPorProveedor.get(e.supplier_id) ?? {
      id: e.supplier_id,
      name: e.suppliers?.name ?? "—",
      total: 0,
    }
    existing.total += pending
    deudasPorProveedor.set(e.supplier_id, existing)
  }
  const topDeudas = [...deudasPorProveedor.values()].sort((a, b) => b.total - a.total)

  const productStats = new Map<string, { id: string; name: string; revenue: number; count: number }>()
  for (const item of saleItems ?? []) {
    const key = item.product_id
    const existing = productStats.get(key) ?? {
      id: key,
      name: item.products?.name ?? "—",
      revenue: 0,
      count: 0,
    }
    existing.revenue += item.subtotal ?? 0
    existing.count += 1
    productStats.set(key, existing)
  }
  const topProducts = [...productStats.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const customerStats = new Map<
    string,
    { id: string; name: string; dni: string; total: number; count: number }
  >()
  for (const sale of sales ?? []) {
    if (!sale.customer_id) continue
    const existing = customerStats.get(sale.customer_id) ?? {
      id: sale.customer_id,
      name: sale.customers?.name ?? "—",
      dni: sale.customers?.dni ?? "",
      total: 0,
      count: 0,
    }
    existing.total += sale.total_amount
    existing.count += 1
    customerStats.set(sale.customer_id, existing)
  }
  const topCustomers = [...customerStats.values()].sort((a, b) => b.total - a.total).slice(0, 10)

  const salesByBucket = new Map<string, number>()
  for (const sale of sales ?? []) {
    const key = bucketKey(new Date(sale.created_at), range.groupBy)
    salesByBucket.set(key, (salesByBucket.get(key) ?? 0) + sale.total_amount)
  }
  const bucketOrder =
    range.groupBy === "day"
      ? generateDayBuckets(range.from, range.to)
      : [...salesByBucket.keys()].sort()
  const chartData = bucketOrder.map((key) => ({
    key,
    label: bucketLabel(key, range.groupBy),
    value: salesByBucket.get(key) ?? 0,
  }))

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Estadísticas del negocio — {REPORT_RANGE_LABEL[range.key]}.
          </p>
        </div>
        <div className="flex gap-2">
          {REPORT_RANGES.map((key) => (
            <Button
              key={key}
              size="sm"
              variant={range.key === key ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={`/reportes?range=${key}`} />}
            >
              {REPORT_RANGE_LABEL[key]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total vendido</CardDescription>
            <CardTitle className="text-2xl">${formatMoney(totalVendido)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {(sales ?? []).length} {(sales ?? []).length === 1 ? "venta" : "ventas"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Total gastado</CardDescription>
            <CardTitle className="text-2xl">${formatMoney(totalGastado)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Balance</CardDescription>
            <CardTitle className={`text-2xl ${balance < 0 ? "text-destructive" : ""}`}>
              ${formatMoney(balance)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Deuda a proveedores</CardDescription>
            <CardTitle className={`text-2xl ${totalDeuda > 0 ? "text-destructive" : ""}`}>
              ${formatMoney(totalDeuda)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Total actual</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas por {range.groupBy === "day" ? "día" : "mes"}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.some((d) => d.value > 0) ? (
            <BarChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">Sin ventas en este período.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-3">
          <h2 className="text-lg font-semibold">Productos más vendidos</h2>
          {topProducts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Facturado</TableHead>
                    <TableHead>Ventas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p) => (
                    <ClickableTableRow key={p.id} href={`/productos/${p.id}`}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>${formatMoney(p.revenue)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.count}</TableCell>
                    </ClickableTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin ventas en este período.</p>
          )}
        </div>

        <div className="grid gap-3">
          <h2 className="text-lg font-semibold">Mejores clientes</h2>
          {topCustomers.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Gastado</TableHead>
                    <TableHead>Compras</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((c) => (
                    <ClickableTableRow key={c.id} href={`/clientes/${c.id}`}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>${formatMoney(c.total)}</TableCell>
                      <TableCell className="text-muted-foreground">{c.count}</TableCell>
                    </ClickableTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin ventas en este período.</p>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">Deudas a proveedores</h2>
        {topDeudas.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Deuda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDeudas.map((d) => (
                  <ClickableTableRow key={d.id} href={`/proveedores/${d.id}`}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">${formatMoney(d.total)}</Badge>
                    </TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay deudas pendientes con proveedores.</p>
        )}
      </div>
    </div>
  )
}
