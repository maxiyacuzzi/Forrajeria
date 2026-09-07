"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { openFractioning } from "./actions"
import {
  openFractioningSchema,
  type OpenFractioningValues,
} from "@/lib/validations/fractioning"
import type { Database } from "@/lib/types/database.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { requiredNumber } from "@/lib/number-input"

type Product = Database["public"]["Tables"]["products"]["Row"]

export function OpenFractioningDialog({
  fractionableProducts,
}: {
  fractionableProducts: Product[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const form = useForm<OpenFractioningValues>({
    resolver: zodResolver(openFractioningSchema),
    defaultValues: { product_id: "", bags_opened: 1 },
  })

  const selectedProduct = fractionableProducts.find(
    (p) => p.id === form.watch("product_id")
  )
  const bagsOpened = form.watch("bags_opened")
  const expected =
    selectedProduct?.conversion_factor && bagsOpened
      ? Number(selectedProduct.conversion_factor) * Number(bagsOpened)
      : null

  function onSubmit(values: OpenFractioningValues) {
    startTransition(async () => {
      const result = await openFractioning(values)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Fraccionamiento abierto")
        setOpen(false)
        form.reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Abrir fraccionamiento</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir fraccionamiento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegí un producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fractionableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.stock_qty}{" "}
                          {product.purchase_unit_label} disponibles)
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
              name="bags_opened"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Cantidad de {selectedProduct?.purchase_unit_label ?? "unidades"} a abrir
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="1"
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

            {expected !== null && (
              <p className="text-sm text-muted-foreground">
                Se acreditarán ~{expected} {selectedProduct?.sale_unit_label} al
                stock suelto (cantidad teórica, sujeta a merma al cerrar).
              </p>
            )}

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Abriendo..." : "Abrir"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
