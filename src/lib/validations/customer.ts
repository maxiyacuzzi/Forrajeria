import { z } from "zod"

export const customerSchema = z.object({
  dni: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{6,9}$/.test(v.replace(/\D/g, "")), "DNI inválido"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  address: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
