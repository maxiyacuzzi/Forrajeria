export type ReportRangeKey = "7d" | "30d" | "month" | "all"

export const REPORT_RANGES: ReportRangeKey[] = ["7d", "30d", "month", "all"]

export const REPORT_RANGE_LABEL: Record<ReportRangeKey, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  month: "Este mes",
  all: "Todo",
}

export function resolveReportRange(key: string | undefined) {
  const rangeKey: ReportRangeKey =
    key === "7d" || key === "month" || key === "all" ? key : "30d"

  const now = new Date()
  const to = now
  let from: Date
  const groupBy: "day" | "month" = rangeKey === "all" ? "month" : "day"

  if (rangeKey === "7d") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  } else if (rangeKey === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (rangeKey === "all") {
    from = new Date(2000, 0, 1)
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
  }

  return { key: rangeKey, from, to, groupBy }
}

export function bucketKey(date: Date, groupBy: "day" | "month") {
  if (groupBy === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`
}

export function bucketLabel(key: string, groupBy: "day" | "month") {
  if (groupBy === "month") {
    const [y, m] = key.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "short", year: "2-digit" })
  }
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
}

/** Full ordered list of bucket keys between from/to — only meaningful for bounded ranges (not "all"). */
export function generateDayBuckets(from: Date, to: Date) {
  const keys: string[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (cursor <= end) {
    keys.push(bucketKey(cursor, "day"))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}
