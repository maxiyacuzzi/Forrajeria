import { z } from "zod"

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  contact_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  address: z.string().trim().optional(),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>
