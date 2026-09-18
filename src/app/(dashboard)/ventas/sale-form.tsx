"use client"

import { useEffect, useState, useTransition } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, TrashIcon } from "lucide-react"

import {
  createSale,
  getCustomerLoyalty,
  type CustomerLoyaltyProgress,
} from "./actions"
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale"
import { requiredNumber } from "@/lib/number-input"
import { simulateLoyaltyDiscounts } from "@/lib/loyalty"
import {
  halfBagPrice,
  halfBagQuantity,
  formatMoney,
  round2,
  CARD_SURCHARGE_RATE,
} from "@/lib/pricing"
import { formatPurchaseLabel, isWeightUnit } from "@/lib/stock-format"
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
} from "@/lib/validations/expense"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type Customer = Database["public"]["Tables"]["customers"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]

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

function isHalfBagItem(
  unit: string | undefined,
  quantity: number,
  product: Product | undefined
) {
  if (unit !== "sale") return false
  const preset = halfBagPreset(product)
  return preset != null && Math.abs(quantity - preset.quantity) < 0.001
}

export function SaleForm({
  customers,
  products,
}: {
  customers: Customer[]
  products: Product[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customer_id: customers.find((c) => c.is_default)?.id ?? "",
      note: "",
      payment_method: "efectivo",
      items: [{ product_id: "", unit: "purchase", quantity: 1, unit_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const items = form.watch("items")
  const customerId = form.watch("customer_id")
  const paymentMethod = form.watch("payment_method")
  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  )

  const [customerLoyalty, setCustomerLoyalty] = useState<
    CustomerLoyaltyProgress[]
  >([])
  const isDefaultCustomer =
    customers.find((c) => c.id === customerId)?.is_default ?? false

  useEffect(() => {
    // "Consumidor Final" is shared by every walk-in sale, so its purchase
    // history isn't any one person's — no need to fetch fidelidad for it (the
    // loyaltyByProduct lookup below also ignores it, in case stale data lingers).
    if (!customerId || isDefaultCustomer) return
    let cancelled = false
    getCustomerLoyalty(customerId).then((data) => {
      if (!cancelled) setCustomerLoyalty(data)
    })
    return () => {
      cancelled = true
    }
  }, [customerId, isDefaultCustomer])

  const productById = new Map(products.map((p) => [p.id, p]))
  const loyaltyByProduct =
    customerId && !isDefaultCustomer
      ? new Map(customerLoyalty.map((l) => [l.product_id, l]))
      : new Map()
  const cartLoyalty = simulateLoyaltyDiscounts(
    items,
    productById,
    loyaltyByProduct
  )
  const discount = cartLoyalty.reduce((sum, l) => sum + l.discount, 0)
  const surcharge =
    paymentMethod === "tarjeta"
      ? round2((subtotal - discount) * CARD_SURCHARGE_RATE)
      : 0
  const total = subtotal - discount + surcharge

  function onSubmit(values: SaleFormValues) {
    setError(null)
    startTransition(async () => {
      const result = await createSale({
        ...values,
        items: values.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity.toFixed(3)),
        })),
      })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid max-w-2xl gap-5"
      >
        <FormField
          control={form.control}
          name="customer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.dni
                    ? `${customer.name} (DNI ${customer.dni})`
                    : customer.name,
                }))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.dni
                        ? `${customer.name} (DNI ${customer.dni})`
                        : customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {discount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
            <Badge>Fidelidad</Badge>
            <span>Algún producto de esta venta tiene 50% de descuento.</span>
          </div>
        )}

        <div className="grid gap-3">
          <FormLabel>Productos</FormLabel>
          {fields.map((field, index) => {
            const selectedProduct = products.find(
              (p) => p.id === items[index]?.product_id
            )
            const unit = items[index]?.unit
            const unitLabel =
              unit === "sale"
                ? selectedProduct?.sale_unit_label
                : selectedProduct?.purchase_unit_label
            const sellByAmount = isWeightUnit(unitLabel)
            const unitPrice = items[index]?.unit_price || 0
            const quantity = items[index]?.quantity || 0

            return (
              <div key={field.id} className="grid gap-3 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.product_id`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value)
                            const product = products.find((p) => p.id === value)
                            const unit =
                              product?.unit_type === "fraccionable"
                                ? "sale"
                                : "purchase"
                            form.setValue(`items.${index}.unit`, unit)
                            form.setValue(
                              `items.${index}.unit_price`,
                              priceForUnit(product, unit)
                            )
                          }}
                          items={products.map((product) => ({
                            value: product.id,
                            label: product.name,
                          }))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Elegí un producto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {cartLoyalty[index]?.ready && (
                    <Badge className="mt-2 shrink-0">50% OFF</Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <TrashIcon />
                    <span className="sr-only">Quitar</span>
                  </Button>
                </div>

                {selectedProduct?.unit_type === "fraccionable" && (
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        unit === "sale" &&
                        !isHalfBagItem(unit, quantity, selectedProduct)
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        form.setValue(`items.${index}.unit`, "sale")
                        form.setValue(
                          `items.${index}.unit_price`,
                          priceForUnit(selectedProduct, "sale")
                        )
                      }}
                    >
                      {selectedProduct.sale_unit_label} (sueltos)
                    </Button>
                    {halfBagPreset(selectedProduct) && (
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          isHalfBagItem(unit, quantity, selectedProduct)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          const preset = halfBagPreset(selectedProduct)
                          if (!preset) return
                          form.setValue(`items.${index}.unit`, "sale")
                          form.setValue(
                            `items.${index}.quantity`,
                            preset.quantity
                          )
                          form.setValue(
                            `items.${index}.unit_price`,
                            preset.unit_price
                          )
                        }}
                      >
                        Media bolsa
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={unit === "purchase" ? "default" : "outline"}
                      onClick={() => {
                        form.setValue(`items.${index}.unit`, "purchase")
                        form.setValue(
                          `items.${index}.unit_price`,
                          priceForUnit(selectedProduct, "purchase")
                        )
                      }}
                    >
                      {selectedProduct.purchase_unit_label} (cerradas)
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Cantidad {unitLabel ? `(${unitLabel})` : ""}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={field.value}
                            onChange={(e) => field.onChange(requiredNumber(e))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio unitario</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={field.value}
                            onChange={(e) => field.onChange(requiredNumber(e))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {sellByAmount && (
                  <FormItem>
                    <FormLabel>Vender por monto ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="Ej: 4000"
                        disabled={unitPrice <= 0}
                        value={
                          unitPrice > 0
                            ? Number((quantity * unitPrice).toFixed(2))
                            : ""
                        }
                        onChange={(e) => {
                          const amount = e.target.valueAsNumber
                          if (!Number.isNaN(amount) && unitPrice > 0) {
                            form.setValue(
                              `items.${index}.quantity`,
                              amount / unitPrice
                            )
                          }
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Equivale a{" "}
                      {selectedProduct
                        ? formatPurchaseLabel(
                            selectedProduct,
                            unit as "purchase" | "sale",
                            quantity
                          )
                        : `${quantity} ${unitLabel}`}
                      .
                    </p>
                  </FormItem>
                )}
              </div>
            )
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() =>
              append({
                product_id: "",
                unit: "purchase",
                quantity: 1,
                unit_price: 0,
              })
            }
          >
            <PlusIcon /> Agregar producto
          </Button>
        </div>

        <div className="grid gap-1 text-sm">
          {(discount > 0 || surcharge > 0) && (
            <p className="text-muted-foreground">
              Subtotal: ${formatMoney(subtotal)}
            </p>
          )}
          {discount > 0 && (
            <p className="text-muted-foreground">
              Descuento fidelidad: -${formatMoney(discount)}
            </p>
          )}
          {surcharge > 0 && (
            <p className="text-muted-foreground">
              Recargo tarjeta (10%): +${formatMoney(surcharge)}
            </p>
          )}
          <p className="font-medium">Total: ${formatMoney(total)}</p>
        </div>

        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de pago</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={PAYMENT_METHODS.map((method) => ({
                  value: method,
                  label: PAYMENT_METHOD_LABEL[method],
                }))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABEL[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nota</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Guardando..." : "Registrar venta"}
        </Button>
      </form>
    </Form>
  )
}
