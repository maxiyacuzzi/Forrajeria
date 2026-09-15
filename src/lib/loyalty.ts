export const LOYALTY_TARGET_UNITS = 10
/** Days allowed between purchases before the streak resets — depends on how the last purchase was made. */
export const LOYALTY_STREAK_WINDOW_DAYS_BAG = 40
export const LOYALTY_STREAK_WINDOW_DAYS_LOOSE = 21
export const LOYALTY_DISCOUNT_RATE = 0.5

/** "6/10 compras" — every purchase of a product counts the same toward the target, whether it's a whole bag or 500g. */
export function loyaltyProgressLabel(progress: number) {
  return `${progress}/${LOYALTY_TARGET_UNITS} compras`
}

type LoyaltyProgress = {
  progress_qty: number
  last_purchase_at: string | null
  last_purchase_unit?: string | null
}

/**
 * Mirrors the per-product progress logic in create_sale(), purely for
 * display: the server is the source of truth and recomputes this
 * independently on submit.
 */
export function getProductLoyaltyStatus(progress: LoyaltyProgress | undefined) {
  const windowDays =
    progress?.last_purchase_unit === "sale"
      ? LOYALTY_STREAK_WINDOW_DAYS_LOOSE
      : LOYALTY_STREAK_WINDOW_DAYS_BAG
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const lastPurchaseAt = progress?.last_purchase_at ? new Date(progress.last_purchase_at) : null
  const streakBroken = lastPurchaseAt != null && Date.now() - lastPurchaseAt.getTime() > windowMs

  const progressCount = streakBroken ? 0 : (progress?.progress_qty ?? 0)
  const ready = progressCount >= LOYALTY_TARGET_UNITS
  const expiresAt =
    !streakBroken && lastPurchaseAt ? new Date(lastPurchaseAt.getTime() + windowMs) : null

  return { progress: progressCount, target: LOYALTY_TARGET_UNITS, ready, expiresAt }
}

type CartLikeItem = {
  product_id: string
  unit: "purchase" | "sale"
  quantity: number
  unit_price: number
}

/**
 * Client-side preview of which cart lines will get the loyalty discount,
 * mirroring create_sale()'s per-line, sequential progress simulation (so two
 * lines of the same product in one cart are handled the same way the server
 * would: the first can trigger the reward, the second starts from zero).
 * Every line is one "purchase" toward the target regardless of quantity — a
 * whole bag counts the same as 500g. The server is the source of truth and
 * recomputes this independently.
 */
export function simulateLoyaltyDiscounts<T extends CartLikeItem>(
  items: T[],
  productById: Map<string, { earns_loyalty: boolean }>,
  loyaltyByProduct: Map<string, LoyaltyProgress>
) {
  const runningProgress = new Map<string, number>()

  return items.map((item) => {
    const product = productById.get(item.product_id)
    if (!product?.earns_loyalty) return { ready: false, discount: 0 }

    const status = getProductLoyaltyStatus(loyaltyByProduct.get(item.product_id))
    const current = runningProgress.get(item.product_id) ?? status.progress
    const ready = current >= status.target

    runningProgress.set(item.product_id, ready ? 0 : current + 1)

    return { ready, discount: ready ? item.quantity * item.unit_price * LOYALTY_DISCOUNT_RATE : 0 }
  })
}
