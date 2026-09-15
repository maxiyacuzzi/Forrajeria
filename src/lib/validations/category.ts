import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  parent_id: z.string().uuid().nullable(),
})

export type CategoryFormValues = z.infer<typeof categorySchema>
