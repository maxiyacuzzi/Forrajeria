import { z } from "zod"

export const PRODUCT_UNIT_TYPES = ["simple", "fraccionable", "peso_variable"] as const

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    brand: z.string().trim().optional(),
    category_id: z.string().uuid().optional().nullable(),
    unit_type: z.enum(PRODUCT_UNIT_TYPES),
    purchase_unit_label: z.string().trim().min(1, "Indicá la unidad de compra"),
    sale_unit_label: z.string().trim().min(1, "Indicá la unidad de venta"),
    conversion_factor: z.number().positive().optional().nullable(),
    reference_weight: z.number().positive().optional().nullable(),
    controls_expiration: z.boolean(),
    min_stock_alert: z.number().min(0).optional().nullable(),
    cost_price: z.number().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.unit_type === "fraccionable" && !data.conversion_factor) {
      ctx.addIssue({
        code: "custom",
        path: ["conversion_factor"],
        message: "Requerido para productos fraccionables (ej: kg por bolsa)",
      })
    }
    if (data.unit_type === "peso_variable" && !data.reference_weight) {
      ctx.addIssue({
        code: "custom",
        path: ["reference_weight"],
        message: "Requerido para productos de peso variable (ej: kg por fardo)",
      })
    }
  })

export type ProductFormValues = z.infer<typeof productSchema>
