"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Database } from "@/lib/types/database.types"
import { matchesSearch } from "@/lib/search"
import { applySort, nextSortState, type SortState } from "@/lib/sort"
import { formatQty } from "@/lib/stock-format"
import { formatMoney } from "@/lib/pricing"

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

type Movement = Database["public"]["Tables"]["stock_movements"]["Row"] & {
  products: {
    name: string
    purchase_unit_label: string
    sale_unit_label: string
  } | null
  suppliers: { name: string } | null
}
type SortKey =
  "date" | "product" | "type" | "quantity" | "supplier" | "cost" | "note"

export function MovementsTable({ movements }: { movements: Movement[] }) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState<SortKey>>(null)

  if (movements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay movimientos de stock.
      </p>
    )
  }

  function getSortValue(movement: Movement, key: SortKey) {
    switch (key) {
      case "date":
        return movement.created_at
      case "product":
        return movement.products?.name ?? null
      case "type":
        return TYPE_LABEL[movement.type] ?? movement.type
      case "quantity":
        return movement.quantity
      case "supplier":
        return movement.suppliers?.name ?? null
      case "cost":
        return movement.unit_cost
      case "note":
        return movement.note
    }
  }

  function handleSort(key: SortKey) {
    setSort(nextSortState(sort, key))
  }

  const filteredMovements = applySort(
    movements.filter((movement) =>
      matchesSearch(
        query,
        movement.products?.name,
        movement.note,
        movement.suppliers?.name
      )
    ),
    sort,
    getSortValue
  )

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Buscar por producto, proveedor o nota..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filteredMovements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningún movimiento coincide con la búsqueda.
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
                  label="Producto"
                  sortKey="product"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Tipo"
                  sortKey="type"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Cantidad"
                  sortKey="quantity"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Proveedor"
                  sortKey="supplier"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Costo unit."
                  sortKey="cost"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Nota"
                  sortKey="note"
                  sort={sort}
                  onSort={handleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((movement) => {
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
                        movement.quantity < 0
                          ? "text-destructive"
                          : "text-emerald-600"
                      }
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {formatQty(movement.quantity)} {unitLabel}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.suppliers?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.unit_cost != null
                        ? `$${formatMoney(movement.unit_cost)}`
                        : "—"}
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
      )}
    </div>
  )
}
