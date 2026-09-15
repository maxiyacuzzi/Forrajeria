"use client"

import { useState, useTransition } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, TrashIcon } from "lucide-react"

import { registerStockEntry } from "../actions"
import { stockEntrySchema, type StockEntryValues } from "@/lib/validations/stock-entry"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import { costPerUnitFromTotal, formatMoney } from "@/lib/pricing"
import { optionalNumber, requiredNumber } from "@/lib/number-input"
import type { Database } from "@/lib/types/database.types"
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

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]

export function StockEntryForm({
  suppliers,
  products,
}: {
  suppliers: Supplier[]
  products: Product[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<StockEntryValues>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      supplier_id: undefined,
      iva_pct: undefined,
      paid_amount: undefined,
      payment_method: "efectivo",
      note: "",
      items: [{ product_id: "", unit: "purchase", quantity: 1, total_cost: undefined }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const items = form.watch("items")
  const ivaPct = form.watch("iva_pct")

  const grandTotal = items.reduce((sum, item) => {
    if (item.total_cost == null) return sum
    return sum + costPerUnitFromTotal(item.total_cost, item.quantity || 1, ivaPct) * (item.quantity || 0)
  }, 0)

  function onSubmit(values: StockEntryValues) {
    setError(null)
    startTransition(async () => {
      const result = await registerStockEntry(values)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-5">
        <FormField
          control={form.control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proveedor</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
                items={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un proveedor (opcional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
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
          name="iva_pct"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IVA del remito (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Dejalo vacío si el remito no tiene IVA"
                  name={field.name}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(optionalNumber(e))}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Se suma al total de cada línea antes de calcular el costo por unidad.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3">
          <FormLabel>Productos</FormLabel>
          {fields.map((field, index) => {
            const selectedProduct = products.find((p) => p.id === items[index]?.product_id)
            const unit = items[index]?.unit
            const unitLabel =
              unit === "sale" ? selectedProduct?.sale_unit_label : selectedProduct?.purchase_unit_label

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
                            form.setValue(`items.${index}.unit`, "purchase")
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
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Llega como</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          items={[
                            {
                              value: "purchase",
                              label: `${selectedProduct.purchase_unit_label} (cerradas)`,
                            },
                            {
                              value: "sale",
                              label: `${selectedProduct.sale_unit_label} (sueltos)`,
                            },
                          ]}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="purchase">
                              {selectedProduct.purchase_unit_label} (cerradas)
                            </SelectItem>
                            <SelectItem value="sale">
                              {selectedProduct.sale_unit_label} (sueltos)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad {unitLabel ? `(${unitLabel})` : ""}</FormLabel>
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
                    name={`items.${index}.total_cost`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total de la línea</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            placeholder="Opcional"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(optionalNumber(e))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {items[index]?.total_cost != null && (
                  <p className="text-xs text-muted-foreground">
                    = $
                    {formatMoney(
                      costPerUnitFromTotal(
                        items[index].total_cost!,
                        items[index]?.quantity || 1,
                        ivaPct
                      )
                    )}{" "}
                    por {unitLabel || "unidad"}
                    {ivaPct ? ` (con ${ivaPct}% de IVA incluido)` : ""} · actualiza el costo y los
                    precios del producto.
                  </p>
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
              append({ product_id: "", unit: "purchase", quantity: 1, total_cost: undefined })
            }
          >
            <PlusIcon /> Agregar producto
          </Button>
        </div>

        {grandTotal > 0 && (
          <div className="grid gap-3 rounded-lg border p-3">
            <p className="text-sm font-medium">
              Esto se registra como un gasto de ${formatMoney(grandTotal)}
            </p>

            <FormField
              control={form.control}
              name="paid_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cuánto pagaste ahora?</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="0"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(optionalNumber(e))}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setValue("paid_amount", grandTotal)}
                    >
                      Todo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setValue("paid_amount", 0)}
                    >
                      Nada
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si pagás menos que el total, el resto queda como saldo pendiente con el
                    proveedor.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </div>
        )}

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nota</FormLabel>
              <FormControl>
                <Input placeholder="Ej: N° de remito" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Guardando..." : "Registrar ingreso"}
        </Button>
      </form>
    </Form>
  )
}
