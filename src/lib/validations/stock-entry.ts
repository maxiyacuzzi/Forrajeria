import { z } from "zod"

import { PAYMENT_METHODS } from "./expense"

export const stockEntryItemSchema = z.object({
  product_id: z.string().uuid("Elegí un producto"),
  unit: z.enum(["purchase", "sale"]),
  quantity: z.number().positive("Tiene que ser mayor a cero"),
  total_cost: z.number().min(0).optional().nullable(),
})

export const stockEntrySchema = z.object({
  supplier_id: z.string().uuid().optional().nullable(),
  iva_pct: z.number().min(0).optional().nullable(),
  paid_amount: z.number().min(0).optional().nullable(),
  payment_method: z.enum(PAYMENT_METHODS),
  note: z.string().trim().optional(),
  items: z.array(stockEntryItemSchema).min(1, "Agregá al menos un producto"),
})

export type StockEntryValues = z.infer<typeof stockEntrySchema>
