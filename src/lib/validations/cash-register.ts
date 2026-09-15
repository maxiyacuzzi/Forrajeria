import { z } from "zod"

export const openCashRegisterSchema = z.object({
  opening_amount: z.number().min(0, "No puede ser negativo"),
  note: z.string().trim().optional(),
})

export const closeCashRegisterSchema = z.object({
  counted_amount: z.number().min(0, "No puede ser negativo"),
  note: z.string().trim().optional(),
})

export type OpenCashRegisterValues = z.infer<typeof openCashRegisterSchema>
export type CloseCashRegisterValues = z.infer<typeof closeCashRegisterSchema>
