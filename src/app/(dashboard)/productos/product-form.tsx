"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { createProduct, updateProduct } from "./actions"
import {
  PRODUCT_UNIT_TYPES,
  productSchema,
  type ProductFormValues,
} from "@/lib/validations/product"
import { UNIT_TYPE_LABEL } from "@/lib/stock-format"
import { optionalNumber, requiredNumber } from "@/lib/number-input"
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

type Product = { id: string } & ProductFormValues

export function ProductForm({ product }: { product?: Product }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ?? {
      name: "",
      brand: "",
      unit_type: "simple",
      purchase_unit_label: "unidad",
      sale_unit_label: "unidad",
      controls_expiration: false,
      cost_price: 0,
    },
  })

  const unitType = form.watch("unit_type")

  function onSubmit(values: ProductFormValues) {
    setError(null)
    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, values)
        : await createProduct(values)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-lg gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de stock</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRODUCT_UNIT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {UNIT_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purchase_unit_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad de compra</FormLabel>
                <FormControl>
                  <Input placeholder="bolsa 25kg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sale_unit_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad de venta</FormLabel>
                <FormControl>
                  <Input placeholder="kg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {unitType === "fraccionable" && (
          <FormField
            control={form.control}
            name="conversion_factor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Factor de conversión (kg por bolsa)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
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
        )}

        {unitType === "peso_variable" && (
          <FormField
            control={form.control}
            name="reference_weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso de referencia (kg por unidad)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo</FormLabel>
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
            name="min_stock_alert"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alerta de stock mínimo</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
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

        <FormField
          control={form.control}
          name="controls_expiration"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="size-4"
                />
              </FormControl>
              <FormLabel className="font-normal">
                Controla vencimiento y lote
              </FormLabel>
            </FormItem>
          )}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </form>
    </Form>
  )
}
