"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { applySupplierPriceIncrease } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function PriceIncreaseForm({
  supplierId,
  supplierName,
  productCount,
}: {
  supplierId: string
  supplierName: string
  productCount: number
}) {
  const [percentage, setPercentage] = useState("")
  const [pending, startTransition] = useTransition()

  function handleApply() {
    const value = Number(percentage)
    if (!value) {
      toast.error("Ingresá un porcentaje distinto de cero")
      return
    }
    if (
      !window.confirm(
        `¿Aplicar ${value > 0 ? "+" : ""}${value}% al costo de los ${productCount} productos de ${supplierName}? Los precios de venta se recalculan automáticamente.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await applySupplierPriceIncrease(supplierId, value)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Precios actualizados")
        setPercentage("")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">Aumento de precios (%)</label>
        <Input
          type="number"
          step="0.01"
          placeholder="Ej: 15"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          className="w-32"
        />
      </div>
      <Button type="button" disabled={pending || productCount === 0} onClick={handleApply}>
        {pending ? "Aplicando..." : "Aplicar a todos los productos"}
      </Button>
      <p className="w-full text-xs text-muted-foreground">
        Sube (o baja, con un número negativo) el costo de los {productCount} productos de este
        proveedor y recalcula sus precios de venta con el margen de cada uno.
      </p>
    </div>
  )
}
