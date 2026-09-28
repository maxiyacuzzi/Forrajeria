"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { Input } from "@/components/ui/input"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import { formatMoney } from "@/lib/pricing"
import { matchesSearch } from "@/lib/search"
import { applySort, nextSortState, type SortState } from "@/lib/sort"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Sale = {
  id: string
  total_amount: number
  is_loyalty_reward: boolean
  payment_method: keyof typeof PAYMENT_METHOD_LABEL
  awaiting_mp_payment: boolean
  voided_at: string | null
  created_at: string
  customers: { name: string; dni: string | null } | null
}
type SortKey = "date" | "customer" | "payment" | "status" | "total"

const STATUS: Record<
  "voided" | "pending" | "paid",
  { label: string; variant: "destructive" | "secondary" | "outline" }
> = {
  voided: { label: "Anulada", variant: "destructive" },
  pending: { label: "Pendiente de pago", variant: "secondary" },
  paid: { label: "Pagada", variant: "outline" },
}

function saleStatus(sale: Sale) {
  if (sale.voided_at) return STATUS.voided
  if (sale.awaiting_mp_payment) return STATUS.pending
  return STATUS.paid
}

export function SalesTable({ sales }: { sales: Sale[] }) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState<SortKey>>(null)

  if (sales.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay ventas registradas.
      </p>
    )
  }

  function getSortValue(sale: Sale, key: SortKey) {
    switch (key) {
      case "date":
        return sale.created_at
      case "customer":
        return sale.customers?.name ?? null
      case "payment":
        return PAYMENT_METHOD_LABEL[sale.payment_method]
      case "status":
        return saleStatus(sale).label
      case "total":
        return sale.total_amount
    }
  }

  function handleSort(key: SortKey) {
    setSort(nextSortState(sort, key))
  }

  const filteredSales = applySort(
    sales.filter((sale) =>
      matchesSearch(query, sale.customers?.name, sale.customers?.dni)
    ),
    sort,
    getSortValue
  )

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Buscar por cliente o DNI..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filteredSales.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguna venta coincide con la búsqueda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Fecha"
                  sortKey="date"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Cliente"
                  sortKey="customer"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Pago"
                  sortKey="payment"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Estado"
                  sortKey="status"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Total"
                  sortKey="total"
                  sort={sort}
                  onSort={handleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
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
                    <Badge variant={saleStatus(sale).variant}>{saleStatus(sale).label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={sale.voided_at ? "text-muted-foreground line-through" : undefined}
                      >
                        ${formatMoney(sale.total_amount)}
                      </span>
                      {sale.is_loyalty_reward && <Badge>Fidelidad</Badge>}
                    </div>
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
