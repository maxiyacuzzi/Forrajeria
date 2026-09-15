"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { openCashRegister } from "./actions"
import {
  openCashRegisterSchema,
  type OpenCashRegisterValues,
} from "@/lib/validations/cash-register"
import { requiredNumber } from "@/lib/number-input"
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

export function OpenRegisterDialog() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const form = useForm<OpenCashRegisterValues>({
    resolver: zodResolver(openCashRegisterSchema),
    defaultValues: { opening_amount: 0, note: "" },
  })

  function onSubmit(values: OpenCashRegisterValues) {
    startTransition(async () => {
      const result = await openCashRegister(values)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Caja abierta")
        setOpen(false)
        form.reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Abrir caja</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir caja</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="opening_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto inicial (fondo)</FormLabel>
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

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Abriendo..." : "Abrir caja"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
