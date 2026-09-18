/** Lowercases and strips accents so "Urinary" matches "urinary" and "Peluqueria" matches "Peluquería". */
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/** True if `query` is blank, or found in any of `fields` (accent/case-insensitive). */
export function matchesSearch(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const q = normalizeForSearch(query.trim())
  if (!q) return true
  return fields.some((field) => field && normalizeForSearch(field).includes(q))
}
