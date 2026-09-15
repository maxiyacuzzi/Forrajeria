import type { Database } from "@/lib/types/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

export const DEFAULT_MARGIN_SUELTO_PCT = 55
export const DEFAULT_MARGIN_BOLSA_PCT = 35

/** Surcharge added to sales paid with "tarjeta" — mirrors create_sale() in the DB. */
export const CARD_SURCHARGE_RATE = 0.1

export function round2(value: number) {
  return Math.round(value * 100) / 100
}

/** Sale prices always round up to the nearest $100 (e.g. 12560 -> 12600), never down. */
export function roundUpToHundred(value: number) {
  return Math.ceil(value / 100) * 100
}

const moneyFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formats a peso amount with thousands separators (no "$" — callers prefix it). */
export function formatMoney(value: number) {
  return moneyFormat.format(value)
}

/**
 * Auto-computed sale_price / bag_price from cost_price and the product's margins.
 * cost_price is always the cost of the purchase unit (the whole envase for
 * fraccionable/no_fraccionable products, the single unit for simple ones) —
 * never a per-kg cost. fraccionable and no_fraccionable share this same
 * envase-based pricing; only fraccionable can actually be sold loose.
 */
export function computeAutoPrices(input: {
  unit_type: Product["unit_type"]
  cost_price: number
  conversion_factor?: number | null
  margin_suelto_pct: number
  margin_bolsa_pct: number
}) {
  const { unit_type, cost_price, conversion_factor, margin_suelto_pct, margin_bolsa_pct } = input

  if (unit_type !== "simple" && conversion_factor) {
    const costPerKg = cost_price / conversion_factor
    return {
      sale_price: roundUpToHundred(costPerKg * (1 + margin_suelto_pct / 100)),
      bag_price: roundUpToHundred(cost_price * (1 + margin_bolsa_pct / 100)),
    }
  }

  return {
    sale_price: roundUpToHundred(cost_price * (1 + margin_bolsa_pct / 100)),
    bag_price: null,
  }
}

/** Price for selling exactly half a closed bag, at the bag margin (not the loose/kg margin). */
export function halfBagPrice(product: Pick<Product, "bag_price">) {
  return product.bag_price != null ? roundUpToHundred(product.bag_price / 2) : null
}

/** Kg equivalent of half a closed bag. */
export function halfBagQuantity(product: Pick<Product, "conversion_factor">) {
  return product.conversion_factor ? Number((product.conversion_factor / 2).toFixed(3)) : null
}

/**
 * Per-unit cost from what a remito shows: a total for the whole line (e.g. $120000
 * for 10 bags) plus an optional IVA % on top, split evenly across the quantity.
 */
export function costPerUnitFromTotal(
  total_cost: number,
  quantity: number,
  iva_pct?: number | null
) {
  if (!quantity) return 0
  const totalWithIva = total_cost * (1 + (iva_pct || 0) / 100)
  return round2(totalWithIva / quantity)
}
