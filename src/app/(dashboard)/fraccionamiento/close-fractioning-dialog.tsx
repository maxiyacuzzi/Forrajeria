"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { closeFractioning } from "./actions"
import {
  closeFractioningSchema,
  type CloseFractioningValues,
} from "@/lib/validations/fractioning"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { requiredNumber } from "@/lib/number-input"

export function CloseFractioningDialog({
  fractioningId,
  productName,
  saleUnitLabel,
  expectedQty,
}: {
  fractioningId: string
  productName: string
  saleUnitLabel: string
  expectedQty: number
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const form = useForm<CloseFractioningValues>({
    resolver: zodResolver(closeFractioningSchema),
    defaultValues: { actual_qty: expectedQty },
  })

  const actualQty = form.watch("actual_qty")
  const shrinkage = expectedQty - Number(actualQty || 0)

  function onSubmit(values: CloseFractioningValues) {
    startTransition(async () => {
      const result = await closeFractioning(fractioningId, values)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Fraccionamiento cerrado")
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Cerrar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar fraccionamiento — {productName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Cantidad teórica: {expectedQty} {saleUnitLabel}
            </p>

            <FormField
              control={form.control}
              name="actual_qty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Cantidad realmente obtenida ({saleUnitLabel})
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

            <p
              className={
                shrinkage > 0
                  ? "text-sm font-medium text-destructive"
                  : "text-sm font-medium text-emerald-600"
              }
            >
              Merma: {shrinkage.toFixed(2)} {saleUnitLabel}
              {shrinkage < 0 && " (se obtuvo más de lo esperado)"}
            </p>

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Cerrando..." : "Confirmar cierre"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
