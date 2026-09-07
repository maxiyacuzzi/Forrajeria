import { z } from "zod"

export const openFractioningSchema = z.object({
  product_id: z.string().uuid("Elegí un producto"),
  bags_opened: z.number().positive("Tiene que ser mayor a cero"),
})

export type OpenFractioningValues = z.infer<typeof openFractioningSchema>

export const closeFractioningSchema = z.object({
  actual_qty: z.number().min(0, "No puede ser negativo"),
})

export type CloseFractioningValues = z.infer<typeof closeFractioningSchema>

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid("Elegí un producto"),
  unit: z.enum(["purchase", "sale"]),
  type: z.enum(["ajuste_manual", "rotura_humedad"]),
  quantity: z.number().refine((v) => v !== 0, "La cantidad no puede ser cero"),
  note: z.string().trim().min(1, "La nota es obligatoria para un ajuste manual"),
})

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>
