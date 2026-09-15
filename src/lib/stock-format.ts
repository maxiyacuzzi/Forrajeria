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
  if (product.unit_type !== "simple") {
    const parts = [`${formatQty(product.stock_qty)} ${product.purchase_unit_label}`]
    if (product.stock_open_qty > 0) {
      parts.push(`${formatQty(product.stock_open_qty)} ${product.sale_unit_label} sueltos`)
    }
    return parts.join(" + ")
  }

  return `${formatQty(product.stock_qty)} ${product.sale_unit_label}`
}

/** Whether a unit label represents a divisible weight (so "vender por monto" applies). */
export function isWeightUnit(label: string | null | undefined) {
  return label?.trim().toLowerCase() === "kg"
}

export const UNIT_TYPE_LABEL: Record<Product["unit_type"], string> = {
  simple: "Simple",
  fraccionable: "Fraccionable",
  no_fraccionable: "No fraccionable",
}

/** The container word alone (e.g. "bolsa" out of "bolsa 20kg"). */
export function envaseWord(purchase_unit_label: string) {
  const match = purchase_unit_label.match(/^(.*?)\s*[\d.,]/)
  return match?.[1]?.trim() || purchase_unit_label
}

/**
 * What the customer actually took, in a shape that reads naturally regardless
 * of price: "1 bolsa", "Media bolsa", "500 gramos", "3.2 kg" — not just a raw
 * number, so a sale/loyalty record says what was bought, not what it cost.
 */
export function formatPurchaseLabel(
  product: Pick<
    Product,
    "unit_type" | "conversion_factor" | "purchase_unit_label" | "sale_unit_label"
  >,
  unit: "purchase" | "sale",
  quantity: number
) {
  if (unit === "purchase") {
    const word = envaseWord(product.purchase_unit_label)
    return `${formatQty(quantity)} ${word}${quantity === 1 ? "" : "s"}`
  }

  if (product.unit_type === "fraccionable" && product.conversion_factor) {
    const word = envaseWord(product.purchase_unit_label)
    if (Math.abs(quantity - product.conversion_factor) < 0.001) return `1 ${word}`
    if (Math.abs(quantity - product.conversion_factor / 2) < 0.001) return `Media ${word}`
    if (quantity < 1) return `${Math.round(quantity * 1000)} gramos`
  }

  return `${formatQty(quantity)} ${product.sale_unit_label}`
}
