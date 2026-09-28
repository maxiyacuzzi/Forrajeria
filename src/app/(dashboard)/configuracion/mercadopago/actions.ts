"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { geocodeAddress, reverseGeocode, type GeocodedAddress } from "@/lib/geocoding"
import {
  createMercadoPagoStoreAndPos,
  getMercadoPagoConnection,
} from "@/lib/mercadopago-qr"

export async function disconnectMercadoPago() {
  const supabase = await createClient()
  const { error } = await supabase.rpc("disconnect_mercadopago")

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/configuracion/mercadopago")
}

const qrSetupSchema = z.object({
  store_name: z.string().trim().min(1, "El nombre de la sucursal es obligatorio"),
  street_name: z.string().trim().min(1, "La calle es obligatoria"),
  street_number: z.string().trim().min(1, "La altura es obligatoria"),
  city_name: z.string().trim().min(1, "La ciudad es obligatoria"),
  state_name: z.string().trim().min(1, "La provincia es obligatoria"),
  latitude: z.coerce.number().min(-90).max(90, "Latitud inválida"),
  longitude: z.coerce.number().min(-180).max(180, "Longitud inválida"),
  reference: z.string().trim().optional(),
})

export type QrSetupState = { error: string | null }

export async function setupMercadoPagoQr(
  _prev: QrSetupState,
  formData: FormData
): Promise<QrSetupState> {
  const parsed = qrSetupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Tu sesión expiró. Volvé a ingresar." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "owner" || !profile.org_id) {
    return { error: "Solo el dueño puede configurar el cobro con QR." }
  }

  try {
    const connection = await getMercadoPagoConnection(profile.org_id)
    if (!connection) return { error: "Primero conectá la cuenta de Mercado Pago." }

    const { store_name, reference, ...location } = parsed.data
    const pos = await createMercadoPagoStoreAndPos(
      connection.access_token,
      connection.mp_user_id,
      { name: store_name, location: { ...location, reference: reference || undefined } }
    )

    const { error } = await createServiceRoleClient()
      .from("mercadopago_connections")
      .update({
        store_id: pos.storeId,
        external_pos_id: pos.externalPosId,
        qr_image_url: pos.qrImageUrl,
        qr_template_url: pos.qrTemplateUrl,
      })
      .eq("org_id", profile.org_id)

    if (error) throw error
  } catch (err) {
    console.error("setupMercadoPagoQr", err)
    return { error: "Mercado Pago no pudo crear la sucursal. Revisá los datos y probá de nuevo." }
  }

  revalidatePath("/configuracion/mercadopago")
  return { error: null }
}

export type GeocodeResult = { address: GeocodedAddress | null; error: string | null }

export async function lookupAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<GeocodeResult> {
  try {
    const address = await reverseGeocode(latitude, longitude)
    return address
      ? { address, error: null }
      : { address: null, error: "No se encontró una dirección para tu ubicación." }
  } catch (err) {
    console.error("lookupAddressFromCoordinates", err)
    return { address: null, error: "No se pudo consultar la dirección. Probá de nuevo." }
  }
}

export async function lookupCoordinatesFromAddress(query: string): Promise<GeocodeResult> {
  if (!query.trim()) return { address: null, error: "Completá la dirección primero." }
  try {
    const address = await geocodeAddress(query)
    return address
      ? { address, error: null }
      : { address: null, error: "No se encontró esa dirección. Revisá calle, altura y ciudad." }
  } catch (err) {
    console.error("lookupCoordinatesFromAddress", err)
    return { address: null, error: "No se pudo buscar la dirección. Probá de nuevo." }
  }
}
