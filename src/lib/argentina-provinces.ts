// Province names exactly as Mercado Pago accepts them in a store's
// location.state_name for Argentina. Its validation error lists them; the
// names after "La Rioja" follow the same official spelling (accents included).
export const MERCADO_PAGO_PROVINCES = [
  "Buenos Aires",
  "Capital Federal",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Corrientes",
  "Córdoba",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const

const ALIASES: Record<string, string> = {
  caba: "Capital Federal",
  "ciudad autonoma de buenos aires": "Capital Federal",
  "ciudad de buenos aires": "Capital Federal",
  "tierra del fuego, antartida e islas del atlantico sur": "Tierra del Fuego",
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/^provincia de /, "")
}

/**
 * Maps what the user typed (or what geocoding returned) to Mercado Pago's
 * spelling, ignoring accents and case. Unknown values are returned as typed,
 * so Mercado Pago's own error lists the valid ones.
 */
export function toMercadoPagoProvince(value: string) {
  const key = normalize(value)
  if (ALIASES[key]) return ALIASES[key]
  return MERCADO_PAGO_PROVINCES.find((p) => normalize(p) === key) ?? value.trim()
}
