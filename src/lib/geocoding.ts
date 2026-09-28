// Address <-> coordinates lookups with OpenStreetMap's Nominatim (free, no API
// key). Only used for the one-off Mercado Pago store setup, well within its
// usage policy: https://operations.osmfoundation.org/policies/nominatim/
// Called server-side so requests carry an identifying User-Agent.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org"
const USER_AGENT = "ForrajeriaPOS/1.0 (https://mundoanimalrio1.netlify.app)"

export type GeocodedAddress = {
  street_name: string
  street_number: string
  city_name: string
  state_name: string
  latitude: number
  longitude: number
}

type NominatimResult = {
  lat: string
  lon: string
  address?: {
    road?: string
    house_number?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
  }
}

function toAddress(result: NominatimResult): GeocodedAddress {
  const a = result.address ?? {}
  return {
    street_name: a.road ?? "",
    street_number: a.house_number ?? "",
    city_name: a.city ?? a.town ?? a.village ?? a.municipality ?? "",
    state_name: a.state ?? "",
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  }
}

async function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, NOMINATIM_URL)
  url.search = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "es",
    ...params,
  }).toString()

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`)
  return res.json() as Promise<T>
}

export async function reverseGeocode(latitude: number, longitude: number) {
  const result = await nominatim<NominatimResult & { error?: string }>("/reverse", {
    lat: String(latitude),
    lon: String(longitude),
  })
  if (result.error) return null
  // Keep the exact position the device reported, not the matched address point.
  return { ...toAddress(result), latitude, longitude }
}

export async function geocodeAddress(query: string) {
  const results = await nominatim<NominatimResult[]>("/search", {
    q: query,
    countrycodes: "ar",
    limit: "1",
  })
  return results[0] ? toAddress(results[0]) : null
}
