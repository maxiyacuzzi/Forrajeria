"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { registerExpensePayment } from "./actions"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import { formatMoney } from "@/lib/pricing"
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

export function PayExpenseDialog({
  expenseId,
  description,
  pendingAmount,
}: {
  expenseId: string
  description: string
  pendingAmount: number
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(pendingAmount)
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("efectivo")
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    if (amount <= 0 || amount > pendingAmount) {
      toast.error(`Ingresá un monto entre $0.01 y $${formatMoney(pendingAmount)}`)
      return
    }
    startTransition(async () => {
      const result = await registerExpensePayment({
        expense_id: expenseId,
        amount,
        payment_method: paymentMethod,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Pago registrado")
        setOpen(false)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setAmount(pendingAmount)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Registrar pago
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar — {description}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Saldo pendiente: ${formatMoney(pendingAmount)}
          </p>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Monto a pagar</label>
            <Input
              type="number"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.valueAsNumber || 0)}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Forma de pago</label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as (typeof PAYMENT_METHODS)[number])}
              items={PAYMENT_METHODS.map((method) => ({
                value: method,
                label: PAYMENT_METHOD_LABEL[method],
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABEL[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" disabled={pending} onClick={handleSubmit} className="w-fit">
            {pending ? "Guardando..." : "Confirmar pago"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
