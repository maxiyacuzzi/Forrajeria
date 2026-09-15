import { z } from "zod"

export const PRODUCT_UNIT_TYPES = ["simple", "fraccionable", "no_fraccionable"] as const

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    brand: z.string().trim().optional(),
    category_id: z.string().uuid().optional().nullable(),
    supplier_ids: z.array(z.string().uuid()),
    image_url: z.string().optional().nullable(),
    unit_type: z.enum(PRODUCT_UNIT_TYPES),
    purchase_unit_label: z.string().trim().min(1, "Indicá la unidad de compra"),
    sale_unit_label: z.string().trim().min(1, "Indicá la unidad de venta"),
    conversion_factor: z.number().positive().optional().nullable(),
    controls_expiration: z.boolean(),
    earns_loyalty: z.boolean(),
    min_stock_alert: z.number().min(0).optional().nullable(),
    cost_price: z.number().min(0),
    margin_suelto_pct: z.number().min(0),
    margin_bolsa_pct: z.number().min(0),
    sale_price: z.number().min(0),
    bag_price: z.number().min(0).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.unit_type !== "simple" && !data.conversion_factor) {
      ctx.addIssue({
        code: "custom",
        path: ["conversion_factor"],
        message: "Requerido para productos con envase (ej: kg por bolsa)",
      })
    }
  })

export type ProductFormValues = z.infer<typeof productSchema>
