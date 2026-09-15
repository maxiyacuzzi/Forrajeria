"use client"

import Image from "next/image"
import { useTransition } from "react"
import { ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { deleteProduct } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
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
import {
  UNIT_TYPE_LABEL,
  formatStockSummary,
  isBelowMinStock,
} from "@/lib/stock-format"
import { formatMoney } from "@/lib/pricing"

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
  productSuppliers: { product_id: string; suppliers: { name: string } | null }[]
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()

  const supplierNamesByProduct = new Map<string, string>()
  for (const ps of productSuppliers) {
    if (!ps.suppliers) continue
    const existing = supplierNamesByProduct.get(ps.product_id)
    supplierNamesByProduct.set(
      ps.product_id,
      existing ? `${existing}, ${ps.suppliers.name}` : ps.suppliers.name
    )
  }

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
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Costo</TableHead>
            <TableHead>Precio de venta</TableHead>
            {canManage && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <ClickableTableRow key={product.id} href={`/productos/${product.id}`}>
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
              <TableCell>{product.brand ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {product.category_id ? categoryPath(product.category_id, categories) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {supplierNamesByProduct.get(product.id) ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {UNIT_TYPE_LABEL[product.unit_type]}
                </Badge>
              </TableCell>
              <TableCell>
                <span
                  className={
                    isBelowMinStock(product) ? "font-medium text-destructive" : ""
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
  )
}
