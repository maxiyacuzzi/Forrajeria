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
import {
  computeAutoPrices,
  DEFAULT_MARGIN_BOLSA_PCT,
  DEFAULT_MARGIN_SUELTO_PCT,
  halfBagPrice,
  formatMoney,
} from "@/lib/pricing"
import { optionalNumber, requiredNumber } from "@/lib/number-input"
import { categoryPath, flattenCategoriesDepthFirst } from "@/lib/category-tree"
import type { Database } from "@/lib/types/database.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageUpload } from "@/components/image-upload"
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
type Category = Database["public"]["Tables"]["product_categories"]["Row"]
type Supplier = Database["public"]["Tables"]["suppliers"]["Row"]

export function ProductForm({
  product,
  categories,
  suppliers,
}: {
  product?: Product
  categories: Category[]
  suppliers: Supplier[]
}) {
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
      earns_loyalty: true,
      cost_price: 0,
      margin_suelto_pct: DEFAULT_MARGIN_SUELTO_PCT,
      margin_bolsa_pct: DEFAULT_MARGIN_BOLSA_PCT,
      sale_price: 0,
      supplier_ids: [],
    },
  })

  // For fraccionable products, "bolsa 10kg" is derived from this container word
  // plus the conversion factor + sale unit, instead of being typed out by hand
  // (which used to duplicate the "10" already entered as the conversion factor).
  const [envase, setEnvase] = useState(() => {
    const match = product?.purchase_unit_label?.match(/^(.*?)\s*[\d.,]/)
    return match?.[1].trim() || "bolsa"
  })

  const unitType = form.watch("unit_type")
  // Fraccionable and no_fraccionable share the exact same fields (envase, kg
  // por envase, costo del envase entero, margen suelto/bolsa) — the only real
  // difference between them is whether it can be sold loose (handled at sale
  // time, not here).
  const usesEnvase = unitType !== "simple"
  const conversionFactor = form.watch("conversion_factor")
  const saleUnitLabel = form.watch("sale_unit_label")
  const costPrice = form.watch("cost_price")
  const marginSueltoPct = form.watch("margin_suelto_pct")
  const marginBolsaPct = form.watch("margin_bolsa_pct")
  const composedPurchaseLabel = conversionFactor
    ? `${envase.trim() || "bolsa"} ${conversionFactor}${saleUnitLabel || ""}`
    : ""

  const autoPrices = computeAutoPrices({
    unit_type: unitType,
    cost_price: costPrice || 0,
    conversion_factor: conversionFactor,
    margin_suelto_pct: marginSueltoPct ?? DEFAULT_MARGIN_SUELTO_PCT,
    margin_bolsa_pct: marginBolsaPct ?? DEFAULT_MARGIN_BOLSA_PCT,
  })
  const autoHalfBagPrice = halfBagPrice({ bag_price: autoPrices.bag_price })

  const categoryOptions = flattenCategoriesDepthFirst(categories).map((c) => ({
    id: c.id,
    path: categoryPath(c.id, categories),
  }))

  function onSubmit(values: ProductFormValues) {
    setError(null)
    const finalValues = {
      ...values,
      ...(values.unit_type !== "simple" && composedPurchaseLabel
        ? { purchase_unit_label: composedPurchaseLabel }
        : {}),
      sale_price: autoPrices.sale_price,
      bag_price: autoPrices.bag_price,
    }
    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, finalValues)
        : await createProduct(finalValues)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-lg gap-5">
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto</FormLabel>
              <FormControl>
                <ImageUpload value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select
                value={field.value ?? "none"}
                onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                items={[
                  { value: "none", label: "Sin categoría" },
                  ...categoryOptions.map((c) => ({ value: c.id, label: c.path })),
                ]}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.path}
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
          name="supplier_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proveedores</FormLabel>
              {suppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no cargaste proveedores.
                </p>
              ) : (
                <div className="grid gap-1.5">
                  {suppliers.map((s) => {
                    const checked = field.value.includes(s.id)
                    return (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={checked}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked
                                ? [...field.value, s.id]
                                : field.value.filter((id: string) => id !== s.id)
                            )
                          }
                        />
                        {s.name}
                      </label>
                    )
                  })}
                </div>
              )}
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
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  if (value !== "simple" && (!saleUnitLabel || saleUnitLabel === "unidad")) {
                    form.setValue("sale_unit_label", "kg")
                  }
                }}
                items={PRODUCT_UNIT_TYPES.map((type) => ({
                  value: type,
                  label: UNIT_TYPE_LABEL[type],
                }))}
              >
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

        {usesEnvase ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Envase</FormLabel>
                <FormControl>
                  <Input
                    placeholder="bolsa"
                    value={envase}
                    onChange={(e) => setEnvase(e.target.value)}
                  />
                </FormControl>
              </FormItem>
              <FormField
                control={form.control}
                name="conversion_factor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kg por envase</FormLabel>
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
            <p className="text-xs text-muted-foreground">
              {composedPurchaseLabel
                ? `Se guarda como "${composedPurchaseLabel}".`
                : "Completá el kg por envase."}
            </p>

            <FormField
              control={form.control}
              name="sale_unit_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad de venta suelta</FormLabel>
                  <FormControl>
                    <Input placeholder="kg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
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
        )}

        <FormField
          control={form.control}
          name="cost_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Costo{usesEnvase ? " (envase entero)" : ""}</FormLabel>
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

        <div className="grid grid-cols-2 gap-4">
          {usesEnvase && (
            <FormField
              control={form.control}
              name="margin_suelto_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Margen suelto (%)</FormLabel>
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
          )}
          <FormField
            control={form.control}
            name="margin_bolsa_pct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{usesEnvase ? "Margen envase (%)" : "Margen (%)"}</FormLabel>
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
        </div>

        {usesEnvase ? (
          <div className="grid gap-1 rounded-lg border p-3 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Precio por kg suelto</span>
              <span className="font-medium">${formatMoney(autoPrices.sale_price)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Precio envase entero</span>
              <span className="font-medium">${formatMoney(autoPrices.bag_price ?? 0)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Precio medio envase</span>
              <span className="font-medium">${formatMoney(autoHalfBagPrice ?? 0)}</span>
            </p>
          </div>
        ) : (
          <p className="rounded-lg border p-3 text-sm">
            <span className="text-muted-foreground">Precio de venta: </span>
            <span className="font-medium">${formatMoney(autoPrices.sale_price)}</span>
          </p>
        )}

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

        <FormField
          control={form.control}
          name="earns_loyalty"
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
              <FormLabel className="font-normal">Suma para fidelidad</FormLabel>
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
