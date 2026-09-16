"use client"

import type { ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { cn } from "cn"

import { TableRow } from "./table"

/**
 * Anything under here should never trigger the row's own navigation:
 * explicit row actions (links/buttons), form controls, and — critically —
 * any open dialog. A dialog's content is portaled elsewhere in the DOM, but
 * it's still a React child of the row that opened it, so React's synthetic
 * click event bubbles up to the row on every click inside it (even just
 * focusing a text field) — not only on its own trigger/submit buttons.
 */
const INTERACTIVE_DESCENDANT_SELECTOR = "a, button, input, select, textarea, [role='dialog']"

/** A table row that navigates to `href` on click, except when the click lands
 * on a nested link/button/form control, or anywhere inside an open dialog
 * (e.g. a row action) — those keep their own behavior. */
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
        if ((e.target as HTMLElement).closest(INTERACTIVE_DESCENDANT_SELECTOR)) return
        router.push(href)
      }}
      {...props}
    />
  )
}
