export type PaymentStatus = "pagado" | "parcial" | "pendiente"

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pagado: "Pagado",
  parcial: "Parcial",
  pendiente: "Pendiente",
}

export function paymentStatus(amount: number, paid_amount: number): PaymentStatus {
  if (paid_amount <= 0) return "pendiente"
  if (paid_amount >= amount) return "pagado"
  return "parcial"
}
