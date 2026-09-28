"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { geocodeAddress, reverseGeocode, type GeocodedAddress } from "@/lib/geocoding"
import {
  createMercadoPagoPos,
  createMercadoPagoStore,
  MercadoPagoApiError,
  getMercadoPagoConnection,
  listMercadoPagoTerminals,
  setMercadoPagoTerminalMode,
  type MercadoPagoTerminal,
} from "@/lib/mercadopago-orders"

export async function disconnectMercadoPago() {
  // Once disconnected we lose the token, so hand a Point back for manual
  // charging first. Best effort: the RPC below still enforces owner-only.
  const orgId = await getOwnerOrgId()
  if (orgId) {
    try {
      const connection = await getMercadoPagoConnection(orgId)
      if (connection?.point_terminal_id) {
        await setMercadoPagoTerminalMode(
          connection.access_token,
          connection.point_terminal_id,
          "STANDALONE"
        )
      }
    } catch (err) {
      console.error("disconnectMercadoPago: could not reset the Point terminal", err)
    }
  }

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

  const service = createServiceRoleClient()
  let step: "store" | "pos" = "store"
  try {
    const connection = await getMercadoPagoConnection(profile.org_id)
    if (!connection) return { error: "Primero conectá la cuenta de Mercado Pago." }

    // A store left from a previous attempt whose POS failed is reused, so a
    // retry doesn't create a duplicate store in the seller's account.
    let storeId = connection.store_id
    if (!storeId) {
      const { store_name, reference, ...location } = parsed.data
      storeId = await createMercadoPagoStore(connection.access_token, connection.mp_user_id, {
        name: store_name,
        location: { ...location, reference: reference || undefined },
      })
      const { error } = await service
        .from("mercadopago_connections")
        .update({ store_id: storeId })
        .eq("org_id", profile.org_id)
      if (error) throw error
    }

    step = "pos"
    const pos = await createMercadoPagoPos(connection.access_token, storeId)
    const { error } = await service
      .from("mercadopago_connections")
      .update({
        external_pos_id: pos.externalPosId,
        qr_image_url: pos.qrImageUrl,
        qr_template_url: pos.qrTemplateUrl,
      })
      .eq("org_id", profile.org_id)
    if (error) throw error
  } catch (err) {
    console.error("setupMercadoPagoQr", step, err)
    const what = step === "store" ? "la sucursal" : "la caja"
    return {
      error:
        err instanceof MercadoPagoApiError
          ? `Mercado Pago no pudo crear ${what}: ${err.reason}`
          : `No se pudo crear ${what}. Probá de nuevo.`,
    }
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

/** The owner's org id, or null when the current user isn't an owner. */
async function getOwnerOrgId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single()

  return profile?.role === "owner" ? profile.org_id : null
}

export type TerminalsResult = { terminals: MercadoPagoTerminal[]; error: string | null }

export async function listPointTerminals(): Promise<TerminalsResult> {
  const orgId = await getOwnerOrgId()
  if (!orgId) return { terminals: [], error: "Solo el dueño puede configurar el posnet." }

  try {
    const connection = await getMercadoPagoConnection(orgId)
    if (!connection) return { terminals: [], error: "Primero conectá la cuenta de Mercado Pago." }
    return { terminals: await listMercadoPagoTerminals(connection.access_token), error: null }
  } catch (err) {
    console.error("listPointTerminals", err)
    return { terminals: [], error: "No se pudieron consultar los posnets en Mercado Pago." }
  }
}

export async function selectPointTerminal(terminalId: string): Promise<{ error: string | null }> {
  const orgId = await getOwnerOrgId()
  if (!orgId) return { error: "Solo el dueño puede configurar el posnet." }

  try {
    const connection = await getMercadoPagoConnection(orgId)
    if (!connection) return { error: "Primero conectá la cuenta de Mercado Pago." }

    // Only a terminal linked to this account can be picked.
    const terminals = await listMercadoPagoTerminals(connection.access_token)
    const terminal = terminals.find((t) => t.id === terminalId)
    if (!terminal) return { error: "Ese posnet no está vinculado a la cuenta." }

    if (terminal.operating_mode !== "PDV") {
      await setMercadoPagoTerminalMode(connection.access_token, terminalId, "PDV")
    }

    const { error } = await createServiceRoleClient()
      .from("mercadopago_connections")
      .update({ point_terminal_id: terminalId })
      .eq("org_id", orgId)
    if (error) throw error
  } catch (err) {
    console.error("selectPointTerminal", err)
    return { error: "No se pudo configurar el posnet en modo integrado." }
  }

  revalidatePath("/configuracion/mercadopago")
  return { error: null }
}

export async function removePointTerminal(): Promise<{ error: string | null }> {
  const orgId = await getOwnerOrgId()
  if (!orgId) return { error: "Solo el dueño puede configurar el posnet." }

  // Hand the device back for manual charging before forgetting it.
  try {
    const connection = await getMercadoPagoConnection(orgId)
    if (connection?.point_terminal_id) {
      await setMercadoPagoTerminalMode(
        connection.access_token,
        connection.point_terminal_id,
        "STANDALONE"
      )
    }
  } catch (err) {
    console.error("removePointTerminal", err)
    return { error: "No se pudo volver el posnet a modo manual. Probá de nuevo." }
  }

  const { error } = await createServiceRoleClient()
    .from("mercadopago_connections")
    .update({ point_terminal_id: null })
    .eq("org_id", orgId)
  if (error) return { error: "No se pudo quitar el posnet." }

  revalidatePath("/configuracion/mercadopago")
  return { error: null }
}
