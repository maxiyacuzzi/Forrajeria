"use client"

import { useState, useTransition } from "react"
import { PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { adjustCustomerProductLoyalty } from "../actions"
import { LOYALTY_TARGET_UNITS } from "@/lib/loyalty"
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

type Product = { id: string; name: string }

export function LoyaltyAdjustDialog({
  customerId,
  products,
  existingProductId,
  currentProgressQty,
}: {
  customerId: string
  products: Product[]
  existingProductId?: string
  currentProgressQty?: number
}) {
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState(existingProductId ?? "")
  const [progress, setProgress] = useState(currentProgressQty ?? 0)
  const [pending, startTransition] = useTransition()

  const locked = existingProductId != null
  const selectedProduct = products.find((p) => p.id === productId)

  function handleSubmit() {
    if (!productId) {
      toast.error("Elegí un producto")
      return
    }
    startTransition(async () => {
      const result = await adjustCustomerProductLoyalty(customerId, productId, progress)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Fidelidad actualizada")
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {locked ? (
        <DialogTrigger render={<Button variant="outline" size="icon-xs" />}>
          <PencilIcon />
          <span className="sr-only">Editar</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" size="xs" />}>
          + Agregar producto
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar fidelidad</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {locked ? (
            <p className="text-sm font-medium">{selectedProduct?.name}</p>
          ) : (
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Producto</label>
              <Select
                value={productId}
                onValueChange={(value) => {
                  setProductId(value ?? "")
                  setProgress(0)
                }}
                items={products.map((p) => ({ value: p.id, label: p.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Compras realizadas</label>
            <Input
              type="number"
              step="1"
              value={progress}
              onChange={(e) => setProgress(e.target.valueAsNumber || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Objetivo: {LOYALTY_TARGET_UNITS} compras de este producto (cualquier cantidad
              cuenta igual: 1 bolsa o 500 gramos son ambas &quot;1 compra&quot;). Al llegar o
              pasar eso, la próxima compra sale con 50% off.
            </p>
          </div>

          <Button type="button" disabled={pending} onClick={handleSubmit} className="w-fit">
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
