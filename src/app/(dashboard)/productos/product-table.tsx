"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { deleteProduct } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { categoryPath } from "@/lib/category-tree"
import { matchesSearch } from "@/lib/search"
import { applySort, nextSortState, type SortState } from "@/lib/sort"
import {
  UNIT_TYPE_LABEL,
  formatStockSummary,
  isBelowMinStock,
  totalStockInSaleUnit,
} from "@/lib/stock-format"
import { formatMoney } from "@/lib/pricing"

type SortKey =
  | "name"
  | "brand"
  | "category"
  | "supplier"
  | "type"
  | "stock"
  | "cost"
  | "price"

type Product = Database["public"]["Tables"]["products"]["Row"]
type Category = Database["public"]["Tables"]["product_categories"]["Row"]

export function ProductTable({
  products,
  categories,
  productSuppliers,
  canManage,
}: {
  products: Product[]
  categories: Category[]
  productSuppliers: {
    product_id: string
    suppliers: { name: string } | null
  }[]
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState<SortKey>>(null)

  const supplierNamesByProduct = new Map<string, string>()
  for (const ps of productSuppliers) {
    if (!ps.suppliers) continue
    const existing = supplierNamesByProduct.get(ps.product_id)
    supplierNamesByProduct.set(
      ps.product_id,
      existing ? `${existing}, ${ps.suppliers.name}` : ps.suppliers.name
    )
  }

  function getSortValue(product: Product, key: SortKey) {
    switch (key) {
      case "name":
        return product.name
      case "brand":
        return product.brand
      case "category":
        return product.category_id
          ? categoryPath(product.category_id, categories)
          : null
      case "supplier":
        return supplierNamesByProduct.get(product.id) ?? null
      case "type":
        return UNIT_TYPE_LABEL[product.unit_type]
      case "stock":
        return totalStockInSaleUnit(product)
      case "cost":
        return product.cost_price
      case "price":
        return product.sale_price
    }
  }

  function handleSort(key: SortKey) {
    setSort(nextSortState(sort, key))
  }

  const filteredProducts = applySort(
    products.filter((product) =>
      matchesSearch(
        query,
        product.name,
        product.brand,
        product.category_id
          ? categoryPath(product.category_id, categories)
          : null,
        supplierNamesByProduct.get(product.id)
      )
    ),
    sort,
    getSortValue
  )

  function handleDelete(product: Product) {
    if (
      !window.confirm(
        `¿Eliminar el producto "${product.name}"? También se borra su historial de movimientos de stock.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await deleteProduct(product.id)
      if (result.error) toast.error(result.error)
      else toast.success("Producto eliminado")
    })
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay productos cargados.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Buscar por nombre, marca, categoría o proveedor..."
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
                  label="Nombre"
                  sortKey="name"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Stock"
                  sortKey="stock"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Costo"
                  sortKey="cost"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Precio de venta"
                  sortKey="price"
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
                  label="Categoría"
                  sortKey="category"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Marca"
                  sortKey="brand"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Proveedor"
                  sortKey="supplier"
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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt=""
                            width={32}
                            height={32}
                            className="size-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isBelowMinStock(product)
                          ? "font-medium text-destructive"
                          : ""
                      }
                    >
                      {formatStockSummary(product)}
                    </span>
                  </TableCell>
                  <TableCell>${formatMoney(product.cost_price)}</TableCell>
                  <TableCell>
                    {product.unit_type !== "simple" && product.bag_price ? (
                      <div className="text-sm">
                        <p>${formatMoney(product.bag_price)} / envase</p>
                        <p className="text-muted-foreground">
                          ${formatMoney(product.sale_price)} / kg
                        </p>
                      </div>
                    ) : (
                      `$${formatMoney(product.sale_price)}`
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {UNIT_TYPE_LABEL[product.unit_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.category_id
                      ? categoryPath(product.category_id, categories)
                      : "—"}
                  </TableCell>
                  <TableCell>{product.brand ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {supplierNamesByProduct.get(product.id) ?? "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleDelete(product)}
                      >
                        Eliminar
                      </Button>
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
