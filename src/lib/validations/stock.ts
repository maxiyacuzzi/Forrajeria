import { z } from "zod"

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid("Elegí un producto"),
  unit: z.enum(["purchase", "sale"]),
  type: z.enum(["ajuste_manual", "rotura_humedad"]),
  quantity: z.number().refine((v) => v !== 0, "La cantidad no puede ser cero"),
  note: z.string().trim().min(1, "La nota es obligatoria para un ajuste manual"),
})

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>
