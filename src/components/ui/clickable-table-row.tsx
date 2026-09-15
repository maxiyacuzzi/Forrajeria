"use client"

import type { ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { cn } from "cn"

import { TableRow } from "./table"

/** A table row that navigates to `href` on click, except when the click lands
 * on a nested link/button (e.g. a row action) — those keep their own behavior. */
export function ClickableTableRow({
  href,
  className,
  ...props
}: ComponentProps<"tr"> & { href: string }) {
  const router = useRouter()

  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return
        router.push(href)
      }}
      {...props}
    />
  )
}
