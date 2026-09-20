"use client"

import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react"
import { cn } from "cn"

import { TableHead } from "./table"
import type { SortState } from "@/lib/sort"

/** A `TableHead` whose label toggles sort on click, with an icon showing the current state. */
export function SortableTableHead<Key extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string
  sortKey: Key
  sort: SortState<Key>
  onSort: (key: Key) => void
  className?: string
}) {
  const active = sort?.key === sortKey

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "-mx-2 flex items-center gap-1 rounded px-2 py-1 hover:bg-accent hover:text-accent-foreground",
          active && "text-foreground"
        )}
      >
        {label}
        {active ? (
          sort.direction === "asc" ? (
            <ArrowUpIcon className="size-3.5" />
          ) : (
            <ArrowDownIcon className="size-3.5" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3.5 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  )
}
