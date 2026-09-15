import { z } from "zod"

export const PAYMENT_METHODS = ["efectivo", "transferencia", "tarjeta", "posnet_mp"] as const

export const PAYMENT_METHOD_LABEL: Record<(typeof PAYMENT_METHODS)[number], string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  posnet_mp: "Posnet Mercado Pago",
}

export const expenseSchema = z
  .object({
    description: z.string().trim().min(1, "La descripción es obligatoria"),
    amount: z.number().positive("Tiene que ser mayor a cero"),
    paid_amount: z.number().min(0),
    payment_method: z.enum(PAYMENT_METHODS),
    supplier_id: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.paid_amount <= data.amount, {
    message: "No puede ser mayor al monto total",
    path: ["paid_amount"],
  })

export type ExpenseFormValues = z.infer<typeof expenseSchema>

export const expensePaymentSchema = z.object({
  expense_id: z.string().uuid(),
  amount: z.number().positive("Tiene que ser mayor a cero"),
  payment_method: z.enum(PAYMENT_METHODS),
  note: z.string().trim().optional(),
})

export type ExpensePaymentFormValues = z.infer<typeof expensePaymentSchema>
