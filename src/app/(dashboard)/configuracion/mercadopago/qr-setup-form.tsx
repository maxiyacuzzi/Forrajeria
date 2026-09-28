"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setupMercadoPagoQr, type QrSetupState } from "./actions"

const FIELDS: {
  name: string
  label: string
  placeholder?: string
  inputMode?: "decimal"
  optional?: boolean
}[] = [
  { name: "store_name", label: "Nombre de la sucursal", placeholder: "Mundo Animal Rio 1" },
  { name: "street_name", label: "Calle" },
  { name: "street_number", label: "Altura" },
  { name: "city_name", label: "Ciudad" },
  { name: "state_name", label: "Provincia" },
  { name: "latitude", label: "Latitud", placeholder: "-34.603722", inputMode: "decimal" },
  { name: "longitude", label: "Longitud", placeholder: "-58.381592", inputMode: "decimal" },
  { name: "reference", label: "Referencia", placeholder: "Frente a la plaza", optional: true },
]

export function QrSetupForm() {
  const [state, action, pending] = useActionState<QrSetupState, FormData>(
    setupMercadoPagoQr,
    { error: null }
  )

  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Mercado Pago necesita la dirección del local para crear la sucursal y la caja con
        su QR. Las coordenadas las sacás de Google Maps (clic derecho sobre el local).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.name} className="grid gap-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.optional && " (opcional)"}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              inputMode={field.inputMode}
              required={!field.optional}
            />
          </div>
        ))}
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Creando..." : "Crear sucursal y QR"}
      </Button>
    </form>
  )
}
