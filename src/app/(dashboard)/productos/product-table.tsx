"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Database } from "@/lib/types/database.types"
import {
  UNIT_TYPE_LABEL,
  formatStockSummary,
  isBelowMinStock,
} from "@/lib/stock-format"

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_categories: { name: string } | null
}

export function ProductTable({
  products,
  canManage,
}: {
  products: Product[]
  canManage: boolean
}) {
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
            <TableHead>Tipo</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Costo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">
                {canManage ? (
                  <Link
                    href={`/productos/${product.id}`}
                    className="hover:underline"
                  >
                    {product.name}
                  </Link>
                ) : (
                  product.name
                )}
              </TableCell>
              <TableCell>{product.brand ?? "—"}</TableCell>
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
              <TableCell>${product.cost_price.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
