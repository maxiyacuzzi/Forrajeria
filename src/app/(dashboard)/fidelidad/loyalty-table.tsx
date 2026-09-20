"use client"

import Link from "next/link"
import { useState } from "react"

import { loyaltyProgressLabel } from "@/lib/loyalty"
import { matchesSearch } from "@/lib/search"
import { applySort, nextSortState, type SortState } from "@/lib/sort"
import { Badge } from "@/components/ui/badge"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { Input } from "@/components/ui/input"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type LoyaltyRow = {
  customer: { id: string; name: string; dni: string | null }
  product: { id: string; name: string }
  status: { ready: boolean; progress: number; expiresAt: Date | null }
}
type SortKey = "customer" | "product" | "progress" | "status"

export function LoyaltyTable({ rows }: { rows: LoyaltyRow[] }) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState<SortKey>>(null)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay compras que sumen para fidelidad.
      </p>
    )
  }

  function getSortValue(row: LoyaltyRow, key: SortKey) {
    switch (key) {
      case "customer":
        return row.customer.name
      case "product":
        return row.product.name
      case "progress":
        return row.status.progress
      case "status":
        return row.status.ready
    }
  }

  function handleSort(key: SortKey) {
    setSort(nextSortState(sort, key))
  }

  const filteredRows = applySort(
    rows.filter(({ customer, product }) =>
      matchesSearch(query, customer.name, customer.dni, product.name)
    ),
    sort,
    getSortValue
  )

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Buscar por cliente, DNI o producto..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningún resultado coincide con la búsqueda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Cliente"
                  sortKey="customer"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Producto"
                  sortKey="product"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Racha"
                  sortKey="progress"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Estado"
                  sortKey="status"
                  sort={sort}
                  onSort={handleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map(({ customer, product, status }) => (
                <ClickableTableRow
                  key={`${customer.id}-${product.id}`}
                  href={`/clientes/${customer.id}`}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/clientes/${customer.id}`}
                      className="hover:underline"
                    >
                      {customer.name}
                    </Link>
                    {customer.dni && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (DNI {customer.dni})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/productos/${product.id}`}
                      className="hover:underline"
                    >
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
      )}
    </div>
  )
}
