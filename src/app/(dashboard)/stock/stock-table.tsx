"use client"

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
import { AdjustStockDialog } from "./adjust-stock-dialog"

type Product = Database["public"]["Tables"]["products"]["Row"]

export function StockTable({
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
            <TableHead>Producto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Stock actual</TableHead>
            <TableHead>Mínimo</TableHead>
            {canManage && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
