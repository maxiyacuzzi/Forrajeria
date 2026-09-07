import type { Database } from "@/lib/types/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

const numberFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 })

export function formatQty(value: number) {
  return numberFormat.format(value)
}

/** Total stock expressed in the product's sale unit (kg for fraccionable, units otherwise). */
export function totalStockInSaleUnit(product: Product) {
  if (product.unit_type === "fraccionable" && product.conversion_factor) {
    return product.stock_qty * product.conversion_factor + product.stock_open_qty
  }
  return product.stock_qty
}

export function isBelowMinStock(product: Product) {
  if (product.min_stock_alert == null) return false
  return totalStockInSaleUnit(product) < product.min_stock_alert
}

export function formatStockSummary(product: Product) {
  if (product.unit_type === "fraccionable") {
    const parts = [`${formatQty(product.stock_qty)} ${product.purchase_unit_label}`]
    if (product.stock_open_qty > 0) {
      parts.push(`${formatQty(product.stock_open_qty)} ${product.sale_unit_label} sueltos`)
    }
    return parts.join(" + ")
  }

  if (product.unit_type === "peso_variable") {
    const suffix = product.reference_weight
      ? ` (~${formatQty(product.reference_weight)} kg c/u)`
      : ""
    return `${formatQty(product.stock_qty)} ${product.purchase_unit_label}${suffix}`
  }

  return `${formatQty(product.stock_qty)} ${product.sale_unit_label}`
}

export const UNIT_TYPE_LABEL: Record<Product["unit_type"], string> = {
  simple: "Simple",
  fraccionable: "Fraccionable",
  peso_variable: "Peso variable",
}
