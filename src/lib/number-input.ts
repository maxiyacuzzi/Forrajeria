import type { ChangeEvent } from "react"

/** For optional numeric form fields backed by a plain (non-coerced) zod number. */
export function optionalNumber(e: ChangeEvent<HTMLInputElement>) {
  return e.target.value === "" ? undefined : e.target.valueAsNumber
}

/** For required numeric form fields backed by a plain (non-coerced) zod number. */
export function requiredNumber(e: ChangeEvent<HTMLInputElement>) {
  return e.target.value === "" ? 0 : e.target.valueAsNumber
}
