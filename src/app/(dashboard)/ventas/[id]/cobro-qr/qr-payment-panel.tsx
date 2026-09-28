"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import {
  refreshQrPaymentStatus,
  settleQrSaleOtherwise,
  startQrPayment,
} from "./actions"

const POLL_INTERVAL_MS = 3000
const FALLBACK_METHODS = ["efectivo", "transferencia", "posnet_mp"] as const

const STATUS_MESSAGE: Record<string, string> = {
  created: "Esperando que el cliente escanee el QR y pague…",
  at_terminal: "El cliente está pagando…",
  action_required: "El pago necesita una acción del cliente en la app de Mercado Pago.",
  expired: "El cobro venció sin pagarse.",
  canceled: "El cobro se canceló.",
  failed: "El pago fue rechazado.",
}

function isOpen(status: string | null) {
  return status === "created" || status === "at_terminal" || status === "action_required"
}

export function QrPaymentPanel({
  saleId,
  qrImageUrl,
  initialStatus,
}: {
  saleId: string
  qrImageUrl: string | null
  initialStatus: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (status === "processed") {
      toast.success("Pago recibido")
      router.push(`/ventas/${saleId}`)
      return
    }
    if (!isOpen(status)) return

    const interval = setInterval(async () => {
      const result = await refreshQrPaymentStatus(saleId)
      if (result.status) setStatus(result.status)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [status, saleId, router])

  function retry() {
    startTransition(async () => {
      const result = await startQrPayment(saleId)
      if (result.error) toast.error(result.error)
      else setStatus(result.status)
    })
  }

  function settle(method: (typeof FALLBACK_METHODS)[number]) {
    startTransition(async () => {
      const result = await settleQrSaleOtherwise(saleId, method)
      if (result?.status === "processed") setStatus("processed")
      else if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="grid gap-4">
      {qrImageUrl && isOpen(status) && (
        // eslint-disable-next-line @next/next/no-img-element -- remote QR served by Mercado Pago
        <img
          src={qrImageUrl}
          alt="QR de Mercado Pago"
          className="mx-auto size-64 rounded-md border bg-white p-2"
        />
      )}

      <p className="text-sm text-muted-foreground">
        {status
          ? (STATUS_MESSAGE[status] ?? `Estado: ${status}`)
          : "Todavía no se generó el cobro en Mercado Pago."}
      </p>

      {!isOpen(status) && (
        <Button size="lg" disabled={pending} onClick={retry}>
          Generar el cobro de nuevo
        </Button>
      )}

      <div className="grid gap-2">
        <p className="text-sm font-medium">¿Paga de otra forma?</p>
        <div className="grid grid-cols-3 gap-2">
          {FALLBACK_METHODS.map((method) => (
            <Button
              key={method}
              variant="outline"
              disabled={pending}
              onClick={() => settle(method)}
            >
              {PAYMENT_METHOD_LABEL[method]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
