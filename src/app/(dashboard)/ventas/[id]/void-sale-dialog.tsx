"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { voidSale } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function VoidSaleDialog({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleVoid() {
    startTransition(async () => {
      const result = await voidSale(saleId, reason)
      setError(result.error)
      if (!result.error) {
        toast.success("Venta anulada")
        setOpen(false)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setError(null)
      }}
    >
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        Anular venta
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular venta</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            La venta queda registrada como anulada y deja de contar en caja y reportes.
            Los productos vuelven al stock (las bolsas abiertas para vender suelto quedan
            abiertas) y se recalcula la fidelidad del cliente. No se puede deshacer.
          </p>

          <div className="grid gap-1.5">
            <label htmlFor="void-reason" className="text-sm font-medium">
              Motivo (opcional)
            </label>
            <Input
              id="void-reason"
              placeholder="Ej: cargada por error"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleVoid}
            className="w-fit"
          >
            {pending ? "Anulando..." : "Confirmar anulación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
