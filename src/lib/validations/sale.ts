import { z } from "zod"

import { PAYMENT_METHODS } from "@/lib/validations/expense"

export const saleItemSchema = z.object({
  product_id: z.string().uuid("Elegí un producto"),
  unit: z.enum(["purchase", "sale"]),
  quantity: z.number().positive("Tiene que ser mayor a cero"),
  unit_price: z.number().min(0, "No puede ser negativo"),
})

export const saleSchema = z.object({
  customer_id: z.string().uuid("Elegí un cliente"),
  items: z.array(saleItemSchema).min(1, "Agregá al menos un producto"),
  note: z.string().trim().optional(),
  payment_method: z.enum(PAYMENT_METHODS),
})

export type SaleItemValues = z.infer<typeof saleItemSchema>
export type SaleFormValues = z.infer<typeof saleSchema>
