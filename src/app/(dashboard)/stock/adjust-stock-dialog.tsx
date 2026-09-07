"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { adjustStock } from "./actions"
import { stockAdjustmentSchema, type StockAdjustmentValues } from "@/lib/validations/fractioning"
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
import { requiredNumber } from "@/lib/number-input"
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

type Product = Database["public"]["Tables"]["products"]["Row"]

export function AdjustStockDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const form = useForm<StockAdjustmentValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      product_id: product.id,
      unit: "purchase",
      type: "ajuste_manual",
      quantity: 0,
      note: "",
    },
  })

  function onSubmit(values: StockAdjustmentValues) {
    startTransition(async () => {
      const result = await adjustStock(values)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Ajuste registrado")
        setOpen(false)
        form.reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Ajustar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock — {product.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            {product.unit_type === "fraccionable" && (
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pool de stock</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="purchase">
                          {product.purchase_unit_label} (cerradas)
                        </SelectItem>
                        <SelectItem value="sale">
                          {product.sale_unit_label} (sueltos)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ajuste_manual">
                        Ajuste manual (conteo físico)
                      </SelectItem>
                      <SelectItem value="rotura_humedad">
                        Rotura / humedad
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Cantidad{" "}
                    {form.watch("type") === "ajuste_manual" &&
                      "(negativo para restar)"}
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota</FormLabel>
                  <FormControl>
                    <Input placeholder="Motivo del ajuste" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Guardando..." : "Registrar ajuste"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
