"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { Input } from "@/components/ui/input"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Database } from "@/lib/types/database.types"
import { matchesSearch } from "@/lib/search"
import { applySort, nextSortState, type SortState } from "@/lib/sort"
import {
  UNIT_TYPE_LABEL,
  formatStockSummary,
  isBelowMinStock,
  totalStockInSaleUnit,
} from "@/lib/stock-format"
import { AdjustStockDialog } from "./adjust-stock-dialog"

type Product = Database["public"]["Tables"]["products"]["Row"]
type SortKey = "name" | "type" | "stock" | "min"

export function StockTable({
  products,
  canManage,
}: {
  products: Product[]
  canManage: boolean
}) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState<SortKey>>(null)

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay productos cargados.
      </p>
    )
  }

  function getSortValue(product: Product, key: SortKey) {
    switch (key) {
      case "name":
        return product.name
      case "type":
        return UNIT_TYPE_LABEL[product.unit_type]
      case "stock":
        return totalStockInSaleUnit(product)
      case "min":
        return product.min_stock_alert
    }
  }

  function handleSort(key: SortKey) {
    setSort(nextSortState(sort, key))
  }

  const filteredProducts = applySort(
    products.filter((product) => matchesSearch(query, product.name)),
    sort,
    getSortValue
  )

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Buscar por nombre de producto..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filteredProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningún producto coincide con la búsqueda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Producto"
                  sortKey="name"
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
                  label="Stock actual"
                  sortKey="stock"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Mínimo"
                  sortKey="min"
                  sort={sort}
                  onSort={handleSort}
                />
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <ClickableTableRow
                  key={product.id}
                  href={`/productos/${product.id}`}
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {UNIT_TYPE_LABEL[product.unit_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          isBelowMinStock(product)
                            ? "font-medium text-destructive"
                            : ""
                        }
                      >
                        {formatStockSummary(product)}
                      </span>
                      {isBelowMinStock(product) && (
                        <Badge variant="destructive">Bajo mínimo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.min_stock_alert ?? "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <AdjustStockDialog product={product} />
                    </TableCell>
                  )}
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
