"use client"

import { useActionState, useState, useTransition } from "react"
import { LocateFixedIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MERCADO_PAGO_PROVINCES, toMercadoPagoProvince } from "@/lib/argentina-provinces"
import type { GeocodedAddress } from "@/lib/geocoding"
import {
  lookupAddressFromCoordinates,
  lookupCoordinatesFromAddress,
  setupMercadoPagoQr,
  type QrSetupState,
} from "./actions"

type FieldName =
  | "store_name"
  | "street_name"
  | "street_number"
  | "city_name"
  | "state_name"
  | "latitude"
  | "longitude"
  | "reference"

const FIELDS: {
  name: FieldName
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
  { name: "latitude", label: "Latitud", placeholder: "-31.330000", inputMode: "decimal" },
  { name: "longitude", label: "Longitud", placeholder: "-63.620000", inputMode: "decimal" },
  { name: "reference", label: "Referencia", placeholder: "Frente a la plaza", optional: true },
]

const EMPTY_VALUES: Record<FieldName, string> = {
  store_name: "",
  street_name: "",
  street_number: "",
  city_name: "",
  state_name: "",
  latitude: "",
  longitude: "",
  reference: "",
}

export function QrSetupForm() {
  const [state, action, pending] = useActionState<QrSetupState, FormData>(
    setupMercadoPagoQr,
    { error: null }
  )
  const [values, setValues] = useState(EMPTY_VALUES)
  const [locating, startLocating] = useTransition()

  // Fills only what the lookup found, so a partial match never wipes typed data.
  function applyAddress(address: GeocodedAddress) {
    setValues((current) => ({
      ...current,
      street_name: address.street_name || current.street_name,
      street_number: address.street_number || current.street_number,
      city_name: address.city_name || current.city_name,
      state_name: address.state_name
        ? toMercadoPagoProvince(address.state_name)
        : current.state_name,
      latitude: address.latitude.toFixed(6),
      longitude: address.longitude.toFixed(6),
    }))
  }

  function fillFromCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Este navegador no permite obtener la ubicación.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        startLocating(async () => {
          const result = await lookupAddressFromCoordinates(coords.latitude, coords.longitude)
          if (result.address) {
            applyAddress(result.address)
            toast.success("Ubicación cargada. Revisá que la dirección sea correcta.")
          } else {
            setValues((current) => ({
              ...current,
              latitude: coords.latitude.toFixed(6),
              longitude: coords.longitude.toFixed(6),
            }))
            toast.error(result.error)
          }
        }),
      () => toast.error("No se pudo obtener tu ubicación. Revisá los permisos del navegador."),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  function findCoordinates() {
    const query = [
      `${values.street_name} ${values.street_number}`.trim(),
      values.city_name,
      values.state_name,
    ]
      .filter(Boolean)
      .join(", ")

    startLocating(async () => {
      const result = await lookupCoordinatesFromAddress(query)
      if (result.address) {
        setValues((current) => ({
          ...current,
          latitude: result.address!.latitude.toFixed(6),
          longitude: result.address!.longitude.toFixed(6),
        }))
        toast.success("Coordenadas encontradas.")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Mercado Pago necesita la dirección del local para crear la sucursal y la caja con
        su QR. Si estás en el local, usá tu ubicación actual; si no, completá la dirección
        y buscá las coordenadas.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={locating} onClick={fillFromCurrentLocation}>
          <LocateFixedIcon />
          Usar mi ubicación actual
        </Button>
        <Button type="button" variant="outline" disabled={locating} onClick={findCoordinates}>
          <SearchIcon />
          Buscar coordenadas de la dirección
        </Button>
      </div>
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
              list={field.name === "state_name" ? "mp-provinces" : undefined}
              value={values[field.name]}
              onChange={(e) =>
                setValues((current) => ({ ...current, [field.name]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>
      <datalist id="mp-provinces">
        {MERCADO_PAGO_PROVINCES.map((province) => (
          <option key={province} value={province} />
        ))}
      </datalist>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending || locating} className="w-fit">
        {pending ? "Creando..." : "Crear sucursal y QR"}
      </Button>
    </form>
  )
}
