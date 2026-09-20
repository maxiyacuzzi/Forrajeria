export type SortDirection = "asc" | "desc"

export type SortState<Key extends string> = {
  key: Key
  direction: SortDirection
} | null

/** Compares two sort values generically: numbers/booleans numerically, everything else as
 * locale-aware text. Nullish values always sort last, regardless of direction. */
export function compareSortValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "boolean" && typeof b === "boolean")
    return Number(a) - Number(b)
  return String(a).localeCompare(String(b), "es", { sensitivity: "base" })
}

/** Toggles a column's sort: unsorted -> asc -> desc -> unsorted. */
export function nextSortState<Key extends string>(
  current: SortState<Key>,
  key: Key
): SortState<Key> {
  if (current?.key !== key) return { key, direction: "asc" }
  if (current.direction === "asc") return { key, direction: "desc" }
  return null
}

/**
 * Sorts a copy of `items` by `sort` using `getValue` to extract the comparable field.
 * For "desc" the comparator's arguments are swapped rather than negating the result,
 * so nullish values keep sorting last in both directions instead of jumping to the front.
 */
export function applySort<T, Key extends string>(
  items: T[],
  sort: SortState<Key>,
  getValue: (item: T, key: Key) => unknown
): T[] {
  if (!sort) return items
  return [...items].sort((a, b) => {
    const va = getValue(a, sort.key)
    const vb = getValue(b, sort.key)
    return sort.direction === "asc"
      ? compareSortValues(va, vb)
      : compareSortValues(vb, va)
  })
}
