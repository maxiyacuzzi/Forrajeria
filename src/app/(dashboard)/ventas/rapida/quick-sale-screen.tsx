"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Image from "next/image"
import { ImageIcon, MinusIcon, PlusIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"

import { createSale, getCustomerLoyalty, type CustomerLoyaltyProgress } from "../actions"
import type { SaleFormValues } from "@/lib/validations/sale"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import { simulateLoyaltyDiscounts } from "@/lib/loyalty"
import { halfBagPrice, halfBagQuantity, formatMoney, round2, CARD_SURCHARGE_RATE } from "@/lib/pricing"
import { formatPurchaseLabel, isWeightUnit } from "@/lib/stock-format"
import { categoryPath } from "@/lib/category-tree"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/types/database.types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Customer = Database["public"]["Tables"]["customers"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]
type Category = Database["public"]["Tables"]["product_categories"]["Row"]

type CartLine = {
  product_id: string
  unit: "purchase" | "sale"
  quantity: number
  unit_price: number
}

/** Envase price for a whole closed unit of a fraccionable/no_fraccionable product, sale price otherwise. */
function priceForUnit(product: Product | undefined, unit: "purchase" | "sale") {
  if (!product) return 0
  if (unit === "purchase" && product.unit_type !== "simple") {
    return product.bag_price ?? product.sale_price
  }
  return product.sale_price
}

/** "Media bolsa" isn't a stored unit: it's a loose-kg sale (unit "sale") preset to
 *  half the bag's kg, priced at the bag margin instead of the per-kg margin. */
function halfBagPreset(product: Product | undefined) {
  if (!product) return null
  const quantity = halfBagQuantity(product)
  const amount = halfBagPrice(product)
  if (!quantity || amount == null) return null
  return { quantity, unit_price: Number((amount / quantity).toFixed(2)) }
}

function isHalfBagLine(line: CartLine, product: Product | undefined) {
  if (line.unit !== "sale") return false
  const preset = halfBagPreset(product)
  return preset != null && Math.abs(line.quantity - preset.quantity) < 0.001
}

export function QuickSaleScreen({
  customers,
  products,
  categories,
}: {
  customers: Customer[]
  products: Product[]
  categories: Category[]
}) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerId, setCustomerId] = useState("")
  const [paymentMethod, setPaymentMethod] =
    useState<SaleFormValues["payment_method"]>("efectivo")
  const [customerLoyalty, setCustomerLoyalty] = useState<CustomerLoyaltyProgress[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!customerId) return
    let cancelled = false
    getCustomerLoyalty(customerId).then((data) => {
      if (!cancelled) setCustomerLoyalty(data)
    })
    return () => {
      cancelled = true
    }
  }, [customerId])

  const categoryChips = useMemo(() => {
    const usedIds = new Set(products.map((p) => p.category_id).filter((id): id is string => !!id))
    return [...usedIds]
      .map((id) => ({ id, path: categoryPath(id, categories) }))
      .sort((a, b) => a.path.localeCompare(b.path))
  }, [products, categories])

  const filteredProducts = products.filter((product) => {
    if (categoryFilter && product.category_id !== categoryFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!product.name.toLowerCase().includes(q) && !product.brand?.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })

  function addToCart(product: Product) {
    const unit: CartLine["unit"] = product.unit_type === "fraccionable" ? "sale" : "purchase"
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === product.id && l.unit === unit)
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      return [...prev, { product_id: product.id, unit, quantity: 1, unit_price: priceForUnit(product, unit) }]
    })
  }

  function updateQuantity(index: number, quantity: number) {
    setCart((prev) =>
      prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(0.01, quantity) } : l))
    )
  }

  /** For "vender por monto": a small peso amount can mean a tiny quantity
   *  (well under 0.01), so this doesn't floor it the way updateQuantity does. */
  function updateAmount(index: number, amount: number) {
    setCart((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l
        const quantity = l.unit_price > 0 ? amount / l.unit_price : 0
        return { ...l, quantity: Math.max(0, quantity) }
      })
    )
  }

  function updatePrice(index: number, unit_price: number) {
    setCart((prev) =>
      prev.map((l, i) => (i === index ? { ...l, unit_price: Math.max(0, unit_price) } : l))
    )
  }

  function updateUnit(index: number, unit: CartLine["unit"]) {
    setCart((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l
        const product = productById.get(l.product_id)
        return { ...l, unit, quantity: 1, unit_price: priceForUnit(product, unit) }
      })
    )
  }

  function selectHalfBag(index: number) {
    setCart((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l
        const product = productById.get(l.product_id)
        const preset = halfBagPreset(product)
        if (!preset) return l
        return { ...l, unit: "sale", quantity: preset.quantity, unit_price: preset.unit_price }
      })
    )
  }

  function removeLine(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const productById = new Map(products.map((p) => [p.id, p]))
  const subtotal = cart.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)

  const loyaltyByProduct = customerId
    ? new Map(customerLoyalty.map((l) => [l.product_id, l]))
    : new Map()
  const cartLoyalty = simulateLoyaltyDiscounts(cart, productById, loyaltyByProduct)
  const discount = cartLoyalty.reduce((sum, l) => sum + l.discount, 0)
  const surcharge = paymentMethod === "tarjeta" ? round2((subtotal - discount) * CARD_SURCHARGE_RATE) : 0
  const total = subtotal - discount + surcharge

  function handleCheckout() {
    if (!customerId) {
      toast.error("Elegí un cliente")
      return
    }
    if (cart.length === 0) {
      toast.error("Agregá al menos un producto")
      return
    }

    startTransition(async () => {
      const result = await createSale({
        customer_id: customerId,
        items: cart.map((l) => ({ ...l, quantity: Number(l.quantity.toFixed(3)) })),
        payment_method: paymentMethod,
      })
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex h-[calc(100svh-2rem)] flex-col gap-4 lg:h-[calc(100svh-4rem)] lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 text-base"
        />

        {categoryChips.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              type="button"
              size="sm"
              variant={categoryFilter === null ? "default" : "outline"}
              onClick={() => setCategoryFilter(null)}
              className="shrink-0"
            >
              Todos
            </Button>
            {categoryChips.map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant={categoryFilter === c.id ? "default" : "outline"}
                onClick={() => setCategoryFilter(c.id)}
                className="shrink-0"
              >
                {c.path}
              </Button>
            ))}
          </div>
        )}

        <div className="grid flex-1 auto-rows-min grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 xl:grid-cols-5">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => addToCart(product)}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-2 text-center ring-foreground/10 transition-colors hover:bg-muted active:translate-y-px"
            >
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt=""
                    width={120}
                    height={120}
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-8 text-muted-foreground" />
                )}
              </div>
              <p className="line-clamp-2 text-sm leading-tight font-medium">
                {product.name}
              </p>
              <p className="text-sm text-muted-foreground">
                ${formatMoney(
                  priceForUnit(product, product.unit_type === "fraccionable" ? "sale" : "purchase")
                )}
                {product.unit_type === "fraccionable" && `/${product.sale_unit_label}`}
              </p>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No se encontraron productos.
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-96 lg:shrink-0">
        <Select
          value={customerId}
          onValueChange={(value) => setCustomerId(value ?? "")}
          items={customers.map((c) => ({
            value: c.id,
            label: c.dni ? `${c.name} (DNI ${c.dni})` : c.name,
          }))}
        >
          <SelectTrigger className="h-11 w-full text-base">
            <SelectValue placeholder="Elegí un cliente" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.dni ? `${c.name} (DNI ${c.dni})` : c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {discount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border p-2 text-sm">
            <Badge>Fidelidad</Badge>
            <span>Algún producto de esta venta tiene 50% de descuento.</span>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border p-2">
          {cart.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Tocá un producto para agregarlo.
            </p>
          ) : (
            cart.map((line, index) => {
              const product = productById.get(line.product_id)
              const unitLabel =
                line.unit === "sale" ? product?.sale_unit_label : product?.purchase_unit_label
              const sellByAmount = isWeightUnit(unitLabel)
              const amount = line.quantity * line.unit_price
              const lineReward = cartLoyalty[index]?.ready

              return (
                <div key={`${line.product_id}-${line.unit}`} className="grid gap-1.5 rounded-md border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{product?.name}</p>
                      {lineReward && <Badge className="shrink-0">50% OFF</Badge>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLine(index)}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                  {product?.unit_type === "fraccionable" && (
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="xs"
                        variant={
                          line.unit === "sale" && !isHalfBagLine(line, product)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => updateUnit(index, "sale")}
                      >
                        Suelto ({product.sale_unit_label})
                      </Button>
                      {halfBagPreset(product) && (
                        <Button
                          type="button"
                          size="xs"
                          variant={isHalfBagLine(line, product) ? "default" : "outline"}
                          onClick={() => selectHalfBag(index)}
                        >
                          Media bolsa
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="xs"
                        variant={line.unit === "purchase" ? "default" : "outline"}
                        onClick={() => updateUnit(index, "purchase")}
                      >
                        Bolsa ({product.purchase_unit_label})
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Precio</span>
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="1"
                      value={line.unit_price}
                      onChange={(e) => updatePrice(index, e.target.valueAsNumber || 0)}
                      className="h-8 w-24 text-center"
                    />
                    <span className="text-xs text-muted-foreground">/{unitLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sellByAmount ? (
                      <>
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="1"
                          value={Number(amount.toFixed(2))}
                          onChange={(e) => {
                            const value = e.target.valueAsNumber
                            if (!Number.isNaN(value)) {
                              updateAmount(index, value)
                            }
                          }}
                          className="h-9 w-24 text-center text-base"
                        />
                        <span className="shrink-0 text-xs text-muted-foreground">
                          = {product ? formatPurchaseLabel(product, line.unit, line.quantity) : ""}
                        </span>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(index, line.quantity - 1)}
                        >
                          <MinusIcon />
                        </Button>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateQuantity(index, e.target.valueAsNumber || 0)}
                          className="h-9 w-16 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateQuantity(index, line.quantity + 1)}
                        >
                          <PlusIcon />
                        </Button>
                      </>
                    )}
                    <p className="ml-auto shrink-0 text-sm font-medium">${formatMoney(amount)}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <Button
              key={method}
              type="button"
              variant={paymentMethod === method ? "default" : "outline"}
              onClick={() => setPaymentMethod(method)}
              className="h-11"
            >
              {PAYMENT_METHOD_LABEL[method]}
            </Button>
          ))}
        </div>

        <div className="grid gap-1 rounded-lg border p-3 text-sm">
          {(discount > 0 || surcharge > 0) && (
            <p className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${formatMoney(subtotal)}</span>
            </p>
          )}
          {discount > 0 && (
            <p className="flex justify-between text-muted-foreground">
              <span>Descuento fidelidad</span>
              <span>-${formatMoney(discount)}</span>
            </p>
          )}
          {surcharge > 0 && (
            <p className="flex justify-between text-muted-foreground">
              <span>Recargo tarjeta (10%)</span>
              <span>+${formatMoney(surcharge)}</span>
            </p>
          )}
          <p className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${formatMoney(total)}</span>
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={handleCheckout}
          className={cn("h-14 text-lg font-semibold")}
        >
          {pending ? "Cobrando..." : `Cobrar $${formatMoney(total)}`}
        </Button>
      </div>
    </div>
  )
}
